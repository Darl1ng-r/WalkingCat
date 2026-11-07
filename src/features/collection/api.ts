import {
  getSignedSightingPhotoUrl,
  invalidateSignedSightingPhotoUrl,
  type SightingSummaryItem,
} from '@/features/sightings';
import {
  listPendingSightingUploads,
  removePendingSightingUpload,
} from '@/lib/db';
import { isSupabaseConfigured } from '@/lib/env';
import { logger } from '@/lib/logger';
import { supabase } from '@/lib/supabase';
import {
  sortCatCards,
  validateCatNickname,
  type CatCardItem,
  type CatCollectionSort,
} from './utils';

export type { CatCardItem } from './utils';

export interface CatSightingTimelineItem {
  id: string;
  walk_id: string | null;
  photo_path: string;
  imageUri: string | null;
  taken_at: string;
  area_geohash: string | null;
  created_at: string;
}

export interface CatDetailItem extends CatCardItem {
  sightings: CatSightingTimelineItem[];
}

export interface ListCatsOptions {
  sort?: CatCollectionSort;
}

/**
 * Lists the user's cat collection cards with signed cover photo URLs,
 * sorting by `sort` (`newest` | `most_seen` | `a_z`).
 */
export async function listCats(
  options: ListCatsOptions = {}
): Promise<CatCardItem[]> {
  const sort = options.sort ?? 'newest';
  if (!isSupabaseConfigured) {
    return [];
  }

  const { data: catRows, error } = await supabase
    .from('cats')
    .select(
      'id, user_id, card_number, nickname, cover_sighting_id, sighting_count, first_seen_at, last_seen_at, area_geohash, theme_id, created_at'
    )
    .order('created_at', { ascending: false });

  if (error || !catRows) {
    if (error) {
      logger.warn('Failed to list cats', { error: error.message });
    }
    return [];
  }

  if (catRows.length === 0) {
    return [];
  }

  // Fetch photo_path for cover sightings in one batch
  const coverSightingIds = catRows
    .map((c) => c.cover_sighting_id)
    .filter((id): id is string => Boolean(id));

  const coverPathBySightingId = new Map<string, string>();
  if (coverSightingIds.length > 0) {
    const { data: coverRows } = await supabase
      .from('sightings')
      .select('id, photo_path')
      .in('id', coverSightingIds);

    if (coverRows) {
      for (const row of coverRows) {
        coverPathBySightingId.set(row.id, row.photo_path);
      }
    }
  }

  const items: CatCardItem[] = await Promise.all(
    catRows.map(async (cat) => {
      const coverPhotoPath = cat.cover_sighting_id
        ? (coverPathBySightingId.get(cat.cover_sighting_id) ?? null)
        : null;
      const coverUrl = coverPhotoPath
        ? await getSignedSightingPhotoUrl(coverPhotoPath)
        : null;

      return {
        id: cat.id,
        user_id: cat.user_id,
        card_number: cat.card_number,
        nickname: cat.nickname,
        cover_sighting_id: cat.cover_sighting_id,
        cover_photo_path: coverPhotoPath,
        coverUrl,
        sighting_count: cat.sighting_count,
        first_seen_at: cat.first_seen_at,
        last_seen_at: cat.last_seen_at,
        area_geohash: cat.area_geohash,
        theme_id: cat.theme_id,
        created_at: cat.created_at,
      };
    })
  );

  return sortCatCards(items, sort);
}

/**
 * Fetches a single cat card and its timeline of accepted sightings.
 */
export async function getCat(catId: string): Promise<CatDetailItem | null> {
  if (!catId || !isSupabaseConfigured) {
    return null;
  }

  const { data: cat, error: catError } = await supabase
    .from('cats')
    .select(
      'id, user_id, card_number, nickname, cover_sighting_id, sighting_count, first_seen_at, last_seen_at, area_geohash, theme_id, created_at'
    )
    .eq('id', catId)
    .maybeSingle();

  if (catError || !cat) {
    return null;
  }

  const { data: sightingRows } = await supabase
    .from('sightings')
    .select('id, walk_id, photo_path, taken_at, area_geohash, created_at')
    .eq('cat_id', cat.id)
    .eq('status', 'accepted')
    .order('taken_at', { ascending: false });

  const sightings: CatSightingTimelineItem[] = await Promise.all(
    (sightingRows ?? []).map(async (row) => {
      const imageUri = await getSignedSightingPhotoUrl(row.photo_path);
      return {
        id: row.id,
        walk_id: row.walk_id,
        photo_path: row.photo_path,
        imageUri,
        taken_at: row.taken_at,
        area_geohash: row.area_geohash,
        created_at: row.created_at,
      };
    })
  );

  const coverSighting =
    sightings.find((s) => s.id === cat.cover_sighting_id) ??
    sightings[sightings.length - 1] ??
    null;

  return {
    id: cat.id,
    user_id: cat.user_id,
    card_number: cat.card_number,
    nickname: cat.nickname,
    cover_sighting_id: cat.cover_sighting_id,
    cover_photo_path: coverSighting?.photo_path ?? null,
    coverUrl: coverSighting?.imageUri ?? null,
    sighting_count: cat.sighting_count,
    first_seen_at: cat.first_seen_at,
    last_seen_at: cat.last_seen_at,
    area_geohash: cat.area_geohash,
    theme_id: cat.theme_id,
    created_at: cat.created_at,
    sightings,
  };
}

