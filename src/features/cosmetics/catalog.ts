export type CosmeticCategory = 'card_theme' | 'profile_banner' | 'profile_title';
export type CosmeticRarity = 'starter' | 'common' | 'rare' | 'epic' | 'legendary';

export interface CardThemeTokens {
  id: string;
  name: string;
  icon: string;
  rarity: CosmeticRarity;
  borderClass: string;
  surfaceClass: string;
  badgeClass: string;
  accentLabel: string | null;
  foil: boolean;
}

export interface ProfileBannerTokens {
  id: string;
  name: string;
  icon: string;
  rarity: CosmeticRarity;
  bannerClass: string;
}

export interface CosmeticMetadata {
  border_class?: string;
  surface_class?: string;
  badge_class?: string;
  accent_label?: string | null;
  foil?: boolean;
  banner_class?: string;
  title_label?: string;
}

export interface CosmeticItem {
  id: string;
  category: CosmeticCategory;
  name: string;
  description: string;
  icon: string;
  cost_points: number;
  rarity: CosmeticRarity;
  metadata: CosmeticMetadata;
  sort_order: number;
}

export interface CosmeticsWallet {
  totalEarnedPoints: number;
  totalSpentPoints: number;
  availablePoints: number;
}

export interface CosmeticsOverview {
  wallet: CosmeticsWallet;
  catalog: CosmeticItem[];
  unlockedIds: string[];
  equippedBannerId: string;
  equippedTitleId: string;
}

export const DEFAULT_CARD_THEME_ID = 'theme_classic_amber';
export const DEFAULT_PROFILE_BANNER_ID = 'banner_meadow';
export const DEFAULT_PROFILE_TITLE_ID = 'title_stroller';

