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
        className={`overflow-hidden rounded-bento border p-2.5 shadow-card transition-all active:scale-[0.98] ${theme.surfaceClass} ${
          selected ? 'border-2 border-primary' : theme.borderClass
        }`}>
        <View className="relative overflow-hidden rounded-[20px] bg-primary-muted dark:bg-surface-elevated-dark">
          {cat.coverUrl ? (
            <Image
              source={{ uri: cat.coverUrl }}
              style={{ width: '100%', height: 176 }}
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
              style={{ height: 176 }}
              className="items-center justify-center">
              <Text className="text-4xl">🐱</Text>
            </View>
          )}

          {/* Frosted Dark-Glass Card Number Badge (#001) */}
          <View
            style={{ backgroundColor: 'rgba(24, 26, 34, 0.76)' }}
            className="absolute left-2.5 top-2.5 rounded-pill border border-white/25 px-2.5 py-0.5">
            <Text
              variant="caption"
              className="text-[11px] font-extrabold text-white">
              {cardNumber}
            </Text>
          </View>

          {/* Sighting Count Badge */}
          <View
            className={`absolute right-2.5 top-2.5 rounded-pill px-2.5 py-0.5 shadow-sm ${theme.badgeClass}`}>
            <Text
              variant="caption"
              className="text-[11px] font-extrabold text-white">
              🐾 {cat.sighting_count}×
            </Text>
          </View>

          {/* Optional Edition / Foil Pill */}
          {theme.accentLabel ? (
            <View
              style={{ backgroundColor: 'rgba(24, 26, 34, 0.78)' }}
              className="absolute bottom-2.5 left-2.5 rounded-pill border border-white/25 px-2.5 py-0.5">
              <Text
                variant="caption"
                className="text-[10px] font-bold text-white">
                {theme.accentLabel}
              </Text>
            </View>
          ) : null}
        </View>

        <View className="mt-3 gap-0.5 px-1 pb-1">
          <Text
            variant="body"
            numberOfLines={1}
            className="text-base font-extrabold tracking-tight text-text-primary dark:text-text-primary-dark">
            {displayName}
          </Text>
          <Text variant="caption" numberOfLines={1} className="text-[11px] font-medium">
            Spotted {firstSeenStr}
          </Text>
        </View>
      </Pressable>
    </Animated.View>
  );
}
