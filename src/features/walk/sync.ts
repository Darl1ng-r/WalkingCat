import {
  listPendingWalkUploads,
  markPendingUploadError,
  removePendingWalkUpload,
} from '@/lib/db';
import { isSupabaseConfigured } from '@/lib/env';
import { logger } from '@/lib/logger';
import { supabase } from '@/lib/supabase';

let isSyncing = false;

export interface SyncWalksResult {
  uploadedCount: number;
  remainingCount: number;
}

/**
 * Uploads any finished walks queued in local SQLite (`pending_uploads`) to Supabase.
 * Uses idempotent `client_id` upsert so retries never create duplicate walk rows.
 */
export async function syncPendingWalks(): Promise<SyncWalksResult> {
  const pending = listPendingWalkUploads();
  if (pending.length === 0 || isSyncing || !isSupabaseConfigured) {
    return {
      uploadedCount: 0,
      remainingCount: pending.length,
    };
  }

  isSyncing = true;
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
      try {
        const { error } = await supabase.from('walks').upsert(
          {
            client_id: item.payload.client_id,
            user_id: userId,
            started_at: item.payload.started_at,
            ended_at: item.payload.ended_at,
            duration_s: item.payload.duration_s,
            moving_time_s: item.payload.moving_time_s,
            distance_m: item.payload.distance_m,
            avg_speed_mps: item.payload.avg_speed_mps,
            route_polyline: item.payload.route_polyline,
            point_count: item.payload.point_count,
            status: 'completed',
          },
          { onConflict: 'client_id' }
        );

        if (error) {
          markPendingUploadError(item.walk_id, error.message);
          logger.warn('Failed to upload walk', {
            walkId: item.walk_id,
            error: error.message,
          });
        } else {
          removePendingWalkUpload(item.walk_id);
          uploadedCount += 1;
        }
      } catch (err) {
        markPendingUploadError(item.walk_id, String(err));
      }
    }
  } finally {
    isSyncing = false;
  }

  return {
    uploadedCount,
    remainingCount: listPendingWalkUploads().length,
  };
}