export const COSMETIC_CATALOG: CosmeticItem[] = [
  // Card Themes
  {
    id: 'theme_classic_amber',
    category: 'card_theme',
    name: 'Classic Amber',
    description: 'Warm terracotta frame for everyday neighborhood discoveries.',
    icon: '🐾',
    cost_points: 0,
    rarity: 'starter',
    metadata: {
      border_class: 'border-border dark:border-border-dark',
      surface_class: 'bg-surface dark:bg-surface-dark',
      badge_class: 'bg-primary',
      accent_label: null,
      foil: false,
    },
    sort_order: 10,
  },
  {
    id: 'theme_forest_moss',
    category: 'card_theme',
    name: 'Botanical Moss',
    description: 'Earthy sage-green frame inspired by leafy park strolls.',
    icon: '🌿',
    cost_points: 50,
    rarity: 'common',
    metadata: {
      border_class: 'border-2 border-emerald-600/70 dark:border-emerald-400/70',
      surface_class: 'bg-emerald-50/70 dark:bg-emerald-950/30',
      badge_class: 'bg-emerald-600',
      accent_label: '🌿 Park Edition',
      foil: false,
    },
    sort_order: 20,
  },
  {
    id: 'theme_sunset_coral',
    category: 'card_theme',
    name: 'Golden Hour Coral',
    description: 'Soft dusk frame for evening twilight walks.',
    icon: '🌅',
    cost_points: 100,
    rarity: 'rare',
    metadata: {
      border_class: 'border-2 border-amber-500/80 dark:border-amber-400/80',
      surface_class: 'bg-amber-50/80 dark:bg-amber-950/30',
      badge_class: 'bg-amber-600',
      accent_label: '🌅 Sunset Edition',
      foil: false,
    },
    sort_order: 30,
  },
  {
    id: 'theme_sakura_blossom',
    category: 'card_theme',
    name: 'Sakura Blossom',
    description: 'Delicate petal-pink border with spring blossom accents.',
    icon: '🌸',
    cost_points: 125,
    rarity: 'rare',
    metadata: {
      border_class: 'border-2 border-pink-400/80 dark:border-pink-400/70',
      surface_class: 'bg-pink-50/70 dark:bg-pink-950/30',
      badge_class: 'bg-pink-500',
      accent_label: '🌸 Blossom',
      foil: false,
    },
    sort_order: 40,
  },
  {
    id: 'theme_starlight_cosmic',
    category: 'card_theme',
    name: 'Midnight Starlight',
    description: 'Deep indigo cosmic frame with stardust shimmer.',
    icon: '✨',
    cost_points: 200,
    rarity: 'epic',
    metadata: {
      border_class: 'border-2 border-indigo-500 dark:border-indigo-400',
      surface_class: 'bg-indigo-50/80 dark:bg-indigo-950/40',
      badge_class: 'bg-indigo-600',
      accent_label: '✨ Starlight Foil',
      foil: true,
    },
    sort_order: 50,
  },
  {
    id: 'theme_golden_foil',
    category: 'card_theme',
    name: 'Royal Gold Foil',
    description: 'Collector’s holographic gold foil frame for treasured felines.',
    icon: '👑',
    cost_points: 350,
    rarity: 'legendary',
    metadata: {
      border_class: 'border-2 border-yellow-500 dark:border-yellow-400',
      surface_class: 'bg-yellow-50/90 dark:bg-yellow-950/40',
      badge_class: 'bg-yellow-600',
      accent_label: '👑 Collector Foil',
      foil: true,
    },
    sort_order: 60,
  },

  // Profile Banners
  {
    id: 'banner_meadow',
    category: 'profile_banner',
    name: 'Morning Meadow',
    description: 'Fresh sunlit greenery for every walker.',
    icon: '🌱',
    cost_points: 0,
    rarity: 'starter',
    metadata: {
      banner_class: 'bg-primary-muted/40 border-border dark:bg-surface-dark dark:border-border-dark',
    },
    sort_order: 110,
  },
  {
    id: 'banner_cozy_rooftops',
    category: 'profile_banner',
    name: 'Cozy Rooftops',
    description: 'Warm terracotta tiles where neighborhood cats nap.',
    icon: '🏘️',
    cost_points: 60,
    rarity: 'common',
    metadata: {
      banner_class:
        'bg-amber-100/70 border-amber-400/60 dark:bg-amber-950/40 dark:border-amber-500/50',
    },
    sort_order: 120,
  },
  {
    id: 'banner_twilight_harbor',
    category: 'profile_banner',
    name: 'Twilight Harbor',
    description: 'Calm coastal breeze and evening lantern glow.',
    icon: '🌊',
    cost_points: 120,
    rarity: 'rare',
    metadata: {
      banner_class:
        'bg-sky-100/70 border-sky-400/60 dark:bg-sky-950/40 dark:border-sky-500/50',
    },
    sort_order: 130,
  },
  {
    id: 'banner_aurora_sky',
    category: 'profile_banner',
    name: 'Aurora Night Walk',
    description: 'Luminous northern lights over quiet evening paths.',
    icon: '🌌',
    cost_points: 220,
    rarity: 'epic',
    metadata: {
      banner_class:
        'bg-indigo-100/80 border-indigo-500/70 dark:bg-indigo-950/50 dark:border-indigo-400/60',
    },
    sort_order: 140,
  },

  // Profile Titles
  {
    id: 'title_stroller',
    category: 'profile_title',
    name: 'Neighborhood Stroller',
    description: 'Default friendly walker title.',
    icon: '👟',
    cost_points: 0,
    rarity: 'starter',
    metadata: {
      title_label: '👟 Neighborhood Stroller',
    },
    sort_order: 210,
  },
  {
    id: 'title_cat_spotter',
    category: 'profile_title',
    name: 'Gentle Cat Spotter',
    description: 'For walkers who always keep a respectful distance.',
    icon: '🔭',
    cost_points: 40,
    rarity: 'common',
    metadata: {
      title_label: '🔭 Gentle Cat Spotter',
    },
    sort_order: 220,
  },
  {
    id: 'title_rain_or_shine',
    category: 'profile_title',
    name: 'Rain or Shine Walker',
    description: 'Steady steps in every season.',
    icon: '🌦️',
    cost_points: 90,
    rarity: 'rare',
    metadata: {
      title_label: '🌦️ Rain or Shine Walker',
    },
    sort_order: 230,
  },
  {
    id: 'title_feline_chronicler',
    category: 'profile_title',
    name: 'Feline Chronicler',
    description: 'Curator of a distinguished cat card album.',
    icon: '📖',
    cost_points: 180,
    rarity: 'epic',
    metadata: {
      title_label: '📖 Feline Chronicler',
    },
    sort_order: 240,
  },
  {
    id: 'title_legend_of_the_ave',
    category: 'profile_title',
    name: 'Guardian of the Avenue',
    description: 'Master walker and friend to all community cats.',
    icon: '🏆',
    cost_points: 300,
    rarity: 'legendary',
    metadata: {
      title_label: '🏆 Guardian of the Avenue',
    },
    sort_order: 250,
  },
];

const CATALOG_MAP = new Map<string, CosmeticItem>(
  COSMETIC_CATALOG.map((item) => [item.id, item]),
);

export function getCosmeticById(id: string | null | undefined): CosmeticItem | null {
  if (!id) return null;
  return CATALOG_MAP.get(id) ?? null;
}

