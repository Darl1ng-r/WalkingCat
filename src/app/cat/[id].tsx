import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, Platform, Pressable, View } from 'react-native';

import {
  AppIcon,
  Button,
  Card,
  EmptyState,
  ErrorState,
  Input,
  Screen,
  StatTile,
  Text,
} from '@/components/ui';
import {
  CatCard,
  formatCatCardNumber,
  formatCoarseAreaLabel,
  getCatDisplayName,
  useCatCollection,
  useCatDetail,
  useDeleteSightingMutation,
  useLinkSightingMutation,
  useRenameCatMutation,
  useUnlinkSightingMutation,
  validateCatNickname,
  type CatSightingTimelineItem,
} from '@/features/collection';
import {
  getCardThemeTokens,
  getCosmeticsByCategory,
  isCosmeticUnlocked,
  useCosmeticsOverview,
  useEquipCatThemeMutation,
} from '@/features/cosmetics';
import { ReportModal } from '@/features/privacy';
import { invalidateSignedSightingPhotoUrl } from '@/features/sightings';
import { useShareCatCardMutation } from '@/features/social';
import { formatNumber } from '@/lib/format';

function formatShortLocalDate(isoString: string): string {
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) {
    return 'Unknown';
  }
  return date.toLocaleDateString([], {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatDateTime(isoString: string): string {
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) {
    return 'Recorded sighting';
  }
  const datePart = date.toLocaleDateString([], {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  const timePart = date.toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
  });
  return `${datePart} · ${timePart}`;
}

export default function CatDetailScreen() {
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const catId = Array.isArray(params.id) ? params.id[0] ?? '' : params.id ?? '';

  const { data: cat, isLoading, isError, refetch } = useCatDetail(catId);
  const { data: allCats = [] } = useCatCollection('newest');
  const { data: cosmeticsOverview } = useCosmeticsOverview();

  const renameMutation = useRenameCatMutation();
  const linkMutation = useLinkSightingMutation();
  const unlinkMutation = useUnlinkSightingMutation();
  const deleteSightingMutation = useDeleteSightingMutation();
  const shareCardMutation = useShareCatCardMutation();
  const equipThemeMutation = useEquipCatThemeMutation();

  const [isEditingNickname, setIsEditingNickname] = useState(false);
  const [nicknameDraft, setNicknameDraft] = useState('');
  const [nicknameError, setNicknameError] = useState<string | null>(null);
  const [showLinkPicker, setShowLinkPicker] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [sharedSuccessNote, setSharedSuccessNote] = useState<string | null>(
    null
  );
  const [showReportModal, setShowReportModal] = useState(false);

  if (isLoading) {
    return (
      <Screen className="items-center justify-center">
        <Text variant="caption">Loading cat card…</Text>
      </Screen>
    );
  }

  if (isError) {
    return (
      <Screen className="justify-center">
        <ErrorState
          message="Could not load this cat card."
          onRetry={() => {
            refetch().catch(() => {});
          }}
        />
      </Screen>
    );
  }

  if (!cat) {
    return (
      <Screen className="justify-center">
        <EmptyState
          emoji="🐱"
          title="Cat card not found"
          message="This cat card may have been merged or deleted."
          actionLabel="Back to Collection"
          onAction={() => router.back()}
        />
      </Screen>
    );
  }

  const cardNumber = formatCatCardNumber(cat.card_number);
  const displayName = getCatDisplayName(cat.nickname, cat.card_number);
  const coarseAreaLabel = formatCoarseAreaLabel(cat.area_geohash);
  const otherCats = allCats.filter((c) => c.id !== cat.id);
  const equippedTheme = getCardThemeTokens(cat.theme_id);
  const cardThemes = getCosmeticsByCategory(
    'card_theme',
    cosmeticsOverview?.catalog
  );
  const unlockedSet = new Set(cosmeticsOverview?.unlockedIds ?? ['theme_classic_amber']);

  const handleStartEditNickname = () => {
    setNicknameDraft(cat.nickname ?? '');
    setNicknameError(null);
    setIsEditingNickname(true);
  };

  const handleSaveNickname = async () => {
    const check = validateCatNickname(nicknameDraft);
    if (!check.valid) {
      setNicknameError(check.error ?? 'Invalid nickname.');
      return;
    }

    try {
      await renameMutation.mutateAsync({
        catId: cat.id,
        nickname: check.sanitized,
      });
      setIsEditingNickname(false);
      setNicknameError(null);
    } catch (err) {
      setNicknameError(
        err instanceof Error ? err.message : 'Could not update nickname.'
      );
    }
  };

  const handleMergeIntoCat = async (targetCatId: string) => {
    const latestSighting = cat.sightings[0];
    if (!latestSighting) {
      return;
    }
    setActionError(null);

    try {
      await linkMutation.mutateAsync({
        sightingId: latestSighting.id,
        targetCatId,
      });
      setShowLinkPicker(false);
      if (cat.sightings.length <= 1) {
        router.replace(`/cat/${targetCatId}`);
      } else {
        await refetch();
      }
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : 'Could not link sighting.'
      );
    }
  };

  const handleUnlinkSighting = async (sighting: CatSightingTimelineItem) => {
    setActionError(null);
    try {
      const newCatId = await unlinkMutation.mutateAsync(sighting.id);
      await refetch();
      if (newCatId) {
        router.push(`/cat/${newCatId}`);
      }
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : 'Could not unlink sighting.'
      );
    }
  };

  const performDeleteSighting = async (sighting: CatSightingTimelineItem) => {
    setActionError(null);
    const isLastSighting = cat.sightings.length <= 1;
    try {
      await deleteSightingMutation.mutateAsync(sighting.id);
      if (isLastSighting) {
        router.back();
      } else {
        await refetch();
      }
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : 'Could not delete sighting.'
      );
    }
  };

  const handleConfirmDeleteSighting = (sighting: CatSightingTimelineItem) => {
    const isLastSighting = cat.sightings.length <= 1;
    const message = isLastSighting
      ? 'This is the only sighting for this cat. Deleting it will permanently remove the photo and delete this cat card.'
      : 'This sighting photo will be permanently removed from your cat card.';

    if (Platform.OS === 'web') {
      const ok =
        typeof window !== 'undefined' && window.confirm(`Delete sighting? ${message}`);
      if (ok) {
        performDeleteSighting(sighting).catch(() => {});
      }
      return;
    }

    Alert.alert('Delete Sighting?', message, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          performDeleteSighting(sighting).catch(() => {});
        },
      },
    ]);
  };

  // Styled directly after the Reference Image's "Огурец" Cat Profile Screen (Middle-Left & Bottom-Left Mockups)
  return (
    <Screen scroll padded={false} contentContainerClassName="bg-white dark:bg-[#12131C] pb-16">
      {/* 1. Deep Midnight-Ink Header ("< Огурец ⋮") with Large White Arched Dome Cutout Framing the Cat Portrait */}
      <View className="bg-[#191A26] pt-3">
        <View className="flex-row items-center justify-between px-5 pb-4">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Back"
            onPress={() => router.back()}
            className="h-11 w-11 items-center justify-center rounded-pill">
            <AppIcon name="chevronLeft" size={18} color="#FFFFFF" />
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Rename ${displayName}`}
            onPress={handleStartEditNickname}
            className="min-h-[44px] flex-row items-center gap-1.5 px-2">
            <Text className="text-lg font-extrabold text-white">
              {displayName}
            </Text>
            <AppIcon name="edit" size={14} color="#F4A97B" />
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Report"
            onPress={() => setShowReportModal(true)}
            className="h-11 w-11 items-center justify-center rounded-pill">
            <AppIcon name="moreVertical" size={18} color="#FFFFFF" />
          </Pressable>
        </View>

        {/* White Arched Dome Rising into Midnight-Ink Header ("Огурец" Portrait Arch) */}
        <View className="items-center pt-2">
          <View className="relative w-full items-center rounded-t-[200px] bg-white pt-6 dark:bg-[#12131C]">
            {/* Symmetric interactive flanking circular badges */}
            <View className="flex-row items-center justify-center gap-4">
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Spot another cat"
                onPress={() => router.push('/sighting/capture')}
                className="mt-12 h-11 w-11 items-center justify-center rounded-pill border-[1.5px] border-[#191A26] bg-white active:scale-95">
                <AppIcon name="camera" size={16} color="#191A26" />
              </Pressable>

              <View className="relative h-40 w-40 items-center justify-center overflow-hidden rounded-pill border-[3px] border-[#191A26] bg-[#FAF8F5]">
                {cat.coverUrl ? (
                  <Image
                    source={{ uri: cat.coverUrl }}
                    style={{ width: '100%', height: '100%' }}
                    contentFit="cover"
                    cachePolicy="memory-disk"
                    accessibilityLabel={`Hero photo of ${displayName}`}
                    onError={() => {
                      if (cat.cover_photo_path) {
                        invalidateSignedSightingPhotoUrl(cat.cover_photo_path);
                        refetch().catch(() => {});
                      }
                    }}
                  />
                ) : (
                  <AppIcon name="cat" size={56} color="#191A26" />
                )}
              </View>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Open Boutique"
                onPress={() => router.push('/cosmetics' as never)}
                className="mt-12 h-11 w-11 items-center justify-center rounded-pill border-[1.5px] border-[#191A26] bg-white active:scale-95">
                <AppIcon name="palette" size={16} color="#191A26" />
              </Pressable>
            </View>
          </View>
        </View>
      </View>

      {/* Main Content Container */}
      <View className="gap-5 px-5 pt-3">
        {/* 2. Centered Midnight-Ink "Биография" Pill Badge & Subtitle */}
        <View className="items-center gap-1.5">
          <View className="flex-row items-center gap-1.5 rounded-pill border-[1.5px] border-[#191A26] bg-[#191A26] px-6 py-2">
            <AppIcon name={equippedTheme.icon} size={13} color="#F4A97B" />
            <Text className="text-xs font-extrabold text-white">
              {equippedTheme.name}
            </Text>
          </View>
          <Text className="mt-1 text-base font-bold text-[#191A26] dark:text-white">
            Neighborhood Cat · {cardNumber}
          </Text>
          {coarseAreaLabel ? (
            <View className="flex-row items-center gap-1">
              <AppIcon name="pin" size={12} color="#6E7085" />
              <Text variant="caption" className="text-xs text-[#6E7085]">
                {coarseAreaLabel} · Exact location is never saved
              </Text>
            </View>
          ) : null}
        </View>

        {/* 3. Three Outlined Pill Attribute Chips ("Черный / 10 месяцев / 14 кг" in Reference) */}
        <View className="flex-row items-center justify-between gap-2.5">
          <View className="flex-1 items-center rounded-pill border-[1.5px] border-[#191A26] bg-white py-2.5 dark:bg-[#191A26]">
            <Text className="text-xs font-extrabold text-[#191A26] dark:text-white">
              {cardNumber}
            </Text>
            <Text className="text-[10px] font-semibold text-[#6E7085]">
              Card #
            </Text>
          </View>

          <View className="flex-1 items-center rounded-pill border-[1.5px] border-[#191A26] bg-white py-2.5 dark:bg-[#191A26]">
            <Text className="text-xs font-extrabold text-[#191A26] dark:text-white">
              {formatNumber(cat.sighting_count)}×
            </Text>
            <Text className="text-[10px] font-semibold text-[#6E7085]">
              Sightings
            </Text>
          </View>

          <View className="flex-1 items-center rounded-pill border-[1.5px] border-[#191A26] bg-white py-2.5 dark:bg-[#191A26]">
            <Text
              numberOfLines={1}
              className="px-1 text-xs font-extrabold text-[#191A26] dark:text-white">
              {formatShortLocalDate(cat.first_seen_at)}
            </Text>
            <Text className="text-[10px] font-semibold text-[#6E7085]">
              First Seen
            </Text>
          </View>
        </View>

        {/* Inline Nickname Editor */}
        {isEditingNickname ? (
          <Card className="gap-3">
            <Input
              label="Cat Nickname"
              placeholder={`Unnamed cat #${cat.card_number}`}
              value={nicknameDraft}
              onChangeText={(text) => {
                setNicknameDraft(text);
                setNicknameError(null);
              }}
              maxLength={30}
              autoFocus
              error={nicknameError ?? undefined}
              hint="Up to 30 characters. Leave blank to reset."
            />
            <View className="flex-row gap-2.5">
              <Button
                label="Cancel"
                size="sm"
                variant="ghost"
                className="flex-1"
                disabled={renameMutation.isPending}
                onPress={() => {
                  setIsEditingNickname(false);
                  setNicknameError(null);
                }}
              />
              <Button
                label="Save"
                size="sm"
                className="flex-1"
                loading={renameMutation.isPending}
                onPress={() => {
                  handleSaveNickname().catch(() => {});
                }}
              />
            </View>
          </Card>
        ) : null}

        {/* 4. Discovery Stats */}
        <Card className="gap-3">
          <View className="flex-row items-center justify-between">
            <Text className="text-sm font-extrabold text-[#191A26] dark:text-white">
              Discovery Stats
            </Text>
          </View>
          <View className="flex-row gap-3">
            <StatTile
              label="Sightings"
              value={formatNumber(cat.sighting_count)}
              unit={cat.sighting_count === 1 ? 'visit' : 'visits'}
            />
            <StatTile
              label="Last Seen"
              value={formatShortLocalDate(cat.last_seen_at)}
            />
          </View>
        </Card>

        {/* 5. Card Theme Selector */}
        <Card className="gap-3">
          <View className="flex-row items-center justify-between gap-2">
            <View className="flex-1">
              <Text variant="label">Card Theme</Text>
              <Text variant="caption" className="text-xs">
                Equipped: {equippedTheme.name}
              </Text>
            </View>
            <Button
              label="Boutique"
              size="sm"
              variant="ghost"
              onPress={() => router.push('/cosmetics' as never)}
            />
          </View>

          <View className="flex-row flex-wrap gap-2">
            {cardThemes.map((item) => {
              const unlocked = isCosmeticUnlocked(item, unlockedSet);
              const isEquipped = equippedTheme.id === item.id;
              return (
                <Pressable
                  key={item.id}
                  accessibilityRole="button"
                  accessibilityLabel={`${item.name} theme${
                    isEquipped ? ', equipped' : unlocked ? '' : ', locked'
                  }`}
                  disabled={equipThemeMutation.isPending}
                  onPress={() => {
                    if (!unlocked) {
                      router.push('/cosmetics' as never);
                      return;
                    }
                    if (isEquipped) return;
                    setActionError(null);
                    equipThemeMutation
                      .mutateAsync({ catId: cat.id, themeId: item.id })
                      .catch((err) => {
                        setActionError(
                          err instanceof Error
                            ? err.message
                            : 'Could not equip card theme.'
                        );
                      });
                  }}
                  className={`flex-row items-center gap-1.5 rounded-pill border-[1.5px] border-[#191A26] px-3 py-1.5 ${
                    isEquipped
                      ? 'bg-[#191A26]'
                      : unlocked
                        ? 'bg-[#FCE8D5]'
                        : 'bg-white opacity-60'
                  }`}>
                  <AppIcon
                    name={unlocked ? item.icon : 'lock'}
                    size={13}
                    color={isEquipped ? '#F4A97B' : '#191A26'}
                  />
                  <Text
                    variant="caption"
                    className={`text-xs font-extrabold ${
                      isEquipped ? 'text-white' : 'text-[#191A26]'
                    }`}>
                    {item.name}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </Card>

        {/* 6. Deep Midnight-Ink Bottom Section ("Прививки | Посещение врача" style in Reference Middle-Left Screen) */}
        <View className="gap-3 rounded-[28px] bg-[#191A26] p-4">
          {/* Opt-In Per-Card Share to Friends */}
          <View className="flex-row items-center justify-between gap-3 rounded-pill border border-white/25 bg-[#232536] px-4 py-3">
            <View className="flex-1">
              <Text className="text-xs font-extrabold text-white">
                Share Card with Friends
              </Text>
              <Text
                numberOfLines={2}
                className="mt-0.5 text-[11px] text-white/70">
                {sharedSuccessNote ??
                  'Shares photo & nickname to Friends Activity feed'}
              </Text>
            </View>
            <Button
              label={sharedSuccessNote ? 'Shared' : 'Share Card'}
              size="sm"
              variant="primary"
              loading={shareCardMutation.isPending}
              onPress={() => {
                setActionError(null);
                setSharedSuccessNote(null);
                shareCardMutation
                  .mutateAsync(cat.id)
                  .then(() => {
                    setSharedSuccessNote(
                      'Shared with your friends! They can see the photo and nickname in Activity.'
                    );
                  })
                  .catch((err) => {
                    setActionError(
                      err instanceof Error
                        ? err.message
                        : 'Could not share cat card.'
                    );
                  });
              }}
            />
          </View>

          {/* Link to another existing cat */}
          {otherCats.length > 0 ? (
            <View className="gap-3 rounded-[22px] border border-white/25 bg-[#232536] px-4 py-3">
              <View className="flex-row items-center justify-between gap-3">
                <View className="flex-1">
                  <Text className="text-xs font-extrabold text-white">
                    Same Cat as Another Card?
                  </Text>
                  <Text className="mt-0.5 text-[11px] text-white/70">
                    Link latest sighting to another card
                  </Text>
                </View>
                <Button
                  label={showLinkPicker ? 'Close' : 'Merge with another cat'}
                  size="sm"
                  variant="ghost"
                  onPress={() => setShowLinkPicker((prev) => !prev)}
                />
              </View>

              {showLinkPicker ? (
                <View className="gap-2.5 pt-1">
                  <Text className="text-xs font-semibold text-white/80">
                    Tap an existing cat card to merge this sighting into it:
                  </Text>
                  {otherCats.map((other) => (
                    <CatCard
                      key={other.id}
                      cat={other}
                      onPress={(picked) => {
                        handleMergeIntoCat(picked.id).catch(() => {});
                      }}
                    />
                  ))}
                </View>
              ) : null}
            </View>
          ) : null}
        </View>

        {actionError ? (
          <Card className="border-danger bg-danger-muted py-3">
            <Text variant="caption" className="font-semibold text-danger">
              {actionError}
            </Text>
          </Card>
        ) : null}

        {/* 7. Sightings Timeline */}
        <View className="gap-3">
          <Text variant="label">
            Sightings Timeline ({cat.sightings.length})
          </Text>

          {cat.sightings.map((sighting, index) => (
            <Card key={sighting.id} className="gap-3 p-3.5">
              <View className="flex-row items-center gap-3">
                {sighting.imageUri ? (
                  <Image
                    source={{ uri: sighting.imageUri }}
                    style={{ width: 72, height: 72, borderRadius: 14 }}
                    contentFit="cover"
                    cachePolicy="memory-disk"
                    accessibilityLabel={`Sighting ${cat.sightings.length - index} photo`}
                    onError={() => {
                      invalidateSignedSightingPhotoUrl(sighting.photo_path);
                      refetch().catch(() => {});
                    }}
                  />
                ) : (
                  <View className="h-[72px] w-[72px] items-center justify-center rounded-xl bg-[#FCE8D5]">
                    <AppIcon name="cat" size={28} color="#191A26" />
                  </View>
                )}

                <View className="flex-1 gap-1">
                  <Text variant="body" className="font-extrabold">
                    Sighting #{cat.sightings.length - index}
                  </Text>
                  <Text variant="caption" className="text-xs">
                    {formatDateTime(sighting.taken_at)}
                  </Text>
                  {sighting.area_geohash ? (
                    <Text variant="caption" className="text-xs">
                      {formatCoarseAreaLabel(sighting.area_geohash)}
                    </Text>
                  ) : null}
                </View>
              </View>

              <View className="flex-row flex-wrap items-center justify-end gap-2 border-t border-[#191A26]/15 pt-2.5">
                {sighting.walk_id ? (
                  <Button
                    label="View Walk"
                    size="sm"
                    variant="ghost"
                    onPress={() => {
                      router.push(`/walk/${sighting.walk_id}`);
                    }}
                  />
                ) : null}

                {cat.sightings.length > 1 ? (
                  <Button
                    label="Unlink to New Card"
                    size="sm"
                    variant="secondary"
                    loading={unlinkMutation.isPending}
                    onPress={() => {
                      handleUnlinkSighting(sighting).catch(() => {});
                    }}
                  />
                ) : null}

                <Button
                  label="Delete Sighting"
                  size="sm"
                  variant="danger"
                  loading={deleteSightingMutation.isPending}
                  onPress={() => handleConfirmDeleteSighting(sighting)}
                />
              </View>
            </Card>
          ))}
        </View>
      </View>

      <ReportModal
        visible={showReportModal}
        targetType="cat_card"
        targetId={cat.id}
        targetTitle={displayName}
        onClose={() => setShowReportModal(false)}
      />
    </Screen>
  );
}
