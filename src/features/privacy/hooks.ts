import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';

import { useSession } from '@/features/auth';
import {
  deleteAllSightings,
  deleteAllWalks,
  deleteUserAccount,
  exportUserData,
  getPrivacySettings,
  submitContentReport,
  updatePrivacySettings,
  type PrivacySettingsValues,
  type ReportReason,
  type ReportTargetType,
} from './api';

export const PRIVACY_QUERY_KEYS = {
  settings: (userId: string) => ['privacy', 'settings', userId] as const,
};

export function usePrivacySettings() {
  const { user } = useSession();
  const userId = user?.id ?? '';
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: PRIVACY_QUERY_KEYS.settings(userId),
    queryFn: () => getPrivacySettings(userId),
    enabled: Boolean(userId),
  });

  const mutation = useMutation({
    mutationFn: (updates: Partial<PrivacySettingsValues>) =>
      updatePrivacySettings(userId, updates),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: PRIVACY_QUERY_KEYS.settings(userId),
      });
    },
  });

  return {
    ...query,
    updateSetting: (updates: Partial<PrivacySettingsValues>) =>
      mutation.mutateAsync(updates),
    isUpdating: mutation.isPending,
  };
}

export function useSubmitReportMutation() {
  return useMutation({
    mutationFn: (input: {
      targetType: ReportTargetType;
      targetId: string;
      reason: ReportReason;
      details?: string;
    }) => submitContentReport(input),
  });
}

export function useDeleteAllWalksMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => deleteAllWalks(),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['walks'] });
    },
  });
}

export function useDeleteAllSightingsMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => deleteAllSightings(),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['sightings'] });
      await queryClient.invalidateQueries({ queryKey: ['collection'] });
    },
  });
}

export function useExportUserDataMutation() {
  return useMutation({
    mutationFn: () => exportUserData(),
  });
}

export function useDeleteAccountMutation() {
  const { signOut } = useSession();
  return useMutation({
    mutationFn: async () => {
      await deleteUserAccount();
      await signOut();
    },
  });
}
