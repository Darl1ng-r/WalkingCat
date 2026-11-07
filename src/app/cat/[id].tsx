import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, Platform, Pressable, View } from 'react-native';

import {
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
import { invalidateSignedSightingPhotoUrl } from '@/features/sightings';
import { ReportModal } from '@/features/privacy';
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

  return (
    <Screen scroll contentContainerClassName="gap-5 pb-12 pt-2">
      {/* Top Header */}
      <View className="flex-row items-start justify-between gap-3">
        <View className="flex-1">
          <View className="flex-row items-center gap-2">
            <View className="rounded-pill bg-primary/15 px-2.5 py-0.5">
              <Text variant="label">{cardNumber}</Text>
            </View>
            <Text variant="label">Collectible Cat Card</Text>
          </View>

          {!isEditingNickname ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Rename ${displayName}`}
              onPress={handleStartEditNickname}
              className="mt-1 flex-row items-center gap-2">
              <Text variant="title">{displayName}</Text>
              <Text variant="caption" className="text-xs font-semibold text-primary">
                ✏️ Edit
              </Text>
            </Pressable>
          ) : null}
        </View>

        <View className="flex-row gap-2">
          <Button
            label="Report"
            size="sm"
            variant="ghost"
            onPress={() => setShowReportModal(true)}
          />
          <Button
            label="Back"
            size="sm"
            variant="ghost"
            onPress={() => router.back()}
          />
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

      {/* Hero Photo Card */}
      <Card
        className={`overflow-hidden p-2.5 ${equippedTheme.surfaceClass} ${equippedTheme.borderClass}`}>
        <View className="relative overflow-hidden rounded-lg bg-primary-muted dark:bg-surface-elevated-dark">
          {cat.coverUrl ? (
            <Image
              source={{ uri: cat.coverUrl }}
              style={{ width: '100%', height: 280 }}
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
            <View
              style={{ height: 240 }}
              className="items-center justify-center">
              <Text className="text-6xl">🐱</Text>
            </View>
          )}

          <View className="absolute left-3 top-3 rounded-pill bg-black/65 px-3 py-1">
            <Text variant="caption" className="font-bold text-white">
              {cardNumber}
            </Text>
          </View>

          <View
            className={`absolute right-3 top-3 rounded-pill px-3 py-1 ${equippedTheme.badgeClass}`}>
            <Text variant="caption" className="font-bold text-white">
              🐾 {cat.sighting_count}{' '}
              {cat.sighting_count === 1 ? 'sighting' : 'sightings'}
            </Text>
          </View>

          {equippedTheme.accentLabel ? (
            <View className="absolute bottom-3 left-3 rounded-pill bg-black/70 px-3 py-1">
              <Text variant="caption" className="font-semibold text-white">
                {equippedTheme.accentLabel}
              </Text>
            </View>
          ) : null}
        </View>

        {coarseAreaLabel ? (
          <View className="mt-2.5 flex-row items-center gap-2 px-1">
            <Text className="text-sm">📍</Text>
            <Text variant="caption" className="text-xs font-medium">
              {coarseAreaLabel} · Exact location is never saved
            </Text>
          </View>
        ) : null}
      </Card>

      {/* Card Theme Selector */}
      <Card className="gap-3">
        <View className="flex-row items-center justify-between gap-2">
          <View className="flex-1">
            <Text variant="label">🎨 Card Theme</Text>
            <Text variant="caption" className="text-xs">
              Equipped: {equippedTheme.icon} {equippedTheme.name}
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
                className={`flex-row items-center gap-1.5 rounded-pill border px-3 py-1.5 ${
                  isEquipped
                    ? 'border-primary bg-primary/15'
                    : unlocked
                      ? 'border-border bg-surface-elevated dark:border-border-dark dark:bg-surface-elevated-dark'
                      : 'border-border/60 bg-surface/50 opacity-65 dark:border-border-dark/60 dark:bg-surface-dark/50'
                }`}>
                <Text className="text-sm">{unlocked ? item.icon : '🔒'}</Text>
                <Text
                  variant="caption"
                  className={`text-xs font-semibold ${
                    isEquipped
                      ? 'text-primary'
                      : 'text-text-primary dark:text-text-primary-dark'
                  }`}>
                  {item.name}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </Card>

      {/* Stats Grid */}
      <View className="gap-3">
        <Text variant="label">Discovery Stats</Text>
        <View className="flex-row gap-3">
          <StatTile
            label="Sightings"
            value={formatNumber(cat.sighting_count)}
            unit={cat.sighting_count === 1 ? 'visit' : 'visits'}
          />
          <StatTile
            label="First Seen"
            value={formatShortLocalDate(cat.first_seen_at)}
          />
        </View>
        <View className="flex-row gap-3">
          <StatTile
            label="Last Seen"
            value={formatShortLocalDate(cat.last_seen_at)}
          />
          <StatTile
            label="Card Number"
            value={cardNumber}
            unit="in collection"
          />
        </View>
      </View>

      {/* Opt-In Per-Card Share to Friends */}
      <Card className="gap-2.5">
        <View className="flex-row items-center justify-between gap-3">
          <View className="flex-1">
            <Text variant="label">🤝 Share Card with Friends</Text>
            <Text variant="caption" className="mt-0.5 text-xs leading-5">
              {sharedSuccessNote ??
                'Shares only this card’s photo and nickname to your friends’ Activity feed. Area and location are never shared.'}
            </Text>
          </View>
          <Button
            label={sharedSuccessNote ? 'Shared ✓' : 'Share Card'}
            size="sm"
            variant="secondary"
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
      </Card>

      {/* Link to another existing cat */}
      {otherCats.length > 0 ? (
        <Card className="gap-3">
          <View className="flex-row items-center justify-between gap-3">
            <View className="flex-1">
              <Text variant="label">🐾 Same Cat as Another Card?</Text>
              <Text variant="caption" className="mt-0.5 text-xs">
                Manually link the latest sighting to one of your other cat cards.
              </Text>
            </View>
            <Button
              label={showLinkPicker ? 'Close' : "I've seen this cat before"}
              size="sm"
              variant="secondary"
              onPress={() => setShowLinkPicker((prev) => !prev)}
            />
          </View>

          {showLinkPicker ? (
            <View className="gap-2.5 pt-1">
              <Text variant="caption" className="text-xs font-semibold">
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
        </Card>
      ) : null}

      {actionError ? (
        <Card className="border-danger bg-danger-muted py-3">
          <Text variant="caption" className="font-semibold text-danger">
            {actionError}
          </Text>
        </Card>
      ) : null}

      {/* Sightings Timeline */}
      <View className="gap-3">
        <Text variant="label">
          Sightings Timeline ({cat.sightings.length})
        </Text>

        {cat.sightings.map((sighting, index) => (
          <Card key={sighting.id} className="gap-3 p-3">
            <View className="flex-row items-center gap-3">
              {sighting.imageUri ? (
                <Image
                  source={{ uri: sighting.imageUri }}
                  style={{ width: 72, height: 72, borderRadius: 12 }}
                  contentFit="cover"
                  cachePolicy="memory-disk"
                  accessibilityLabel={`Sighting ${cat.sightings.length - index} photo`}
                  onError={() => {
                    invalidateSignedSightingPhotoUrl(sighting.photo_path);
                    refetch().catch(() => {});
                  }}
                />
              ) : (
                <View className="h-[72px] w-[72px] items-center justify-center rounded-xl bg-primary-muted dark:bg-surface-elevated-dark">
                  <Text className="text-2xl">🐱</Text>
                </View>
              )}

              <View className="flex-1 gap-1">
                <Text variant="body" className="font-semibold">
                  Sighting #{cat.sightings.length - index}
                </Text>
                <Text variant="caption" className="text-xs">
                  {formatDateTime(sighting.taken_at)}
                </Text>
                {sighting.area_geohash ? (
                  <Text variant="caption" className="text-xs">
                    📍 {formatCoarseAreaLabel(sighting.area_geohash)}
                  </Text>
                ) : null}
              </View>
            </View>

            <View className="flex-row flex-wrap items-center justify-end gap-2 border-t border-border pt-2.5 dark:border-border-dark">
              {sighting.walk_id ? (
                <Button
                  label="🥾 View Walk"
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
