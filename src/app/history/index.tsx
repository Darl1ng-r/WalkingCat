import { FlashList } from '@shopify/flash-list';
import { router } from 'expo-router';
import { Pressable, View } from 'react-native';

import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  Screen,
  Text,
} from '@/components/ui';
import { useWalkHistory, type WalkListItem } from '@/features/walk';
import { formatDistance, formatDuration, formatNumber } from '@/lib/format';

function formatWalkRowDate(isoString: string): string {
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return 'Recent walk';

  const now = new Date();
  const isToday =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();

  const timePart = date.toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
  });

  if (isToday) {
    return `Today · ${timePart}`;
  }

  const datePart = date.toLocaleDateString([], {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
  return `${datePart} · ${timePart}`;
}

export default function WalkHistoryScreen() {
  const {
    walks,
    isLoading,
    isError,
    refetch,
    isRefetching,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
    syncPending,
    syncingPending,
  } = useWalkHistory();

  const pendingCount = walks.filter((w) => w.isPendingUpload).length;

  return (
    <Screen edges={['top', 'bottom']} contentContainerClassName="px-0 py-0">
      <View className="flex-row items-center justify-between px-4 pb-3 pt-4">
        <View>
          <Text variant="label">Activity</Text>
          <Text variant="title" className="mt-0.5">
            Walk History
          </Text>
        </View>
        <View className="flex-row gap-2">
          <Button
            label="Progress"
            size="sm"
            variant="secondary"
            onPress={() => router.push('/history/progress')}
          />
          <Button
            label="Done"
            size="sm"
            variant="ghost"
            onPress={() => router.back()}
          />
        </View>
      </View>

      {pendingCount > 0 ? (
        <View className="px-4 pb-3">
          <Card className="flex-row items-center justify-between border-primary/40 py-3">
            <View className="flex-1 pr-3">
              <Text variant="label">
                {pendingCount}{' '}
                {pendingCount === 1
                  ? 'walk waiting to upload'
                  : 'walks waiting to upload'}
              </Text>
              <Text variant="caption" className="text-xs">
                Saved safely on your device and will sync when online.
              </Text>
            </View>
            <Button
              label="Sync Now"
              size="sm"
              loading={syncingPending}
              onPress={() => {
                syncPending().catch(() => {});
              }}
            />
          </Card>
        </View>
      ) : null}

      {isError && walks.length === 0 ? (
        <View className="flex-1 justify-center px-4">
          <ErrorState
            message="Could not load your walk history. Check your connection and try again."
            onRetry={() => {
              refetch().catch(() => {});
            }}
          />
        </View>
      ) : (
        <View className="flex-1">
          <FlashList<WalkListItem>
            data={walks}
            keyExtractor={(item) => item.id}
            refreshing={isRefetching}
            onRefresh={() => {
              refetch().catch(() => {});
            }}
            onEndReached={() => {
              if (hasNextPage && !isFetchingNextPage) {
                fetchNextPage().catch(() => {});
              }
            }}
            onEndReachedThreshold={0.5}
            ListEmptyComponent={
              !isLoading ? (
                <View className="px-4 pt-8">
                  <EmptyState
                    emoji="🥾"
                    title="Your walks will appear here"
                    message="Every stroll you record is saved here with its distance, duration, and private route."
                    actionLabel="Start a Walk"
                    onAction={() => router.push('/walk')}
                  />
                </View>
              ) : null
            }
            ListFooterComponent={
              isFetchingNextPage ? (
                <View className="items-center py-4">
                  <Text variant="caption">Loading more walks…</Text>
                </View>
              ) : (
                <View className="h-8" />
              )
            }
            renderItem={({ item }) => (
              <View className="px-4 py-1.5">
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Walk on ${formatWalkRowDate(item.started_at)}, ${formatDistance(item.distance_m)}`}
                  onPress={() =>
                    router.push({
                      pathname: '/walk/[id]',
                      params: { id: item.id },
                    })
                  }
                  className="active:opacity-80">
                  <Card className="flex-row items-center gap-3.5">
                    <View className="h-12 w-12 items-center justify-center rounded-card bg-primary-muted dark:bg-surface-elevated-dark">
                      <Text className="text-xl">
                        {item.isPendingUpload ? '⏳' : '🗺️'}
                      </Text>
                    </View>

                    <View className="flex-1 gap-1">
                      <View className="flex-row items-center justify-between gap-2">
                        <Text
                          variant="body"
                          className="font-semibold"
                          numberOfLines={1}>
                          {formatWalkRowDate(item.started_at)}
                        </Text>
                        {item.isPendingUpload ? (
                          <View className="rounded-pill bg-primary/15 px-2.5 py-0.5">
                            <Text
                              variant="caption"
                              className="text-[11px] font-semibold text-primary-dark dark:text-primary-light">
                              Waiting to upload
                            </Text>
                          </View>
                        ) : null}
                      </View>

                      <View className="flex-row flex-wrap items-center gap-x-4 gap-y-1">
                        <Text variant="caption" className="font-medium">
                          📏 {formatDistance(item.distance_m)}
                        </Text>
                        <Text variant="caption">
                          ⏱️ {formatDuration(item.duration_s)}
                        </Text>
                        {item.steps !== null && item.steps > 0 ? (
                          <Text variant="caption">
                            👣 {formatNumber(item.steps)} steps
                          </Text>
                        ) : null}
                      </View>
                    </View>
                  </Card>
                </Pressable>
              </View>
            )}
          />
        </View>
      )}
    </Screen>
  );
}
