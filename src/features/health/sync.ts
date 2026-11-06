import { isSupabaseConfigured } from '@/lib/env';
import { logger } from '@/lib/logger';
import { supabase } from '@/lib/supabase';

import { estimateWalkingCalories } from './calories';
import { healthProvider } from './provider';
import type { HealthPermissionState, HealthSourceName } from './types';

const SYNC_THROTTLE_MS = 15 * 60 * 1000; // 15 minutes
let lastDailySyncAt = 0;

export function toLocalDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getLocalDayBounds(date: Date): { start: Date; end: Date } {
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
  const end = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
  return { start, end };
}

export interface WalkHealthResolution {
  steps: number | null;
  activeKcal: number;
  kcalSource: 'health' | 'estimate';
  healthSourceName: HealthSourceName;
  usedDefaultWeight: boolean;
}

/**
 * Resolves step count and calories for a finished walk `[startedAt, endedAt]`.
 * Prefers connected health platform data when permitted; falls back to the MET
 * calorie estimate clearly labelled as `'estimate'`.
 */
export async function resolveWalkHealthData(params: {
  startedAt: Date;
  endedAt: Date;
  movingTimeSeconds: number;
  distanceMeters: number;
  weightKg?: number | null;
}): Promise<WalkHealthResolution> {
  const { startedAt, endedAt, movingTimeSeconds, distanceMeters, weightKg } = params;

  const permState = await healthProvider.getPermissionState();
  let steps: number | null = null;
  let healthKcal: number | null = null;

  if (permState === 'connected') {
    steps = await healthProvider.getSteps(startedAt, endedAt);
    healthKcal = await healthProvider.getActiveCalories(startedAt, endedAt);
  }

  const estimate = estimateWalkingCalories({
    movingTimeSeconds,
    distanceMeters,
    weightKg,
  });

  if (healthKcal !== null && healthKcal > 0) {
    return {
      steps,
      activeKcal: healthKcal,
      kcalSource: 'health',
      healthSourceName: healthProvider.sourceName,
      usedDefaultWeight: false,
    };
  }

  return {
    steps,
    activeKcal: estimate.kcal,
    kcalSource: 'estimate',
    healthSourceName: healthProvider.sourceName,
    usedDefaultWeight: estimate.usedDefaultWeight,
  };
}

export interface TodayActivitySummary {
  permissionState: HealthPermissionState;
  providerDisplayName: string;
  stepsToday: number | null;
  activeKcalToday: number | null;
  walksTodayCount: number;
  distanceTodayMeters: number;
}

export async function fetchTodayActivitySummary(
  userId?: string | null
): Promise<TodayActivitySummary> {
  const permissionState = await healthProvider.getPermissionState();
  const { start, end } = getLocalDayBounds(new Date());

  let stepsToday: number | null = null;
  let activeKcalToday: number | null = null;

  if (permissionState === 'connected') {
    stepsToday = await healthProvider.getSteps(start, end);
    activeKcalToday = await healthProvider.getActiveCalories(start, end);
  }

  let walksTodayCount = 0;
  let distanceTodayMeters = 0;

  if (userId && isSupabaseConfigured) {
    const { data, error } = await supabase
      .from('walks')
      .select('distance_m')
      .eq('user_id', userId)
      .gte('started_at', start.toISOString())
      .lte('started_at', end.toISOString());

    if (!error && data) {
      walksTodayCount = data.length;
      distanceTodayMeters = data.reduce((acc, row) => acc + Number(row.distance_m || 0), 0);
    }
  }

  return {
    permissionState,
    providerDisplayName: healthProvider.displayName,
    stepsToday,
    activeKcalToday,
    walksTodayCount,
    distanceTodayMeters,
  };
}

/**
 * Syncs today's and yesterday's aggregated step/calorie counts to `daily_activity`
 * and refreshes any walk that finished within the last 2 hours (late wearable sync).
 * Throttled to once per 15 minutes unless `force` is true.
 */
export async function syncDailyHealthActivity(force = false): Promise<void> {
  const now = Date.now();
  if (!force && now - lastDailySyncAt < SYNC_THROTTLE_MS) {
    return;
  }

  if (!isSupabaseConfigured) {
    return;
  }

  const permState = await healthProvider.getPermissionState();
  if (permState !== 'connected') {
    return;
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();
  const userId = session?.user?.id;
  if (!userId) {
    return;
  }

  lastDailySyncAt = now;

  try {
    const today = new Date();
    const yesterday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1);

    for (const targetDate of [yesterday, today]) {
      const { start, end } = getLocalDayBounds(targetDate);
      const steps = await healthProvider.getSteps(start, end);
      const kcal = await healthProvider.getActiveCalories(start, end);

      if (steps !== null) {
        await supabase.from('daily_activity').upsert(
          {
            user_id: userId,
            date: toLocalDateString(targetDate),
            steps,
            active_kcal: kcal,
            kcal_source: kcal !== null ? 'health' : null,
            source: healthProvider.sourceName,
          },
          { onConflict: 'user_id,date' }
        );
      }
    }

    // Re-query steps for any walk that ended within the last 2 hours (wearable late sync)
    const twoHoursAgoIso = new Date(now - 2 * 3600 * 1000).toISOString();
    const { data: recentWalks } = await supabase
      .from('walks')
      .select('id, started_at, ended_at, steps')
      .eq('user_id', userId)
      .gte('ended_at', twoHoursAgoIso);

    if (recentWalks && recentWalks.length > 0) {
      for (const walk of recentWalks) {
        const freshSteps = await healthProvider.getSteps(
          new Date(walk.started_at),
          new Date(walk.ended_at)
        );
        if (freshSteps !== null && freshSteps > (walk.steps ?? 0)) {
          await supabase
            .from('walks')
            .update({ steps: freshSteps })
            .eq('id', walk.id);
        }
      }
    }
  } catch (err) {
    logger.warn('Daily health activity sync failed', { error: String(err) });
  }
}
