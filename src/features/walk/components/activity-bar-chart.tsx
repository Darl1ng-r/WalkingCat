import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { Text } from '@/components/ui';
import { formatDistance, formatNumber } from '@/lib/format';
import type { DailyActivityPoint } from '../dashboard';

export type ChartMetric = 'distance' | 'steps';

export interface ActivityBarChartProps {
  days: readonly DailyActivityPoint[];
  defaultMetric?: ChartMetric;
  height?: number;
}

export function ActivityBarChart({
  days,
  defaultMetric = 'distance',
  height = 132,
}: ActivityBarChartProps) {
  const [metric, setMetric] = useState<ChartMetric>(defaultMetric);

  const values = days.map((d) =>
    metric === 'distance' ? d.distanceMeters : d.steps
  );
  const maxValue = Math.max(...values, metric === 'distance' ? 500 : 1000);
  const isCompact = days.length > 10;

  return (
    <View className="gap-3">
      <View className="flex-row items-center justify-between">
        <Text variant="caption" className="text-xs">
          {metric === 'distance' ? 'Daily distance' : 'Daily steps'}
        </Text>

        <View className="flex-row rounded-pill bg-background p-0.5 dark:bg-background-dark">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Show distance chart"
            onPress={() => setMetric('distance')}
            className={`rounded-pill px-3 py-1 ${
              metric === 'distance'
                ? 'bg-primary'
                : 'bg-transparent'
            }`}>
            <Text
              variant="caption"
              className={`text-xs font-semibold ${
                metric === 'distance'
                  ? 'text-white'
                  : 'text-text-secondary dark:text-text-secondary-dark'
              }`}>
              Distance
            </Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Show steps chart"
            onPress={() => setMetric('steps')}
            className={`rounded-pill px-3 py-1 ${
              metric === 'steps'
                ? 'bg-primary'
                : 'bg-transparent'
            }`}>
            <Text
              variant="caption"
              className={`text-xs font-semibold ${
                metric === 'steps'
                  ? 'text-white'
                  : 'text-text-secondary dark:text-text-secondary-dark'
              }`}>
              Steps
            </Text>
          </Pressable>
        </View>
      </View>

      <View
        style={{ height }}
        className="flex-row items-end justify-between gap-1 pt-4">
        {days.map((day, idx) => {
          const val = metric === 'distance' ? day.distanceMeters : day.steps;
          const ratio = maxValue > 0 ? Math.min(1, val / maxValue) : 0;
          const barHeight = val > 0 ? Math.max(12, Math.round(ratio * (height - 44))) : 5;
          const showLabel =
            !isCompact || idx === 0 || idx === days.length - 1 || idx % 5 === 0;

          const valueSummary =
            metric === 'distance'
              ? formatDistance(day.distanceMeters)
              : `${formatNumber(day.steps)} steps`;

          return (
            <View
              key={day.date}
              accessibilityLabel={`${day.date}: ${valueSummary}`}
              className="flex-1 items-center justify-end gap-1">
              {!isCompact && val > 0 ? (
                <Text
                  variant="caption"
                  numberOfLines={1}
                  className="text-[10px] font-medium">
                  {metric === 'distance'
                    ? day.distanceMeters >= 1000
                      ? `${(day.distanceMeters / 1000).toFixed(1)}k`
                      : `${day.distanceMeters}m`
                    : day.steps >= 1000
                      ? `${(day.steps / 1000).toFixed(1)}k`
                      : String(day.steps)}
                </Text>
              ) : null}

              <View
                style={{ height: barHeight }}
                className={`w-full rounded-t-md ${
                  isCompact ? 'max-w-[8px]' : 'max-w-[24px]'
                } ${
                  val > 0
                    ? day.isToday
                      ? 'bg-primary-dark dark:bg-primary-light'
                      : 'bg-primary'
                    : 'bg-border dark:bg-border-dark'
                }`}
              />

              <Text
                variant="caption"
                numberOfLines={1}
                className={`text-[10px] ${
                  day.isToday
                    ? 'font-bold text-primary-dark dark:text-primary-light'
                    : ''
                }`}>
                {showLabel ? day.shortLabel : ''}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}
