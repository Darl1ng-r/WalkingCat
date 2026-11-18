import { useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, AppState, Platform, Pressable, View } from 'react-native';

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
import { DEMO_AVATARS, DEMO_WALK_ROUTE } from '@/lib/demo-data';
import { formatDistance, formatDuration, formatNumber, formatPace } from '@/lib/format';

const HEADER_COMPANIONS = [
  { id: 'marmalade', name: 'Marmalade', uri: DEMO_AVATARS.mina, active: true },
  { id: 'whiskers', name: 'Whiskers', uri: DEMO_AVATARS.layla, active: false },
  { id: 'mochi', name: 'Mochi', uri: DEMO_AVATARS.tariq, active: false },
] as const;

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
  const [mapFilter, setMapFilter] = useState<'all' | 'live' | 'sightings' | 'street'>('street');

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
      if (Platform.OS === 'web') {
        completeAndRefreshWalk().catch(() => {});
        return;
      }
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

    if (Platform.OS === 'web') {
      completeAndRefreshWalk().catch(() => {});
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
    if (Platform.OS === 'web') {
      track('walk_discarded', { reason: 'user_cancelled' }).catch(() => {});
      discardWalk().catch(() => {});
      return;
    }
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
      <Screen scroll contentContainerClassName="gap-5 pb-32">
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

        <RouteMap
          coordinates={
            summary.routePoints.length >= 2 ? summary.routePoints : DEMO_WALK_ROUTE
          }
          fitToBounds
          height={260}
        />

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
            variant="action"
            className="flex-1"
            onPress={dismissSummary}
          />
        </View>
      </Screen>
    );
  }

  // 2. Active or Paused Walk Screen (Styled after the Reference "GPS" screen)
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
      <Screen scroll padded={false} contentContainerClassName="pb-32">
        {/* Midnight-Ink Top Header ("< GPS ⋮") from Reference Middle-Right Screen */}
        <View className="bg-[#191A26] px-5 pb-8 pt-3">
          <View className="flex-row items-center justify-between">
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="View Walk History"
              onPress={() => router.push('/history')}
              className="h-9 w-9 items-center justify-center rounded-pill">
              <Text className="text-lg font-bold text-white">‹</Text>
            </Pressable>
            <Text className="text-base font-extrabold text-white">
              GPS · {formatDuration(movingTimeSeconds)}
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Toggle screen awake"
              onPress={() => setKeepAwakeEnabled((prev) => !prev)}
              className="h-9 items-center justify-center rounded-pill px-2">
              <Text className="text-xs font-bold text-[#F4A97B]">
                {keepAwakeEnabled ? 'Awake' : 'Sleep'}
              </Text>
            </Pressable>
          </View>
        </View>

        {/* Overlapping Circular Cat/Walker Avatars + Live Map */}
        <View className="relative">
          <View
            style={{ zIndex: 30 }}
            className="-mt-7 flex-row items-center justify-around px-6 pb-2">
            {HEADER_COMPANIONS.map((item) => (
              <Pressable
                key={item.id}
                onPress={() =>
                  setMapFilter((prev) => (prev === 'street' ? 'all' : 'street'))
                }
                className="items-center">
                <View className="rounded-pill bg-white p-1 shadow-sm">
                  <View className="h-14 w-14 overflow-hidden rounded-pill border-[2.5px] border-[#191A26] bg-white">
                    <Image
                      source={{ uri: item.uri }}
                      style={{ width: '100%', height: '100%' }}
                      contentFit="cover"
                    />
                  </View>
                </View>
                <View
                  className={`mt-1 rounded-pill px-2.5 py-0.5 ${
                    item.active ? 'bg-[#F4A97B]' : 'bg-[#191A26]'
                  }`}>
                  <Text
                    className={`text-[10px] font-extrabold ${
                      item.active ? 'text-[#191A26]' : 'text-white'
                    }`}>
                    {item.name}
                  </Text>
                </View>
              </Pressable>
            ))}
          </View>

          <RouteMap
            coordinates={routePoints.length >= 2 ? routePoints : DEMO_WALK_ROUTE}
            showUserLocation
            borderless
            mapStyle={mapFilter === 'street' ? 'street' : 'satellite'}
            height={300}
          />
        </View>

        {/* Bottom Sheet ("Динамика" style from Reference GPS Screen) */}
        <View className="-mt-5 gap-4 rounded-t-[28px] border-t-[1.5px] border-[#191A26] bg-white px-5 pt-5 dark:bg-[#191A26]">
          <View className="flex-row items-center justify-between">
            <Text className="text-base font-extrabold text-[#191A26] dark:text-white">
              {status === 'paused' ? 'Walk Paused' : 'Dynamics & Pace'}
            </Text>
            <Text className="text-sm font-bold text-[#191A26] dark:text-[#F4A97B]">⌄</Text>
          </View>

          {isWeakGps ? (
            <Card elevated className="py-2.5">
              <Text variant="caption" className="font-bold text-[#191A26]">
                📡 Weak GPS signal — waiting for a clear sky fix…
              </Text>
            </Card>
          ) : null}

          <View className="flex-row gap-3">
            <StatTile
              label="Distance"
              value={formatDistance(distanceMeters)}
              accentColor="secondary"
            />
            <StatTile
              label="Avg Pace"
              value={formatPace(paceSecondsPerKm)}
              accentColor="primary"
            />
          </View>

          <Button
            label={
              walkSightings.length > 0
                ? `📷 Spot a Cat (${walkSightings.length} spotted)`
                : '📷 Spot a Cat Along Route'
            }
            variant="secondary"
            size="lg"
            onPress={() =>
              router.push({
                pathname: '/sighting/capture',
                params: walkId ? { walkId } : {},
              })
            }
          />

          <View className="flex-row gap-3">
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
                variant="action"
                className="flex-1"
                onPress={resumeWalk}
              />
            )}

            <Button
              label="Finish Walk"
              variant="action"
              className="flex-1"
              loading={status === 'finishing'}
              onPress={handleFinishPress}
            />
          </View>

          <Button
            label="Discard Walk"
            variant="ghost"
            size="sm"
            onPress={handleDiscardPress}
          />
        </View>
      </Screen>
    );
  }

  // 3. Idle Screen — Styled Directly After the Reference Middle-Right "GPS" Screen
  return (
    <Screen scroll padded={false} contentContainerClassName="pb-32">
      {/* Midnight-Ink Top Header ("< GPS ⋮") */}
      <View className="bg-[#191A26] px-5 pb-9 pt-3">
        <View className="flex-row items-center justify-between">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="View Walk History"
            onPress={() => router.push('/history')}
            className="h-9 w-9 items-center justify-center rounded-pill">
            <Text className="text-xl font-bold text-white">‹</Text>
          </Pressable>
          <Text className="text-base font-extrabold tracking-wide text-white">
            GPS
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Toggle map style"
            onPress={() =>
              setMapFilter((prev) => (prev === 'street' ? 'all' : 'street'))
            }
            className="h-9 w-9 items-center justify-center rounded-pill">
            <Text className="text-base font-extrabold text-white">⋮</Text>
          </Pressable>
        </View>
      </View>

      {/* Overlapping Circular Blob-Cat Avatars ("Огурец | Бублик | Пиксик" in Reference) + Map */}
      <View className="relative">
        <View
          style={{ zIndex: 30 }}
          className="-mt-8 flex-row items-center justify-around px-6 pb-2">
          {HEADER_COMPANIONS.map((item) => (
            <Pressable
              key={item.id}
              accessibilityRole="button"
              accessibilityLabel={`Filter route by ${item.name}`}
              onPress={() => router.push('/collection')}
              className="items-center">
              <View className="rounded-pill bg-white p-1.5 shadow-sm">
                <View className="h-16 w-16 overflow-hidden rounded-pill border-[2.5px] border-[#191A26] bg-white">
                  <Image
                    source={{ uri: item.uri }}
                    style={{ width: '100%', height: '100%' }}
                    contentFit="cover"
                  />
                </View>
              </View>
              <Text
                className={`mt-1 text-xs font-extrabold ${
                  item.active ? 'text-[#F4A97B]' : 'text-[#191A26]'
                }`}>
                {item.name}
              </Text>
            </Pressable>
          ))}
        </View>

        <RouteMap
          coordinates={DEMO_WALK_ROUTE}
          borderless
          mapStyle={mapFilter === 'street' ? 'street' : 'satellite'}
          showSightingPins={mapFilter !== 'live'}
          height={310}
        />
      </View>

      {/* Bottom Sheet ("Динамика" Card with Two Dark Midnight-Ink Stat Tiles from Reference) */}
      <View className="-mt-5 gap-4 rounded-t-[28px] border-t-[1.5px] border-[#191A26] bg-white px-5 pt-5 dark:bg-[#191A26]">
        <View className="flex-row items-center justify-between">
          <Text className="text-base font-extrabold text-[#191A26] dark:text-white">
            Dynamics
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="View Walk History"
            onPress={() => router.push('/history')}>
            <Text className="text-xs font-extrabold text-[#191A26] dark:text-[#F4A97B]">
              History ⌄
            </Text>
          </Pressable>
        </View>

        {/* Two Side-by-Side Dark Midnight-Ink Tiles ("123 мм. рт. ст." | "12 км/ч" in Reference) */}
        <View className="flex-row gap-3">
          <StatTile
            label="Target Distance"
            value="3.2 km"
            unit="+65 Paw Pts"
            accentColor="secondary"
          />
          <StatTile
            label="Target Speed"
            value="4.8 km/h"
            unit="+120 XP"
            accentColor="primary"
          />
        </View>

        {recoverableWalk ? (
          <Card elevated className="gap-3">
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
                variant="action"
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
          <Card elevated className="gap-4 p-5">
            <Text variant="heading">📍 How we use your location</Text>
            <Text variant="caption" className="leading-5">
              We only use GPS while a walk is actively running so we can measure your distance and
              draw your private route—including when your screen is locked in your pocket.
            </Text>
            <Button
              label="Continue & Allow Location"
              variant="action"
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
          <>
            {permissionError ? (
              <View className="w-full gap-2 rounded-card border-[1.5px] border-[#191A26] bg-danger-muted p-3">
                <Text variant="caption" className="text-center font-bold text-danger">
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

            {/* Warm Peach Primary Pill CTA (#F4A97B with #191A26 border) */}
            <Button
              label={status === 'requestingPermission' ? 'Starting…' : 'Start Walk'}
              variant="primary"
              size="lg"
              loading={status === 'requestingPermission'}
              onPress={handleStartWalkPress}
            />
          </>
        )}
      </View>
    </Screen>
  );
}