/**
 * Updates a cat's optional nickname (<= 30 characters; null/blank resets to unnamed).
 */
export async function renameCat(
  catId: string,
  nickname: string | null
): Promise<string | null> {
  const validation = validateCatNickname(nickname ?? '');
  if (!validation.valid) {
    throw new Error(validation.error ?? 'Invalid nickname.');
  }

  if (!isSupabaseConfigured) {
    return validation.sanitized;
  }

  const { error } = await supabase
    .from('cats')
    .update({ nickname: validation.sanitized })
    .eq('id', catId);

  if (error) {
    throw new Error(error.message);
  }

  return validation.sanitized;
}

/**
 * Links an accepted sighting to an existing cat card via `link_sighting_to_cat` RPC.
 */
export async function linkSighting(
  sightingId: string,
  targetCatId: string
): Promise<string> {
  if (!isSupabaseConfigured) {
    return targetCatId;
  }

  const { data, error } = await supabase.rpc('link_sighting_to_cat', {
    p_sighting_id: sightingId,
    p_cat_id: targetCatId,
  });

  if (error) {
    throw new Error(error.message);
  }

  return data ?? targetCatId;
}

/**
 * Unlinks a sighting from a multi-sighting cat into its own new cat card via `unlink_sighting` RPC.
 */
export async function unlinkSighting(sightingId: string): Promise<string> {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase is not configured.');
  }

  const { data, error } = await supabase.rpc('unlink_sighting', {
    p_sighting_id: sightingId,
  });

  if (error || !data) {
    throw new Error(error?.message ?? 'Could not unlink sighting.');
  }

  return data;
}

/**
 * Deletes a sighting: removes its photo from the private `sighting-photos` storage bucket
 * and deletes the `public.sightings` row (which triggers `recompute_cat_aggregates`
 * and deletes the `cats` card if it was the last sighting).
 */
export async function deleteSighting(sightingId: string): Promise<void> {
  if (!sightingId) {
    return;
  }

  removePendingSightingUpload(sightingId);

  if (!isSupabaseConfigured) {
    return;
  }

  const { data: row } = await supabase
    .from('sightings')
    .select('id, photo_path')
    .eq('id', sightingId)
    .maybeSingle();

  if (row?.photo_path) {
    invalidateSignedSightingPhotoUrl(row.photo_path);
    const { error: storageError } = await supabase.storage
      .from('sighting-photos')
      .remove([row.photo_path]);

    if (storageError) {
      logger.warn('Failed to remove sighting photo from storage bucket', {
        sightingId,
        photoPath: row.photo_path,
        error: storageError.message,
      });
    }
  }

  const { error: deleteError } = await supabase
    .from('sightings')
    .delete()
    .eq('id', sightingId);

  if (deleteError) {
    throw new Error(deleteError.message);
  }
}

/**
 * Lists recent non-accepted submissions (`pending`, `flagged`, `rejected`) combining
 * local pending uploads and server sightings so the user can see what happened on the Collection tab.
 */
export async function listRecentSubmissions(
  limit = 10
): Promise<SightingSummaryItem[]> {
  const localRows = listPendingSightingUploads();
  const byId = new Map<string, SightingSummaryItem>();

  for (const row of localRows) {
    byId.set(row.sighting_id, {
      id: row.sighting_id,
      walk_id: row.payload.walk_id,
      cat_id: null,
      imageUri: row.payload.local_file_uri,
      taken_at: row.payload.taken_at,
      area_geohash: row.payload.area_geohash,
      status: 'pending',
      reject_reason: null,
      isUploading: true,
    });
  }

  if (isSupabaseConfigured) {
    const { data, error } = await supabase
      .from('sightings')
      .select(
        'id, walk_id, cat_id, photo_path, taken_at, area_geohash, status, reject_reason'
      )
      .in('status', ['pending', 'flagged', 'rejected'])
      .order('taken_at', { ascending: false })
      .limit(limit);

    if (!error && data) {
      const signedItems = await Promise.all(
        data.map(async (row) => {
          const imageUri = await getSignedSightingPhotoUrl(row.photo_path);
          return {
            id: row.id,
            walk_id: row.walk_id,
            cat_id: row.cat_id,
            imageUri,
            taken_at: row.taken_at,
            area_geohash: row.area_geohash,
            status: row.status,
            reject_reason: row.reject_reason,
            isUploading: false,
          } satisfies SightingSummaryItem;
        })
      );

      for (const item of signedItems) {
        byId.set(item.id, item);
      }
    }
  }

  return Array.from(byId.values())
    .sort(
      (a, b) => new Date(b.taken_at).getTime() - new Date(a.taken_at).getTime()
    )
    .slice(0, limit);
}
