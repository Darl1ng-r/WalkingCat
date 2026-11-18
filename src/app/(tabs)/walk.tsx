import { useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Alert, AppState, Platform, Pressable, View } from 'react-native';

import { AppIcon, Button, Card, Screen, StatTile, Text } from '@/components/ui';
import { AppConfig } from '@/constants/config';
import { useSession } from '@/features/auth';
import {
  GAMIFICATION_QUERY_KEYS,
  WalkRewardsCard,
} from '@/features/gamification';
import {
  SIGHTINGS_QUERY_KEYS,
  type SightingSummaryItem,
  useWalkSightings,
  WalkSightingsList,
} from '@/features/sightings';
import {
  checkCurrentLocationPermission,
  computeDurations,
  type GeoPoint,
  openDeviceLocationSettings,
  requestWalkLocationPermissions,
  RouteMap,
  type RouteSightingMarker,
  useWalkStore,
  WALK_QUERY_KEYS,
} from '@/features/walk';
import {
  getDistanceBucket,
  getStepsBucket,
  track,
} from '@/lib/analytics';
import { DEMO_WALK_ROUTE } from '@/lib/demo-data';
import { formatDistance, formatDuration, formatNumber, formatPace } from '@/lib/format';

function mapSightingsToRouteMarkers(
  sightings: SightingSummaryItem[],
  routePoints: GeoPoint[]
): RouteSightingMarker[] {
  if (sightings.length === 0 || routePoints.length === 0) {
    return [];
  }

  return sightings.map((sighting, index) => {
    const targetMs = new Date(sighting.taken_at).getTime();
    let bestPoint = routePoints[routePoints.length - 1];
    if (!Number.isNaN(targetMs)) {
      let bestDiff = Infinity;
      for (const pt of routePoints) {
        const diff = Math.abs(pt.timestamp - targetMs);
        if (diff < bestDiff) {
          bestDiff = diff;
          bestPoint = pt;
        }
      }
    }
    return {
      id: sighting.id,
      latitude: bestPoint.latitude,
      longitude: bestPoint.longitude,
      label: `Cat #${index + 1}`,
    };
  });
}

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

  const sightingMarkers = useMemo<RouteSightingMarker[]>(() => {
    if (status === 'idle' && routePoints.length === 0) {
      return [
        {
          id: 'demo-cat-1',
          latitude: DEMO_WALK_ROUTE[4].latitude,
          longitude: DEMO_WALK_ROUTE[4].longitude,
          label: 'Marmalade',
        },
      ];
    }
    return mapSightingsToRouteMarkers(walkSightings, routePoints);
  }, [status, walkSightings, routePoints]);

  const [nowMs, setNowMs] = useState(() => Date.now());
  const [showPermissionExplainer, setShowPermissionExplainer] = useState(false);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [keepAwakeEnabled, setKeepAwakeEnabled] = useState(true);
  const [mapStyle, setMapStyle] = useState<'street' | 'satellite'>('street');

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
          <View className="flex-row items-center gap-1.5">
            <AppIcon name="check" size={14} color="#191A26" />
            <Text variant="label">Walk Completed</Text>
          </View>
          <Text variant="title" className="mt-1">
            Great walk!
          </Text>
          <Text variant="caption" className="mt-1">
            {summary.syncStatus === 'synced'
              ? 'Saved to your private history'
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
      <Screen padded={false} contentContainerClassName="flex-1">
        {/* Compact Midnight-Ink Top Bar */}
        <View className="flex-row items-center justify-between bg-[#191A26] px-5 py-3">
          <View className="flex-row items-center gap-2.5">
            <View
              className={`h-2.5 w-2.5 rounded-full ${
                status === 'paused' ? 'bg-amber-400' : 'bg-[#F4A97B]'
              }`}
            />
            <Text className="text-base font-extrabold text-white">
              {status === 'paused' ? 'Walk Paused' : 'Live Walk'}
            </Text>
          </View>

          <View className="flex-row items-center gap-2">
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Switch map to ${mapStyle === 'street' ? 'Satellite' : 'Street'} view`}
              onPress={() =>
                setMapStyle((prev) => (prev === 'street' ? 'satellite' : 'street'))
              }
              className="min-h-[36px] flex-row items-center gap-1.5 rounded-pill border border-white/20 bg-white/10 px-3">
              <AppIcon name="pin" size={14} color="#F4A97B" />
              <Text className="text-xs font-bold text-white">
                {mapStyle === 'street' ? 'Street' : 'Satellite'}
              </Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Toggle screen awake"
              onPress={() => setKeepAwakeEnabled((prev) => !prev)}
              className="min-h-[36px] items-center justify-center rounded-pill border border-white/20 bg-white/10 px-3">
              <Text className="text-xs font-bold text-[#F4A97B]">
                {keepAwakeEnabled ? 'Awake' : 'Sleep'}
              </Text>
            </Pressable>
          </View>
        </View>

        {/* Full-Screen Live GPS Map */}
        <View className="relative flex-1">
          <RouteMap
            coordinates={routePoints}
            sightingMarkers={sightingMarkers}
            showUserLocation
            borderless
            fill
            mapStyle={mapStyle}
          />

          {isWeakGps ? (
            <View className="absolute left-4 right-4 top-3 z-20">
              <View className="flex-row items-center gap-2 rounded-pill border border-[#191A26] bg-white/95 px-4 py-2 shadow-sm">
                <AppIcon name="signal" size={14} color="#191A26" />
                <Text variant="caption" className="font-bold text-[#191A26]">
                  Weak GPS signal — waiting for a clear sky fix…
                </Text>
              </View>
            </View>
          ) : null}

          {/* Strava-Inspired Floating Bottom Controls */}
          <View className="absolute bottom-0 left-0 right-0 z-30 gap-3 px-4 pb-24">
            {/* Compact Live Telemetry Strip */}
            <View className="flex-row items-center justify-between rounded-[22px] border-[1.5px] border-[#191A26] bg-[#191A26]/95 px-4 py-3 shadow-lg">
              <View className="items-center">
                <Text className="text-[10px] font-bold uppercase tracking-wider text-white/65">
                  Distance
                </Text>
                <Text className="text-sm font-extrabold text-white">
                  {formatDistance(distanceMeters)}
                </Text>
              </View>
              <View className="h-6 w-[1px] bg-white/15" />
              <View className="items-center">
                <Text className="text-[10px] font-bold uppercase tracking-wider text-white/65">
                  Time
                </Text>
                <Text className="text-sm font-extrabold text-[#F4A97B]">
                  {formatDuration(movingTimeSeconds)}
                </Text>
              </View>
              <View className="h-6 w-[1px] bg-white/15" />
              <View className="items-center">
                <Text className="text-[10px] font-bold uppercase tracking-wider text-white/65">
                  Pace
                </Text>
                <Text className="text-sm font-extrabold text-white">
                  {formatPace(paceSecondsPerKm)}
                </Text>
              </View>
              <View className="h-6 w-[1px] bg-white/15" />
              <View className="items-center">
                <Text className="text-[10px] font-bold uppercase tracking-wider text-white/65">
                  Cats
                </Text>
                <Text className="text-sm font-extrabold text-[#F4A97B]">
                  {walkSightings.length}
                </Text>
              </View>
            </View>

            {/* Stop / Pause-Resume / Marker Row */}
            <View className="flex-row items-center justify-around rounded-[28px] border-[1.5px] border-[#191A26] bg-white/95 px-4 py-3 shadow-lg">
              {/* Stop Button */}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Stop and Finish Walk"
                disabled={status === 'finishing'}
                onPress={handleFinishPress}
                className="items-center gap-1">
                <View className="h-12 w-12 items-center justify-center rounded-full border-[1.5px] border-[#191A26] bg-white">
                  <View className="h-3.5 w-3.5 rounded-[3px] bg-[#191A26]" />
                </View>
                <Text className="text-[11px] font-extrabold text-[#191A26]">
                  {status === 'finishing' ? 'Saving…' : 'Stop'}
                </Text>
              </Pressable>

              {/* Center Pause / Resume Button */}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={status === 'active' ? 'Pause Walk' : 'Resume Walk'}
                onPress={status === 'active' ? pauseWalk : resumeWalk}
                className="items-center gap-1">
                <View className="h-16 w-16 items-center justify-center rounded-full border-2 border-[#191A26] bg-[#F4A97B] shadow-md">
                  {status === 'active' ? (
                    <View className="flex-row gap-1.5">
                      <View className="h-5 w-1.5 rounded-full bg-[#191A26]" />
                      <View className="h-5 w-1.5 rounded-full bg-[#191A26]" />
                    </View>
                  ) : (
                    <View
                      style={{
                        width: 0,
                        height: 0,
                        marginLeft: 3,
                        borderTopWidth: 9,
                        borderBottomWidth: 9,
                        borderLeftWidth: 15,
                        borderTopColor: 'transparent',
                        borderBottomColor: 'transparent',
                        borderLeftColor: '#191A26',
                      }}
                    />
                  )}
                </View>
                <Text className="text-[11px] font-extrabold text-[#191A26]">
                  {status === 'active' ? 'Pause' : 'Resume'}
                </Text>
              </Pressable>

              {/* Cat Sighting Marker Button */}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Drop Cat Sighting Marker"
                onPress={() =>
                  router.push({
                    pathname: '/sighting/capture',
                    params: walkId ? { walkId } : {},
                  })
                }
                className="items-center gap-1">
                <View className="relative h-12 w-12 items-center justify-center rounded-full border-[1.5px] border-[#191A26] bg-white">
                  <AppIcon name="pin" size={20} color="#191A26" />
                  {walkSightings.length > 0 ? (
                    <View className="absolute -right-1 -top-1 h-5 min-w-[20px] items-center justify-center rounded-full border border-[#191A26] bg-[#F4A97B] px-1">
                      <Text className="text-[10px] font-extrabold text-[#191A26]">
                        {walkSightings.length}
                      </Text>
                    </View>
                  ) : null}
                </View>
                <Text className="text-[11px] font-extrabold text-[#191A26]">
                  Marker
                </Text>
              </Pressable>
            </View>

            {status === 'paused' ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Discard Walk"
                onPress={handleDiscardPress}
                className="self-center rounded-pill bg-white/90 px-4 py-1.5">
                <Text className="text-xs font-bold text-danger">Discard Walk</Text>
              </Pressable>
            ) : null}
          </View>
        </View>
      </Screen>
    );
  }

  // 3. Idle Screen — Full-Screen Map + Clean Start & Marker Controls
  return (
    <Screen padded={false} contentContainerClassName="flex-1">
      {/* Compact Midnight-Ink Top Header (No back arrow, no 3-dots) */}
      <View className="flex-row items-center justify-between bg-[#191A26] px-5 py-3">
        <Text className="text-base font-extrabold tracking-wide text-white">
          Walk & Map
        </Text>

        <View className="flex-row items-center gap-2">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="View Walk History"
            onPress={() => router.push('/history')}
            className="min-h-[36px] flex-row items-center gap-1 rounded-pill border border-white/20 bg-white/10 px-3">
            <AppIcon name="clock" size={13} color="#FFFFFF" />
            <Text className="text-xs font-bold text-white">History</Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Switch map to ${mapStyle === 'street' ? 'Satellite' : 'Street'} view`}
            onPress={() =>
              setMapStyle((prev) => (prev === 'street' ? 'satellite' : 'street'))
            }
            className="min-h-[36px] flex-row items-center gap-1.5 rounded-pill border border-white/20 bg-white/10 px-3">
            <AppIcon name="pin" size={13} color="#F4A97B" />
            <Text className="text-xs font-bold text-white">
              {mapStyle === 'street' ? 'Street' : 'Satellite'}
            </Text>
          </Pressable>
        </View>
      </View>

      {/* Full-Screen Google Map */}
      <View className="relative flex-1">
        <RouteMap
          coordinates={routePoints}
          sightingMarkers={sightingMarkers}
          showDemoRouteWhenEmpty
          showUserLocation
          borderless
          fill
          mapStyle={mapStyle}
        />

        {/* Floating Bottom Controls Above Dock */}
        <View className="absolute bottom-0 left-0 right-0 z-30 gap-3 px-4 pb-24">
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
              <View className="flex-row items-center gap-2">
                <AppIcon name="pin" size={18} color="#191A26" />
                <Text variant="heading">How we use your location</Text>
              </View>
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

              {/* Clean Start + Marker Floating Row */}
              <View className="flex-row items-center gap-3">
                <Button
                  label={status === 'requestingPermission' ? 'Starting…' : 'Start Walk'}
                  variant="primary"
                  size="lg"
                  className="flex-1 shadow-lg"
                  loading={status === 'requestingPermission'}
                  onPress={handleStartWalkPress}
                />

                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Log Cat Sighting Marker"
                  onPress={() => router.push('/sighting/capture')}
                  className="h-14 w-14 items-center justify-center rounded-full border-[1.5px] border-[#191A26] bg-white shadow-lg">
                  <AppIcon name="pin" size={20} color="#191A26" />
                </Pressable>
              </View>
            </>
          )}
        </View>
      </View>
    </Screen>
  );
}
