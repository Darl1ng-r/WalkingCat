import { File } from 'expo-file-system';
import { Platform } from 'react-native';

import { syncPendingWalks } from '@/features/walk/sync';
import {
  enqueueSightingUpload,
  getActiveWalkRecord,
  listPendingSightingUploads,
  listPendingWalkUploads,
  markPendingSightingUploadError,
  removePendingSightingUpload,
  type PendingSightingUploadRow,
} from '@/lib/db';
import { isSupabaseConfigured } from '@/lib/env';
import { logger } from '@/lib/logger';
import { supabase } from '@/lib/supabase';
import { deleteLocalSightingFile, type ProcessedSightingPhoto } from './process';

export type SubmitSightingOutcome =
  | {
      status: 'uploaded' | 'queued';
      sightingId: string;
    }
  | {
      status: 'duplicate';
      message: string;
    };

let isSyncingSightings = false;

async function readLocalPhotoBytes(localFileUri: string): Promise<Uint8Array> {
  if (Platform.OS === 'web') {
    const res = await fetch(localFileUri);
    const buf = await res.arrayBuffer();
    return new Uint8Array(buf);
  }
  const file = new File(localFileUri);
  return file.bytes();
}

function isDuplicateError(error: { code?: string; message?: string }): boolean {
  if (error.code === '23505') {
    return true;
  }
  const msg = (error.message ?? '').toLowerCase();
  return (
    msg.includes('sightings_user_sha256_unique') ||
    msg.includes('duplicate key')
  );
}

async function checkServerSha256Duplicate(sha256: string): Promise<boolean> {
  if (!isSupabaseConfigured) return false;
  try {
    const { data, error } = await supabase
      .from('sightings')
      .select('id')
      .eq('sha256', sha256)
      .maybeSingle();

    if (error) {
      return false;
    }
    return Boolean(data?.id);
  } catch {
    return false;
  }
}

async function uploadSingleSightingRow(
  item: PendingSightingUploadRow,
  userId: string
): Promise<'uploaded' | 'duplicate' | 'deferred' | 'failed'> {
  const { id, walk_id, local_file_uri, sha256, taken_at, area_geohash } =
    item.payload;

  // If this sighting belongs to an active walk that hasn't finished yet,
  // or a finished walk still queued for upload, wait until the walk row exists on server.
  if (walk_id) {
    const activeWalk = getActiveWalkRecord();
    if (activeWalk && activeWalk.id === walk_id) {
      return 'deferred';
    }

    const pendingWalks = listPendingWalkUploads();
    if (
      pendingWalks.some(
        (w) => w.walk_id === walk_id || w.payload.client_id === walk_id
      )
    ) {
      await syncPendingWalks();
      const stillPending = listPendingWalkUploads().some(
        (w) => w.walk_id === walk_id || w.payload.client_id === walk_id
      );
      if (stillPending) {
        return 'deferred';
      }
    }
  }

  try {
    const bytes = await readLocalPhotoBytes(local_file_uri);
    const storagePath = `${userId}/${id}.jpg`;

    const { error: storageError } = await supabase.storage
      .from('sighting-photos')
      .upload(storagePath, bytes, {
        contentType: 'image/jpeg',
        upsert: true,
      });

    if (storageError) {
      markPendingSightingUploadError(id, storageError.message);
      logger.warn('Failed to upload sighting photo to storage', {
        sightingId: id,
        error: storageError.message,
      });
      return 'failed';
    }

    const { error: dbError } = await supabase.from('sightings').insert({
      id,
      user_id: userId,
      walk_id,
      photo_path: storagePath,
      sha256,
      taken_at,
      area_geohash,
      status: 'pending',
    });

    if (dbError) {
      if (isDuplicateError(dbError)) {
        // Check if this is an idempotent retry of the exact same sighting ID
        const { data: existingById } = await supabase
          .from('sightings')
          .select('id')
          .eq('id', id)
          .maybeSingle();

        removePendingSightingUpload(id);
        deleteLocalSightingFile(local_file_uri);

        if (existingById?.id === id) {
          return 'uploaded';
        }

        // Remove the duplicate storage object we just uploaded
        await supabase.storage
          .from('sighting-photos')
          .remove([storagePath])
          .catch(() => {});
        return 'duplicate';
      }

      markPendingSightingUploadError(id, dbError.message);
      logger.warn('Failed to insert sighting row', {
        sightingId: id,
        error: dbError.message,
      });
      return 'failed';
    }

    removePendingSightingUpload(id);
    deleteLocalSightingFile(local_file_uri);
    return 'uploaded';
  } catch (err) {
    markPendingSightingUploadError(id, String(err));
    return 'failed';
  }
}

