import { useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, AppState, Platform, View } from 'react-native';

import { Button, Card, Screen, StatTile, Text } from '@/components/ui';
import { AppConfig } from '@/constants/config';
import { useSession } from '@/features/auth';
import {
  GAMIFICATION_QUERY_KEYS,
  WalkRewardsCard,
} from '@/features/gamification';
import {
  SIGHTINGS_QUERY_KEYS,
  useWalkSightings,
  WalkSightingsList,
} from '@/features/sightings';
import {
  checkCurrentLocationPermission,
  computeDurations,
  openDeviceLocationSettings,
  requestWalkLocationPermissions,
  RouteMap,
  useWalkStore,
  WALK_QUERY_KEYS,
} from '@/features/walk';
import {
  getDistanceBucket,
  getStepsBucket,
  track,
} from '@/lib/analytics';
import { formatDistance, formatDuration, formatNumber, formatPace } from '@/lib/format';

export default function WalkScreen() {
  const queryClient = useQueryClient();
  const { profile } = useSession();
  const {
    status,
    walkId,
    startedAt,
    pauseIntervals,
    routePoints,
    distanceMeters,
    lastFixAt,
    recoverableWalk,
    summary,
    pendingUploadCount,
    checkCrashRecovery,
    resumeRecoveredWalk,
    discardRecoveredWalk,
    setRequestingPermission,
    startWalk,
    pauseWalk,
    resumeWalk,
    finishWalk,
    discardWalk,
    dismissSummary,
    triggerSync,
  } = useWalkStore();

  const { data: walkSightings = [] } = useWalkSightings(
    status === 'summary' ? summary?.walkId : walkId
  );

  const [nowMs, setNowMs] = useState(() => Date.now());
  const [showPermissionExplainer, setShowPermissionExplainer] = useState(false);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [keepAwakeEnabled, setKeepAwakeEnabled] = useState(true);

  useEffect(() => {
    checkCrashRecovery();
    triggerSync().catch(() => {});
  }, [checkCrashRecovery, triggerSync]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        setNowMs(Date.now());
        triggerSync().catch(() => {});
      }
    });
    return () => sub.remove();
  }, [triggerSync]);

  // Timestamp-derived 1s ticker while active or paused
  useEffect(() => {
    if (status !== 'active' && status !== 'paused') {
      return;
    }
    const id = setInterval(() => {
      setNowMs(Date.now());
    }, 1000);
    return () => clearInterval(id);
  }, [status]);

  // Manage keep-awake while walk is active
  useEffect(() => {
    if (Platform.OS === 'web') return;
    if ((status === 'active' || status === 'paused') && keepAwakeEnabled) {
      activateKeepAwakeAsync('active-walk').catch(() => {});
    } else {
      deactivateKeepAwake('active-walk').catch(() => {});
    }
    return () => {
      deactivateKeepAwake('active-walk').catch(() => {});
    };
  }, [status, keepAwakeEnabled]);

  const handleStartWalkPress = async () => {
    setPermissionError(null);
    const current = await checkCurrentLocationPermission();
    if (!current.foregroundGranted) {
      setShowPermissionExplainer(true);
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    track('walk_started', { source: 'tab' }).catch(() => {});
    await startWalk();
  };

  const handleConfirmPermissionRequest = async () => {
    setShowPermissionExplainer(false);
    setRequestingPermission(true);

    const outcome = await requestWalkLocationPermissions();
    if (outcome.status === 'granted') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
      track('walk_started', { source: 'tab' }).catch(() => {});
      await startWalk();
      return;
    }

    setRequestingPermission(false);
    switch (outcome.status) {
      case 'services_disabled':
        setPermissionError(
          'Location services are turned off on your device. Please enable GPS in Settings to track your walk.'
        );
        break;
      case 'approximate_only':
        setPermissionError(
          'Precise location is needed to record your walking route accurately. Please enable "Precise Location" in Settings.'
        );
        break;
      case 'denied_settings_required':
        setPermissionError(
          'Location permission was denied. Open Settings to allow location access while walking.'
        );
        break;
      default:
        setPermissionError(
          'Location permission is required to record your walk distance and route.'
        );
        break;
    }
  };

  const completeAndRefreshWalk = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    const finishedSummary = await finishWalk(profile?.weight_kg);
    if (finishedSummary) {
      track('walk_completed', {
        duration_s: finishedSummary.movingTimeSeconds,
        distance_bucket: getDistanceBucket(finishedSummary.distanceMeters),
        steps_bucket: getStepsBucket(finishedSummary.steps ?? 0),
      }).catch(() => {});
    }
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: WALK_QUERY_KEYS.all }),
      queryClient.invalidateQueries({ queryKey: SIGHTINGS_QUERY_KEYS.all }),
      queryClient.invalidateQueries({ queryKey: GAMIFICATION_QUERY_KEYS.all }),
      queryClient.invalidateQueries({ queryKey: ['health', 'today'] }),
    ]);
  };

  const handleFinishPress = () => {
    if (!startedAt) return;
    const { movingTimeSeconds } = computeDurations(startedAt, Date.now(), pauseIntervals);
    const isShortWalk =
      distanceMeters < AppConfig.walk.minSaveDistanceMeters ||
      movingTimeSeconds < AppConfig.walk.minSaveDurationSeconds;

    if (isShortWalk) {
      Alert.alert(
        'Short walk detected',
        'This walk is under 50 meters or 1 minute. Would you like to save it anyway or discard it?',
        [
          { text: 'Keep Walking', style: 'cancel' },
          {
            text: 'Discard Walk',
            style: 'destructive',
            onPress: () => {
              track('walk_discarded', { reason: 'short_walk' }).catch(() => {});
              discardWalk().catch(() => {});
            },
          },
          {
            text: 'Save Anyway',
            onPress: () => {
              completeAndRefreshWalk().catch(() => {});
            },
          },
        ]
      );
      return;
    }

    Alert.alert('Finish walk?', 'Ready to wrap up and save this walk to your private history?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Finish Walk',
        onPress: () => {
          completeAndRefreshWalk().catch(() => {});
        },
      },
    ]);
  };

  const handleDiscardPress = () => {
    Alert.alert(
      'Discard walk?',
      'This will permanently delete the current walk and its route points.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Discard',
          style: 'destructive',
          onPress: () => {
            track('walk_discarded', { reason: 'user_cancelled' }).catch(() => {});
            discardWalk().catch(() => {});
          },
        },
      ]
    );
  };

  // 1. Summary Screen
  if (status === 'summary' && summary) {
    return (
      <Screen scroll contentContainerClassName="gap-5 pb-10">
        <View className="mt-2">
          <Text variant="label">Walk Completed 🎉</Text>
          <Text variant="title" className="mt-1">
            Great walk!
          </Text>
          <Text variant="caption" className="mt-1">
            {summary.syncStatus === 'synced'
              ? '✓ Saved to your private history'
              : summary.syncStatus === 'uploading'
                ? 'Uploading to your private history…'
                : 'Saved on device — will upload automatically when online'}
          </Text>
        </View>

        <RouteMap coordinates={summary.routePoints} height={240} />

        <WalkRewardsCard
          walkId={summary.walkId}
          distanceMeters={summary.distanceMeters}
          movingTimeSeconds={summary.movingTimeSeconds}
        />

        <View className="flex-row gap-3">
          <StatTile label="Distance" value={formatDistance(summary.distanceMeters)} />
          <StatTile label="Moving Time" value={formatDuration(summary.movingTimeSeconds)} />
        </View>

        <View className="flex-row gap-3">
          <StatTile label="Avg Pace" value={formatPace(summary.paceSecondsPerKm)} />
          <StatTile label="Total Time" value={formatDuration(summary.durationSeconds)} />
        </View>

        <View className="flex-row gap-3">
          <StatTile
            label="Steps"
            value={summary.steps !== null ? formatNumber(summary.steps) : '—'}
            unit={summary.steps !== null ? undefined : 'Connect Health'}
          />
          <StatTile
            label={
              summary.kcalSource === 'health'
                ? `Calories (${
                    summary.healthSourceName === 'healthkit'
                      ? 'from Apple Health'
                      : 'from Health Connect'
                  })`
                : 'Calories (Estimate)'
            }
            value={`${formatNumber(summary.activeKcal)}`}
            unit="kcal"
          />
        </View>

        <Card className="gap-1.5">
          <Text variant="label">How is this estimated?</Text>
          <Text variant="caption" className="text-xs leading-5">
            {summary.kcalSource === 'health'
              ? 'Active energy was read directly from your connected health platform.'
              : `Calculated using standard walking METs × ${
                  summary.usedDefaultWeight
                    ? 'a default 70 kg weight (add your weight in Profile for a closer estimate)'
                    : 'your profile weight'
                } × moving time.`}
            {' '}Calorie figures are approximate estimates and are not medical advice.
          </Text>
        </Card>

        <WalkSightingsList sightings={walkSightings} />

        <View className="flex-row gap-3">
          <Button
            label="Walk History"
            variant="secondary"
            className="flex-1"
            onPress={() => {
              dismissSummary();
              router.push('/history');
            }}
          />
          <Button
            label="Done"
            className="flex-1"
            onPress={dismissSummary}
          />
        </View>
      </Screen>
    );
  }

  // 2. Active or Paused Walk Screen
  if (status === 'active' || status === 'paused' || status === 'finishing') {
    const { movingTimeSeconds } = startedAt
      ? computeDurations(startedAt, nowMs, pauseIntervals)
      : { movingTimeSeconds: 0 };

    const paceSecondsPerKm =
      distanceMeters >= 10 && movingTimeSeconds > 0
        ? movingTimeSeconds / (distanceMeters / 1000)
        : 0;

    const isWeakGps =
      status === 'active' && lastFixAt !== null && nowMs - lastFixAt > 30_000;

    return (
      <Screen scroll contentContainerClassName="gap-4 pb-10">
        <View className="mt-1 flex-row items-center justify-between">
          <View>
            <Text variant="label">
              {status === 'paused' ? '⏸ Walk Paused' : '🟢 Walk in Progress'}
            </Text>
            <Text variant="title" className="mt-0.5">
              {formatDuration(movingTimeSeconds)}
            </Text>
          </View>

          <Button
            label={keepAwakeEnabled ? 'Screen Awake: ON' : 'Screen Awake: OFF'}
            size="sm"
            variant="ghost"
            onPress={() => setKeepAwakeEnabled((prev) => !prev)}
          />
        </View>

        {isWeakGps ? (
          <Card className="border-primary/50 bg-primary-muted/60 py-2.5 dark:bg-surface-elevated-dark">
            <Text variant="caption" className="font-semibold text-primary-dark dark:text-primary-light">
              📡 Weak GPS signal — waiting for a clear sky fix…
            </Text>
          </Card>
        ) : null}

        <RouteMap
          coordinates={routePoints}
          showUserLocation
          height={230}
        />

        <View className="flex-row gap-3">
          <StatTile label="Distance" value={formatDistance(distanceMeters)} />
          <StatTile label="Avg Pace" value={formatPace(paceSecondsPerKm)} />
        </View>

        <Button
          label={
            walkSightings.length > 0
              ? `📷 Spot a Cat (${walkSightings.length} spotted)`
              : '📷 Spot a Cat'
          }
          variant="secondary"
          onPress={() =>
            router.push({
              pathname: '/sighting/capture',
              params: walkId ? { walkId } : {},
            })
          }
        />

        <View className="mt-1 flex-row gap-3">
          {status === 'active' ? (
            <Button
              label="Pause"
              variant="ghost"
              className="flex-1"
              onPress={pauseWalk}
            />
          ) : (
            <Button
              label="Resume"
              variant="primary"
              className="flex-1"
              onPress={resumeWalk}
            />
          )}

          <Button
            label="Finish"
            variant="primary"
            className="flex-1"
            loading={status === 'finishing'}
            onPress={handleFinishPress}
          />
        </View>

        <Button
          label="Discard Walk"
          variant="danger"
          size="sm"
          onPress={handleDiscardPress}
        />
      </Screen>
    );
  }

  // 3. Idle Screen (with pre-permission explainer & crash recovery banner)
  return (
    <Screen scroll contentContainerClassName="justify-between gap-6 pb-10">
      <View className="mt-2">
        <Text variant="label">Activity Tracker</Text>
        <Text variant="title" className="mt-1">
          Ready to Walk
        </Text>
        <Text variant="caption" className="mt-1">
          Every walk builds your activity history—with or without a cat sighting.
        </Text>
      </View>

      {recoverableWalk ? (
        <Card className="gap-3 border-primary">
          <Text variant="heading">Resume your unfinished walk?</Text>
          <Text variant="caption">
            We found an active walk from{' '}
            {new Date(recoverableWalk.startedAt).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}
            . Would you like to continue or discard it?
          </Text>
          <View className="flex-row gap-3">
            <Button
              label="Resume Walk"
              className="flex-1"
              onPress={() => {
                resumeRecoveredWalk().catch(() => {});
              }}
            />
            <Button
              label="Discard"
              variant="ghost"
              className="flex-1"
              onPress={() => {
                discardRecoveredWalk().catch(() => {});
              }}
            />
          </View>
        </Card>
      ) : null}

      {pendingUploadCount > 0 ? (
        <Card className="flex-row items-center justify-between">
          <View className="flex-1 pr-2">
            <Text variant="body" className="font-semibold">
              {pendingUploadCount} walk{pendingUploadCount > 1 ? 's' : ''} waiting to upload
            </Text>
            <Text variant="caption">Will sync automatically when online.</Text>
          </View>
          <Button
            label="Retry Now"
            size="sm"
            variant="secondary"
            onPress={() => {
              triggerSync().catch(() => {});
            }}
          />
        </Card>
      ) : null}

      {showPermissionExplainer ? (
        <Card className="gap-4 p-6">
          <Text variant="heading">📍 How we use your location</Text>
          <Text variant="caption" className="leading-5">
            We only use GPS while a walk is actively running so we can measure your distance and
            draw your private route—including when your screen is locked in your pocket.
          </Text>
          <Text variant="caption" className="leading-5">
            Your route is private by default and never shared live with friends.
          </Text>
          <Button
            label="Continue & Allow Location"
            size="lg"
            onPress={handleConfirmPermissionRequest}
          />
          <Button
            label="Not Now"
            variant="ghost"
            onPress={() => setShowPermissionExplainer(false)}
          />
        </Card>
      ) : (
        <Card className="items-center gap-4 p-6">
          <View className="h-20 w-20 items-center justify-center rounded-pill bg-primary-muted dark:bg-surface-elevated-dark">
            <Text className="text-4xl">👟</Text>
          </View>
          <Text variant="heading" className="text-center">
            Start a new walk
          </Text>
          <Text variant="caption" className="text-center leading-5">
            Track your distance, pace, and route privately while exploring your neighborhood.
          </Text>

          {permissionError ? (
            <View className="w-full gap-2 rounded-button bg-danger-muted p-3">
              <Text variant="caption" className="text-center text-danger">
                {permissionError}
              </Text>
              <Button
                label="Open Device Settings"
                size="sm"
                variant="secondary"
                onPress={openDeviceLocationSettings}
              />
            </View>
          ) : null}

          <Button
            label="Start Walk"
            size="lg"
            className="w-full"
            loading={status === 'requestingPermission'}
            onPress={handleStartWalkPress}
          />
        </Card>
      )}

      <View />
    </Screen>
  );
}
