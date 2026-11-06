import {
  listPendingWalkUploads,
  removePendingWalkUpload,
  type PendingWalkUploadRow,
} from '@/lib/db';
import { logger } from '@/lib/logger';
import { supabase } from '@/lib/supabase';
import {
  buildActivityDashboardSummary,
  getCurrentWeekDateRange,
  getTrailingDaysDateRange,
  parseLocalDateKey,
  toLocalDateKey,
  type ActivityDashboardSummary,
  type RawActivitySummaryRow,
} from './dashboard';

export interface WalkListItem {
  id: string;
  client_id: string;
  started_at: string;
  ended_at: string;
  duration_s: number;
  moving_time_s: number;
  distance_m: number;
  avg_speed_mps: number;
  steps: number | null;
  active_kcal: number | null;
  kcal_source: 'health' | 'estimate' | null;
  isPendingUpload: boolean;
  lastUploadError?: string | null;
}

export interface WalkDetailRecord extends WalkListItem {
  route_polyline: string;
  point_count: number;
}

export interface ListWalksPage {
  items: WalkListItem[];
  nextCursor: string | null;
}

function mapPendingRowToWalkDetail(row: PendingWalkUploadRow): WalkDetailRecord {
  const p = row.payload;
  return {
    id: row.walk_id,
    client_id: p.client_id,
    started_at: p.started_at,
    ended_at: p.ended_at,
    duration_s: Number(p.duration_s) || 0,
    moving_time_s: Number(p.moving_time_s) || 0,
    distance_m: Number(p.distance_m) || 0,
    avg_speed_mps: Number(p.avg_speed_mps) || 0,
    steps: p.steps ?? null,
    active_kcal: p.active_kcal !== undefined && p.active_kcal !== null ? Number(p.active_kcal) : null,
    kcal_source: p.kcal_source ?? null,
    route_polyline: p.route_polyline ?? '',
    point_count: Number(p.point_count) || 0,
    isPendingUpload: true,
    lastUploadError: row.last_error,
  };
}

/**
 * Returns local walks that are queued and waiting to upload, newest first.
 */
export function listPendingLocalWalks(): WalkListItem[] {
  return listPendingWalkUploads()
    .map(mapPendingRowToWalkDetail)
    .sort(
      (a, b) =>
        new Date(b.started_at).getTime() - new Date(a.started_at).getTime()
    );
}

/**
 * Paginated fetch of synced walks (newest first).
 * Deliberately omits `route_polyline` to keep list payloads lightweight.
 */
export async function listWalks(params: {
  cursor?: string | null;
  limit?: number;
} = {}): Promise<ListWalksPage> {
  const { cursor = null, limit = 20 } = params;

  let query = supabase
    .from('walks')
    .select(
      'id, client_id, started_at, ended_at, duration_s, moving_time_s, distance_m, avg_speed_mps, steps, active_kcal, kcal_source'
    )
    .order('started_at', { ascending: false })
    .limit(limit);

  if (cursor) {
    query = query.lt('started_at', cursor);
  }

  const { data, error } = await query;

  if (error) {
    logger.warn('Failed to list walks from Supabase', { error: error.message });
    throw new Error(error.message);
  }

  const rows = data ?? [];
  const items: WalkListItem[] = rows.map((r) => ({
    id: r.id,
    client_id: r.client_id,
    started_at: r.started_at,
    ended_at: r.ended_at,
    duration_s: Number(r.duration_s) || 0,
    moving_time_s: Number(r.moving_time_s) || 0,
    distance_m: Number(r.distance_m) || 0,
    avg_speed_mps: Number(r.avg_speed_mps) || 0,
    steps: r.steps ?? null,
    active_kcal: r.active_kcal !== null ? Number(r.active_kcal) : null,
    kcal_source: r.kcal_source ?? null,
    isPendingUpload: false,
  }));

  const nextCursor =
    items.length === limit ? items[items.length - 1]?.started_at ?? null : null;

  return { items, nextCursor };
}

/**
 * Fetches a single walk by its server `id` or `client_id` (including `route_polyline`).
 * Falls back to local pending walks if the walk hasn't uploaded yet.
 */
