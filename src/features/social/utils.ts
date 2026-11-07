import { formatDistance, formatDuration, formatNumber } from '@/lib/format';

function formatCardNum(cardNumber: number): string {
  const safe = Math.max(
    1,
    Math.floor(Number.isFinite(cardNumber) ? cardNumber : 1)
  );
  return `#${String(safe).padStart(3, '0')}`;
}

function getCardName(
  nickname: string | null | undefined,
  cardNumber: number
): string {
  const trimmed = (nickname ?? '').trim();
  if (trimmed.length > 0) {
    return trimmed;
  }
  const safe = Math.max(
    1,
    Math.floor(Number.isFinite(cardNumber) ? cardNumber : 1)
  );
  return `Unnamed cat #${safe}`;
}

export type LeaderboardMetric =
  | 'steps'
  | 'distance_m'
  | 'walks'
  | 'challenge_points';

export type LeaderboardWeekPeriod = 'this_week' | 'last_week';

export type ActivityEventType =
  | 'walk_completed'
  | 'achievement_unlocked'
  | 'collection_milestone'
  | 'challenge_completed'
  | 'cat_card_shared';

export type ReactionEmoji = '👏' | '🐾' | '❤️' | '🔥';

export const REACTION_EMOJIS: readonly ReactionEmoji[] = [
  '👏',
  '🐾',
  '❤️',
  '🔥',
] as const;

export const LEADERBOARD_MAX_DAILY_STEPS = 60_000;

export const LEADERBOARD_METRICS: readonly {
  key: LeaderboardMetric;
  label: string;
  shortLabel: string;
  emoji: string;
}[] = [
  { key: 'steps', label: 'Steps', shortLabel: 'Steps', emoji: '👣' },
  { key: 'distance_m', label: 'Distance', shortLabel: 'Distance', emoji: '🗺️' },
  { key: 'walks', label: 'Walks', shortLabel: 'Walks', emoji: '🥾' },
  {
    key: 'challenge_points',
    label: 'Challenge Pts',
    shortLabel: 'Points',
    emoji: '🎯',
  },
] as const;

/**
 * Computes the Monday `YYYY-MM-DD` start date for `'this_week'` or `'last_week'`
 * (resets weekly on Monday).
 */
export function getWeekStartDateString(
  period: LeaderboardWeekPeriod,
  now: Date = new Date()
): string {
  const utcDay = now.getUTCDay(); // 0=Sun, 1=Mon, ..., 6=Sat
  const diffToMonday = utcDay === 0 ? -6 : 1 - utcDay;
  const extraWeekOffset = period === 'last_week' ? -7 : 0;

  const monday = new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate() + diffToMonday + extraWeekOffset
    )
  );
  return monday.toISOString().slice(0, 10);
}

/**
 * Formats a leaderboard metric value (Calories are never a leaderboard metric).
 */
export function formatLeaderboardValue(
  metric: LeaderboardMetric,
  value: number
): string {
  const safeVal = Math.max(0, Number(value) || 0);
  switch (metric) {
    case 'steps':
      return `${formatNumber(Math.round(safeVal))} steps`;
    case 'distance_m':
      return formatDistance(safeVal);
    case 'walks':
      return `${formatNumber(Math.round(safeVal))} ${
        Math.round(safeVal) === 1 ? 'walk' : 'walks'
      }`;
    case 'challenge_points':
      return `${formatNumber(Math.round(safeVal))} pts`;
    default:
      return formatNumber(Math.round(safeVal));
  }
}

/**
 * Enforces the anti-cheat daily step cap (60,000 steps/day) and flags outliers.
 */
export function capDailyStepsForLeaderboard(
  rawSteps: number,
  maxDailySteps: number = LEADERBOARD_MAX_DAILY_STEPS
): { countedSteps: number; isOutlier: boolean } {
  const safe = Math.max(0, Math.floor(Number(rawSteps) || 0));
  if (safe > maxDailySteps) {
    return { countedSteps: maxDailySteps, isOutlier: true };
  }
  return { countedSteps: safe, isOutlier: false };
}

/**
 * Builds the deep link URL for a friend invite code (`walkingcat://invite/<code>`).
 */
export function buildInviteDeepLink(code: string): string {
  const clean = code.trim().toUpperCase();
  return `walkingcat://invite/${clean}`;
}

