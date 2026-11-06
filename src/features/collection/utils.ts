import { toLocalDateKey } from '@/features/walk';

export type CatCollectionSort = 'newest' | 'most_seen' | 'a_z';

export interface CatCardItem {
  id: string;
  user_id: string;
  card_number: number;
  nickname: string | null;
  cover_sighting_id: string | null;
  cover_photo_path: string | null;
  coverUrl: string | null;
  sighting_count: number;
  first_seen_at: string;
  last_seen_at: string;
  area_geohash: string | null;
  created_at: string;
}

export interface CollectionHeaderStats {
  totalCats: number;
  totalSightings: number;
  discoveryDaysCount: number;
}

/**
 * Formats a sequential cat card number as `#001`, `#012`, `#125`.
 */
export function formatCatCardNumber(cardNumber: number): string {
  const safe = Math.max(1, Math.floor(Number.isFinite(cardNumber) ? cardNumber : 1));
  return `#${String(safe).padStart(3, '0')}`;
}

/**
 * Returns the user's custom nickname or a friendly default `"Unnamed cat #12"`.
 */
export function getCatDisplayName(
  nickname: string | null | undefined,
  cardNumber: number
): string {
  const trimmed = (nickname ?? '').trim();
  if (trimmed.length > 0) {
    return trimmed;
  }
  const safe = Math.max(1, Math.floor(Number.isFinite(cardNumber) ? cardNumber : 1));
  return `Unnamed cat #${safe}`;
}

export interface NicknameValidationResult {
  valid: boolean;
  sanitized: string | null;
  error?: string;
}

/**
 * Validates a cat nickname (optional, up to 30 characters).
 * Empty string clears the nickname (`sanitized: null`).
 */
export function validateCatNickname(
  raw: string | null | undefined
): NicknameValidationResult {
  const trimmed = (raw ?? '').trim();
  if (trimmed.length === 0) {
    return { valid: true, sanitized: null };
  }

  if (trimmed.length > 30) {
    return {
      valid: false,
      sanitized: null,
      error: 'Nickname must be 30 characters or fewer.',
    };
  }

  return {
    valid: true,
    sanitized: trimmed,
  };
}

/**
 * Sorts cat cards by 'newest', 'most_seen', or 'a_z'.
 */
export function sortCatCards(
  cats: readonly CatCardItem[],
  sort: CatCollectionSort
): CatCardItem[] {
  const copy = [...cats];

  switch (sort) {
    case 'most_seen':
      return copy.sort((a, b) => {
        if (b.sighting_count !== a.sighting_count) {
          return b.sighting_count - a.sighting_count;
        }
        return (
          new Date(b.last_seen_at).getTime() -
          new Date(a.last_seen_at).getTime()
        );
      });

    case 'a_z':
      return copy.sort((a, b) => {
        const nameA = getCatDisplayName(a.nickname, a.card_number);
        const nameB = getCatDisplayName(b.nickname, b.card_number);
        return nameA.localeCompare(nameB, undefined, { numeric: true });
      });

    case 'newest':
    default:
      return copy.sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
  }
}

/**
 * Computes summary stats for the Cat Collection header:
 * total cats, total sightings, and unique days with discoveries.
 */
export function computeCollectionHeaderStats(
  cats: readonly CatCardItem[],
  acceptedSightingTimestamps: readonly string[] = []
): CollectionHeaderStats {
  const totalCats = cats.length;
  let totalSightings = 0;
  const uniqueDays = new Set<string>();

  for (const cat of cats) {
    totalSightings += Math.max(1, Number(cat.sighting_count) || 1);
    if (cat.first_seen_at) {
      uniqueDays.add(toLocalDateKey(cat.first_seen_at));
    }
    if (cat.last_seen_at) {
      uniqueDays.add(toLocalDateKey(cat.last_seen_at));
    }
  }

  for (const ts of acceptedSightingTimestamps) {
    if (ts) {
      uniqueDays.add(toLocalDateKey(ts));
    }
  }

  return {
    totalCats,
    totalSightings,
    discoveryDaysCount: uniqueDays.size,
  };
}

/**
 * Returns a privacy-safe coarse neighborhood label when a sighting saved a 5-char geohash.
 * Never displays coordinates or raw lat/lng.
 */
export function formatCoarseAreaLabel(
  areaGeohash: string | null | undefined
): string | null {
  if (!areaGeohash || areaGeohash.trim().length === 0) {
    return null;
  }
  return 'Seen around your neighborhood';
}
