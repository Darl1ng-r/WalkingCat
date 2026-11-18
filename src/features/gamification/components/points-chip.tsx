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
      className="flex-row items-center gap-1.5 rounded-pill border-[1.5px] border-[#191A26] bg-[#FCE8D5] px-3 py-1 active:opacity-80">
      <View className="h-5 w-5 items-center justify-center rounded-pill bg-[#F4A97B]">
        <Text className="text-[10px]">🐾</Text>
      </View>
      <View className="flex-row items-center gap-1">
        <Text
          variant="caption"
          className="text-xs font-extrabold text-[#191A26]">
          {formatNumber(total)} pts
        </Text>
        {week > 0 ? (
          <Text
            variant="caption"
            className="text-[10px] font-bold text-[#191A26]/70">
            · +{formatNumber(week)}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}
