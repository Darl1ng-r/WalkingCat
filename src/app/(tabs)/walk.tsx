import { useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, AppState, Platform, Pressable, ScrollView, View } from 'react-native';

import { Button, Card, GlassPill, Screen, StatTile, Text } from '@/components/ui';
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
  const [mapFilter, setMapFilter] = useState<'all' | 'live' | 'sightings' | 'street'>('all');

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
      <Screen scroll padded={false} contentContainerClassName="pb-32">
        {/* Full-bleed live map header */}
        <View className="relative">
          <RouteMap
            coordinates={routePoints.length >= 2 ? routePoints : DEMO_WALK_ROUTE}
            showUserLocation
            borderless
            mapStyle={mapFilter === 'street' ? 'street' : 'satellite'}
            height={360}
          />

          {/* Top Floating Glass Filter Pills (Reference Image 2) */}
          <View className="absolute left-4 right-4 top-3 z-30 flex-row items-center gap-2">
            <GlassPill
              label="Live Route"
              badgeCount={routePoints.length || DEMO_WALK_ROUTE.length}
              active={mapFilter !== 'street'}
              onPress={() => setMapFilter('live')}
            />
            <GlassPill
              label="Street Map"
              active={mapFilter === 'street'}
              onPress={() =>
                setMapFilter((prev) => (prev === 'street' ? 'all' : 'street'))
              }
            />
            <GlassPill
              label={keepAwakeEnabled ? 'Awake ON' : 'Awake OFF'}
              onPress={() => setKeepAwakeEnabled((prev) => !prev)}
            />
          </View>
        </View>

        {/* Rounded White Bottom Sheet Card */}
        <View className="-mt-7 gap-4 rounded-t-[32px] bg-surface px-5 pt-6 shadow-bento dark:bg-surface-dark">
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center gap-2">
              <View className="h-3 w-3 rounded-pill bg-[#58B957]" />
              <Text variant="label" className="text-[#58B957]">
                {status === 'paused' ? 'Walk Paused' : 'Live GPS Tracking'}
              </Text>
            </View>
            <View className="rounded-pill bg-[#E8F7E8] px-3 py-1">
              <Text className="text-xs font-extrabold text-[#3E963D]">
                +45 Paw Pts
              </Text>
            </View>
          </View>

          <View className="flex-row items-baseline justify-between">
            <Text className="text-4xl font-extrabold tracking-tight text-text-primary dark:text-text-primary-dark">
              {formatDuration(movingTimeSeconds)}
            </Text>
            <Text variant="caption" className="font-semibold">
              {formatDistance(distanceMeters)} walked
            </Text>
          </View>

          {isWeakGps ? (
            <Card className="border-primary/50 bg-primary-muted/60 py-2.5">
              <Text variant="caption" className="font-semibold text-primary-dark">
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

          <View className="mt-1 flex-row gap-3">
            {status === 'active' ? (
              <Button
                label="Pause"
                variant="secondary"
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

  // 3. Idle Screen — Styled Directly After Reference Image 2 (Live Map + Glass Filter Bar + Bottom Sheet Challenge Card)
  return (
    <Screen scroll padded={false} contentContainerClassName="pb-32">
      {/* Top Interactive Map Viewport with Walked Path & Cat Pins */}
      <View className="relative">
        <RouteMap
          coordinates={DEMO_WALK_ROUTE}
          borderless
          mapStyle={mapFilter === 'street' ? 'street' : 'satellite'}
          showSightingPins={mapFilter !== 'live'}
          height={370}
        />

        {/* Top Floating Glass Filter Pills (Reference Image 2) */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerClassName="gap-2 px-4"
          className="absolute left-0 right-0 top-3 z-30">
          <GlassPill
            label="All"
            active={mapFilter === 'all'}
            onPress={() => setMapFilter('all')}
          />
          <GlassPill
            label="Live Route"
            badgeCount={98}
            active={mapFilter === 'live'}
            onPress={() => setMapFilter('live')}
          />
          <GlassPill
            label="Cat Spots"
            badgeCount={8}
            active={mapFilter === 'sightings'}
            onPress={() => setMapFilter('sightings')}
          />
          <GlassPill
            label={mapFilter === 'street' ? 'Satellite' : 'Street Map'}
            active={mapFilter === 'street'}
            onPress={() =>
              setMapFilter((prev) => (prev === 'street' ? 'all' : 'street'))
            }
          />
        </ScrollView>
      </View>

      {/* Overlapping White Bottom Sheet Card (Reference Image 2 Center Screen) */}
      <View className="-mt-8 gap-4 rounded-t-[32px] bg-surface px-6 pt-6 shadow-bento dark:bg-surface-dark">
        {/* Top Row: Target Challenge Badge + Stacked Walker Avatars (+23) */}
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center gap-2">
            <View className="h-8 w-8 items-center justify-center rounded-pill bg-[#E8F7E8]">
              <Text className="text-base">🎯</Text>
            </View>
            <Text className="text-sm font-bold text-text-primary dark:text-text-primary-dark">
              Challenge Route
            </Text>
          </View>

          <View className="flex-row items-center">
            {[DEMO_AVATARS.mina, DEMO_AVATARS.tariq, DEMO_AVATARS.layla].map(
              (uri, idx) => (
                <View
                  key={uri}
                  style={{ marginLeft: idx === 0 ? 0 : -10 }}
                  className="h-8 w-8 overflow-hidden rounded-pill border-2 border-white bg-primary-muted">
                  <Image
                    source={{ uri }}
                    style={{ width: '100%', height: '100%' }}
                    contentFit="cover"
                  />
                </View>
              )
            )}
            <View
              style={{ marginLeft: -8 }}
              className="h-8 items-center justify-center rounded-pill border-2 border-white bg-[#58B957] px-2.5">
              <Text className="text-xs font-extrabold text-white">+23</Text>
            </View>
          </View>
        </View>

        {/* Bold Editorial Title */}
        <Text className="text-[26px] font-extrabold leading-[32px] tracking-tight text-text-primary dark:text-text-primary-dark">
          Sunset Cat Patrol: Discover Your Next Favorite Spot
        </Text>

        {/* Reward Pills (+120 XP & +65 Gold / Paw Points) */}
        <View className="flex-row items-center gap-3">
          <View className="flex-row items-center gap-1.5 rounded-pill bg-[#E8F7E8] px-3 py-1.5">
            <View className="h-5 w-5 items-center justify-center rounded-pill bg-[#58B957]">
              <Text className="text-[10px] font-bold text-white">★</Text>
            </View>
            <Text className="text-xs font-extrabold text-[#181A22]">+120 XP</Text>
          </View>

          <View className="flex-row items-center gap-1.5 rounded-pill bg-[#EEFBF0] px-3 py-1.5">
            <View className="h-5 w-5 items-center justify-center rounded-pill bg-[#58B957]">
              <Text className="text-[10px] font-extrabold text-white">🐾</Text>
            </View>
            <Text className="text-xs font-extrabold text-[#181A22]">+65 Paw Pts</Text>
          </View>
        </View>

        {/* Description Copy */}
        <Text variant="caption" className="text-[13px] leading-5 text-text-secondary">
          Explore sunlit neighborhood stoops and garden paths right from the live map. Complete
          your daily loop to earn +120 XP along with +65 Paw Points, and spot local cats to unlock
          rare collector cards!
        </Text>

        {recoverableWalk ? (
          <Card className="gap-3 border-primary bg-primary-muted/30">
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
          <Card className="flex-row items-center justify-between bg-background">
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
          <Card className="gap-4 bg-background p-5">
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
              <View className="w-full gap-2 rounded-card bg-danger-muted p-3">
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

            {/* Green Pill CTA Button with White Play Circle (Reference Image 2) */}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Start Walk"
              disabled={status === 'requestingPermission'}
              onPress={handleStartWalkPress}
              className="mt-1 flex-row items-center justify-center gap-2.5 rounded-pill bg-[#58B957] py-4 shadow-md active:opacity-90">
              <View className="h-6 w-6 items-center justify-center rounded-pill bg-white">
                <Text className="ml-0.5 text-[10px] font-extrabold text-[#58B957]">▶</Text>
              </View>
              <Text className="text-base font-bold text-white">
                {status === 'requestingPermission' ? 'Starting…' : 'Start Walk'}
              </Text>
            </Pressable>
          </>
        )}

        {/* Creator / Route Host Footer Row (Reference Image 2 bottom of sheet) */}
        <View className="mt-1 flex-row items-center justify-between border-t border-border/60 pt-4">
          <View className="flex-row items-center gap-3">
            <View className="h-11 w-11 overflow-hidden rounded-pill border border-border bg-primary-muted">
              <Image
                source={{ uri: DEMO_AVATARS.mina }}
                style={{ width: '100%', height: '100%' }}
                contentFit="cover"
              />
            </View>
            <View>
              <Text className="text-[11px] font-semibold text-text-muted">
                Route curated by
              </Text>
              <Text className="text-sm font-extrabold text-text-primary dark:text-text-primary-dark">
                {profile?.display_name || 'Mina Park'}
              </Text>
            </View>
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="View Walk History"
            onPress={() => router.push('/history')}
            className="flex-row items-center gap-1.5 rounded-pill border border-border bg-background px-3.5 py-2 active:opacity-80">
            <Text className="text-xs font-bold text-text-primary">📜 History</Text>
          </Pressable>
        </View>
      </View>
    </Screen>
  );
}
