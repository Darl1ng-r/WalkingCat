import { router } from 'expo-router';
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
  ChallengeCard,
  useChallenges,
  usePointsSummary,
  useSetChallengeDifficultyMutation,
  type ChallengeDifficulty,
} from '@/features/gamification';
import { formatNumber } from '@/lib/format';

const DIFFICULTY_OPTIONS: {
  label: string;
  subtitle: string;
  value: ChallengeDifficulty;
}[] = [
  {
    label: 'Easy',
    subtitle: 'Gentle (~60% goals)',
    value: 'easy',
  },
  {
    label: 'Standard',
    subtitle: 'Regular pace',
    value: 'standard',
  },
];

export default function ChallengesScreen() {
  const { data: points } = usePointsSummary();
  const {
    data: overview,
    isLoading,
    isError,
    refetch,
  } = useChallenges();
  const setDifficultyMutation = useSetChallengeDifficultyMutation();

  const currentDifficulty = overview?.difficulty ?? 'standard';
  const activeDaily = overview?.activeDaily ?? [];
  const activeWeekly = overview?.activeWeekly ?? [];
  const completedHistory = overview?.completedHistory ?? [];

  if (isLoading) {
    return (
      <Screen className="items-center justify-center">
        <Text variant="caption">Loading challenges…</Text>
      </Screen>
    );
  }

  if (isError) {
    return (
      <Screen className="justify-center">
        <ErrorState
          message="Could not load challenges."
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
          <Text variant="label">Goals & Rewards</Text>
          <Text variant="title" className="mt-0.5">
            Challenges
          </Text>
          <Text variant="caption" className="mt-1 leading-5">
            Healthy daily and weekly goals—rest days are always welcome and never reset your
            progress.
          </Text>
        </View>
        <Button
          label="Back"
          size="sm"
          variant="ghost"
          onPress={() => router.back()}
        />
      </View>

      {/* Points Summary */}
      <View className="flex-row gap-2.5">
        <StatTile
          label="Total Points"
          value={formatNumber(points?.totalPoints ?? 0)}
          unit="pts"
        />
        <StatTile
          label="This Week"
          value={`+${formatNumber(points?.weekPoints ?? 0)}`}
          unit="pts"
        />
        <StatTile
          label="Today"
          value={`+${formatNumber(points?.todayPoints ?? 0)}`}
          unit="pts"
        />
      </View>

      {/* Difficulty Selector (Easy vs Standard) */}
      <Card className="gap-3">
        <View className="flex-row items-center justify-between">
          <View className="flex-1">
            <Text variant="label">🎯 Challenge Goal Level</Text>
            <Text variant="caption" className="mt-0.5 text-xs">
              Adjust targets anytime to fit your schedule and energy level.
            </Text>
          </View>
        </View>

        <View className="flex-row gap-2.5">
          {DIFFICULTY_OPTIONS.map((opt) => {
            const active = currentDifficulty === opt.value;
            return (
              <Pressable
                key={opt.value}
                accessibilityRole="button"
                accessibilityLabel={`Select ${opt.label} challenge difficulty`}
                disabled={setDifficultyMutation.isPending}
                onPress={() => {
                  if (!active) {
                    setDifficultyMutation.mutate(opt.value);
                  }
                }}
                className={`flex-1 rounded-card border p-3 ${
                  active
                    ? 'border-primary bg-primary-muted dark:bg-surface-elevated-dark'
                    : 'border-border bg-background dark:border-border-dark dark:bg-background-dark'
                }`}>
                <Text
                  variant="body"
                  className={`font-bold ${
                    active
                      ? 'text-primary-dark dark:text-primary-light'
                      : 'text-text-primary dark:text-text-primary-dark'
                  }`}>
                  {opt.label}
                </Text>
                <Text variant="caption" className="text-xs">
                  {opt.subtitle}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </Card>

      {/* Today's Challenges */}
      <View className="gap-3">
        <View className="flex-row items-center justify-between">
          <Text variant="label">Today&apos;s Challenges (+25 pts each)</Text>
          <Text variant="caption" className="text-xs">
            UTC day
          </Text>
        </View>
        {activeDaily.map((challenge) => (
          <ChallengeCard key={challenge.instanceId} challenge={challenge} />
        ))}
      </View>

      {/* Weekly Challenges */}
      <View className="gap-3">
        <View className="flex-row items-center justify-between">
          <Text variant="label">Weekly Challenges (+75 pts each)</Text>
          <Text variant="caption" className="text-xs">
            Rest-day friendly
          </Text>
        </View>
        {activeWeekly.map((challenge) => (
          <ChallengeCard key={challenge.instanceId} challenge={challenge} />
        ))}
      </View>

      {/* Completed History */}
      {completedHistory.length > 0 ? (
        <View className="gap-3">
          <Text variant="label">
            Completed Challenges ({completedHistory.length})
          </Text>
          {completedHistory.map((item) => (
            <Card
              key={item.instanceId}
              className="flex-row items-center justify-between p-3.5">
              <View className="flex-1 flex-row items-center gap-3">
                <Text className="text-xl">{item.icon}</Text>
                <View className="flex-1">
                  <Text variant="body" className="font-semibold">
                    {item.title}
                  </Text>
                  <Text variant="caption" className="text-xs">
                    {item.period === 'weekly' ? 'Weekly' : 'Daily'} · Completed{' '}
                    {item.completedAt
                      ? new Date(item.completedAt).toLocaleDateString([], {
                          month: 'short',
                          day: 'numeric',
                        })
                      : ''}
                  </Text>
                </View>
              </View>
              <View className="rounded-pill bg-secondary/20 px-2.5 py-1">
                <Text variant="caption" className="text-xs font-bold">
                  ✓ +{item.rewardPoints} pts
                </Text>
              </View>
            </Card>
          ))}
        </View>
      ) : null}

      <Button
        label="🏅 View Achievements"
        variant="secondary"
        onPress={() => router.push('/achievements')}
      />
    </Screen>
  );
}