export async function getWalk(id: string): Promise<WalkDetailRecord | null> {
  const pendingMatch = listPendingWalkUploads().find(
    (row) => row.walk_id === id || row.payload.client_id === id
  );
  if (pendingMatch) {
    return mapPendingRowToWalkDetail(pendingMatch);
  }

  const { data, error } = await supabase
    .from('walks')
    .select(
      'id, client_id, started_at, ended_at, duration_s, moving_time_s, distance_m, avg_speed_mps, route_polyline, point_count, steps, active_kcal, kcal_source'
    )
    .or(`id.eq.${id},client_id.eq.${id}`)
    .maybeSingle();

  if (error) {
    logger.warn('Failed to fetch walk detail', { id, error: error.message });
    throw new Error(error.message);
  }

  if (!data) {
    return null;
  }

  return {
    id: data.id,
    client_id: data.client_id,
    started_at: data.started_at,
    ended_at: data.ended_at,
    duration_s: Number(data.duration_s) || 0,
    moving_time_s: Number(data.moving_time_s) || 0,
    distance_m: Number(data.distance_m) || 0,
    avg_speed_mps: Number(data.avg_speed_mps) || 0,
    route_polyline: data.route_polyline ?? '',
    point_count: Number(data.point_count) || 0,
    steps: data.steps ?? null,
    active_kcal: data.active_kcal !== null ? Number(data.active_kcal) : null,
    kcal_source: data.kcal_source ?? null,
    isPendingUpload: false,
  };
}

/**
 * Deletes a walk both locally (if pending upload) and on the server.
 */
export async function deleteWalk(id: string): Promise<void> {
  removePendingWalkUpload(id);

  const { error } = await supabase
    .from('walks')
    .delete()
    .or(`id.eq.${id},client_id.eq.${id}`);

  if (error) {
    logger.warn('Failed to delete walk from server', { id, error: error.message });
    throw new Error(error.message);
  }
}

async function fetchFallbackActivityRows(
  fromDate: string,
  toDate: string
): Promise<RawActivitySummaryRow[]> {
  const startLocal = parseLocalDateKey(fromDate);
  startLocal.setHours(0, 0, 0, 0);
  const endLocal = parseLocalDateKey(toDate);
  endLocal.setHours(23, 59, 59, 999);

  const [walksRes, healthRes] = await Promise.all([
    supabase
      .from('walks')
      .select('started_at, distance_m, moving_time_s, steps')
      .eq('is_suspicious', false)
      .gte('started_at', startLocal.toISOString())
      .lte('started_at', endLocal.toISOString()),
    supabase
      .from('daily_activity')
      .select('date, steps')
      .gte('date', fromDate)
      .lte('date', toDate),
  ]);

  const map = new Map<string, RawActivitySummaryRow>();

  for (const w of walksRes.data ?? []) {
    const key = toLocalDateKey(w.started_at);
    const existing = map.get(key) ?? {
      date: key,
      walks_count: 0,
      distance_m: 0,
      moving_time_s: 0,
      steps: 0,
    };
    existing.walks_count += 1;
    existing.distance_m += Number(w.distance_m) || 0;
    existing.moving_time_s += Number(w.moving_time_s) || 0;
    existing.steps += Number(w.steps) || 0;
    map.set(key, existing);
  }

  for (const d of healthRes.data ?? []) {
    const existing = map.get(d.date) ?? {
      date: d.date,
      walks_count: 0,
      distance_m: 0,
      moving_time_s: 0,
      steps: 0,
    };
    existing.steps = Math.max(existing.steps, Number(d.steps) || 0);
    map.set(d.date, existing);
  }

  return Array.from(map.values());
}

/**
 * Fetches the activity summary for either the current locale week ('week')
 * or trailing 30 days ('month'), merging any pending local walks.
 */
export async function getActivityDashboardSummary(
  period: 'week' | 'month' = 'week',
  locale?: string
): Promise<ActivityDashboardSummary> {
  const now = new Date();
  const range =
    period === 'week'
      ? getCurrentWeekDateRange(now, locale)
      : getTrailingDaysDateRange(30, now);

  const tzOffsetMinutes = -now.getTimezoneOffset();
  let serverRows: RawActivitySummaryRow[] = [];

  const { data: sessionData } = await supabase.auth.getSession();
  if (sessionData.session?.user) {
    const { data, error } = await supabase.rpc('get_activity_summary', {
      p_from: range.fromDate,
      p_to: range.toDate,
      p_tz_offset_minutes: tzOffsetMinutes,
    });

    if (!error && data) {
      serverRows = data.map((r) => ({
        date: r.date,
        walks_count: Number(r.walks_count) || 0,
        distance_m: Number(r.distance_m) || 0,
        moving_time_s: Number(r.moving_time_s) || 0,
        steps: Number(r.steps) || 0,
      }));
    } else {
      serverRows = await fetchFallbackActivityRows(range.fromDate, range.toDate);
    }
  }

  const pendingWalks = listPendingWalkUploads();

  return buildActivityDashboardSummary({
    fromDate: range.fromDate,
    toDate: range.toDate,
    period,
    serverRows,
    pendingWalks,
    now,
    locale,
  });
}