export function getCosmeticsByCategory(
  category: CosmeticCategory,
  items: CosmeticItem[] = COSMETIC_CATALOG,
): CosmeticItem[] {
  return items
    .filter((item) => item.category === category)
    .sort((a, b) => a.sort_order - b.sort_order);
}

export function getCardThemeTokens(themeId?: string | null): CardThemeTokens {
  const item =
    (themeId ? CATALOG_MAP.get(themeId) : undefined) ??
    CATALOG_MAP.get(DEFAULT_CARD_THEME_ID)!;

  return {
    id: item.id,
    name: item.name,
    icon: item.icon,
    rarity: item.rarity,
    borderClass: item.metadata.border_class ?? 'border-border dark:border-border-dark',
    surfaceClass: item.metadata.surface_class ?? 'bg-surface dark:bg-surface-dark',
    badgeClass: item.metadata.badge_class ?? 'bg-primary',
    accentLabel: item.metadata.accent_label ?? null,
    foil: Boolean(item.metadata.foil),
  };
}

export function getProfileBannerTokens(bannerId?: string | null): ProfileBannerTokens {
  const item =
    (bannerId ? CATALOG_MAP.get(bannerId) : undefined) ??
    CATALOG_MAP.get(DEFAULT_PROFILE_BANNER_ID)!;

  return {
    id: item.id,
    name: item.name,
    icon: item.icon,
    rarity: item.rarity,
    bannerClass:
      item.metadata.banner_class ??
      'bg-primary-muted/40 border-border dark:bg-surface-dark dark:border-border-dark',
  };
}

export function getProfileTitleLabel(titleId?: string | null): string {
  const item =
    (titleId ? CATALOG_MAP.get(titleId) : undefined) ??
    CATALOG_MAP.get(DEFAULT_PROFILE_TITLE_ID)!;

  return item.metadata.title_label ?? `${item.icon} ${item.name}`;
}

export function getRarityBadgeInfo(rarity: CosmeticRarity): {
  label: string;
  className: string;
  textClassName: string;
} {
  switch (rarity) {
    case 'starter':
      return {
        label: 'Starter',
        className: 'bg-border/60 dark:bg-border-dark',
        textClassName: 'text-text-muted dark:text-text-dark-muted',
      };
    case 'common':
      return {
        label: 'Common',
        className: 'bg-emerald-500/15',
        textClassName: 'text-emerald-700 dark:text-emerald-300',
      };
    case 'rare':
      return {
        label: 'Rare',
        className: 'bg-sky-500/15',
        textClassName: 'text-sky-700 dark:text-sky-300',
      };
    case 'epic':
      return {
        label: 'Epic',
        className: 'bg-indigo-500/15',
        textClassName: 'text-indigo-700 dark:text-indigo-300',
      };
    case 'legendary':
      return {
        label: 'Legendary',
        className: 'bg-amber-500/20',
        textClassName: 'text-amber-700 dark:text-amber-300',
      };
  }
}

export function isCosmeticUnlocked(
  item: Pick<CosmeticItem, 'id' | 'cost_points'>,
  unlockedIds: ReadonlySet<string> | string[],
): boolean {
  if (item.cost_points <= 0) return true;
  if (Array.isArray(unlockedIds)) {
    return unlockedIds.includes(item.id);
  }
  return unlockedIds.has(item.id);
}

export function canUnlockCosmetic(
  item: Pick<CosmeticItem, 'id' | 'cost_points'>,
  availablePoints: number,
  unlockedIds: ReadonlySet<string> | string[],
): {
  canUnlock: boolean;
  reason: 'already_unlocked' | 'insufficient_points' | 'ready';
} {
  if (isCosmeticUnlocked(item, unlockedIds)) {
    return { canUnlock: false, reason: 'already_unlocked' };
  }
  if (availablePoints < item.cost_points) {
    return { canUnlock: false, reason: 'insufficient_points' };
  }
  return { canUnlock: true, reason: 'ready' };
}

export function computeCosmeticsWallet(
  totalEarned: number,
  totalSpent: number,
): CosmeticsWallet {
  const safeEarned = Math.max(0, Math.floor(Number.isFinite(totalEarned) ? totalEarned : 0));
  const safeSpent = Math.max(0, Math.floor(Number.isFinite(totalSpent) ? totalSpent : 0));
  return {
    totalEarnedPoints: safeEarned,
    totalSpentPoints: safeSpent,
    availablePoints: Math.max(0, safeEarned - safeSpent),
  };
}
