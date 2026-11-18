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
        <Text variant="caption" className="text-xs font-bold text-[#191A26] dark:text-[#FAF8F5]">
          {metric === 'distance' ? 'Daily distance' : 'Daily steps'}
        </Text>

        <View className="flex-row rounded-pill border-[1.5px] border-[#191A26] bg-white p-0.5">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Show distance chart"
            onPress={() => setMetric('distance')}
            className={`rounded-pill px-3 py-1 ${
              metric === 'distance' ? 'bg-[#191A26]' : 'bg-transparent'
            }`}>
            <Text
              variant="caption"
              className={`text-xs font-extrabold ${
                metric === 'distance' ? 'text-white' : 'text-[#191A26]'
              }`}>
              Distance
            </Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Show steps chart"
            onPress={() => setMetric('steps')}
            className={`rounded-pill px-3 py-1 ${
              metric === 'steps' ? 'bg-[#191A26]' : 'bg-transparent'
            }`}>
            <Text
              variant="caption"
              className={`text-xs font-extrabold ${
                metric === 'steps' ? 'text-white' : 'text-[#191A26]'
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
          const barHeight = val > 0 ? Math.max(12, Math.round(ratio * (height - 44))) : 6;
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
                  className="text-[10px] font-bold text-[#191A26] dark:text-[#FAF8F5]">
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
                className={`w-full rounded-pill border border-[#191A26] ${
                  isCompact ? 'max-w-[8px]' : 'max-w-[22px]'
                } ${
                  val > 0
                    ? day.isToday
                      ? 'bg-[#F4A97B]'
                      : 'bg-[#191A26]'
                    : 'bg-[#FCE8D5]'
                }`}
              />

              <Text
                variant="caption"
                numberOfLines={1}
                className={`text-[10px] ${
                  day.isToday
                    ? 'font-extrabold text-[#F4A97B]'
                    : 'font-semibold text-[#6E7085]'
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
