import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { useEffect } from 'react';

import { SIGHTINGS_QUERY_KEYS } from '@/features/sightings';
import { isSupabaseConfigured } from '@/lib/env';
import { supabase } from '@/lib/supabase';
import {
  deleteSighting,
  getCat,
  linkSighting,
  listCats,
  listRecentSubmissions,
  renameCat,
  unlinkSighting,
} from './api';
import type { CatCollectionSort } from './utils';

export const COLLECTION_QUERY_KEYS = {
  all: ['collection'] as const,
  list: (sort: CatCollectionSort) => ['collection', 'list', sort] as const,
  detail: (catId: string) => ['collection', 'detail', catId] as const,
  recentSubmissions: ['collection', 'recentSubmissions'] as const,
};

/**
 * Fetches the user's cat collection and subscribes to Supabase Realtime changes
 * on `cats` and `sightings` so newly accepted sightings appear immediately.
 */
export function useCatCollection(sort: CatCollectionSort = 'newest') {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!isSupabaseConfigured) {
      return;
    }

    const channel = supabase
      .channel(`cat-collection:${sort}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'cats',
        },
        () => {
          queryClient
            .invalidateQueries({ queryKey: COLLECTION_QUERY_KEYS.all })
            .catch(() => {});
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'sightings',
        },
        () => {
          queryClient
            .invalidateQueries({ queryKey: COLLECTION_QUERY_KEYS.all })
            .catch(() => {});
          queryClient
            .invalidateQueries({ queryKey: SIGHTINGS_QUERY_KEYS.all })
            .catch(() => {});
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel).catch(() => {});
    };
  }, [queryClient, sort]);

  return useQuery({
    queryKey: COLLECTION_QUERY_KEYS.list(sort),
    queryFn: () => listCats({ sort }),
  });
}

/**
 * Fetches a single cat's details and sightings timeline.
 */
export function useCatDetail(catId: string | null | undefined) {
  return useQuery({
    queryKey: COLLECTION_QUERY_KEYS.detail(catId ?? ''),
    queryFn: () => getCat(catId ?? ''),
    enabled: Boolean(catId),
  });
}

/**
 * Fetches pending/flagged/rejected sightings for the Collection tab's "Recent submissions" section.
 */
export function useRecentSubmissions(limit = 10) {
  return useQuery({
    queryKey: [...COLLECTION_QUERY_KEYS.recentSubmissions, limit] as const,
    queryFn: () => listRecentSubmissions(limit),
    refetchInterval: (query) => {
      const items = query.state.data ?? [];
      return items.some((i) => i.status === 'pending') ? 5000 : false;
    },
  });
}

export function useRenameCatMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      catId,
      nickname,
    }: {
      catId: string;
      nickname: string | null;
    }) => renameCat(catId, nickname),
    onSuccess: async (_data, variables) => {
      await queryClient.invalidateQueries({
        queryKey: COLLECTION_QUERY_KEYS.detail(variables.catId),
      });
      await queryClient.invalidateQueries({
        queryKey: COLLECTION_QUERY_KEYS.all,
      });
    },
  });
}

export function useLinkSightingMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      sightingId,
      targetCatId,
    }: {
      sightingId: string;
      targetCatId: string;
    }) => linkSighting(sightingId, targetCatId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: COLLECTION_QUERY_KEYS.all,
      });
      await queryClient.invalidateQueries({
        queryKey: SIGHTINGS_QUERY_KEYS.all,
      });
    },
  });
}

export function useUnlinkSightingMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (sightingId: string) => unlinkSighting(sightingId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: COLLECTION_QUERY_KEYS.all,
      });
      await queryClient.invalidateQueries({
        queryKey: SIGHTINGS_QUERY_KEYS.all,
      });
    },
  });
}

export function useDeleteSightingMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (sightingId: string) => deleteSighting(sightingId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: COLLECTION_QUERY_KEYS.all,
      });
      await queryClient.invalidateQueries({
        queryKey: SIGHTINGS_QUERY_KEYS.all,
      });
    },
  });
}