/**
 * Enqueues a processed sighting photo locally and attempts an immediate upload if possible.
 * Blocks exact SHA-256 duplicates both in the local queue and on the server.
 */
export async function submitSightingPhoto(params: {
  processed: ProcessedSightingPhoto;
  walkId?: string | null;
  areaGeohash?: string | null;
  takenAt?: string;
}): Promise<SubmitSightingOutcome> {
  const {
    processed,
    walkId = null,
    areaGeohash = null,
    takenAt = new Date().toISOString(),
  } = params;

  // 1. Check local queue for identical SHA-256
  const localDuplicate = listPendingSightingUploads().find(
    (row) => row.payload.sha256 === processed.sha256
  );
  if (localDuplicate) {
    deleteLocalSightingFile(processed.localFileUri);
    return {
      status: 'duplicate',
      message: 'You already submitted this photo.',
    };
  }

  // 2. Check server for identical SHA-256 (even if currently in an active walk)
  const serverDuplicate = await checkServerSha256Duplicate(processed.sha256);
  if (serverDuplicate) {
    deleteLocalSightingFile(processed.localFileUri);
    return {
      status: 'duplicate',
      message: 'You already submitted this photo.',
    };
  }

  // 3. Enqueue locally for offline-safe durability
  const safeGeohash = areaGeohash ? areaGeohash.slice(0, 5) : null;
  enqueueSightingUpload(processed.sightingId, {
    id: processed.sightingId,
    walk_id: walkId,
    local_file_uri: processed.localFileUri,
    sha256: processed.sha256,
    taken_at: takenAt,
    area_geohash: safeGeohash,
  });

  if (!isSupabaseConfigured) {
    return { status: 'queued', sightingId: processed.sightingId };
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();
  const userId = session?.user?.id;
  if (!userId) {
    return { status: 'queued', sightingId: processed.sightingId };
  }

  const queuedRow = listPendingSightingUploads().find(
    (r) => r.sighting_id === processed.sightingId
  );
  if (!queuedRow) {
    return { status: 'uploaded', sightingId: processed.sightingId };
  }

  const outcome = await uploadSingleSightingRow(queuedRow, userId);
  if (outcome === 'duplicate') {
    return {
      status: 'duplicate',
      message: 'You already submitted this photo.',
    };
  }

  return {
    status: outcome === 'uploaded' ? 'uploaded' : 'queued',
    sightingId: processed.sightingId,
  };
}

/**
 * Uploads any pending sightings queued in local SQLite (`pending_sighting_uploads`).
 */
export async function syncPendingSightings(): Promise<{
  uploadedCount: number;
  remainingCount: number;
}> {
  const pending = listPendingSightingUploads();
  if (pending.length === 0 || isSyncingSightings || !isSupabaseConfigured) {
    return {
      uploadedCount: 0,
      remainingCount: pending.length,
    };
  }

  isSyncingSightings = true;
  let uploadedCount = 0;

  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const userId = session?.user?.id;
    if (!userId) {
      return {
        uploadedCount: 0,
        remainingCount: pending.length,
      };
    }

    for (const item of pending) {
      const res = await uploadSingleSightingRow(item, userId);
      if (res === 'uploaded') {
        uploadedCount += 1;
      }
    }
  } finally {
    isSyncingSightings = false;
  }

  return {
    uploadedCount,
    remainingCount: listPendingSightingUploads().length,
  };
}
