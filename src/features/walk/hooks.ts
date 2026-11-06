import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { useCallback, useMemo, useState } from 'react';

import {
  getLocalHideRouteEndsSetting,
  setLocalHideRouteEndsSetting,
} from '@/lib/db';
import {
  deleteWalk,
  getActivityDashboardSummary,
  getWalk,
  listPendingLocalWalks,
  listWalks,
  type WalkListItem,
} from './api';
import { syncPendingWalks } from './sync';

export const WALK_QUERY_KEYS = {
  all: ['walks'] as const,
  history: () => ['walks', 'history'] as const,
  detail: (id: string) => ['walks', 'detail', id] as const,
  dashboard: (period: 'week' | 'month') =>
    ['walks', 'dashboard', period] as const,
};

export function useWalkHistory() {
  const queryClient = useQueryClient();
  const [syncingPending, setSyncingPending] = useState(false);

  const infiniteQuery = useInfiniteQuery({
    queryKey: WALK_QUERY_KEYS.history(),
    queryFn: ({ pageParam }) => listWalks({ cursor: pageParam, limit: 20 }),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  });

  const combinedWalks = useMemo<WalkListItem[]>(() => {
    const pending = listPendingLocalWalks();
    const serverItems =
      infiniteQuery.data?.pages.flatMap((page) => page.items) ?? [];

    const seenClientIds = new Set<string>();
    const merged: WalkListItem[] = [];

    for (const item of pending) {
      seenClientIds.add(item.client_id);
      merged.push(item);
    }

    for (const item of serverItems) {
      if (!seenClientIds.has(item.client_id)) {
        seenClientIds.add(item.client_id);
        merged.push(item);
      }
    }

    return merged;
  }, [infiniteQuery.data]);

  const syncPending = useCallback(async () => {
    setSyncingPending(true);
    try {
      await syncPendingWalks();
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: WALK_QUERY_KEYS.all }),
        queryClient.invalidateQueries({ queryKey: ['health', 'today'] }),
      ]);
    } finally {
      setSyncingPending(false);
    }
  }, [queryClient]);

  return {
    ...infiniteQuery,
    walks: combinedWalks,
    syncPending,
    syncingPending,
  };
}

export function useWalkDetail(id: string) {
  return useQuery({
    queryKey: WALK_QUERY_KEYS.detail(id),
    queryFn: () => getWalk(id),
    enabled: Boolean(id),
  });
}

export function useDeleteWalkMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteWalk(id),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: WALK_QUERY_KEYS.all }),
        queryClient.invalidateQueries({ queryKey: ['health', 'today'] }),
      ]);
    },
  });
}

export function useActivityDashboard(period: 'week' | 'month' = 'week') {
  return useQuery({
    queryKey: WALK_QUERY_KEYS.dashboard(period),
    queryFn: () => getActivityDashboardSummary(period),
    staleTime: 30_000,
  });
}

export function useRoutePrivacyTrim() {
  const [hideRouteEnds, setHideRouteEndsState] = useState<boolean>(() =>
    getLocalHideRouteEndsSetting()
  );

  const setHideRouteEnds = useCallback((enabled: boolean) => {
    setLocalHideRouteEndsSetting(enabled);
    setHideRouteEndsState(enabled);
  }, []);

  return {
    hideRouteEnds,
    setHideRouteEnds,
  };
}
