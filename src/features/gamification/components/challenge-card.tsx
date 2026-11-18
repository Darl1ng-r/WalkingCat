import { View } from 'react-native';

import { Text } from '@/components/ui';
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

  // Styled after the reference image's "Запись к ветеринару / Прогулка с другими друзьями" pill-shaped plan cards
  return (
    <View
      className={`gap-2 rounded-[22px] border-[1.5px] border-[#191A26] ${
        isCompleted
          ? 'bg-[#FCE8D5]'
          : compact
            ? 'bg-[#FCE8D5]'
            : 'bg-white dark:bg-[#232536]'
      } ${compact ? 'px-4 py-3' : 'p-4'}`}>
      <View className="flex-row items-center justify-between gap-3">
        <View className="flex-1 flex-row items-center gap-2.5">
          <View className="h-8 w-8 items-center justify-center rounded-pill border border-[#191A26] bg-[#191A26]">
            <Text className="text-sm text-white">{challenge.icon}</Text>
          </View>
          <View className="flex-1">
            <Text
              variant="body"
              numberOfLines={1}
              className="text-sm font-extrabold text-[#191A26]">
              {challenge.title}
            </Text>
            {!compact ? (
              <Text
                variant="caption"
                className="mt-0.5 text-xs leading-4 text-[#191A26]/75">
                {challenge.description}
              </Text>
            ) : null}
          </View>
        </View>

        <View className="rounded-pill border border-[#191A26] bg-white px-2.5 py-0.5">
          <Text
            variant="caption"
            className="text-[11px] font-extrabold text-[#191A26]">
            {isCompleted ? `✓ +${challenge.rewardPoints}` : `+${challenge.rewardPoints} pts`}
          </Text>
        </View>
      </View>

      {/* Progress Bar */}
      <View className="gap-1">
        <View className="h-2 w-full overflow-hidden rounded-pill bg-[#191A26]/15">
          <View
            style={{ width: `${Math.max(8, percent)}%` }}
            className="h-full rounded-pill bg-[#191A26]"
          />
        </View>

        <View className="flex-row items-center justify-between">
          <Text variant="caption" className="text-[11px] font-bold text-[#191A26]">
            {progressText}
          </Text>
          <Text variant="caption" className="text-[11px] font-semibold text-[#191A26]/70">
            {isCompleted ? 'Completed 🎉' : timeRemaining}
          </Text>
        </View>
      </View>
    </View>
  );
}
