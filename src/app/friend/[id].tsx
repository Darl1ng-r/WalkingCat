import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, Platform, View } from 'react-native';

import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  Screen,
  StatTile,
  Text,
} from '@/components/ui';
import {
  useBlockUserMutation,
  useFriendProfileSummary,
  useRemoveFriendshipMutation,
} from '@/features/social';
import { formatDistance, formatNumber } from '@/lib/format';

function getInitials(displayName?: string | null, username?: string | null): string {
  const source = (displayName || username || 'W').trim();
  const parts = source.split(/\s+/);
  if (parts.length >= 2) {
    return `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`.toUpperCase();
  }
  return source.slice(0, 2).toUpperCase();
}

function formatMemberSince(isoDate?: string | null): string {
  if (!isoDate) return 'Member';
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return 'Member';
  return `Member since ${date.toLocaleDateString([], {
    month: 'short',
    year: 'numeric',
  })}`;
}

export default function FriendProfileScreen() {
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const friendId = Array.isArray(params.id)
    ? params.id[0] ?? ''
    : params.id ?? '';

  const {
    data: summary,
    isLoading,
    isError,
    refetch,
  } = useFriendProfileSummary(friendId);
  const removeMutation = useRemoveFriendshipMutation();
  const blockMutation = useBlockUserMutation();
  const [actionError, setActionError] = useState<string | null>(null);

  if (isLoading) {
    return (
      <Screen className="items-center justify-center">
        <Text variant="caption">Loading friend profile…</Text>
      </Screen>
    );
  }

  if (isError) {
    return (
      <Screen className="justify-center">
        <ErrorState
          message="Could not load friend profile."
          onRetry={() => {
            refetch().catch(() => {});
          }}
        />
      </Screen>
    );
  }

  if (!summary) {
    return (
      <Screen className="justify-center">
        <EmptyState
          emoji="👋"
          title="Profile unavailable"
          message="You may no longer be connected with this walker."
          actionLabel="Back to Friends"
          onAction={() => router.back()}
        />
      </Screen>
    );
  }

  const displayName = summary.displayName || summary.username;
  const initials = getInitials(summary.displayName, summary.username);

  const performRemove = async () => {
    setActionError(null);
    try {
      await removeMutation.mutateAsync(summary.userId);
      router.back();
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : 'Could not remove friend.'
      );
    }
  };

  const performBlock = async () => {
    setActionError(null);
    try {
      await blockMutation.mutateAsync(summary.userId);
      router.back();
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : 'Could not block user.'
      );
    }
  };

  const handleConfirmRemove = () => {
    if (Platform.OS === 'web') {
      if (
        typeof window !== 'undefined' &&
        window.confirm(`Remove ${displayName} from your friends?`)
      ) {
        performRemove().catch(() => {});
      }
      return;
    }

    Alert.alert(
      'Remove Friend?',
      `${displayName} will be removed from your friends list and weekly leaderboard.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            performRemove().catch(() => {});
          },
        },
      ]
    );
  };

  const handleConfirmBlock = () => {
    if (Platform.OS === 'web') {
      if (
        typeof window !== 'undefined' &&
        window.confirm(
          `Block ${displayName}? They will be hidden everywhere and unable to send you friend requests.`
        )
      ) {
        performBlock().catch(() => {});
      }
      return;
    }

    Alert.alert(
      `Block ${displayName}?`,
      'Blocking hides this user everywhere in the app and prevents future friend requests.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Block User',
          style: 'destructive',
          onPress: () => {
            performBlock().catch(() => {});
          },
        },
      ]
    );
  };

  return (
    <Screen scroll contentContainerClassName="gap-5 pb-12 pt-2">
      <View className="flex-row items-start justify-between gap-3">
        <View className="flex-1">
          <Text variant="label">Friend Profile</Text>
          <Text variant="title" className="mt-0.5">
            {displayName}
          </Text>
        </View>
        <Button
          label="Back"
          size="sm"
          variant="ghost"
          onPress={() => router.back()}
        />
      </View>

      <Card className="flex-row items-center gap-4">
        <View className="h-16 w-16 items-center justify-center rounded-pill bg-primary-muted dark:bg-surface-elevated-dark">
          <Text
            variant="heading"
            className="text-primary-dark dark:text-primary-light">
            {initials}
          </Text>
        </View>
        <View className="flex-1">
          <Text variant="heading">{displayName}</Text>
          <Text variant="caption">@{summary.username}</Text>
          <Text variant="caption" className="mt-0.5 text-xs">
            {formatMemberSince(summary.memberSince)}
          </Text>
        </View>
        <View className="items-center rounded-card bg-primary/15 px-3 py-2">
          <Text variant="heading">🏅 {summary.achievementsCount}</Text>
          <Text variant="caption" className="text-[11px]">
            Badges
          </Text>
        </View>
      </Card>

      <View className="gap-3">
        <Text variant="label">This Week&apos;s Activity</Text>
        {summary.showOnLeaderboard ? (
          <>
            <View className="flex-row gap-3">
              <StatTile
                label="Steps"
                value={formatNumber(Math.round(summary.weekSteps))}
                unit="steps"
              />
              <StatTile
                label="Distance"
                value={formatDistance(summary.weekDistanceM)}
              />
            </View>
            <View className="flex-row gap-3">
              <StatTile
                label="Walks"
                value={formatNumber(Math.round(summary.weekWalks))}
                unit={summary.weekWalks === 1 ? 'walk' : 'walks'}
              />
              <StatTile
                label="Challenge Pts"
                value={formatNumber(Math.round(summary.weekChallengePoints))}
                unit="pts"
              />
            </View>
          </>
        ) : (
          <Card className="py-4">
            <Text variant="caption" className="text-center">
              {displayName} has chosen to keep their weekly leaderboard stats private.
            </Text>
          </Card>
        )}
      </View>

      {actionError ? (
        <Card className="border-danger bg-danger-muted py-3">
          <Text variant="caption" className="font-semibold text-danger">
            {actionError}
          </Text>
        </Card>
      ) : null}

      <View className="gap-3 pt-2">
        <Button
          label="Remove Friend"
          variant="secondary"
          loading={removeMutation.isPending}
          onPress={handleConfirmRemove}
        />
        <Button
          label="Block User"
          variant="danger"
          loading={blockMutation.isPending}
          onPress={handleConfirmBlock}
        />
      </View>
    </Screen>
  );
}
