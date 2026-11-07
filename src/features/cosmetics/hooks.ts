import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { COLLECTION_QUERY_KEYS } from '@/features/collection/hooks';
import {
  equipCatTheme,
  equipProfileCosmeticItem,
  getCosmeticsOverview,
  unlockCosmeticItem,
} from './api';

export const COSMETICS_QUERY_KEYS = {
  all: ['cosmetics'] as const,
  overview: ['cosmetics', 'overview'] as const,
};

export function useCosmeticsOverview() {
  return useQuery({
    queryKey: COSMETICS_QUERY_KEYS.overview,
    queryFn: () => getCosmeticsOverview(),
  });
}

export function useUnlockCosmeticMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (cosmeticId: string) => unlockCosmeticItem(cosmeticId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: COSMETICS_QUERY_KEYS.all,
      });
    },
  });
}

export function useEquipCatThemeMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ catId, themeId }: { catId: string; themeId: string }) =>
      equipCatTheme(catId, themeId),
    onSuccess: async (_data, variables) => {
      await queryClient.invalidateQueries({
        queryKey: COLLECTION_QUERY_KEYS.detail(variables.catId),
      });
      await queryClient.invalidateQueries({
        queryKey: COLLECTION_QUERY_KEYS.all,
      });
      await queryClient.invalidateQueries({
        queryKey: COSMETICS_QUERY_KEYS.all,
      });
    },
  });
}

export function useEquipProfileCosmeticMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      slot,
      cosmeticId,
    }: {
      slot: 'banner' | 'title';
      cosmeticId: string;
    }) => equipProfileCosmeticItem(slot, cosmeticId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: COSMETICS_QUERY_KEYS.all,
      });
      await queryClient.invalidateQueries({
        queryKey: ['auth', 'profile'],
      });
    },
  });
}