/**
 * Parses a 6–12 character alphanumeric invite code from either a raw code string
 * or a `walkingcat://invite/<code>` deep link.
 */
export function parseInviteCodeFromInput(rawInput: string): string | null {
  const trimmed = rawInput.trim();
  if (!trimmed) {
    return null;
  }

  // Match walkingcat://invite/CODE or /invite/CODE
  const urlMatch = trimmed.match(/invite\/([A-Za-z0-9]{6,12})/i);
  if (urlMatch?.[1]) {
    return urlMatch[1].toUpperCase();
  }

  if (/^[A-Za-z0-9]{6,12}$/.test(trimmed)) {
    return trimmed.toUpperCase();
  }

  return null;
}

export interface FormattedActivityEventCopy {
  emoji: string;
  headline: string;
  subtitle: string;
  sharedCatCard?: {
    catId: string | null;
    cardNumberLabel: string;
    displayName: string;
    sightingCount: number;
    coverPhotoPath: string | null;
    themeId: string | null;
  };
}

/**
 * Formats a friend's milestone `activity_events` row into privacy-safe display copy.
 * Never includes coordinates, polylines, area geohashes, or calories.
 */
export function formatActivityEventCopy(
  type: ActivityEventType,
  payload: Record<string, unknown>,
  actorDisplayName: string
): FormattedActivityEventCopy {
  const actor = actorDisplayName.trim() || 'A friend';

  switch (type) {
    case 'walk_completed': {
      const distanceM = Number(payload.distance_m ?? 0);
      const movingTimeS = Number(payload.moving_time_s ?? 0);
      return {
        emoji: '🥾',
        headline: `${actor} completed a ${formatDistance(distanceM)} walk`,
        subtitle:
          movingTimeS > 0
            ? `${formatDuration(movingTimeS)} of moving time`
            : 'Enjoyed a neighborhood stroll',
      };
    }

    case 'achievement_unlocked': {
      const title =
        typeof payload.title === 'string' ? payload.title : 'a new badge';
      const icon = typeof payload.icon === 'string' ? payload.icon : '🏅';
      return {
        emoji: icon,
        headline: `${actor} unlocked "${title}"`,
        subtitle: 'Personal milestone badge earned',
      };
    }

    case 'collection_milestone': {
      const count = Math.max(1, Number(payload.cats_count ?? 1));
      return {
        emoji: '🐾',
        headline: `${actor} reached ${formatNumber(count)} ${
          count === 1 ? 'cat card' : 'cat cards'
        } in their collection!`,
        subtitle: 'Spotted respectfully from a distance',
      };
    }

    case 'challenge_completed': {
      const title =
        typeof payload.title === 'string' ? payload.title : 'a challenge';
      const icon = typeof payload.icon === 'string' ? payload.icon : '🎯';
      const period = payload.period === 'weekly' ? 'Weekly' : 'Daily';
      return {
        emoji: icon,
        headline: `${actor} completed "${title}"`,
        subtitle: `${period} challenge goal reached`,
      };
    }

    case 'cat_card_shared': {
      const cardNumber = Math.max(1, Number(payload.card_number ?? 1));
      const nickname =
        typeof payload.nickname === 'string' ? payload.nickname : null;
      const sightingCount = Math.max(1, Number(payload.sighting_count ?? 1));
      const coverPhotoPath =
        typeof payload.cover_photo_path === 'string'
          ? payload.cover_photo_path
          : null;
      const catId = typeof payload.cat_id === 'string' ? payload.cat_id : null;
      const themeId =
        typeof payload.theme_id === 'string' ? payload.theme_id : null;
      const displayName = getCardName(nickname, cardNumber);
      const cardNumberLabel = formatCardNum(cardNumber);

      return {
        emoji: '🐱',
        headline: `${actor} shared cat card ${cardNumberLabel}: ${displayName}`,
        subtitle: `Spotted ${sightingCount} ${
          sightingCount === 1 ? 'time' : 'times'
        } · Location kept private`,
        sharedCatCard: {
          catId,
          cardNumberLabel,
          displayName,
          sightingCount,
          coverPhotoPath,
          themeId,
        },
      };
    }

    default:
      return {
        emoji: '✨',
        headline: `${actor} reached a walking milestone`,
        subtitle: 'StrayCat Walk activity',
      };
  }
}
