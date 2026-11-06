import { Image } from 'expo-image';
import { View } from 'react-native';

import { Card, Text } from '@/components/ui';
import type { SightingSummaryItem } from '../api';

export interface WalkSightingsListProps {
  sightings: readonly SightingSummaryItem[];
}

function getStatusBadge(item: SightingSummaryItem): {
  label: string;
  badgeClassName: string;
} {
  if (item.isUploading) {
    return {
      label: '⏳ Waiting to upload · Checking…',
      badgeClassName: 'bg-primary/15',
    };
  }
  switch (item.status) {
    case 'accepted':
      return {
        label: '✓ Accepted',
        badgeClassName: 'bg-secondary/20',
      };
    case 'rejected':
      return {
        label: 'Not a cat photo',
        badgeClassName: 'bg-danger-muted',
      };
    case 'flagged':
      return {
        label: 'Under review',
        badgeClassName: 'bg-primary/15',
      };
    case 'pending':
    default:
      return {
        label: '🔍 Checking…',
        badgeClassName: 'bg-primary/15',
      };
  }
}

export function WalkSightingsList({ sightings }: WalkSightingsListProps) {
  if (sightings.length === 0) {
    return null;
  }

  return (
    <Card className="gap-3">
      <View className="flex-row items-center justify-between">
        <Text variant="heading">🐱 Cat Sightings ({sightings.length})</Text>
        <Text variant="caption" className="text-xs">
          No-flash photos
        </Text>
      </View>

      <View className="gap-2.5">
        {sightings.map((item) => {
          const badge = getStatusBadge(item);
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
                  style={{ width: 56, height: 56, borderRadius: 10 }}
                  contentFit="cover"
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
                </View>

                <View className="flex-row flex-wrap items-center gap-2">
                  <View className={`rounded-pill px-2.5 py-0.5 ${badge.badgeClassName}`}>
                    <Text
                      variant="caption"
                      className="text-[11px] font-semibold text-text-primary dark:text-text-primary-dark">
                      {badge.label}
                    </Text>
                  </View>

                  {item.area_geohash ? (
                    <Text variant="caption" className="text-xs">
                      📍 Area {item.area_geohash}
                    </Text>
                  ) : null}
                </View>
              </View>
            </View>
          );
        })}
      </View>
    </Card>
  );
}
