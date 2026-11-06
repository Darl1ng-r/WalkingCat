import { listPendingSightingUploads } from '@/lib/db';
import { isSupabaseConfigured } from '@/lib/env';
import { logger } from '@/lib/logger';
import { supabase } from '@/lib/supabase';

export type SightingStatus = 'pending' | 'accepted' | 'rejected' | 'flagged';

export interface SightingSummaryItem {
  id: string;
  walk_id: string | null;
  cat_id: string | null;
  imageUri: string | null;
  taken_at: string;
  area_geohash: string | null;
  status: SightingStatus;
  reject_reason: string | null;
  isUploading: boolean;
}

const SIGNED_URL_TTL_SECONDS = 3600; // 1 hour
const CACHE_EXPIRY_MS = 50 * 60 * 1000; // 50 minutes

const signedUrlCache = new Map<string, { url: string; expiresAt: number }>();

/**
 * Evicts a cached signed URL (e.g., on image error or photo deletion).
 */
export function invalidateSignedSightingPhotoUrl(photoPath: string): void {
  if (photoPath) {
    signedUrlCache.delete(photoPath);
  }
}

/**
 * Generates or returns a cached 1-hour signed URL for a private `sighting-photos` object.
 */
export async function getSignedSightingPhotoUrl(
  photoPath: string
): Promise<string | null> {
  if (!photoPath || !isSupabaseConfigured) {
    return null;
  }

  const now = Date.now();
  const cached = signedUrlCache.get(photoPath);
  if (cached && cached.expiresAt > now) {
    return cached.url;
  }

  const { data, error } = await supabase.storage
    .from('sighting-photos')
    .createSignedUrl(photoPath, SIGNED_URL_TTL_SECONDS);

  if (error || !data?.signedUrl) {
    logger.warn('Failed to create signed URL for sighting photo', {
      photoPath,
      error: error?.message,
    });
    return null;
  }

  signedUrlCache.set(photoPath, {
    url: data.signedUrl,
    expiresAt: now + CACHE_EXPIRY_MS,
  });

  return data.signedUrl;
}

/**
 * Lists all sightings associated with a specific `walkId`, combining local
 * pending uploads and server rows.
 */
export async function listSightingsForWalk(
  walkId: string
): Promise<SightingSummaryItem[]> {
  if (!walkId) {
    return [];
  }

  const localRows = listPendingSightingUploads().filter(
    (r) => r.payload.walk_id === walkId
  );

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
      .eq('walk_id', walkId)
      .order('taken_at', { ascending: true });

    if (!error && data) {
      const signedItems = await Promise.all(
        data.map(async (row) => {
          const signedUrl = await getSignedSightingPhotoUrl(row.photo_path);
          return {
            id: row.id,
            walk_id: row.walk_id,
            cat_id: row.cat_id,
            imageUri: signedUrl,
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

  return Array.from(byId.values()).sort(
    (a, b) => new Date(a.taken_at).getTime() - new Date(b.taken_at).getTime()
  );
}

/**
 * Fetches a single sighting's validation status by ID (checking local pending queue first).
 */
export async function getSightingById(
  sightingId: string
): Promise<SightingSummaryItem | null> {
  if (!sightingId) {
    return null;
  }

  const localPending = listPendingSightingUploads().find(
    (r) => r.sighting_id === sightingId
  );
  if (localPending) {
    return {
      id: localPending.sighting_id,
      walk_id: localPending.payload.walk_id,
      cat_id: null,
      imageUri: localPending.payload.local_file_uri,
      taken_at: localPending.payload.taken_at,
      area_geohash: localPending.payload.area_geohash,
      status: 'pending',
      reject_reason: null,
      isUploading: true,
    };
  }

  if (!isSupabaseConfigured) {
    return null;
  }

  const { data, error } = await supabase
    .from('sightings')
    .select(
      'id, walk_id, cat_id, photo_path, taken_at, area_geohash, status, reject_reason'
    )
    .eq('id', sightingId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  const signedUrl = await getSignedSightingPhotoUrl(data.photo_path);
  return {
    id: data.id,
    walk_id: data.walk_id,
    cat_id: data.cat_id,
    imageUri: signedUrl,
    taken_at: data.taken_at,
    area_geohash: data.area_geohash,
    status: data.status,
    reject_reason: data.reject_reason,
    isUploading: false,
  };
}
