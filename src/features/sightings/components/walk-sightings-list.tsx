import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Pressable, View } from 'react-native';

import { Card, Text } from '@/components/ui';
import type { SightingSummaryItem } from '../api';
import { getSightingStatusCopy } from '../validation-rules';

export interface WalkSightingsListProps {
  sightings: readonly SightingSummaryItem[];
  showEmptyPlaceholder?: boolean;
}

function getToneBadgeClassName(
  tone: 'neutral' | 'success' | 'warning' | 'danger'
): string {
  switch (tone) {
    case 'success':
      return 'bg-secondary/20';
    case 'danger':
      return 'bg-danger-muted';
    case 'warning':
    case 'neutral':
    default:
      return 'bg-primary/15';
  }
}

export function WalkSightingsList({
  sightings,
  showEmptyPlaceholder = false,
}: WalkSightingsListProps) {
  if (sightings.length === 0) {
    if (!showEmptyPlaceholder) {
      return null;
    }
    return (
      <Card className="gap-1.5">
        <Text variant="heading">🐱 Cats spotted on this walk</Text>
        <Text variant="caption">
          No cat sightings were photographed during this walk.
        </Text>
      </Card>
    );
  }

  return (
    <Card className="gap-3">
      <View className="flex-row items-center justify-between">
        <Text variant="heading">
          🐱 Cats spotted on this walk ({sightings.length})
        </Text>
        <Text variant="caption" className="text-xs">
          No-flash photos
        </Text>
      </View>

      <View className="gap-2.5">
        {sightings.map((item) => {
          const copy = getSightingStatusCopy(
            item.status,
            item.reject_reason,
            item.isUploading
          );
          const badgeClassName = getToneBadgeClassName(copy.tone);
          const timeStr = new Date(item.taken_at).toLocaleTimeString([], {
            hour: 'numeric',
            minute: '2-digit',
          });

          return (
            <Pressable
              key={item.id}
              disabled={!item.cat_id}
              accessibilityRole={item.cat_id ? 'button' : undefined}
              accessibilityLabel={
                item.cat_id ? 'Open cat card in collection' : undefined
              }
              onPress={() => {
                if (item.cat_id) {
                  router.push(`/cat/${item.cat_id}`);
                }
              }}
              className="flex-row items-center gap-3 rounded-card border border-border p-2.5 dark:border-border-dark">
              {item.imageUri ? (
                <Image
                  source={{ uri: item.imageUri }}
                  style={{ width: 56, height: 56, borderRadius: 10 }}
                  contentFit="cover"
                  cachePolicy="memory-disk"
                  accessibilityLabel="Submitted cat sighting photo"
                />
              ) : (
                <View className="h-14 w-14 items-center justify-center rounded-lg bg-primary-muted dark:bg-surface-elevated-dark">
                  <Text className="text-xl">🐱</Text>
                </View>
              )}

              <View className="flex-1 gap-1">
                <View className="flex-row items-center justify-between gap-2">
                  <Text variant="body" className="font-semibold">
                    Spotted at {timeStr}
                  </Text>
                  {item.cat_id ? (
                    <Text
                      variant="caption"
                      className="text-xs font-semibold text-primary">
                      View Card →
                    </Text>
                  ) : null}
                </View>

                <View className="flex-row flex-wrap items-center gap-2">
                  <View
                    className={`rounded-pill px-2.5 py-0.5 ${badgeClassName}`}>
                    <Text
                      variant="caption"
                      className="text-[11px] font-semibold text-text-primary dark:text-text-primary-dark">
                      {copy.badgeLabel}
                    </Text>
                  </View>

                  {item.area_geohash ? (
                    <Text variant="caption" className="text-xs">
                      📍 Seen around your neighborhood
                    </Text>
                  ) : null}
                </View>

                <Text variant="caption" className="text-xs leading-4">
                  {copy.friendlyMessage}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>
    </Card>
  );
}
