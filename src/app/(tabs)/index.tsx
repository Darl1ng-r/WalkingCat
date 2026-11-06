import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { Button, Card, EmptyState, Screen, StatTile, Text } from '@/components/ui';
import { useTodayHealthSummary } from '@/features/health';
import { ActivityBarChart, useActivityDashboard } from '@/features/walk';
import { formatDistance, formatNumber } from '@/lib/format';

export default function HomeScreen() {
  const { data, isLoading, requestConnect, openHealthSettings } = useTodayHealthSummary();
  const { data: weekSummary } = useActivityDashboard('week');
  const [connecting, setConnecting] = useState(false);

  const permState = data?.permissionState ?? 'not_connected';
  const providerName = data?.providerDisplayName ?? 'Health App';
  const stepsToday = data?.stepsToday ?? null;
  const walksToday = data?.walksTodayCount ?? 0;
  const distanceToday = data?.distanceTodayMeters ?? 0;

  const handleConnectPress = async () => {
    setConnecting(true);
    try {
      await requestConnect();
    } finally {
      setConnecting(false);
    }
  };

  return (
    <Screen scroll contentContainerClassName="gap-6 pb-10">
      <View className="mt-2">
        <Text variant="label">Today</Text>
        <Text variant="title" className="mt-1">
          StrayCat Walk
        </Text>
        <Text variant="caption" className="mt-1">
          Walk a little farther. Discover a little more.
        </Text>
      </View>

      <View className="gap-3">
        <Text variant="label">Today&apos;s Activity</Text>
        <View className="flex-row gap-3">
          <StatTile
            label="Steps Today"
            value={stepsToday !== null ? formatNumber(stepsToday) : '—'}
            unit={
              permState === 'connected'
                ? `from ${providerName}`
                : 'Connect Health'
            }
          />
          <StatTile label="Walks Today" value={formatNumber(walksToday)} />
        </View>

        <View className="flex-row gap-3">
          <StatTile label="Distance Today" value={formatDistance(distanceToday)} />
          {data?.activeKcalToday ? (
            <StatTile
              label={`Active Calories (from ${providerName})`}
              value={formatNumber(data.activeKcalToday)}
              unit="kcal"
            />
          ) : null}
        </View>
      </View>

      {!isLoading && permState !== 'connected' ? (
        <Card className="gap-3 border-primary/40">
          <Text variant="heading">❤️ Connect {providerName}</Text>
          {permState === 'install_required' ? (
            <>
              <Text variant="caption" className="leading-5">
                Install or update Google Health Connect to display your daily steps and active
                calories burned. We only read Steps and Active Calories and never write to your
                health records.
              </Text>
              <Button
                label="Install Health Connect"
                variant="secondary"
                onPress={openHealthSettings}
              />
            </>
          ) : permState === 'denied' ? (
            <>
              <Text variant="caption" className="leading-5">
                Health access was not granted. You can still record walks normally, or enable read
                access for Steps and Active Calories in {providerName} settings anytime.
              </Text>
              <Button
                label={`Open ${providerName} Settings`}
                variant="secondary"
                onPress={openHealthSettings}
              />
            </>
          ) : permState === 'unavailable' ? (
            <Text variant="caption" className="leading-5">
              {providerName} is not available in this runtime (requires a native iOS/Android
              development build). Walk distance, pace, and estimated calories still work normally!
            </Text>
          ) : (
            <>
              <Text variant="caption" className="leading-5">
                Connect {providerName} to see your daily step count and walk steps. We only read
                Steps and Active Calories—we never write data or share health metrics.
              </Text>
              <Button
                label={`Connect ${providerName}`}
                loading={connecting}
                onPress={handleConnectPress}
              />
            </>
          )}
        </Card>
      ) : null}

      {permState === 'connected' && stepsToday === 0 ? (
        <Card className="gap-1.5">
          <Text variant="label">0 steps reported so far</Text>
          <Text variant="caption" className="text-xs leading-5">
            If you have walked today and still see 0 steps, check that step read access is enabled
            for StrayCat Walk in {providerName}.
          </Text>
          <Button
            label={`Manage in ${providerName}`}
            size="sm"
            variant="ghost"
            onPress={openHealthSettings}
          />
        </Card>
      ) : null}

      <Card className="gap-4">
        <View className="flex-row items-start justify-between gap-2">
          <View className="flex-1">
            <Text variant="label">This Week</Text>
            <Text variant="heading" className="mt-1">
              {weekSummary?.encouragingTitle ?? 'A fresh week for a stroll 🌿'}
            </Text>
            <Text variant="caption" className="mt-0.5 text-xs leading-5">
              {weekSummary?.encouragingSubtitle ??
                'Whenever you step outside for a walk, your personal progress will show up here.'}
            </Text>
          </View>
          <Button
            label="Progress"
            size="sm"
            variant="ghost"
            onPress={() => router.push('/history/progress')}
          />
        </View>

        <View className="flex-row gap-2.5">
          <StatTile
            label="Active Days"
            value={
              weekSummary
                ? `${weekSummary.activeDaysCount} of ${weekSummary.totalDays}`
                : '0 of 7'
            }
            unit="days"
          />
          <StatTile
            label="Walks"
            value={weekSummary ? formatNumber(weekSummary.totalWalks) : '0'}
          />
        </View>

        <View className="flex-row gap-2.5">
          <StatTile
            label="Distance"
            value={
              weekSummary
                ? formatDistance(weekSummary.totalDistanceMeters)
                : '0 m'
            }
          />
          <StatTile
            label="Steps"
            value={
              weekSummary && weekSummary.totalSteps > 0
                ? formatNumber(weekSummary.totalSteps)
                : '—'
            }
          />
        </View>

        {weekSummary ? (
          <ActivityBarChart days={weekSummary.days} height={124} />
        ) : null}

        <View className="flex-row gap-3 pt-1">
          <Button
            label="Walk History"
            size="sm"
            variant="secondary"
            className="flex-1"
            onPress={() => router.push('/history')}
          />
          <Button
            label="Week / Month View"
            size="sm"
            variant="ghost"
            className="flex-1"
            onPress={() => router.push('/history/progress')}
          />
        </View>
      </Card>

      <EmptyState
        emoji="🐾"
        title="Ready for a walk?"
        message="Start a walk to record your route, distance, steps, and spot neighborhood cats along the way."
        actionLabel="Go to Walk"
        onAction={() => router.push('/walk')}
      />
    </Screen>
  );
}
