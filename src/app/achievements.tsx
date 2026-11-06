import { router } from 'expo-router';
import { View } from 'react-native';

import {
  Button,
  Card,
  ErrorState,
  Screen,
  StatTile,
  Text,
} from '@/components/ui';
import {
  formatAchievementGoalLabel,
  useAchievements,
  usePointsSummary,
} from '@/features/gamification';
import { formatNumber } from '@/lib/format';

function formatUnlockedDate(isoString: string | null): string {
  if (!isoString) return '';
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return 'Unlocked';
  return `Unlocked ${date.toLocaleDateString([], {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })}`;
}

export default function AchievementsScreen() {
  const {
    data: achievements = [],
    isLoading,
    isError,
    refetch,
  } = useAchievements();
  const { data: points } = usePointsSummary();

  const unlockedCount = achievements.filter((a) => a.unlocked).length;

  if (isLoading) {
    return (
      <Screen className="items-center justify-center">
        <Text variant="caption">Loading achievements…</Text>
      </Screen>
    );
  }

  if (isError) {
    return (
      <Screen className="justify-center">
        <ErrorState
          message="Could not load achievements."
          onRetry={() => {
            refetch().catch(() => {});
          }}
        />
      </Screen>
    );
  }

  return (
    <Screen scroll contentContainerClassName="gap-5 pb-12 pt-2">
      <View className="flex-row items-start justify-between gap-3">
        <View className="flex-1">
          <Text variant="label">Milestones</Text>
          <Text variant="title" className="mt-0.5">
            Achievements
          </Text>
          <Text variant="caption" className="mt-1 leading-5">
            Celebrate personal walking and cat-spotting milestones at your own pace—no rush, no
            expiring streaks.
          </Text>
        </View>
        <Button
          label="Back"
          size="sm"
          variant="ghost"
          onPress={() => router.back()}
        />
      </View>

      <View className="flex-row gap-3">
        <StatTile
          label="Unlocked"
          value={`${unlockedCount} / ${achievements.length}`}
          unit="badges"
        />
        <StatTile
          label="Total Points"
          value={formatNumber(points?.totalPoints ?? 0)}
          unit="pts"
        />
      </View>

      <View className="gap-3">
        {achievements.map((item) => (
          <Card
            key={item.id}
            className={`flex-row items-center gap-3.5 p-4 ${
              item.unlocked
                ? 'border-secondary/60 bg-secondary/5 dark:border-secondary/40'
                : 'opacity-85'
            }`}>
            <View
              className={`h-14 w-14 items-center justify-center rounded-pill ${
                item.unlocked
                  ? 'bg-primary-muted dark:bg-surface-elevated-dark'
                  : 'bg-border/60 dark:bg-border-dark'
              }`}>
              <Text className="text-2xl">{item.icon}</Text>
            </View>

            <View className="flex-1 gap-1">
              <View className="flex-row items-center justify-between gap-2">
                <Text variant="body" className="flex-1 font-bold">
                  {item.title}
                </Text>
                <View
                  className={`rounded-pill px-2.5 py-0.5 ${
                    item.unlocked ? 'bg-secondary/20' : 'bg-primary/15'
                  }`}>
                  <Text
                    variant="caption"
                    className="text-xs font-bold text-text-primary dark:text-text-primary-dark">
                    {item.unlocked ? `✓ +${item.points} pts` : `+${item.points} pts`}
                  </Text>
                </View>
              </View>

              <Text variant="caption" className="text-xs leading-4">
                {item.description}
              </Text>

              <Text
                variant="caption"
                className={`text-[11px] font-semibold ${
                  item.unlocked
                    ? 'text-secondary-dark dark:text-secondary'
                    : 'text-primary-dark dark:text-primary-light'
                }`}>
                {item.unlocked
                  ? formatUnlockedDate(item.unlockedAt)
                  : formatAchievementGoalLabel(item.metric, item.threshold)}
              </Text>
            </View>
          </Card>
        ))}
      </View>
    </Screen>
  );
}
