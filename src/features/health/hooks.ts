import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect } from 'react';
import { AppState } from 'react-native';

import { useSession } from '@/features/auth';

import { healthProvider } from './provider';
import { fetchTodayActivitySummary, syncDailyHealthActivity } from './sync';

export const HEALTH_TODAY_QUERY_KEY = ['health', 'today-summary'] as const;

export function useTodayHealthSummary() {
  const { user } = useSession();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: [...HEALTH_TODAY_QUERY_KEY, user?.id ?? 'anon'],
    queryFn: async () => {
      await syncDailyHealthActivity(false);
      return fetchTodayActivitySummary(user?.id);
    },
  });

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        syncDailyHealthActivity(false)
          .then(() => {
            queryClient.invalidateQueries({ queryKey: HEALTH_TODAY_QUERY_KEY });
          })
          .catch(() => {});
      }
    });
    return () => sub.remove();
  }, [queryClient]);

  const requestConnect = useCallback(async () => {
    const nextState = await healthProvider.requestPermissions();
    if (nextState === 'connected') {
      await syncDailyHealthActivity(true);
    }
    await queryClient.invalidateQueries({ queryKey: HEALTH_TODAY_QUERY_KEY });
    return nextState;
  }, [queryClient]);

  return {
    ...query,
    requestConnect,
    openHealthSettings: () => healthProvider.openSettings(),
  };
}
