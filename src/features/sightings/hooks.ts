import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useState } from 'react';

import {
  getLocalCameraWelfareAck,
  getLocalSaveSightingAreaSetting,
  setLocalCameraWelfareAck,
  setLocalSaveSightingAreaSetting,
} from '@/lib/db';
import { isSupabaseConfigured } from '@/lib/env';
import { supabase } from '@/lib/supabase';
import { getSightingById, listSightingsForWalk } from './api';
import { syncPendingSightings } from './sync';

export const SIGHTINGS_QUERY_KEYS = {
  all: ['sightings'] as const,
  forWalk: (walkId: string) => ['sightings', 'walk', walkId] as const,
  detail: (sightingId: string) => ['sightings', 'detail', sightingId] as const,
};

export function useWalkSightings(walkId: string | null | undefined) {
  const safeId = walkId ?? '';
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!safeId || !isSupabaseConfigured) {
      return;
    }

    const channel = supabase
      .channel(`walk-sightings-${safeId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'sightings',
          filter: `walk_id=eq.${safeId}`,
        },
        () => {
          queryClient
            .invalidateQueries({ queryKey: SIGHTINGS_QUERY_KEYS.forWalk(safeId) })
            .catch(() => {});
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel).catch(() => {});
    };
  }, [safeId, queryClient]);

  return useQuery({
    queryKey: SIGHTINGS_QUERY_KEYS.forWalk(safeId),
    queryFn: () => listSightingsForWalk(safeId),
    enabled: Boolean(safeId),
    refetchInterval: (query) => {
      const items = query.state.data ?? [];
      const hasRecentPending = items.some((item) => {
        if (item.status !== 'pending') return false;
        const ageMs = Date.now() - new Date(item.taken_at).getTime();
        return ageMs < 2 * 60 * 1000;
      });
      return hasRecentPending ? 5000 : false;
    },
  });
}

export function useSightingValidationStatus(
  sightingId: string | null | undefined
) {
  const safeId = sightingId ?? '';
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!safeId || !isSupabaseConfigured) {
      return;
    }

    const channel = supabase
      .channel(`sighting-status-${safeId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'sightings',
          filter: `id=eq.${safeId}`,
        },
        () => {
          queryClient
            .invalidateQueries({ queryKey: SIGHTINGS_QUERY_KEYS.detail(safeId) })
            .catch(() => {});
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel).catch(() => {});
    };
  }, [safeId, queryClient]);

  return useQuery({
    queryKey: SIGHTINGS_QUERY_KEYS.detail(safeId),
    queryFn: () => getSightingById(safeId),
    enabled: Boolean(safeId),
    refetchInterval: (query) => {
      const item = query.state.data;
      if (!item || item.status !== 'pending') {
        return false;
      }
      const ageMs = Date.now() - new Date(item.taken_at).getTime();
      return ageMs < 2 * 60 * 1000 ? 5000 : false;
    },
  });
}

export function useCameraWelfareAck() {
  const [acknowledged, setAckState] = useState<boolean>(() =>
    getLocalCameraWelfareAck()
  );

  const acknowledgeWelfare = useCallback(() => {
    setLocalCameraWelfareAck(true);
    setAckState(true);
  }, []);

  return {
    acknowledged,
    acknowledgeWelfare,
  };
}

export function useSaveSightingAreaSetting() {
  const [saveArea, setSaveAreaState] = useState<boolean>(() =>
    getLocalSaveSightingAreaSetting()
  );

  const setSaveArea = useCallback((enabled: boolean) => {
    setLocalSaveSightingAreaSetting(enabled);
    setSaveAreaState(enabled);
  }, []);

  return {
    saveArea,
    setSaveArea,
  };
}

export function useSyncPendingSightings() {
  const queryClient = useQueryClient();

  return useCallback(async () => {
    const res = await syncPendingSightings();
    if (res.uploadedCount > 0) {
      await queryClient.invalidateQueries({
        queryKey: SIGHTINGS_QUERY_KEYS.all,
      });
    }
    return res;
  }, [queryClient]);
}
