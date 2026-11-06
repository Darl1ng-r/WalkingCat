import { View } from 'react-native';

import { Card, Text } from '@/components/ui';
import type { ChallengeInstanceItem } from '../api';
import {
  computeChallengeProgressRatio,
  formatChallengeProgressText,
  formatChallengeTimeRemaining,
} from '../rules';

export interface ChallengeCardProps {
  challenge: ChallengeInstanceItem;
  compact?: boolean;
}

export function ChallengeCard({
  challenge,
  compact = false,
}: ChallengeCardProps) {
  const ratio = computeChallengeProgressRatio(
    challenge.progress,
    challenge.target
  );
  const percent = Math.round(ratio * 100);
  const isCompleted = Boolean(challenge.completedAt) || ratio >= 1;
  const progressText = formatChallengeProgressText(
    challenge.metric,
    challenge.progress,
    challenge.target
  );
  const timeRemaining = formatChallengeTimeRemaining(challenge.periodEnd);

  return (
    <Card
      className={`gap-2.5 ${
        isCompleted
          ? 'border-secondary/60 bg-secondary/5 dark:border-secondary/40'
          : ''
      } ${compact ? 'p-3' : 'p-4'}`}>
      <View className="flex-row items-start justify-between gap-3">
        <View className="flex-1 flex-row items-center gap-2.5">
          <View className="h-10 w-10 items-center justify-center rounded-pill bg-primary-muted dark:bg-surface-elevated-dark">
            <Text className="text-xl">{challenge.icon}</Text>
          </View>
          <View className="flex-1">
            <Text variant="body" className="font-bold">
              {challenge.title}
            </Text>
            {!compact ? (
              <Text variant="caption" className="mt-0.5 text-xs leading-4">
                {challenge.description}
              </Text>
            ) : null}
          </View>
        </View>

        <View
          className={`rounded-pill px-2.5 py-1 ${
            isCompleted ? 'bg-secondary/20' : 'bg-primary/15'
          }`}>
          <Text
            variant="caption"
            className="text-xs font-bold text-text-primary dark:text-text-primary-dark">
            {isCompleted ? `✓ +${challenge.rewardPoints} pts` : `+${challenge.rewardPoints} pts`}
          </Text>
        </View>
      </View>

      {/* Progress Bar */}
      <View className="gap-1.5">
        <View className="h-2.5 w-full overflow-hidden rounded-pill bg-border dark:bg-border-dark">
          <View
            style={{ width: `${percent}%` }}
            className={`h-full rounded-pill ${
              isCompleted ? 'bg-secondary' : 'bg-primary'
            }`}
          />
        </View>

        <View className="flex-row items-center justify-between">
          <Text variant="caption" className="text-xs font-semibold">
            {progressText}
          </Text>
          <Text variant="caption" className="text-xs">
            {isCompleted ? 'Completed 🎉' : timeRemaining}
          </Text>
        </View>
      </View>
    </Card>
  );
}
