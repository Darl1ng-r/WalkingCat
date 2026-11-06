import { router } from 'expo-router';
import { Pressable, View } from 'react-native';

import { Text } from '@/components/ui';
import { formatNumber } from '@/lib/format';
import { usePointsSummary } from '../hooks';

export interface PointsChipProps {
  onPress?: () => void;
}

export function PointsChip({ onPress }: PointsChipProps) {
  const { data } = usePointsSummary();
  const total = data?.totalPoints ?? 0;
  const week = data?.weekPoints ?? 0;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${formatNumber(total)} total points, ${formatNumber(
        week
      )} points this week. Tap to view challenges and rewards.`}
      onPress={() => {
        if (onPress) {
          onPress();
        } else {
          router.push('/challenges');
        }
      }}
      className="flex-row items-center gap-2 rounded-pill border border-primary/30 bg-primary-muted px-3.5 py-1.5 active:opacity-80 dark:bg-surface-elevated-dark">
      <Text className="text-sm">⭐</Text>
      <View className="flex-row items-center gap-1.5">
        <Text
          variant="caption"
          className="font-bold text-primary-dark dark:text-primary-light">
          {formatNumber(total)} pts
        </Text>
        {week > 0 ? (
          <Text
            variant="caption"
            className="text-xs text-text-secondary dark:text-text-secondary-dark">
            · +{formatNumber(week)} this wk
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}
