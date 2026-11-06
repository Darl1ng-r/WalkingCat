import type { PendingWalkUploadRow } from '@/lib/db';

export interface RawActivitySummaryRow {
  date: string; // YYYY-MM-DD
  walks_count: number;
  distance_m: number;
  moving_time_s: number;
  steps: number;
}

export interface DailyActivityPoint {
  date: string; // YYYY-MM-DD in local time
  shortLabel: string; // e.g. 'Mon', 'Tue' or '6'
  isToday: boolean;
  walksCount: number;
  distanceMeters: number;
  movingTimeSeconds: number;
  steps: number;
}

export interface ActivityDashboardSummary {
  fromDate: string;
  toDate: string;
  totalDays: number;
  activeDaysCount: number;
  totalWalks: number;
  totalDistanceMeters: number;
  totalMovingTimeSeconds: number;
  totalSteps: number;
  encouragingTitle: string;
  encouragingSubtitle: string;
  days: DailyActivityPoint[];
}

const SUNDAY_FIRST_REGIONS = new Set([
  'US',
  'CA',
  'MX',
  'JP',
  'KR',
  'TW',
  'HK',
  'PH',
  'BR',
  'IL',
  'ZA',
]);

const SATURDAY_FIRST_REGIONS = new Set([
  'SA',
  'AE',
  'QA',
  'KW',
  'BH',
  'OM',
  'JO',
  'EG',
  'DZ',
]);

/**
 * Formats a Date (or timestamp/ISO string) into a local `YYYY-MM-DD` string.
 */
