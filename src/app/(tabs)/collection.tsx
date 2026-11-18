import { FlashList } from '@shopify/flash-list';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';

import {
  AppIcon,
  Button,
  Card,
  EmptyState,
  ErrorState,
  GlassPill,
  ProgressStripBento,
  Screen,
  StatTile,
  Text,
} from '@/components/ui';
import {
  CatCard,
  computeCollectionHeaderStats,
  useCatCollection,
  useDeleteSightingMutation,
  useRecentSubmissions,
  type CatCardItem,
  type CatCollectionSort,
} from '@/features/collection';
import { getSightingStatusCopy } from '@/features/sightings';
import { formatNumber } from '@/lib/format';

const SORT_OPTIONS: { label: string; key: CatCollectionSort }[] = [
  { label: 'Newest', key: 'newest' },
  { label: 'Most Seen', key: 'most_seen' },
  { label: 'A–Z', key: 'a_z' },
];

export default function CollectionScreen() {
  const [sort, setSort] = useState<CatCollectionSort>('newest');
  const {
    data: cats = [],
    isLoading,
    isError,
    refetch,
  } = useCatCollection(sort);
  const { data: recentSubmissions = [] } = useRecentSubmissions(8);
  const deleteSightingMutation = useDeleteSightingMutation();

  const headerStats = useMemo(
    () => computeCollectionHeaderStats(cats),
    [cats]
  );

  // Styled after the reference image's "Статьи" / "События" screen (midnight-ink header + 3 large overlapping circular badges + filter pill row + 2-col ink-outlined cards)
  const renderHeader = () => (
    <View className="gap-4 pb-4">
      {/* Midnight-Ink Top Header */}
      <View className="bg-[#191A26] px-5 pb-12 pt-3">
        <View className="flex-row items-center justify-between">
          <Text className="text-lg font-extrabold text-white">
            Cat Collection
          </Text>
          <View className="flex-row items-center gap-2">
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Open Card Themes Boutique"
              onPress={() => router.push('/cosmetics')}
              className="flex-row items-center gap-1.5 rounded-pill border border-white/30 bg-[#252738] px-3 py-1">
              <AppIcon name="sparkles" size={12} color="#F4A97B" />
              <Text className="text-xs font-bold text-[#F4A97B]">Themes</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Spot a Cat"
              onPress={() => router.push('/sighting/capture')}
              className="h-8 w-8 items-center justify-center rounded-pill border border-white/30 bg-[#F4A97B]">
              <Text className="text-base font-extrabold text-[#191A26]">+</Text>
            </Pressable>
          </View>
        </View>
      </View>

      {/* 3 Overlapping Circular Category/Stat Badges ("Все | Собаки | Коты" in Reference) */}
      <View
        style={{ zIndex: 20 }}
        className="-mt-12 flex-row items-center justify-around px-2">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`All Cats: ${headerStats.totalCats}`}
          onPress={() => setSort('newest')}
          className="items-center">
          <View className="rounded-pill bg-[#FAF8F5] p-1.5 dark:bg-[#12131C]">
            <View className="h-[74px] w-[74px] items-center justify-center rounded-pill border-[2.5px] border-[#191A26] bg-[#191A26] shadow-sm">
              <View className="h-[62px] w-[62px] items-center justify-center rounded-pill border border-white/40">
                <Text className="text-base font-extrabold text-white">
                  {formatNumber(headerStats.totalCats)}
                </Text>
                <Text className="text-[10px] font-bold text-white/80">Cats</Text>
              </View>
            </View>
          </View>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Total Sightings: ${headerStats.totalSightings}`}
          onPress={() => setSort('most_seen')}
          className="items-center">
          <View className="rounded-pill bg-[#FAF8F5] p-1.5 dark:bg-[#12131C]">
            <View className="h-[74px] w-[74px] items-center justify-center rounded-pill border-[2.5px] border-[#191A26] bg-white shadow-sm">
              <View className="h-[62px] w-[62px] items-center justify-center rounded-pill border border-[#191A26]">
                <Text className="text-base font-extrabold text-[#191A26]">
                  {formatNumber(headerStats.totalSightings)}
                </Text>
                <Text className="text-[10px] font-bold text-[#6E7085]">Visits</Text>
              </View>
            </View>
          </View>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Discovery Days: ${headerStats.discoveryDaysCount}`}
          onPress={() => setSort('a_z')}
          className="items-center">
          <View className="rounded-pill bg-[#FAF8F5] p-1.5 dark:bg-[#12131C]">
            <View className="h-[74px] w-[74px] items-center justify-center rounded-pill border-[2.5px] border-[#191A26] bg-white shadow-sm">
              <View className="h-[62px] w-[62px] items-center justify-center rounded-pill border border-[#191A26]">
                <Text className="text-base font-extrabold text-[#191A26]">
                  {formatNumber(headerStats.discoveryDaysCount)}
                </Text>
                <Text className="text-[10px] font-bold text-[#6E7085]">Days</Text>
              </View>
            </View>
          </View>
        </Pressable>
      </View>

      {/* Filter / Sort Pill Row with Warm Peach Camera Circle */}
      {cats.length > 0 ? (
        <View className="flex-row items-center gap-2 px-4 pt-1">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Spot new cat"
            onPress={() => router.push('/sighting/capture')}
            className="h-9 w-9 items-center justify-center rounded-pill border-[1.5px] border-[#191A26] bg-[#F4A97B]">
            <AppIcon name="camera" size={16} color="#191A26" />
          </Pressable>
          {SORT_OPTIONS.map((opt) => (
            <GlassPill
              key={opt.key}
              label={opt.label}
              active={sort === opt.key}
              onPress={() => setSort(opt.key)}
            />
          ))}
        </View>
      ) : null}

      {/* Collector Progress Strip */}
      <View className="px-4">
        <ProgressStripBento
          title="Album Milestones"
          metrics={[
            {
              id: 'cards',
              label: 'Cat Cards',
              current: headerStats.totalCats,
              target: 10,
              color: 'primary',
              icon: 'cards',
            },
            {
              id: 'visits',
              label: 'Total Sightings',
              current: headerStats.totalSightings,
              target: 25,
              color: 'coral',
              icon: 'paw',
            },
            {
              id: 'days',
              label: 'Discovery Days',
              current: headerStats.discoveryDaysCount,
              target: 14,
              color: 'secondary',
              icon: 'sun',
            },
          ]}
        />
      </View>

      {/* Header Stat Tiles */}
      <View className="flex-row gap-2.5 px-4">
        <StatTile
          label="Total Cats"
          value={formatNumber(headerStats.totalCats)}
          accentColor="primary"
          unit={headerStats.totalCats === 1 ? 'card' : 'cards'}
        />
        <StatTile
          label="Total Sightings"
          value={formatNumber(headerStats.totalSightings)}
          accentColor="coral"
          unit={headerStats.totalSightings === 1 ? 'visit' : 'visits'}
        />
        <StatTile
          label="Discovery Days"
          value={formatNumber(headerStats.discoveryDaysCount)}
          accentColor="secondary"
          unit={headerStats.discoveryDaysCount === 1 ? 'day' : 'days'}
        />
      </View>

      {/* Recent Submissions (pending / flagged / rejected) */}
      {recentSubmissions.length > 0 ? (
        <View className="px-4">
          <Card className="gap-3">
          <View className="flex-row items-center justify-between">
            <Text variant="label">Recent Submissions</Text>
            <Text variant="caption" className="text-xs">
              {recentSubmissions.length}{' '}
              {recentSubmissions.length === 1 ? 'photo' : 'photos'}
            </Text>
          </View>

          <View className="gap-2.5">
            {recentSubmissions.map((item) => {
              const copy = getSightingStatusCopy(
                item.status,
                item.reject_reason,
                item.isUploading
              );
              const timeStr = new Date(item.taken_at).toLocaleTimeString([], {
                hour: 'numeric',
                minute: '2-digit',
              });

              return (
                <View
                  key={item.id}
                  className="flex-row items-center gap-3 rounded-card border-[1.5px] border-[#191A26] p-2.5">
                  {item.imageUri ? (
                    <Image
                      source={{ uri: item.imageUri }}
                      style={{ width: 52, height: 52, borderRadius: 12 }}
                      contentFit="cover"
                      cachePolicy="memory-disk"
                      accessibilityLabel="Recent submission photo"
                    />
                  ) : (
                    <View className="h-[52px] w-[52px] items-center justify-center rounded-xl bg-[#FCE8D5]">
                      <AppIcon name="cat" size={24} color="#191A26" />
                    </View>
                  )}

                  <View className="flex-1 gap-0.5">
                    <View className="flex-row items-center justify-between gap-2">
                      <Text variant="caption" className="font-bold text-[#191A26]">
                        Submitted at {timeStr}
                      </Text>
                      <View className="rounded-pill border border-[#191A26] bg-[#FCE8D5] px-2 py-0.5">
                        <Text
                          variant="caption"
                          className="text-[11px] font-extrabold text-[#191A26]">
                          {copy.badgeLabel}
                        </Text>
                      </View>
                    </View>
                    <Text variant="caption" className="text-xs leading-4">
                      {copy.friendlyMessage}
                    </Text>
                  </View>

                  {item.status === 'rejected' ? (
                    <Button
                      label="Dismiss"
                      size="sm"
                      variant="ghost"
                      loading={deleteSightingMutation.isPending}
                      onPress={() => {
                        deleteSightingMutation.mutate(item.id);
                      }}
                    />
                  ) : null}
                </View>
              );
            })}
          </View>
          </Card>
        </View>
      ) : null}

      {cats.length > 0 ? (
        <Text variant="label" className="px-4 pt-1 text-[#191A26] dark:text-white">
          Your Collector Cards ({cats.length})
        </Text>
      ) : null}
    </View>
  );

  if (isLoading) {
    return (
      <Screen className="items-center justify-center">
        <Text variant="caption">Loading your cat collection…</Text>
      </Screen>
    );
  }

  if (isError) {
    return (
      <Screen className="justify-center">
        <ErrorState
          message="Could not load your cat collection."
          onRetry={() => {
            refetch().catch(() => {});
          }}
        />
      </Screen>
    );
  }

  return (
    <Screen edges={['top']} padded={false}>
      <FlashList<CatCardItem>
        data={cats}
        numColumns={2}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={renderHeader}
        contentContainerStyle={{ paddingBottom: 120 }}
        renderItem={({ item, index }) => (
          <View
            className={`mb-3.5 flex-1 ${
              index % 2 === 0 ? 'pl-4 pr-1.5' : 'pl-1.5 pr-4'
            }`}>
            <CatCard
              cat={item}
              onPress={(picked) => {
                router.push(`/cat/${picked.id}`);
              }}
              onImageExpire={() => {
                refetch().catch(() => {});
              }}
            />
          </View>
        )}
        ListEmptyComponent={
          <View className="px-4 py-8">
            <EmptyState
              emoji="walk"
              title="Ready for a stroll?"
              message="Head out for a relaxing walk! Any respectful cat sightings you photograph along the way will appear here as collectible cards."
              actionLabel="Start a Walk"
              onAction={() => router.push('/walk')}
            />
          </View>
        }
      />
    </Screen>
  );
}
