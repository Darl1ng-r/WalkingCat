import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { useEffect } from 'react';

import { useSession } from '@/features/auth';
import { isSupabaseConfigured } from '@/lib/env';
import { supabase } from '@/lib/supabase';
import {
  blockUser,
  createFriendInvite,
  getFriendProfileSummary,
  getFriendsLeaderboard,
  getShowOnLeaderboardSetting,
  listFriendActivityEvents,
  listFriendshipsOverview,
  redeemFriendInvite,
  removeOrCancelFriendship,
  respondToFriendRequest,
  searchUsersByUsername,
  sendFriendRequest,
  shareCatCardToFriends,
  toggleEventReaction,
  updateShowOnLeaderboardSetting,
} from './api';
import type {
  LeaderboardMetric,
  LeaderboardWeekPeriod,
  ReactionEmoji,
} from './utils';

export const SOCIAL_QUERY_KEYS = {
  all: ['social'] as const,
  friendships: (userId: string) => ['social', 'friendships', userId] as const,
  search: (query: string) => ['social', 'search', query] as const,
  leaderboard: (metric: LeaderboardMetric, period: LeaderboardWeekPeriod) =>
    ['social', 'leaderboard', metric, period] as const,
  activity: (userId: string) => ['social', 'activity', userId] as const,
  friendProfile: (friendId: string) =>
    ['social', 'friendProfile', friendId] as const,
  leaderboardOptIn: (userId: string) =>
    ['social', 'leaderboardOptIn', userId] as const,
};

/**
 * Fetches accepted friends, incoming requests, and outgoing requests,
 * subscribed to Realtime changes on `friendships`.
 */
export function useFriendshipsOverview() {
  const { user } = useSession();
  const userId = user?.id ?? '';
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!userId || !isSupabaseConfigured) {
      return;
    }

    const channel = supabase
      .channel(`social-friendships:${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'friendships',
        },
        () => {
          queryClient
            .invalidateQueries({ queryKey: SOCIAL_QUERY_KEYS.all })
            .catch(() => {});
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel).catch(() => {});
    };
  }, [queryClient, userId]);

  return useQuery({
    queryKey: SOCIAL_QUERY_KEYS.friendships(userId),
    queryFn: () => listFriendshipsOverview(userId),
    enabled: Boolean(userId),
  });
}

/**
 * Searches discoverable users by username (only runs when trimmed query >= 3 chars).
 */
export function useUsernameSearch(query: string) {
  const clean = query.trim().replace(/^@/, '');
  return useQuery({
    queryKey: SOCIAL_QUERY_KEYS.search(clean),
    queryFn: () => searchUsersByUsername(clean),
    enabled: clean.length >= 3,
  });
}

/**
 * Fetches the weekly friends leaderboard for `metric` and `weekPeriod`.
 */
export function useFriendsLeaderboard(
  metric: LeaderboardMetric,
  weekPeriod: LeaderboardWeekPeriod = 'this_week'
) {
  return useQuery({
    queryKey: SOCIAL_QUERY_KEYS.leaderboard(metric, weekPeriod),
    queryFn: () => getFriendsLeaderboard(metric, weekPeriod),
  });
}

/**
 * Fetches friends' milestone activity events (last 14 days) and subscribes to
 * Realtime changes on `activity_events` and `reactions`.
 */
export function useFriendActivityEvents() {
  const { user } = useSession();
  const userId = user?.id ?? '';
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!userId || !isSupabaseConfigured) {
      return;
    }

    const channel = supabase
      .channel(`social-activity:${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'activity_events',
        },
        () => {
          queryClient
            .invalidateQueries({
              queryKey: SOCIAL_QUERY_KEYS.activity(userId),
            })
            .catch(() => {});
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'reactions',
        },
        () => {
          queryClient
            .invalidateQueries({
              queryKey: SOCIAL_QUERY_KEYS.activity(userId),
            })
            .catch(() => {});
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel).catch(() => {});
    };
  }, [queryClient, userId]);

  return useQuery({
    queryKey: SOCIAL_QUERY_KEYS.activity(userId),
    queryFn: () => listFriendActivityEvents(userId),
    enabled: Boolean(userId),
  });
}

export function useFriendProfileSummary(friendId: string | null | undefined) {
  return useQuery({
    queryKey: SOCIAL_QUERY_KEYS.friendProfile(friendId ?? ''),
    queryFn: () => getFriendProfileSummary(friendId ?? ''),
    enabled: Boolean(friendId),
  });
}

export function useShowOnLeaderboardSetting() {
  const { user } = useSession();
  const userId = user?.id ?? '';
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: SOCIAL_QUERY_KEYS.leaderboardOptIn(userId),
    queryFn: () => getShowOnLeaderboardSetting(userId),
    enabled: Boolean(userId),
  });

  const mutation = useMutation({
    mutationFn: (enabled: boolean) =>
      updateShowOnLeaderboardSetting(userId, enabled),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: SOCIAL_QUERY_KEYS.all,
      });
    },
  });

  return {
    showOnLeaderboard: query.data ?? true,
    setShowOnLeaderboard: (enabled: boolean) => mutation.mutate(enabled),
    isUpdating: mutation.isPending,
  };
}

export function useSendFriendRequestMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (targetUserId: string) => sendFriendRequest(targetUserId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: SOCIAL_QUERY_KEYS.all,
      });
    },
  });
}

export function useRespondFriendRequestMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      friendshipId,
      decision,
    }: {
      friendshipId: string;
      decision: 'accepted' | 'declined';
    }) => respondToFriendRequest(friendshipId, decision),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: SOCIAL_QUERY_KEYS.all,
      });
    },
  });
}

export function useRemoveFriendshipMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (otherUserId: string) => removeOrCancelFriendship(otherUserId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: SOCIAL_QUERY_KEYS.all,
      });
    },
  });
}

export function useBlockUserMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (targetUserId: string) => blockUser(targetUserId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: SOCIAL_QUERY_KEYS.all,
      });
    },
  });
}

export function useCreateInviteMutation() {
  return useMutation({
    mutationFn: () => createFriendInvite(),
  });
}

export function useRedeemInviteMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (rawCodeOrUrl: string) => redeemFriendInvite(rawCodeOrUrl),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: SOCIAL_QUERY_KEYS.all,
      });
    },
  });
}

export function useToggleReactionMutation() {
  const { user } = useSession();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      eventId,
      emoji,
      currentMyReaction,
    }: {
      eventId: string;
      emoji: ReactionEmoji;
      currentMyReaction: ReactionEmoji | null;
    }) =>
      toggleEventReaction(
        eventId,
        user?.id ?? '',
        emoji,
        currentMyReaction
      ),
    onSuccess: async () => {
      if (user?.id) {
        await queryClient.invalidateQueries({
          queryKey: SOCIAL_QUERY_KEYS.activity(user.id),
        });
      }
    },
  });
}

export function useShareCatCardMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (catId: string) => shareCatCardToFriends(catId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: SOCIAL_QUERY_KEYS.all,
      });
    },
  });
}
