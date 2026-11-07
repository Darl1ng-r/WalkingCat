import { isSupabaseConfigured } from '@/lib/env';
import { logger } from '@/lib/logger';
import { supabase } from '@/lib/supabase';

export type ReportTargetType =
  | 'sighting'
  | 'cat_card'
  | 'profile'
  | 'activity_event';

export type ReportReason =
  | 'animal_harm'
  | 'inappropriate'
  | 'personal_info'
  | 'spam'
  | 'other';

export const REPORT_REASONS: readonly {
  key: ReportReason;
  label: string;
  description: string;
}[] = [
  {
    key: 'animal_harm',
    label: 'Animal Welfare Concern',
    description: 'Cat in distress, improper handling, or concerning behavior.',
  },
  {
    key: 'inappropriate',
    label: 'Inappropriate Content',
    description: 'Offensive images, text, or non-cat content.',
  },
  {
    key: 'personal_info',
    label: 'Privacy or Personal Information',
    description: 'Private property details, street signs, faces, or identity leaks.',
  },
  {
    key: 'spam',
    label: 'Spam or Duplicate',
    description: 'Repetitive submissions or automated activity.',
  },
  {
    key: 'other',
    label: 'Other Concern',
    description: 'Any other issue requiring human moderation review.',
  },
] as const;

export interface PrivacySettingsValues {
  share_walks_with_friends: boolean;
  share_milestones_with_friends: boolean;
  show_on_friends_leaderboard: boolean;
  share_cat_cards: boolean;
  discoverable_by_username: boolean;
  save_sighting_area: boolean;
  hide_route_ends: boolean;
  hide_route_ends_m: 100 | 150 | 300;
  analytics_opt_out: boolean;
}

export const DEFAULT_PRIVACY_SETTINGS: PrivacySettingsValues = {
  share_walks_with_friends: false,
  share_milestones_with_friends: true,
  show_on_friends_leaderboard: true,
  share_cat_cards: false,
  discoverable_by_username: true,
  save_sighting_area: false,
  hide_route_ends: true,
  hide_route_ends_m: 150,
  analytics_opt_out: false,
};

/**
 * Fetches the user's server privacy settings.
 */
export async function getPrivacySettings(
  userId: string | null | undefined
): Promise<PrivacySettingsValues> {
  if (!userId || !isSupabaseConfigured) {
    return DEFAULT_PRIVACY_SETTINGS;
  }

  const { data, error } = await supabase
    .from('privacy_settings')
    .select(
      'share_walks_with_friends, share_milestones_with_friends, show_on_friends_leaderboard, share_cat_cards, discoverable_by_username, save_sighting_area, hide_route_ends, hide_route_ends_m, analytics_opt_out'
    )
    .eq('user_id', userId)
    .maybeSingle();

  if (error || !data) {
    return DEFAULT_PRIVACY_SETTINGS;
  }

  return {
    share_walks_with_friends: data.share_walks_with_friends ?? false,
    share_milestones_with_friends: data.share_milestones_with_friends ?? true,
    show_on_friends_leaderboard: data.show_on_friends_leaderboard ?? true,
    share_cat_cards: data.share_cat_cards ?? false,
    discoverable_by_username: data.discoverable_by_username ?? true,
    save_sighting_area: data.save_sighting_area ?? false,
    hide_route_ends: data.hide_route_ends ?? true,
    hide_route_ends_m: (data.hide_route_ends_m as 100 | 150 | 300) ?? 150,
    analytics_opt_out: data.analytics_opt_out ?? false,
  };
}

/**
 * Updates privacy settings on the server.
 */
export async function updatePrivacySettings(
  userId: string,
  updates: Partial<PrivacySettingsValues>
): Promise<void> {
  if (!userId || !isSupabaseConfigured) {
    return;
  }

  const { error } = await supabase
    .from('privacy_settings')
    .upsert({ user_id: userId, ...updates }, { onConflict: 'user_id' });

  if (error) {
    logger.warn('Failed to update privacy settings', { error: error.message });
    throw new Error(error.message);
  }
}

/**
 * Submits a moderation report against content or a profile.
 */
export async function submitContentReport(input: {
  targetType: ReportTargetType;
  targetId: string;
  reason: ReportReason;
  details?: string;
}): Promise<void> {
  if (!isSupabaseConfigured) {
    return;
  }

  const { error } = await supabase.rpc('submit_report', {
    p_target_type: input.targetType,
    p_target_id: input.targetId,
    p_reason: input.reason,
    p_details: input.details ? input.details.slice(0, 500) : null,
  });

  if (error) {
    throw new Error(error.message);
  }
}

/**
 * Bulk deletes all user walks.
 */
export async function deleteAllWalks(): Promise<number> {
  if (!isSupabaseConfigured) {
    return 0;
  }

  const { data, error } = await supabase.rpc('delete_all_user_walks');
  if (error) {
    throw new Error(error.message);
  }
  return data ?? 0;
}

/**
 * Bulk deletes all user sightings and associated cat cards.
 */
export async function deleteAllSightings(): Promise<{
  deletedSightingsCount: number;
  deletedCatsCount: number;
}> {
  if (!isSupabaseConfigured) {
    return { deletedSightingsCount: 0, deletedCatsCount: 0 };
  }

  const { data, error } = await supabase.rpc('delete_all_user_sightings');
  if (error || !data || data.length === 0) {
    throw new Error(error?.message ?? 'Could not delete sightings.');
  }

  const row = data[0];
  return {
    deletedSightingsCount: Number(row?.deleted_sightings_count ?? 0),
    deletedCatsCount: Number(row?.deleted_cats_count ?? 0),
  };
}

/**
 * Exports user account data via Edge Function.
 */
export async function exportUserData(): Promise<Record<string, unknown>> {
  if (!isSupabaseConfigured) {
    return { message: 'Offline demo export' };
  }

  const { data, error } = await supabase.functions.invoke<{
    success?: boolean;
    data?: Record<string, unknown>;
    error?: string;
  }>('export-data');

  if (error || !data?.data) {
    throw new Error(error?.message ?? data?.error ?? 'Could not export data.');
  }

  return data.data;
}

/**
 * Permanently deletes the user account via Edge Function.
 */
export async function deleteUserAccount(): Promise<void> {
  if (!isSupabaseConfigured) {
    return;
  }

  const { data, error } = await supabase.functions.invoke<{
    success?: boolean;
    error?: string;
  }>('delete-account');

  if (error || !data?.success) {
    throw new Error(
      error?.message ?? data?.error ?? 'Could not delete account.'
    );
  }
}