export function toLocalDateKey(input: Date | string | number): string {
  const date = input instanceof Date ? input : new Date(input);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Parses a `YYYY-MM-DD` string into a local Date at 12:00:00 (noon) to avoid DST shifts.
 */
export function parseLocalDateKey(dateKey: string): Date {
  const [y, m, d] = dateKey.split('-').map((n) => Number(n));
  return new Date(y || 1970, (m || 1) - 1, d || 1, 12, 0, 0, 0);
}

/**
 * Returns the locale's first day of the week (0 = Sunday, 1 = Monday, 6 = Saturday).
 */
export function getLocaleWeekStartDay(locale?: string): 0 | 1 | 6 {
  const resolvedLocale =
    locale ||
    (typeof Intl !== 'undefined'
      ? Intl.DateTimeFormat().resolvedOptions().locale
      : 'en-US') ||
    'en-US';

  try {
    if (typeof Intl !== 'undefined' && 'Locale' in Intl) {
      const intlLocale = new Intl.Locale(resolvedLocale) as Intl.Locale & {
        getWeekInfo?: () => { firstDay?: number };
        weekInfo?: { firstDay?: number };
      };
      const info = intlLocale.getWeekInfo?.() ?? intlLocale.weekInfo;
      if (info?.firstDay !== undefined) {
        if (info.firstDay === 7 || info.firstDay === 0) return 0;
        if (info.firstDay === 6) return 6;
        if (info.firstDay === 1) return 1;
      }
    }
  } catch {
    // Fall through to region heuristic
  }

  const parts = resolvedLocale.replace('_', '-').split('-');
  const region = parts.length > 1 ? parts[parts.length - 1]?.toUpperCase() : '';

  if (region && SUNDAY_FIRST_REGIONS.has(region)) {
    return 0;
  }
  if (region && SATURDAY_FIRST_REGIONS.has(region)) {
    return 6;
  }
  return 1;
}

/**
 * Generates an inclusive array of `YYYY-MM-DD` local date keys from `fromDate` to `toDate`.
 */
export function enumerateDateKeys(fromDate: string, toDate: string): string[] {
  const start = parseLocalDateKey(fromDate);
  const end = parseLocalDateKey(toDate);
  if (start.getTime() > end.getTime()) {
    return [];
  }

  const keys: string[] = [];
  const cursor = new Date(start.getTime());
  while (cursor.getTime() <= end.getTime() && keys.length < 366) {
    keys.push(toLocalDateKey(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return keys;
}

/**
 * Returns the 7-day range for the current week starting on the user's locale first day.
 */
export function getCurrentWeekDateRange(
  now: Date = new Date(),
  locale?: string
): { fromDate: string; toDate: string; dateKeys: string[] } {
  const weekStartDay = getLocaleWeekStartDay(locale);
  const currentDay = now.getDay(); // 0..6
  const diff = (currentDay - weekStartDay + 7) % 7;

  const start = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() - diff,
    12,
    0,
    0,
    0
  );
  const end = new Date(
    start.getFullYear(),
    start.getMonth(),
    start.getDate() + 6,
    12,
    0,
    0,
    0
  );

  const fromDate = toLocalDateKey(start);
  const toDate = toLocalDateKey(end);
  return {
    fromDate,
    toDate,
    dateKeys: enumerateDateKeys(fromDate, toDate),
  };
}

/**
 * Returns the trailing `daysCount` local dates ending on `now` (e.g. 7 days or 30 days).
 */
export function getTrailingDaysDateRange(
  daysCount: number,
  now: Date = new Date()
): { fromDate: string; toDate: string; dateKeys: string[] } {
  const safeCount = Math.max(1, Math.min(365, Math.floor(daysCount)));
  const end = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    12,
    0,
    0,
    0
  );
  const start = new Date(
    end.getFullYear(),
    end.getMonth(),
    end.getDate() - (safeCount - 1),
    12,
    0,
    0,
    0
  );

  const fromDate = toLocalDateKey(start);
  const toDate = toLocalDateKey(end);
  return {
    fromDate,
    toDate,
    dateKeys: enumerateDateKeys(fromDate, toDate),
  };
}

/**
 * Produces warm, encouraging, non-judgmental copy for the user's walking progress.
 */
export function getEncouragingCopy(
  activeDaysCount: number,
  totalWalks: number,
  period: 'week' | 'month'
): { title: string; subtitle: string } {
  const periodLabel = period === 'week' ? 'this week' : 'over the last 30 days';

  if (activeDaysCount === 0 && totalWalks === 0) {
    return {
      title:
        period === 'week'
          ? 'A fresh week for a stroll 🌿'
          : 'Your monthly walking journey 🌿',
      subtitle:
        'Whenever you step outside for a walk, your personal progress will show up here.',
    };
  }

  if (activeDaysCount === 1) {
    return {
      title: `You walked on 1 day ${periodLabel} 🎉`,
      subtitle:
        totalWalks > 1
          ? `${totalWalks} walks logged — every step counts!`
          : 'Great job getting out there at your own pace.',
    };
  }

  return {
    title: `You walked on ${activeDaysCount} days ${periodLabel} 🎉`,
    subtitle: `${totalWalks} ${totalWalks === 1 ? 'walk' : 'walks'} completed — keep enjoying your neighborhood strolls!`,
  };
}

function formatDayShortLabel(
  dateKey: string,
  totalDays: number,
  locale = 'en-US'
): string {
  const date = parseLocalDateKey(dateKey);
  if (totalDays <= 7) {
    return date.toLocaleDateString(locale, { weekday: 'short' }).slice(0, 3);
  }
  return String(date.getDate());
}

/**
 * Combines server summary rows and any unsynced local pending walks into a
 * complete, timezone-aligned `ActivityDashboardSummary`.
 */
export function buildActivityDashboardSummary(params: {
  fromDate: string;
  toDate: string;
  period: 'week' | 'month';
  serverRows: readonly RawActivitySummaryRow[];
  pendingWalks?: readonly PendingWalkUploadRow[];
  now?: Date;
  locale?: string;
}): ActivityDashboardSummary {
  const {
    fromDate,
    toDate,
    period,
    serverRows,
    pendingWalks = [],
    now = new Date(),
    locale = 'en-US',
  } = params;

  const todayKey = toLocalDateKey(now);
  const dateKeys = enumerateDateKeys(fromDate, toDate);

  const byDate = new Map<
    string,
    {
      walksCount: number;
      distanceMeters: number;
      movingTimeSeconds: number;
      steps: number;
    }
  >();

  for (const key of dateKeys) {
    byDate.set(key, {
      walksCount: 0,
      distanceMeters: 0,
      movingTimeSeconds: 0,
      steps: 0,
    });
  }

  for (const row of serverRows) {
    const bucket = byDate.get(row.date);
    if (!bucket) continue;
    bucket.walksCount += Number(row.walks_count) || 0;
    bucket.distanceMeters += Number(row.distance_m) || 0;
    bucket.movingTimeSeconds += Number(row.moving_time_s) || 0;
    bucket.steps = Math.max(bucket.steps, Number(row.steps) || 0);
  }

  // Merge offline pending walks so the dashboard is immediately accurate offline
  for (const pending of pendingWalks) {
    const localDate = toLocalDateKey(pending.payload.started_at);
    const bucket = byDate.get(localDate);
    if (!bucket) continue;
    bucket.walksCount += 1;
    bucket.distanceMeters += Number(pending.payload.distance_m) || 0;
    bucket.movingTimeSeconds += Number(pending.payload.moving_time_s) || 0;
    bucket.steps += Number(pending.payload.steps) || 0;
  }

  let totalWalks = 0;
  let totalDistanceMeters = 0;
  let totalMovingTimeSeconds = 0;
  let totalSteps = 0;
  let activeDaysCount = 0;

  const days: DailyActivityPoint[] = dateKeys.map((dateKey) => {
    const b = byDate.get(dateKey) ?? {
      walksCount: 0,
      distanceMeters: 0,
      movingTimeSeconds: 0,
      steps: 0,
    };

    totalWalks += b.walksCount;
    totalDistanceMeters += b.distanceMeters;
    totalMovingTimeSeconds += b.movingTimeSeconds;
    totalSteps += b.steps;

    if (b.walksCount > 0 || b.distanceMeters > 0) {
      activeDaysCount += 1;
    }

    return {
      date: dateKey,
      shortLabel: formatDayShortLabel(dateKey, dateKeys.length, locale),
      isToday: dateKey === todayKey,
      walksCount: b.walksCount,
      distanceMeters: Math.round(b.distanceMeters),
      movingTimeSeconds: b.movingTimeSeconds,
      steps: b.steps,
    };
  });

  const copy = getEncouragingCopy(activeDaysCount, totalWalks, period);

  return {
    fromDate,
    toDate,
    totalDays: days.length,
    activeDaysCount,
    totalWalks,
    totalDistanceMeters: Math.round(totalDistanceMeters),
    totalMovingTimeSeconds,
    totalSteps,
    encouragingTitle: copy.title,
    encouragingSubtitle: copy.subtitle,
    days,
  };
}
