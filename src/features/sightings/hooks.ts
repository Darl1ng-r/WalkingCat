import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useState } from 'react';

import {
  getLocalCameraWelfareAck,
  getLocalSaveSightingAreaSetting,
  setLocalCameraWelfareAck,
  setLocalSaveSightingAreaSetting,
} from '@/lib/db';
import { listSightingsForWalk } from './api';
import { syncPendingSightings } from './sync';

export const SIGHTINGS_QUERY_KEYS = {
  all: ['sightings'] as const,
  forWalk: (walkId: string) => ['sightings', 'walk', walkId] as const,
};

export function useWalkSightings(walkId: string | null | undefined) {
  const safeId = walkId ?? '';
  return useQuery({
    queryKey: SIGHTINGS_QUERY_KEYS.forWalk(safeId),
    queryFn: () => listSightingsForWalk(safeId),
    enabled: Boolean(safeId),
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
