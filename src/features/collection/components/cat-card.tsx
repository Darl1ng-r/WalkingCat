import { Image } from 'expo-image';
import { Pressable, View } from 'react-native';
import Animated, {
  FadeInDown,
  useReducedMotion,
} from 'react-native-reanimated';

import { AppIcon, Text } from '@/components/ui';
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
        className={`overflow-hidden rounded-[22px] border-[1.5px] border-[#191A26] bg-white p-2.5 transition-all active:scale-[0.98] dark:border-[#35384F] dark:bg-[#191A26] ${
          selected ? 'bg-[#FCE8D5]' : ''
        }`}>
        <View className="relative overflow-hidden rounded-[16px] border border-[#191A26]/15 bg-[#FAF8F5]">
          {cat.coverUrl ? (
            <Image
              source={{ uri: cat.coverUrl }}
              style={{ width: '100%', height: 156 }}
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
              style={{ height: 156 }}
              className="items-center justify-center">
              <AppIcon name="cat" size={36} color="#191A26" />
            </View>
          )}

          {/* Midnight-Ink Card Number Badge (#001) */}
          <View className="absolute left-2 top-2 rounded-pill border border-white/30 bg-[#191A26] px-2.5 py-0.5">
            <Text
              variant="caption"
              className="font-display text-[10px] font-bold text-white">
              {cardNumber}
            </Text>
          </View>

          {/* Warm Peach Sighting Count Badge */}
          <View className="absolute right-2 top-2 flex-row items-center gap-1 rounded-pill border border-[#191A26] bg-[#F4A97B] px-2 py-0.5">
            <AppIcon name="paw" size={10} color="#191A26" />
            <Text
              variant="caption"
              className="font-display text-[10px] font-bold text-[#191A26]">
              {cat.sighting_count}×
            </Text>
          </View>

          {/* Optional Edition / Foil Pill */}
          {theme.accentLabel ? (
            <View className="absolute bottom-2 left-2 rounded-pill border border-[#191A26] bg-white px-2 py-0.5">
              <Text
                variant="caption"
                className="text-[9px] font-bold text-[#191A26]">
                {theme.accentLabel}
              </Text>
            </View>
          ) : null}
        </View>

        <View className="mt-2.5 gap-0.5 px-1 pb-0.5">
          <Text
            variant="body"
            numberOfLines={1}
            className="font-display text-sm font-bold tracking-tight text-[#191A26] dark:text-white">
            {displayName}
          </Text>
          <Text
            variant="caption"
            numberOfLines={1}
            className="text-[11px] font-medium text-[#6E7085]">
            Spotted {firstSeenStr}
          </Text>
        </View>
      </Pressable>
    </Animated.View>
  );
}
