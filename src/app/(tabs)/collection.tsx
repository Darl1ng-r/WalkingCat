import { FlashList } from '@shopify/flash-list';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { View } from 'react-native';

import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  ProgressStripBento,
  Screen,
  SegmentedControl,
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

  const renderHeader = () => (
    <View className="gap-4 pb-4 pt-2">
      <View className="flex-row items-center justify-between">
        <View>
          <Text variant="label">Collector Album</Text>
          <Text variant="title" className="mt-0.5 text-[28px] leading-8">
            Cat Collection
          </Text>
        </View>
        <View className="flex-row items-center gap-2">
          <Button
            label="✨ Themes"
            size="sm"
            variant="secondary"
            onPress={() => router.push('/cosmetics')}
          />
          <Button
            label="📷 Spot"
            size="sm"
            variant="action"
            onPress={() => router.push('/sighting/capture')}
          />
        </View>
      </View>

      {/* Collector Progress Strip Bento */}
      <ProgressStripBento
        title="ALBUM MILESTONES"
        metrics={[
          {
            id: 'cards',
            label: 'Cat Cards',
            current: headerStats.totalCats,
            target: 10,
            color: 'primary',
            icon: '🃏',
          },
          {
            id: 'visits',
            label: 'Total Sightings',
            current: headerStats.totalSightings,
            target: 25,
            color: 'coral',
            icon: '🐾',
          },
          {
            id: 'days',
            label: 'Discovery Days',
            current: headerStats.discoveryDaysCount,
            target: 14,
            color: 'secondary',
            icon: '☀️',
          },
        ]}
      />

      {/* Header Stats */}
      <View className="flex-row gap-2.5">
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
                  className="flex-row items-center gap-3 rounded-card border border-border p-2.5 dark:border-border-dark">
                  {item.imageUri ? (
                    <Image
                      source={{ uri: item.imageUri }}
                      style={{ width: 52, height: 52, borderRadius: 12 }}
                      contentFit="cover"
                      cachePolicy="memory-disk"
                      accessibilityLabel="Recent submission photo"
                    />
                  ) : (
                    <View className="h-[52px] w-[52px] items-center justify-center rounded-xl bg-primary-muted dark:bg-surface-elevated-dark">
                      <Text className="text-xl">🐱</Text>
                    </View>
                  )}

                  <View className="flex-1 gap-0.5">
                    <View className="flex-row items-center justify-between gap-2">
                      <Text variant="caption" className="font-semibold">
                        Submitted at {timeStr}
                      </Text>
                      <View className="rounded-pill bg-primary/15 px-2 py-0.5">
                        <Text
                          variant="caption"
                          className="text-[11px] font-semibold text-text-primary dark:text-text-primary-dark">
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
      ) : null}

      {/* Charcoal Segmented Sort Control */}
      {cats.length > 0 ? (
        <View className="gap-2">
          <Text variant="label">Your Collector Cards ({cats.length})</Text>
          <SegmentedControl
            options={SORT_OPTIONS}
            value={sort}
            onChange={setSort}
          />
        </View>
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
    <Screen edges={['top']}>
      <FlashList<CatCardItem>
        data={cats}
        numColumns={2}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={renderHeader}
        contentContainerStyle={{ paddingBottom: 120 }}
        renderItem={({ item, index }) => (
          <View
            className={`mb-3.5 flex-1 ${
              index % 2 === 0 ? 'pr-1.5' : 'pl-1.5'
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
          <View className="py-8">
            <EmptyState
              emoji="🥾"
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
