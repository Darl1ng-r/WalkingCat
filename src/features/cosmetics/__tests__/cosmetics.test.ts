import { describe, expect, it } from '@jest/globals';

import {
  canUnlockCosmetic,
  computeCosmeticsWallet,
  COSMETIC_CATALOG,
  DEFAULT_CARD_THEME_ID,
  DEFAULT_PROFILE_BANNER_ID,
  DEFAULT_PROFILE_TITLE_ID,
  equipCatTheme,
  equipProfileCosmeticItem,
  getCardThemeTokens,
  getCosmeticById,
  getCosmeticsByCategory,
  getCosmeticsOverview,
  getProfileBannerTokens,
  getProfileTitleLabel,
  getRarityBadgeInfo,
  isCosmeticUnlocked,
  unlockCosmeticItem,
} from '../index';

describe('Phase 13A: Cosmetics Catalog & Wallet Logic', () => {
  it('contains all 15 seeded items across 3 categories with valid starter defaults', () => {
    expect(COSMETIC_CATALOG).toHaveLength(15);

    const themes = getCosmeticsByCategory('card_theme');
    const banners = getCosmeticsByCategory('profile_banner');
    const titles = getCosmeticsByCategory('profile_title');

    expect(themes).toHaveLength(6);
    expect(banners).toHaveLength(4);
    expect(titles).toHaveLength(5);

    // Every category has a 0-cost starter item
    expect(themes[0].id).toBe(DEFAULT_CARD_THEME_ID);
    expect(themes[0].cost_points).toBe(0);
    expect(banners[0].id).toBe(DEFAULT_PROFILE_BANNER_ID);
    expect(banners[0].cost_points).toBe(0);
    expect(titles[0].id).toBe(DEFAULT_PROFILE_TITLE_ID);
    expect(titles[0].cost_points).toBe(0);
  });

  it('looks up cosmetic items by ID and returns null for unknown IDs', () => {
    const goldFoil = getCosmeticById('theme_golden_foil');
    expect(goldFoil).not.toBeNull();
    expect(goldFoil?.name).toBe('Royal Gold Foil');
    expect(goldFoil?.cost_points).toBe(350);

    expect(getCosmeticById('unknown_id')).toBeNull();
    expect(getCosmeticById(null)).toBeNull();
    expect(getCosmeticById(undefined)).toBeNull();
  });

  it('returns accurate card theme tokens and falls back to Classic Amber for unknown IDs', () => {
    const starlight = getCardThemeTokens('theme_starlight_cosmic');
    expect(starlight.id).toBe('theme_starlight_cosmic');
    expect(starlight.foil).toBe(true);
    expect(starlight.accentLabel).toBe('✨ Starlight Foil');
    expect(starlight.badgeClass).toContain('bg-indigo-600');

    const fallback = getCardThemeTokens('non_existent_theme');
    expect(fallback.id).toBe(DEFAULT_CARD_THEME_ID);
    expect(fallback.foil).toBe(false);
    expect(fallback.accentLabel).toBeNull();

    const nullFallback = getCardThemeTokens(null);
    expect(nullFallback.id).toBe(DEFAULT_CARD_THEME_ID);
  });

  it('returns profile banner tokens and walker title labels with starter fallbacks', () => {
    const aurora = getProfileBannerTokens('banner_aurora_sky');
    expect(aurora.id).toBe('banner_aurora_sky');
    expect(aurora.bannerClass).toContain('bg-indigo-100/80');

    const defaultBanner = getProfileBannerTokens('unknown_banner');
    expect(defaultBanner.id).toBe(DEFAULT_PROFILE_BANNER_ID);

    expect(getProfileTitleLabel('title_legend_of_the_ave')).toBe(
      '🏆 Guardian of the Avenue'
    );
    expect(getProfileTitleLabel('unknown_title')).toBe(
      '👟 Neighborhood Stroller'
    );
    expect(getProfileTitleLabel(undefined)).toBe('👟 Neighborhood Stroller');
  });

  it('formats rarity badge metadata for all 5 rarity tiers', () => {
    expect(getRarityBadgeInfo('starter').label).toBe('Starter');
    expect(getRarityBadgeInfo('common').label).toBe('Common');
    expect(getRarityBadgeInfo('rare').label).toBe('Rare');
    expect(getRarityBadgeInfo('epic').label).toBe('Epic');
    expect(getRarityBadgeInfo('legendary').label).toBe('Legendary');
  });

  it('computes wallet balances safely with non-negative clamping', () => {
    expect(computeCosmeticsWallet(250, 90)).toEqual({
      totalEarnedPoints: 250,
      totalSpentPoints: 90,
      availablePoints: 160,
    });

    // Clamps when spent > earned or negative/NaN inputs are passed
    expect(computeCosmeticsWallet(50, 120)).toEqual({
      totalEarnedPoints: 50,
      totalSpentPoints: 120,
      availablePoints: 0,
    });

    expect(computeCosmeticsWallet(-10, Number.NaN)).toEqual({
      totalEarnedPoints: 0,
      totalSpentPoints: 0,
      availablePoints: 0,
    });
  });

  it('evaluates unlock eligibility accurately for starter, locked, and unlocked items', () => {
    const starterItem = getCosmeticById('theme_classic_amber')!;
    const mossItem = getCosmeticById('theme_forest_moss')!; // 50 pts
    const goldItem = getCosmeticById('theme_golden_foil')!; // 350 pts

    const unlocked = new Set<string>(['theme_forest_moss']);

    // Starter item is always unlocked even if not in set
    expect(isCosmeticUnlocked(starterItem, new Set())).toBe(true);
    expect(canUnlockCosmetic(starterItem, 0, new Set())).toEqual({
      canUnlock: false,
      reason: 'already_unlocked',
    });

    // Already unlocked item
    expect(isCosmeticUnlocked(mossItem, unlocked)).toBe(true);
    expect(canUnlockCosmetic(mossItem, 500, unlocked)).toEqual({
      canUnlock: false,
      reason: 'already_unlocked',
    });

    // Locked item with insufficient points
    expect(canUnlockCosmetic(goldItem, 200, unlocked)).toEqual({
      canUnlock: false,
      reason: 'insufficient_points',
    });

    // Locked item with enough points
    expect(canUnlockCosmetic(goldItem, 350, unlocked)).toEqual({
      canUnlock: true,
      reason: 'ready',
    });
  });

  it('provides safe offline defaults when Supabase is not configured', async () => {
    const overview = await getCosmeticsOverview();
    expect(overview.wallet.availablePoints).toBe(0);
    expect(overview.catalog).toHaveLength(15);
    expect(overview.equippedBannerId).toBe(DEFAULT_PROFILE_BANNER_ID);
    expect(overview.equippedTitleId).toBe(DEFAULT_PROFILE_TITLE_ID);
    expect(overview.unlockedIds).toEqual(
      expect.arrayContaining([
        DEFAULT_CARD_THEME_ID,
        DEFAULT_PROFILE_BANNER_ID,
        DEFAULT_PROFILE_TITLE_ID,
      ])
    );

    await expect(unlockCosmeticItem('theme_forest_moss')).rejects.toThrow(
      /Connect to Supabase/
    );
    await expect(equipCatTheme('cat-1', 'theme_forest_moss')).rejects.toThrow(
      /Connect to Supabase/
    );
    await expect(
      equipProfileCosmeticItem('banner', 'banner_cozy_rooftops')
    ).rejects.toThrow(/Connect to Supabase/);
  });
});
