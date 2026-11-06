import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import {
  Button,
  Card,
  ErrorState,
  Screen,
  StatTile,
  Text,
} from '@/components/ui';
import {
  ActivityBarChart,
  parseLocalDateKey,
  useActivityDashboard,
} from '@/features/walk';
import {
  formatDistance,
  formatDuration,
  formatNumber,
} from '@/lib/format';

function formatRangeLabel(fromDate: string, toDate: string): string {
  if (!fromDate || !toDate) return '';
  const start = parseLocalDateKey(fromDate);
  const end = parseLocalDateKey(toDate);

  const startStr = start.toLocaleDateString([], {
    month: 'short',
    day: 'numeric',
  });
  const endStr = end.toLocaleDateString([], {
    month: 'short',
    day: 'numeric',
  });

  return `${startStr} – ${endStr}`;
}

export default function ProgressScreen() {
  const [period, setPeriod] = useState<'week' | 'month'>('week');
  const { data: summary, isLoading, isError, refetch } = useActivityDashboard(period);

  return (
    <Screen scroll contentContainerClassName="gap-6 pb-10 pt-2">
      <View className="flex-row items-center justify-between">
        <View>
          <Text variant="label">Personal Progress</Text>
          <Text variant="title" className="mt-0.5">
            Activity Summary
          </Text>
        </View>
        <Button
          label="Done"
          size="sm"
          variant="ghost"
          onPress={() => router.back()}
        />
      </View>

      <View className="flex-row rounded-card border border-border bg-surface p-1 dark:border-border-dark dark:bg-surface-dark">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="This Week tab"
          onPress={() => setPeriod('week')}
          className={`flex-1 items-center rounded-lg py-2.5 ${
            period === 'week' ? 'bg-primary' : 'bg-transparent'
          }`}>
          <Text
            variant="body"
            className={`font-semibold ${
              period === 'week'
                ? 'text-white'
                : 'text-text-secondary dark:text-text-secondary-dark'
            }`}>
            This Week
          </Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Last 30 Days tab"
          onPress={() => setPeriod('month')}
          className={`flex-1 items-center rounded-lg py-2.5 ${
            period === 'month' ? 'bg-primary' : 'bg-transparent'
          }`}>
          <Text
            variant="body"
            className={`font-semibold ${
              period === 'month'
                ? 'text-white'
                : 'text-text-secondary dark:text-text-secondary-dark'
            }`}>
            Last 30 Days
          </Text>
        </Pressable>
      </View>

      {isError ? (
        <ErrorState
          message="Could not load your activity summary."
          onRetry={() => {
            refetch().catch(() => {});
          }}
        />
      ) : (
        <>
          <Card className="gap-2 border-primary/30">
            <View className="flex-row items-center justify-between">
              <Text variant="label">
                {period === 'week' ? 'This Week' : 'Last 30 Days'}
              </Text>
              {summary ? (
                <Text variant="caption" className="text-xs">
                  {formatRangeLabel(summary.fromDate, summary.toDate)}
                </Text>
              ) : null}
            </View>
            <Text variant="heading" className="mt-0.5">
              {summary?.encouragingTitle ??
                (isLoading ? 'Loading your activity…' : 'Your walking journey 🌿')}
            </Text>
            <Text variant="caption" className="leading-5">
              {summary?.encouragingSubtitle ??
                'Every stroll you take adds to your personal progress.'}
            </Text>
          </Card>

          <View className="gap-3">
            <Text variant="label">Totals</Text>
            <View className="flex-row gap-3">
              <StatTile
                label="Active Days"
                value={
                  summary
                    ? `${summary.activeDaysCount} of ${summary.totalDays}`
                    : '—'
                }
                unit="days"
              />
              <StatTile
                label="Walks"
                value={summary ? formatNumber(summary.totalWalks) : '—'}
              />
            </View>

            <View className="flex-row gap-3">
              <StatTile
                label="Total Distance"
                value={
                  summary ? formatDistance(summary.totalDistanceMeters) : '—'
                }
              />
              <StatTile
                label="Moving Time"
                value={
                  summary
                    ? formatDuration(summary.totalMovingTimeSeconds)
                    : '—'
                }
              />
            </View>

            <View className="flex-row gap-3">
              <StatTile
                label="Total Steps"
                value={
                  summary && summary.totalSteps > 0
                    ? formatNumber(summary.totalSteps)
                    : '—'
                }
                unit={
                  summary && summary.totalSteps > 0
                    ? 'steps'
                    : 'Connect Health for steps'
                }
              />
            </View>
          </View>

          {summary ? (
            <Card className="gap-3">
              <Text variant="heading">
                {period === 'week' ? 'Daily Breakdown (7 Days)' : '30-Day Trend'}
              </Text>
              <ActivityBarChart days={summary.days} height={150} />
            </Card>
          ) : null}

          <View className="flex-row gap-3">
            <Button
              label="Browse All Walks"
              variant="secondary"
              className="flex-1"
              onPress={() => router.push('/history')}
            />
            <Button
              label="Start a Walk"
              className="flex-1"
              onPress={() => router.push('/walk')}
            />
          </View>
        </>
      )}
    </Screen>
  );
}
