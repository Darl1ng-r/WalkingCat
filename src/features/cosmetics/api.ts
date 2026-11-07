import { track } from '@/lib/analytics';
import { isSupabaseConfigured } from '@/lib/env';
import { supabase } from '@/lib/supabase';

import {
  COSMETIC_CATALOG,
  type CosmeticItem,
  type CosmeticMetadata,
  type CosmeticsOverview,
  type CosmeticsWallet,
  computeCosmeticsWallet,
  DEFAULT_PROFILE_BANNER_ID,
  DEFAULT_PROFILE_TITLE_ID,
} from './catalog';

export interface UnlockCosmeticResult {
  cosmeticId: string;
  pointsSpent: number;
  availablePoints: number;
  alreadyUnlocked: boolean;
}

function getDefaultOverview(): CosmeticsOverview {
  return {
    wallet: {
      totalEarnedPoints: 0,
      totalSpentPoints: 0,
      availablePoints: 0,
    },
    catalog: COSMETIC_CATALOG,
    unlockedIds: COSMETIC_CATALOG.filter((item) => item.cost_points === 0).map(
      (item) => item.id,
    ),
    equippedBannerId: DEFAULT_PROFILE_BANNER_ID,
    equippedTitleId: DEFAULT_PROFILE_TITLE_ID,
  };
}

function parseCosmeticMetadata(raw: unknown): CosmeticMetadata {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return {};
  }
  const record = raw as Record<string, unknown>;
  return {
    border_class: typeof record.border_class === 'string' ? record.border_class : undefined,
    surface_class: typeof record.surface_class === 'string' ? record.surface_class : undefined,
    badge_class: typeof record.badge_class === 'string' ? record.badge_class : undefined,
    accent_label:
      typeof record.accent_label === 'string' || record.accent_label === null
        ? (record.accent_label as string | null)
        : undefined,
    foil: typeof record.foil === 'boolean' ? record.foil : undefined,
    banner_class: typeof record.banner_class === 'string' ? record.banner_class : undefined,
    title_label: typeof record.title_label === 'string' ? record.title_label : undefined,
  };
}

export async function getCosmeticsOverview(): Promise<CosmeticsOverview> {
  if (!isSupabaseConfigured) {
    return getDefaultOverview();
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.user) {
    return getDefaultOverview();
  }

  const userId = session.user.id;

  const [walletRes, catalogRes, unlockedRes, profileRes] = await Promise.all([
    supabase.rpc('get_cosmetics_wallet'),
    supabase
      .from('cosmetic_items')
      .select('*')
      .order('sort_order', { ascending: true }),
    supabase
      .from('user_cosmetics')
      .select('cosmetic_id, points_spent')
      .eq('user_id', userId),
    supabase
      .from('profiles')
      .select('equipped_banner_id, equipped_title_id')
      .eq('id', userId)
      .maybeSingle(),
  ]);

  let wallet: CosmeticsWallet = {
    totalEarnedPoints: 0,
    totalSpentPoints: 0,
    availablePoints: 0,
  };

  const walletRow = Array.isArray(walletRes.data) ? walletRes.data[0] : null;
  if (walletRow) {
    wallet = computeCosmeticsWallet(
      Number(walletRow.total_earned_points ?? 0),
      Number(walletRow.total_spent_points ?? 0),
    );
  }

  const catalog: CosmeticItem[] =
    catalogRes.data && catalogRes.data.length > 0
      ? catalogRes.data.map((row) => ({
          id: row.id,
          category: row.category,
          name: row.name,
          description: row.description,
          icon: row.icon,
          cost_points: row.cost_points,
          rarity: row.rarity,
          metadata: parseCosmeticMetadata(row.metadata),
          sort_order: row.sort_order,
        }))
      : COSMETIC_CATALOG;

  const starterIds = catalog
    .filter((item) => item.cost_points <= 0)
    .map((item) => item.id);

  const unlockedFromDb = (unlockedRes.data ?? []).map((row) => row.cosmetic_id);
  const unlockedIds = Array.from(new Set([...starterIds, ...unlockedFromDb]));

  return {
    wallet,
    catalog,
    unlockedIds,
    equippedBannerId:
      profileRes.data?.equipped_banner_id ?? DEFAULT_PROFILE_BANNER_ID,
    equippedTitleId:
      profileRes.data?.equipped_title_id ?? DEFAULT_PROFILE_TITLE_ID,
  };
}

export async function unlockCosmeticItem(
  cosmeticId: string,
): Promise<UnlockCosmeticResult> {
  if (!isSupabaseConfigured) {
    throw new Error('Connect to Supabase to unlock cosmetics.');
  }

  const { data, error } = await supabase.rpc('unlock_cosmetic', {
    p_cosmetic_id: cosmeticId,
  });

  if (error) {
    throw new Error(error.message);
  }

  const row = Array.isArray(data) ? data[0] : null;
  if (!row) {
    throw new Error('Could not unlock cosmetic item.');
  }

  const result: UnlockCosmeticResult = {
    cosmeticId: row.cosmetic_id,
    pointsSpent: Number(row.points_spent ?? 0),
    availablePoints: Number(row.available_points ?? 0),
    alreadyUnlocked: Boolean(row.already_unlocked),
  };

  if (!result.alreadyUnlocked) {
    void track('cosmetic_unlocked', {
      cosmetic_id: result.cosmeticId,
      points_spent: result.pointsSpent,
    });
  }

  return result;
}

export async function equipCatTheme(
  catId: string,
  themeId: string,
): Promise<string> {
  if (!isSupabaseConfigured) {
    throw new Error('Connect to Supabase to equip card themes.');
  }

  const { data, error } = await supabase.rpc('equip_cat_card_theme', {
    p_cat_id: catId,
    p_theme_id: themeId,
  });

  if (error) {
    throw new Error(error.message);
  }

  void track('cat_theme_equipped', {
    theme_id: themeId,
  });

  return data ?? themeId;
}

export async function equipProfileCosmeticItem(
  slot: 'banner' | 'title',
  cosmeticId: string,
): Promise<string> {
  if (!isSupabaseConfigured) {
    throw new Error('Connect to Supabase to equip profile cosmetics.');
  }

  const { data, error } = await supabase.rpc('equip_profile_cosmetic', {
    p_slot: slot,
    p_cosmetic_id: cosmeticId,
  });

  if (error) {
    throw new Error(error.message);
  }

  void track('profile_cosmetic_equipped', {
    slot,
    cosmetic_id: cosmeticId,
  });

  return data ?? cosmeticId;
}
