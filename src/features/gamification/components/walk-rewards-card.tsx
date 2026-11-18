import * as Haptics from 'expo-haptics';
import { useEffect } from 'react';
import { Platform, View } from 'react-native';
import Animated, {
  FadeInDown,
  useReducedMotion,
} from 'react-native-reanimated';

import { AppIcon, Card, Text } from '@/components/ui';
import { useWalkRewards } from '../hooks';

export interface WalkRewardsCardProps {
  walkId: string;
  distanceMeters: number;
  movingTimeSeconds: number;
}

export function WalkRewardsCard({
  walkId,
  distanceMeters,
  movingTimeSeconds,
}: WalkRewardsCardProps) {
  const reducedMotion = useReducedMotion();
  const { data: rewards } = useWalkRewards(walkId, {
    distanceMeters,
    movingTimeSeconds,
  });

  useEffect(() => {
    if (
      Platform.OS !== 'web' &&
      rewards &&
      rewards.totalPointsEarned > 0
    ) {
      Haptics.notificationAsync(
        Haptics.NotificationFeedbackType.Success
      ).catch(() => {});
    }
  }, [rewards]);

  if (!rewards) {
    return null;
  }

  if (rewards.totalPointsEarned === 0) {
    return (
      <Card className="gap-1.5 border-border dark:border-border-dark">
        <View className="flex-row items-center gap-1.5">
          <AppIcon name="sparkles" size={14} color="#191A26" />
          <Text variant="label">Walk Points</Text>
        </View>
        <Text variant="caption" className="text-xs leading-5">
          {rewards.reasonNotRewarded === 'daily_cap_reached'
            ? "You've already earned points on 3 walks today! This walk is still saved to your history and counts toward your distance and challenges."
            : 'Walks of at least 0.5 km and 10 minutes of moving time earn +20 base points (+5 pts per full km). Every walk still counts toward your personal history!'}
        </Text>
      </Card>
    );
  }

  return (
    <Animated.View
      entering={
        reducedMotion
          ? undefined
          : FadeInDown.duration(300).springify().damping(18)
      }>
      <Card elevated className="gap-3">
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center gap-2.5">
            <View className="h-10 w-10 items-center justify-center rounded-pill border-[1.5px] border-[#191A26] bg-[#191A26]">
              <AppIcon name="sparkles" size={18} color="#F4A97B" />
            </View>
            <View>
              <Text variant="label">Rewards Earned</Text>
              <Text variant="heading">
                +{rewards.totalPointsEarned} points
              </Text>
            </View>
          </View>

          {rewards.isEstimatePreview ? (
            <View className="rounded-pill border border-[#191A26] bg-white px-2.5 py-1">
              <Text variant="caption" className="text-[11px] font-bold text-[#191A26]">
                Syncing
              </Text>
            </View>
          ) : (
            <View className="rounded-pill border border-[#191A26] bg-[#191A26] px-2.5 py-1">
              <Text variant="caption" className="text-[11px] font-bold text-white">
                Awarded
              </Text>
            </View>
          )}
        </View>

        <View className="gap-1.5 border-t border-[#191A26]/15 pt-2.5">
          {rewards.lines.map((line) => (
            <View
              key={line.id}
              className="flex-row items-center justify-between">
              <View className="flex-row items-center gap-1.5">
                <AppIcon
                  name={
                    line.sourceType === 'achievement'
                      ? 'award'
                      : line.sourceType === 'challenge'
                        ? 'target'
                        : 'check'
                  }
                  size={13}
                  color="#191A26"
                />
                <Text variant="caption" className="text-xs font-medium text-[#191A26]">
                  {line.reason}
                </Text>
              </View>
              <Text
                variant="caption"
                className="font-display text-xs font-bold text-[#191A26]">
                +{line.amount} pts
              </Text>
            </View>
          ))}
        </View>
      </Card>
    </Animated.View>
  );
}
