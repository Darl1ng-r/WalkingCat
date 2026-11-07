import { Image } from 'expo-image';
import { Pressable, View } from 'react-native';
import Animated, {
  FadeInDown,
  useReducedMotion,
} from 'react-native-reanimated';

import { Text } from '@/components/ui';
import { getCardThemeTokens } from '@/features/cosmetics';
import { invalidateSignedSightingPhotoUrl } from '@/features/sightings';
import {
  formatCatCardNumber,
  getCatDisplayName,
  type CatCardItem,
} from '../utils';

export interface CatCardProps {
  cat: CatCardItem;
  onPress?: (cat: CatCardItem) => void;
  onImageExpire?: () => void;
  selected?: boolean;
}

function formatShortDate(isoString: string): string {
  const d = new Date(isoString);
  if (Number.isNaN(d.getTime())) {
    return 'Recently';
  }
  return d.toLocaleDateString([], {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function CatCard({
  cat,
  onPress,
  onImageExpire,
  selected = false,
}: CatCardProps) {
  const reducedMotion = useReducedMotion();
  const cardNumber = formatCatCardNumber(cat.card_number);
  const displayName = getCatDisplayName(cat.nickname, cat.card_number);
  const firstSeenStr = formatShortDate(cat.first_seen_at);
  const theme = getCardThemeTokens(cat.theme_id);

  return (
    <Animated.View
      entering={
        reducedMotion
          ? undefined
          : FadeInDown.duration(260).springify().damping(18)
      }
      className="flex-1">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${displayName}, card ${cardNumber}, ${cat.sighting_count} ${
          cat.sighting_count === 1 ? 'sighting' : 'sightings'
        }`}
        onPress={() => onPress?.(cat)}
        className={`overflow-hidden rounded-card border p-2.5 ${theme.surfaceClass} ${
          selected ? 'border-2 border-primary' : theme.borderClass
        }`}>
        <View className="relative overflow-hidden rounded-lg bg-primary-muted dark:bg-surface-elevated-dark">
          {cat.coverUrl ? (
            <Image
              source={{ uri: cat.coverUrl }}
              style={{ width: '100%', height: 144 }}
              contentFit="cover"
              cachePolicy="memory-disk"
              transition={reducedMotion ? 0 : 180}
              accessibilityLabel={`Photo of ${displayName}`}
              onError={() => {
                if (cat.cover_photo_path) {
                  invalidateSignedSightingPhotoUrl(cat.cover_photo_path);
                  onImageExpire?.();
                }
              }}
            />
          ) : (
            <View
              style={{ height: 144 }}
              className="items-center justify-center">
              <Text className="text-4xl">🐱</Text>
            </View>
          )}

          {/* Card number badge (#012) */}
          <View className="absolute left-2 top-2 rounded-pill bg-black/65 px-2.5 py-0.5">
            <Text
              variant="caption"
              className="text-[11px] font-bold text-white">
              {cardNumber}
            </Text>
          </View>

          {/* Sighting count badge */}
          <View
            className={`absolute right-2 top-2 rounded-pill px-2.5 py-0.5 ${theme.badgeClass}`}>
            <Text
              variant="caption"
              className="text-[11px] font-bold text-white">
              🐾 {cat.sighting_count}×
            </Text>
          </View>

          {/* Optional Edition / Foil pill */}
          {theme.accentLabel ? (
            <View className="absolute bottom-2 left-2 rounded-pill bg-black/70 px-2 py-0.5">
              <Text
                variant="caption"
                className="text-[10px] font-semibold text-white">
                {theme.accentLabel}
              </Text>
            </View>
          ) : null}
        </View>

        <View className="mt-2.5 gap-0.5 px-0.5">
          <Text
            variant="body"
            numberOfLines={1}
            className="font-bold text-text-primary dark:text-text-primary-dark">
            {displayName}
          </Text>
          <Text variant="caption" numberOfLines={1} className="text-xs">
            First spotted {firstSeenStr}
          </Text>
        </View>
      </Pressable>
    </Animated.View>
  );
}
