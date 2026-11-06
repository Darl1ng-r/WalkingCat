import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { useEffect } from 'react';

import { useSession } from '@/features/auth';
import {
  getLocalChallengeDifficultySetting,
  setLocalChallengeDifficultySetting,
} from '@/lib/db';
import { isSupabaseConfigured } from '@/lib/env';
import { supabase } from '@/lib/supabase';
import {
  getPointsSummary,
  getWalkRewardsSummary,
  listAchievements,
  listChallengesWithProgress,
  updateChallengeDifficulty,
} from './api';
import type { ChallengeDifficulty } from './rules';

export const GAMIFICATION_QUERY_KEYS = {
  all: ['gamification'] as const,
  points: ['gamification', 'points'] as const,
  achievements: ['gamification', 'achievements'] as const,
  challenges: (difficulty: ChallengeDifficulty) =>
    ['gamification', 'challenges', difficulty] as const,
  walkRewards: (walkId: string) =>
    ['gamification', 'walkRewards', walkId] as const,
};

/**
 * Fetches the user's server-authoritative points summary and subscribes to `points_ledger` changes.
 */
export function usePointsSummary() {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!isSupabaseConfigured) {
      return;
    }

    const channel = supabase
      .channel('gamification-points')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'points_ledger',
        },
        () => {
          queryClient
            .invalidateQueries({ queryKey: GAMIFICATION_QUERY_KEYS.all })
            .catch(() => {});
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel).catch(() => {});
    };
  }, [queryClient]);

  return useQuery({
    queryKey: GAMIFICATION_QUERY_KEYS.points,
    queryFn: getPointsSummary,
  });
}

/**
 * Fetches all achievements (unlocked and locked) and subscribes to `user_achievements` changes.
 */
export function useAchievements() {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!isSupabaseConfigured) {
      return;
    }

    const channel = supabase
      .channel('gamification-achievements')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_achievements',
        },
        () => {
          queryClient
            .invalidateQueries({
              queryKey: GAMIFICATION_QUERY_KEYS.achievements,
            })
            .catch(() => {});
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel).catch(() => {});
    };
  }, [queryClient]);

  return useQuery({
    queryKey: GAMIFICATION_QUERY_KEYS.achievements,
    queryFn: listAchievements,
  });
}

/**
 * Reads the user's preferred challenge difficulty ('easy' | 'standard').
 */
export function useChallengeDifficulty(): ChallengeDifficulty {
  const { profile } = useSession();
  if (
    profile?.challenge_difficulty === 'easy' ||
    profile?.challenge_difficulty === 'standard'
  ) {
    setLocalChallengeDifficultySetting(profile.challenge_difficulty);
    return profile.challenge_difficulty;
  }
  return getLocalChallengeDifficultySetting();
}

/**
 * Fetches active daily/weekly challenges and completed history, subscribed to `challenge_progress`.
 */
export function useChallenges(overrideDifficulty?: ChallengeDifficulty) {
  const queryClient = useQueryClient();
  const profileDifficulty = useChallengeDifficulty();
  const difficulty = overrideDifficulty ?? profileDifficulty;

  useEffect(() => {
    if (!isSupabaseConfigured) {
      return;
    }

    const channel = supabase
      .channel(`gamification-challenges:${difficulty}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'challenge_progress',
        },
        () => {
          queryClient
            .invalidateQueries({ queryKey: GAMIFICATION_QUERY_KEYS.all })
            .catch(() => {});
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel).catch(() => {});
    };
  }, [queryClient, difficulty]);

  return useQuery({
    queryKey: GAMIFICATION_QUERY_KEYS.challenges(difficulty),
    queryFn: () => listChallengesWithProgress(difficulty),
  });
}

/**
 * Mutation to switch between 'easy' (~60% targets) and 'standard' challenge difficulty.
 */
export function useSetChallengeDifficultyMutation() {
  const queryClient = useQueryClient();
  const { refreshProfile } = useSession();

  return useMutation({
    mutationFn: (difficulty: ChallengeDifficulty) =>
      updateChallengeDifficulty(difficulty),
    onSuccess: async () => {
      await refreshProfile().catch(() => {});
      await queryClient.invalidateQueries({
        queryKey: GAMIFICATION_QUERY_KEYS.all,
      });
    },
  });
}

/**
 * Fetches points breakdown + newly unlocked achievements/challenges for a completed walk.
 */
export function useWalkRewards(
  walkId: string | null | undefined,
  walkMeta: { distanceMeters: number; movingTimeSeconds: number }
) {
  return useQuery({
    queryKey: GAMIFICATION_QUERY_KEYS.walkRewards(walkId ?? 'preview'),
    queryFn: () => getWalkRewardsSummary(walkId ?? '', walkMeta),
    enabled: Boolean(walkId) || walkMeta.distanceMeters > 0,
  });
}
