import { isSupabaseConfigured } from '@/lib/env';
import { logger } from '@/lib/logger';
import { supabase } from '@/lib/supabase';
import {
  getLocalAnalyticsOptOutSetting,
  setLocalAnalyticsOptOutSetting,
} from '@/lib/db';

export type DistanceBucket =
  | '< 500m'
  | '500m - 1km'
  | '1km - 3km'
  | '3km - 5km'
  | '5km - 10km'
  | '10km+';

export type StepsBucket =
  | '< 1k'
  | '1k - 3k'
  | '3k - 5k'
  | '5k - 8k'
  | '8k - 10k'
  | '10k+';

export function getDistanceBucket(distanceMeters: number): DistanceBucket {
  if (distanceMeters < 500) return '< 500m';
  if (distanceMeters < 1000) return '500m - 1km';
  if (distanceMeters < 3000) return '1km - 3km';
  if (distanceMeters < 5000) return '3km - 5km';
  if (distanceMeters < 10000) return '5km - 10km';
  return '10km+';
}

export function getStepsBucket(steps: number): StepsBucket {
  if (steps < 1000) return '< 1k';
  if (steps < 3000) return '1k - 3k';
  if (steps < 5000) return '3k - 5k';
  if (steps < 8000) return '5k - 8k';
  if (steps < 10000) return '8k - 10k';
  return '10k+';
}

export interface AnalyticsEventMap {
  onboarding_completed: { has_display_name: boolean };
  walk_started: { source?: 'tab' | 'quick_start' };
  walk_completed: {
    duration_s: number;
    distance_bucket: DistanceBucket;
    steps_bucket: StepsBucket;
  };
  walk_discarded: { reason?: string };
  walk_gps_failed: { error_code?: string };
  health_connected: { provider: 'apple_health' | 'health_connect' | 'manual' };
  sighting_submitted: { has_coarse_area: boolean };
  sighting_result: { status: 'accepted' | 'rejected' | 'pending' };
  collection_viewed: { total_cats_bucket: string };
  cat_renamed: { had_previous_nickname: boolean };
  cat_linked: { same_card: boolean };
  challenge_completed: { period: 'daily' | 'weekly'; metric: string };
  friend_invite_sent: { channel?: 'share_sheet' | 'copy' };
  cosmetic_unlocked: { cosmetic_id: string; points_spent: number };
  cat_theme_equipped: { theme_id: string };
  profile_cosmetic_equipped: { slot: 'banner' | 'title'; cosmetic_id: string };
  friend_added: { method: 'invite_code' | 'username_search' };
  leaderboard_viewed: { metric: string; period: 'this_week' | 'last_week' };
}

export type AnalyticsEventName = keyof AnalyticsEventMap;

const FORBIDDEN_PROPERTY_KEYS = new Set([
  'latitude',
  'longitude',
  'lat',
  'lon',
  'lng',
  'route',
  'polyline',
  'coordinates',
  'email',
  'password',
  'token',
  'calories',
  'kcal',
  'heart_rate',
]);

/**
 * Strips any sensitive PII, health numbers, or GPS coordinate keys.
 */
export function sanitizeAnalyticsProps(
  props?: Record<string, unknown>
): Record<string, unknown> {
  if (!props) return {};

  const clean: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(props)) {
    const lowerKey = key.toLowerCase();
    if (FORBIDDEN_PROPERTY_KEYS.has(lowerKey)) {
      continue;
    }
    // Block any nested object with lat/lng
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      clean[key] = sanitizeAnalyticsProps(value as Record<string, unknown>);
    } else {
      clean[key] = value;
    }
  }
  return clean;
}

/**
 * Tracks a privacy-respecting product telemetry event.
 * Checks user opt-out status; if opted out, event is discarded.
 */
export async function track<E extends AnalyticsEventName>(
  eventName: E,
  properties?: AnalyticsEventMap[E]
): Promise<void> {
  try {
    if (getLocalAnalyticsOptOutSetting()) {
      return; // Opted out per privacy preference
    }

    const sanitized = sanitizeAnalyticsProps(
      properties as Record<string, unknown> | undefined
    );

    if (!isSupabaseConfigured) {
      logger.info(`[Analytics] ${eventName}`, sanitized);
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    // Asynchronously insert telemetry row
    const { error } = await supabase.from('analytics_events').insert({
      user_id: user?.id ?? null,
      event_name: eventName,
      properties: sanitized as any,
    });

    if (error) {
      logger.warn(`Failed to track analytics event ${eventName}`, {
        error: error.message,
      });
    }
  } catch {
    // Analytics failures must never crash user workflows
  }
}

export {
  getLocalAnalyticsOptOutSetting,
  setLocalAnalyticsOptOutSetting,
};
