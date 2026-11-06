import * as Haptics from 'expo-haptics';
import { useEffect } from 'react';
import { Platform, View } from 'react-native';
import Animated, {
  FadeInDown,
  useReducedMotion,
} from 'react-native-reanimated';

import { Card, Text } from '@/components/ui';
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
        <Text variant="label">⭐ Walk Points</Text>
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
      <Card className="gap-3 border-primary/50 bg-primary-muted/30 dark:bg-surface-elevated-dark">
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center gap-2">
            <Text className="text-2xl">⭐</Text>
            <View>
              <Text variant="label">Rewards Earned</Text>
              <Text variant="heading">
                +{rewards.totalPointsEarned} points
              </Text>
            </View>
          </View>

          {rewards.isEstimatePreview ? (
            <View className="rounded-pill bg-primary/15 px-2.5 py-1">
              <Text variant="caption" className="text-[11px] font-semibold">
                Syncing
              </Text>
            </View>
          ) : (
            <View className="rounded-pill bg-secondary/20 px-2.5 py-1">
              <Text variant="caption" className="text-[11px] font-semibold">
                Awarded
              </Text>
            </View>
          )}
        </View>

        <View className="gap-1.5 border-t border-border pt-2.5 dark:border-border-dark">
          {rewards.lines.map((line) => (
            <View
              key={line.id}
              className="flex-row items-center justify-between">
              <Text variant="caption" className="text-xs font-medium">
                {line.sourceType === 'achievement'
                  ? `🏅 ${line.reason}`
                  : line.sourceType === 'challenge'
                    ? `🎯 ${line.reason}`
                    : `✓ ${line.reason}`}
              </Text>
              <Text
                variant="caption"
                className="text-xs font-bold text-primary-dark dark:text-primary-light">
                +{line.amount} pts
              </Text>
            </View>
          ))}
        </View>
      </Card>
    </Animated.View>
  );
}
