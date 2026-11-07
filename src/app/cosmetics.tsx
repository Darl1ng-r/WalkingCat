import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useState } from 'react';
import { Platform, Pressable, View } from 'react-native';

import {
  Button,
  Card,
  ErrorState,
  Screen,
  Skeleton,
  StatTile,
  Text,
} from '@/components/ui';
import {
  canUnlockCosmetic,
  type CosmeticCategory,
  type CosmeticItem,
  getCardThemeTokens,
  getCosmeticsByCategory,
  getProfileBannerTokens,
  getProfileTitleLabel,
  getRarityBadgeInfo,
  isCosmeticUnlocked,
  useCosmeticsOverview,
  useEquipProfileCosmeticMutation,
  useUnlockCosmeticMutation,
} from '@/features/cosmetics';
import { formatNumber } from '@/lib/format';

const CATEGORY_TABS: { key: CosmeticCategory; label: string }[] = [
  { key: 'card_theme', label: '🎨 Card Themes' },
  { key: 'profile_banner', label: '🖼️ Banners' },
  { key: 'profile_title', label: '🏷️ Titles' },
];

export default function CosmeticsScreen() {
  const { data: overview, isLoading, isError, refetch } = useCosmeticsOverview();
  const unlockMutation = useUnlockCosmeticMutation();
  const equipProfileMutation = useEquipProfileCosmeticMutation();

  const [selectedCategory, setSelectedCategory] =
    useState<CosmeticCategory>('card_theme');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [pendingItemId, setPendingItemId] = useState<string | null>(null);

  if (isLoading && !overview) {
    return (
      <Screen scroll contentContainerClassName="gap-5 pb-12 pt-2">
        <View className="flex-row items-center justify-between">
          <Text variant="title">Paw Points Boutique</Text>
          <Button
            label="Back"
            size="sm"
            variant="ghost"
            onPress={() => router.back()}
          />
        </View>
        <Skeleton height={116} borderRadius={20} />
        <Skeleton height={44} borderRadius={999} />
        <Skeleton height={160} borderRadius={20} />
        <Skeleton height={160} borderRadius={20} />
      </Screen>
    );
  }

  if (isError && !overview) {
    return (
      <Screen className="justify-center">
        <ErrorState
          message="Could not load the Paw Points Boutique."
          onRetry={() => {
            refetch().catch(() => {});
          }}
        />
      </Screen>
    );
  }

  const wallet = overview?.wallet ?? {
    totalEarnedPoints: 0,
    totalSpentPoints: 0,
    availablePoints: 0,
  };
  const unlockedSet = new Set(overview?.unlockedIds ?? []);
  const items = getCosmeticsByCategory(selectedCategory, overview?.catalog);

  const handleUnlock = async (item: CosmeticItem) => {
    setErrorMessage(null);
    setStatusMessage(null);
    setPendingItemId(item.id);
    try {
      const result = await unlockMutation.mutateAsync(item.id);
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(
          Haptics.NotificationFeedbackType.Success
        ).catch(() => {});
      }
      setStatusMessage(
        result.alreadyUnlocked
          ? `${item.icon} ${item.name} is already unlocked!`
          : `Unlocked ${item.icon} ${item.name}! (${formatNumber(
              result.availablePoints
            )} pts remaining)`
      );
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Could not unlock cosmetic.'
      );
    } finally {
      setPendingItemId(null);
    }
  };

  const handleEquipProfile = async (
    slot: 'banner' | 'title',
    item: CosmeticItem
  ) => {
    setErrorMessage(null);
    setStatusMessage(null);
    setPendingItemId(item.id);
    try {
      await equipProfileMutation.mutateAsync({
        slot,
        cosmeticId: item.id,
      });
      if (Platform.OS !== 'web') {
        Haptics.selectionAsync().catch(() => {});
      }
      setStatusMessage(`Equipped ${item.icon} ${item.name} on your profile!`);
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Could not equip cosmetic.'
      );
    } finally {
      setPendingItemId(null);
    }
  };

  return (
    <Screen scroll contentContainerClassName="gap-5 pb-12 pt-2">
      {/* Header */}
      <View className="flex-row items-start justify-between gap-3">
        <View className="flex-1">
          <Text variant="label">Cosmetics & Collectibles</Text>
          <Text variant="title" className="mt-1">
            Paw Points Boutique
          </Text>
          <Text variant="caption" className="mt-1 leading-5">
            Spend Paw Points earned from walking and gentle cat sightings on card
            themes, profile banners, and walker titles.
          </Text>
        </View>
        <Button
          label="Back"
          size="sm"
          variant="ghost"
          onPress={() => router.back()}
        />
      </View>

      {/* Wallet Summary */}
      <Card className="gap-3">
        <View className="flex-row items-center justify-between">
          <Text variant="label">🐾 Your Paw Points Wallet</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="View challenges to earn more points"
            onPress={() => router.push('/challenges')}>
            <Text variant="caption" className="text-xs font-semibold text-primary">
              Earn more →
            </Text>
          </Pressable>
        </View>

        <View className="flex-row gap-2.5">
          <StatTile
            label="Available"
            value={formatNumber(wallet.availablePoints)}
            unit="pts to spend"
          />
          <StatTile
            label="Lifetime"
            value={formatNumber(wallet.totalEarnedPoints)}
            unit="pts earned"
          />
          <StatTile
            label="Spent"
            value={formatNumber(wallet.totalSpentPoints)}
            unit="pts unlocked"
          />
        </View>

        <Text variant="caption" className="text-xs leading-5">
          💡 Unlocking cosmetics never reduces your lifetime Paw Points or your
          weekly leaderboard score.
        </Text>
      </Card>

      {statusMessage ? (
        <Card className="border-success/50 bg-success/10 py-3">
          <Text
            variant="caption"
            className="font-semibold text-emerald-700 dark:text-emerald-300">
            {statusMessage}
          </Text>
        </Card>
      ) : null}

      {errorMessage ? (
        <Card className="border-danger bg-danger-muted py-3">
          <Text variant="caption" className="font-semibold text-danger">
            {errorMessage}
          </Text>
        </Card>
      ) : null}

      {/* Category Switcher */}
      <View className="flex-row gap-2">
        {CATEGORY_TABS.map((tab) => {
          const active = selectedCategory === tab.key;
          return (
            <Pressable
              key={tab.key}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              onPress={() => {
                setSelectedCategory(tab.key);
                setStatusMessage(null);
                setErrorMessage(null);
              }}
              className={`flex-1 items-center justify-center rounded-pill border px-3 py-2.5 ${
                active
                  ? 'border-primary bg-primary'
                  : 'border-border bg-surface dark:border-border-dark dark:bg-surface-dark'
              }`}>
              <Text
                variant="caption"
                className={`text-xs font-bold ${
                  active
                    ? 'text-white'
                    : 'text-text-primary dark:text-text-primary-dark'
                }`}>
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Category Hint */}
      {selectedCategory === 'card_theme' ? (
        <Text variant="caption" className="text-xs leading-5">
          Unlocked card themes can be equipped individually on any cat card in your{' '}
          <Text
            variant="caption"
            className="text-xs font-bold text-primary"
            onPress={() => router.push('/(tabs)/collection')}>
            Cat Collection
          </Text>
          .
        </Text>
      ) : null}

      {/* Catalog List */}
      <View className="gap-3.5">
        {items.map((item) => {
          const unlocked = isCosmeticUnlocked(item, unlockedSet);
          const eligibility = canUnlockCosmetic(
            item,
            wallet.availablePoints,
            unlockedSet
          );
          const rarityBadge = getRarityBadgeInfo(item.rarity);
          const isPendingThis = pendingItemId === item.id;

          const isEquippedProfileBanner =
            item.category === 'profile_banner' &&
            (overview?.equippedBannerId ?? 'banner_meadow') === item.id;
          const isEquippedProfileTitle =
            item.category === 'profile_title' &&
            (overview?.equippedTitleId ?? 'title_stroller') === item.id;

          const themePreview =
            item.category === 'card_theme' ? getCardThemeTokens(item.id) : null;
          const bannerPreview =
            item.category === 'profile_banner'
              ? getProfileBannerTokens(item.id)
              : null;
          const titlePreview =
            item.category === 'profile_title'
              ? getProfileTitleLabel(item.id)
              : null;

          return (
            <Card key={item.id} className="gap-3">
              {/* Top Row: Icon + Name + Rarity + Cost */}
              <View className="flex-row items-start justify-between gap-3">
                <View className="flex-1 flex-row items-start gap-3">
                  <View className="h-11 w-11 items-center justify-center rounded-2xl bg-primary-muted dark:bg-surface-elevated-dark">
                    <Text className="text-2xl">{item.icon}</Text>
                  </View>
                  <View className="flex-1 gap-1">
                    <View className="flex-row flex-wrap items-center gap-2">
                      <Text variant="body" className="font-bold">
                        {item.name}
                      </Text>
                      <View
                        className={`rounded-pill px-2 py-0.5 ${rarityBadge.className}`}>
                        <Text
                          variant="caption"
                          className={`text-[10px] font-bold ${rarityBadge.textClassName}`}>
                          {rarityBadge.label}
                        </Text>
                      </View>
                    </View>
                    <Text variant="caption" className="text-xs leading-5">
                      {item.description}
                    </Text>
                  </View>
                </View>

                <View className="items-end">
                  {unlocked ? (
                    <View className="rounded-pill bg-emerald-500/15 px-2.5 py-1">
                      <Text
                        variant="caption"
                        className="text-xs font-bold text-emerald-700 dark:text-emerald-300">
                        Unlocked ✓
                      </Text>
                    </View>
                  ) : (
                    <View className="rounded-pill bg-primary/15 px-2.5 py-1">
                      <Text
                        variant="caption"
                        className="text-xs font-bold text-primary">
                        🐾 {formatNumber(item.cost_points)} pts
                      </Text>
                    </View>
                  )}
                </View>
              </View>

              {/* Visual Swatch Preview */}
              {themePreview ? (
                <View
                  className={`flex-row items-center justify-between rounded-xl border p-3 ${themePreview.surfaceClass} ${themePreview.borderClass}`}>
                  <View className="flex-row items-center gap-2">
                    <View className="rounded-pill bg-black/65 px-2.5 py-0.5">
                      <Text
                        variant="caption"
                        className="text-[11px] font-bold text-white">
                        #001
                      </Text>
                    </View>
                    <Text variant="caption" className="text-xs font-semibold">
                      Sample Cat Card Frame
                    </Text>
                  </View>
                  <View className="flex-row items-center gap-1.5">
                    {themePreview.accentLabel ? (
                      <View className="rounded-pill bg-black/70 px-2 py-0.5">
                        <Text
                          variant="caption"
                          className="text-[10px] font-semibold text-white">
                          {themePreview.accentLabel}
                        </Text>
                      </View>
                    ) : null}
                    <View
                      className={`rounded-pill px-2.5 py-0.5 ${themePreview.badgeClass}`}>
                      <Text
                        variant="caption"
                        className="text-[11px] font-bold text-white">
                        🐾 3×
                      </Text>
                    </View>
                  </View>
                </View>
              ) : null}

              {bannerPreview ? (
                <View
                  className={`flex-row items-center justify-between rounded-xl border p-3 ${bannerPreview.bannerClass}`}>
                  <Text variant="caption" className="text-xs font-semibold">
                    {item.icon} Profile Banner Backdrop Preview
                  </Text>
                  {isEquippedProfileBanner ? (
                    <Text
                      variant="caption"
                      className="text-xs font-bold text-primary">
                      Equipped ✓
                    </Text>
                  ) : null}
                </View>
              ) : null}

              {titlePreview ? (
                <View className="flex-row items-center justify-between rounded-xl border border-border bg-surface-elevated p-3 dark:border-border-dark dark:bg-surface-elevated-dark">
                  <View className="rounded-pill bg-primary/15 px-3 py-1">
                    <Text
                      variant="caption"
                      className="text-xs font-bold text-primary">
                      {titlePreview}
                    </Text>
                  </View>
                  {isEquippedProfileTitle ? (
                    <Text
                      variant="caption"
                      className="text-xs font-bold text-primary">
                      Equipped ✓
                    </Text>
                  ) : null}
                </View>
              ) : null}

              {/* Action Row */}
              <View className="flex-row items-center justify-end gap-2">
                {!unlocked ? (
                  <Button
                    label={
                      eligibility.canUnlock
                        ? `Unlock for ${formatNumber(item.cost_points)} pts`
                        : `Need ${formatNumber(
                            item.cost_points - wallet.availablePoints
                          )} more pts`
                    }
                    size="sm"
                    variant={eligibility.canUnlock ? 'primary' : 'secondary'}
                    disabled={!eligibility.canUnlock || unlockMutation.isPending}
                    loading={isPendingThis && unlockMutation.isPending}
                    onPress={() => {
                      handleUnlock(item).catch(() => {});
                    }}
                  />
                ) : item.category === 'card_theme' ? (
                  <Button
                    label="Choose Cat Card to Equip →"
                    size="sm"
                    variant="secondary"
                    onPress={() => router.push('/(tabs)/collection')}
                  />
                ) : item.category === 'profile_banner' ? (
                  <Button
                    label={
                      isEquippedProfileBanner ? 'Equipped ✓' : 'Equip Banner'
                    }
                    size="sm"
                    variant={isEquippedProfileBanner ? 'ghost' : 'secondary'}
                    disabled={
                      isEquippedProfileBanner || equipProfileMutation.isPending
                    }
                    loading={isPendingThis && equipProfileMutation.isPending}
                    onPress={() => {
                      handleEquipProfile('banner', item).catch(() => {});
                    }}
                  />
                ) : (
                  <Button
                    label={isEquippedProfileTitle ? 'Equipped ✓' : 'Equip Title'}
                    size="sm"
                    variant={isEquippedProfileTitle ? 'ghost' : 'secondary'}
                    disabled={
                      isEquippedProfileTitle || equipProfileMutation.isPending
                    }
                    loading={isPendingThis && equipProfileMutation.isPending}
                    onPress={() => {
                      handleEquipProfile('title', item).catch(() => {});
                    }}
                  />
                )}
              </View>
            </Card>
          );
        })}
      </View>
    </Screen>
  );
}
