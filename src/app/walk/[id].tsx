import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, Platform, Pressable, View } from 'react-native';

import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  Screen,
  StatTile,
  Text,
} from '@/components/ui';
import { AppConfig } from '@/constants/config';
import { useSession } from '@/features/auth';
import { DEFAULT_WEIGHT_KG, healthProvider } from '@/features/health';
import { useWalkSightings, WalkSightingsList } from '@/features/sightings';
import {
  decodePolyline,
  RouteMap,
  trimRouteEnds,
  useDeleteWalkMutation,
  useRoutePrivacyTrim,
  useWalkDetail,
} from '@/features/walk';
import {
  formatDistance,
  formatDuration,
  formatNumber,
  formatPace,
} from '@/lib/format';

function formatFullLocalDateTime(isoString: string): string {
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return 'Recorded walk';

  const datePart = date.toLocaleDateString([], {
    weekday: 'long',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
  const timePart = date.toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
  });
  return `${datePart} · ${timePart}`;
}

export default function WalkDetailScreen() {
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const walkId = Array.isArray(params.id) ? params.id[0] ?? '' : params.id ?? '';

  const { profile } = useSession();
  const { data: walk, isLoading, isError, refetch } = useWalkDetail(walkId);
  const { data: walkSightings = [] } = useWalkSightings(walkId);
  const deleteMutation = useDeleteWalkMutation();
  const { hideRouteEnds, setHideRouteEnds } = useRoutePrivacyTrim();
  const [showCalorieFormula, setShowCalorieFormula] = useState(false);

  const decodedPoints = useMemo(
    () => (walk?.route_polyline ? decodePolyline(walk.route_polyline) : []),
    [walk]
  );

  const displayedPoints = useMemo(() => {
    if (!hideRouteEnds) {
      return decodedPoints;
    }
    return trimRouteEnds(decodedPoints, AppConfig.walk.defaultRouteTrimMeters);
  }, [decodedPoints, hideRouteEnds]);

  if (isLoading) {
    return (
      <Screen className="items-center justify-center">
        <Text variant="caption">Loading walk details…</Text>
      </Screen>
    );
  }

  if (isError) {
    return (
      <Screen className="justify-center">
        <ErrorState
          message="Could not load this walk."
          onRetry={() => {
            refetch().catch(() => {});
          }}
        />
      </Screen>
    );
  }

  if (!walk) {
    return (
      <Screen className="justify-center">
        <EmptyState
          emoji="🥾"
          title="Walk not found"
          message="This walk may have been deleted."
          actionLabel="Back to History"
          onAction={() => router.back()}
        />
      </Screen>
    );
  }

  const paceSecondsPerKm =
    walk.distance_m >= 20 && walk.moving_time_s > 0
      ? walk.moving_time_s / (walk.distance_m / 1000)
      : 0;

  const healthProviderName = healthProvider.displayName;
  const calorieSourceBadge =
    walk.kcal_source === 'health'
      ? `from ${healthProviderName}`
      : 'Estimate';

  const isFullyTrimmed =
    hideRouteEnds && decodedPoints.length >= 2 && displayedPoints.length === 0;

  const performDelete = async () => {
    try {
      await deleteMutation.mutateAsync(walk.id);
      router.back();
    } catch {
      // Handled by mutation state
    }
  };

  const handleConfirmDelete = () => {
    if (Platform.OS === 'web') {
      const ok =
        typeof window !== 'undefined' &&
        window.confirm('Delete this walk permanently? This cannot be undone.');
      if (ok) {
        performDelete().catch(() => {});
      }
      return;
    }

    Alert.alert(
      'Delete Walk?',
      'This walk and its route will be permanently removed from your history and weekly totals.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            performDelete().catch(() => {});
          },
        },
      ]
    );
  };

  return (
    <Screen scroll contentContainerClassName="gap-5 pb-10 pt-2">
      <View className="flex-row items-start justify-between gap-3">
        <View className="flex-1">
          <Text variant="label">Walk Detail</Text>
          <Text variant="title" className="mt-0.5">
            {formatDistance(walk.distance_m)}
          </Text>
          <Text variant="caption" className="mt-1">
            {formatFullLocalDateTime(walk.started_at)}
          </Text>
        </View>
        <Button
          label="Back"
          size="sm"
          variant="ghost"
          onPress={() => router.back()}
        />
      </View>

      {walk.isPendingUpload ? (
        <Card className="border-primary/40 py-3">
          <Text variant="label">⏳ Waiting to upload</Text>
          <Text variant="caption" className="mt-0.5 text-xs">
            This walk is stored safely on your device and will sync when you are online.
          </Text>
        </Card>
      ) : null}

      <View className="gap-2.5">
        <RouteMap coordinates={displayedPoints} fitToBounds height={260} />

        <Card className="gap-2 py-3">
          <View className="flex-row items-center justify-between gap-3">
            <View className="flex-1">
              <Text variant="label">
                🔒 Privacy Trim ({AppConfig.walk.defaultRouteTrimMeters} m)
              </Text>
              <Text variant="caption" className="mt-0.5 text-xs">
                {hideRouteEnds
                  ? `Hiding the first and last ${AppConfig.walk.defaultRouteTrimMeters} m of your route.`
                  : 'Showing complete start-to-finish route.'}
              </Text>
            </View>
            <Button
              label={hideRouteEnds ? 'Trim On' : 'Trim Off'}
              size="sm"
              variant={hideRouteEnds ? 'secondary' : 'ghost'}
              onPress={() => setHideRouteEnds(!hideRouteEnds)}
            />
          </View>

          {isFullyTrimmed ? (
            <Text variant="caption" className="text-xs text-primary-dark dark:text-primary-light">
              This route is shorter than {AppConfig.walk.defaultRouteTrimMeters * 2} m, so the entire
              line falls inside the privacy buffer. Tap &quot;Trim On&quot; to preview the full
              path.
            </Text>
          ) : null}
        </Card>
      </View>

      <View className="gap-3">
        <Text variant="label">Walk Stats</Text>
        <View className="flex-row gap-3">
          <StatTile label="Distance" value={formatDistance(walk.distance_m)} />
          <StatTile label="Duration" value={formatDuration(walk.duration_s)} />
        </View>

        <View className="flex-row gap-3">
          <StatTile
            label="Moving Time"
            value={formatDuration(walk.moving_time_s)}
          />
          <StatTile label="Avg Pace" value={formatPace(paceSecondsPerKm)} />
        </View>

        <View className="flex-row gap-3">
          <StatTile
            label="Steps"
            value={walk.steps !== null ? formatNumber(walk.steps) : '—'}
            unit={
              walk.steps !== null
                ? `from ${healthProviderName}`
                : 'Health not connected'
            }
          />
          <StatTile
            label={`Calories (${calorieSourceBadge})`}
            value={
              walk.active_kcal !== null ? formatNumber(walk.active_kcal) : '0'
            }
            unit="kcal"
          />
        </View>
      </View>

      {walk.kcal_source === 'estimate' ? (
        <Card className="gap-2">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="How are calories estimated?"
            onPress={() => setShowCalorieFormula((prev) => !prev)}
            className="flex-row items-center justify-between py-1">
            <Text variant="label">ℹ️ How is this calorie figure estimated?</Text>
            <Text variant="caption">{showCalorieFormula ? 'Hide' : 'Show'}</Text>
          </Pressable>
          {showCalorieFormula ? (
            <Text variant="caption" className="leading-5">
              Calculated using standard walking METs (2.8 slow, 3.5 moderate, 4.3 brisk) ×{' '}
              {profile?.weight_kg
                ? `your profile weight (${profile.weight_kg} kg)`
                : `a neutral default weight (${DEFAULT_WEIGHT_KG} kg — add your weight in Profile for a closer estimate)`}{' '}
              × moving time in hours. Calorie figures are approximate estimates and are not medical
              advice.
            </Text>
          ) : null}
        </Card>
      ) : null}

      <WalkSightingsList sightings={walkSightings} showEmptyPlaceholder />

      <View className="pt-2">
        <Button
          label="Delete Walk"
          variant="danger"
          loading={deleteMutation.isPending}
          onPress={handleConfirmDelete}
        />
      </View>
    </Screen>
  );
}
