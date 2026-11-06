import { formatDistance, formatDuration, formatNumber } from '@/lib/format';

export type ChallengeDifficulty = 'easy' | 'standard';
export type ChallengePeriod = 'daily' | 'weekly';
export type ChallengeMetric =
  | 'walks'
  | 'distance_m'
  | 'moving_time_s'
  | 'steps'
  | 'active_days'
  | 'sightings';

export type AchievementMetric =
  | 'walks_count'
  | 'total_distance_m'
  | 'cats_count'
  | 'weekly_active_days';

export interface PointRulesConfig {
  walkCompletedPoints: number;
  walkMinDistanceMeters: number;
  walkMinMovingTimeSeconds: number;
  walkDailyCap: number;
  walkDistancePointsPerKm: number;
  walkDistanceMaxKm: number;
  steps5kPoints: number;
  steps8kPoints: number;
  steps10kPoints: number;
  sightingAcceptedPoints: number;
  sightingDailyCap: number;
  dailyChallengePoints: number;
  weeklyChallengePoints: number;
}

export const DEFAULT_POINT_RULES: PointRulesConfig = {
  walkCompletedPoints: 20,
  walkMinDistanceMeters: 500,
  walkMinMovingTimeSeconds: 600,
  walkDailyCap: 3,
  walkDistancePointsPerKm: 5,
  walkDistanceMaxKm: 10,
  steps5kPoints: 10,
  steps8kPoints: 10,
  steps10kPoints: 10,
  sightingAcceptedPoints: 15,
  sightingDailyCap: 5,
  dailyChallengePoints: 25,
  weeklyChallengePoints: 75,
};

export interface WalkPointsEstimateInput {
  distanceMeters: number;
  movingTimeSeconds: number;
  isSuspicious?: boolean;
  rewardedWalksTodayCount?: number;
}

export interface WalkPointsEstimateBreakdown {
  qualifies: boolean;
  walkPoints: number;
  distanceBonusPoints: number;
  fullKmCount: number;
  totalPoints: number;
  reasonNotRewarded: 'too_short' | 'daily_cap_reached' | 'suspicious' | null;
}

/**
 * Pure mirror of the server-side `on_walk_inserted` point rules.
 * Used for testing and previewing expected walk points while offline.
 */
export function calculateWalkPointsBreakdown(
  input: WalkPointsEstimateInput,
  config: PointRulesConfig = DEFAULT_POINT_RULES
): WalkPointsEstimateBreakdown {
  if (input.isSuspicious) {
    return {
      qualifies: false,
      walkPoints: 0,
      distanceBonusPoints: 0,
      fullKmCount: 0,
      totalPoints: 0,
      reasonNotRewarded: 'suspicious',
    };
  }

  if (
    input.distanceMeters < config.walkMinDistanceMeters ||
    input.movingTimeSeconds < config.walkMinMovingTimeSeconds
  ) {
    return {
      qualifies: false,
      walkPoints: 0,
      distanceBonusPoints: 0,
      fullKmCount: 0,
      totalPoints: 0,
      reasonNotRewarded: 'too_short',
    };
  }

  const rewardedToday = input.rewardedWalksTodayCount ?? 0;
  if (rewardedToday >= config.walkDailyCap) {
    return {
      qualifies: false,
      walkPoints: 0,
      distanceBonusPoints: 0,
      fullKmCount: 0,
      totalPoints: 0,
      reasonNotRewarded: 'daily_cap_reached',
    };
  }

  const walkPoints = config.walkCompletedPoints;
  const fullKmCount = Math.min(
    Math.floor(Math.max(0, input.distanceMeters) / 1000),
    config.walkDistanceMaxKm
  );
  const distanceBonusPoints = fullKmCount * config.walkDistancePointsPerKm;

  return {
    qualifies: true,
    walkPoints,
    distanceBonusPoints,
    fullKmCount,
    totalPoints: walkPoints + distanceBonusPoints,
    reasonNotRewarded: null,
  };
}

/**
 * Pure mirror of the server-side daily step milestone rules (5k, 8k, 10k).
 */
export function calculateDailyStepsMilestonePoints(
  steps: number,
  config: PointRulesConfig = DEFAULT_POINT_RULES
): {
  milestonesReached: (5000 | 8000 | 10000)[];
  totalPoints: number;
} {
  const milestonesReached: (5000 | 8000 | 10000)[] = [];
  let totalPoints = 0;

  if (steps >= 5000) {
    milestonesReached.push(5000);
    totalPoints += config.steps5kPoints;
  }
  if (steps >= 8000) {
    milestonesReached.push(8000);
    totalPoints += config.steps8kPoints;
  }
  if (steps >= 10000) {
    milestonesReached.push(10000);
    totalPoints += config.steps10kPoints;
  }

  return { milestonesReached, totalPoints };
}

/**
 * Pure mirror of the server-side accepted cat sighting points rule (15 pts, max 5/day).
 */
export function calculateSightingPoints(
  rewardedSightingsTodayCount: number,
  config: PointRulesConfig = DEFAULT_POINT_RULES
): number {
  if (rewardedSightingsTodayCount >= config.sightingDailyCap) {
    return 0;
  }
  return config.sightingAcceptedPoints;
}

/**
 * Formats a challenge's current progress and target in human-friendly units.
 */
export function formatChallengeProgressText(
  metric: ChallengeMetric,
  progress: number,
  target: number
): string {
  const safeProgress = Math.max(0, progress);
  const safeTarget = Math.max(1, target);

  switch (metric) {
    case 'distance_m':
      return `${formatDistance(safeProgress)} / ${formatDistance(safeTarget)}`;
    case 'moving_time_s':
      return `${formatDuration(Math.round(safeProgress))} / ${formatDuration(
        Math.round(safeTarget)
      )}`;
    case 'steps':
      return `${formatNumber(Math.round(safeProgress))} / ${formatNumber(
        Math.round(safeTarget)
      )} steps`;
    case 'walks':
      return `${Math.round(safeProgress)} / ${Math.round(safeTarget)} ${
        safeTarget === 1 ? 'walk' : 'walks'
      }`;
    case 'active_days':
      return `${Math.round(safeProgress)} / ${Math.round(safeTarget)} active days`;
    case 'sightings':
      return `${Math.round(safeProgress)} / ${Math.round(safeTarget)} ${
        safeTarget === 1 ? 'sighting' : 'sightings'
      }`;
    default:
      return `${Math.round(safeProgress)} / ${Math.round(safeTarget)}`;
  }
}

/**
 * Computes a clamped progress ratio in `[0, 1]`.
 */
export function computeChallengeProgressRatio(
  progress: number,
  target: number
): number {
  if (!Number.isFinite(target) || target <= 0) {
    return 0;
  }
  const ratio = Math.max(0, progress) / target;
  return Math.min(1, Math.max(0, ratio));
}

/**
 * Formats remaining time until the end of a UTC challenge period (`YYYY-MM-DD`).
 * Never uses stress-inducing countdowns; uses calm labels.
 */
export function formatChallengeTimeRemaining(
  periodEndDateStr: string,
  nowMs: number = Date.now()
): string {
  const endParts = periodEndDateStr.split('-').map(Number);
  if (endParts.length !== 3 || endParts.some((n) => Number.isNaN(n))) {
    return 'Active';
  }

  const endUtcMs = Date.UTC(
    endParts[0],
    endParts[1] - 1,
    endParts[2],
    23,
    59,
    59,
    999
  );
  const diffMs = endUtcMs - nowMs;

  if (diffMs <= 0) {
    return 'Wrapping up today';
  }

  const totalHours = Math.ceil(diffMs / (1000 * 60 * 60));
  if (totalHours < 24) {
    return `${totalHours}h left today`;
  }

  const days = Math.ceil(totalHours / 24);
  return `${days} ${days === 1 ? 'day' : 'days'} left this week`;
}

/**
 * Formats an achievement's unlock goal for locked badges (no shame, encouraging).
 */
export function formatAchievementGoalLabel(
  metric: AchievementMetric,
  threshold: number
): string {
  switch (metric) {
    case 'walks_count':
      return `Goal: ${formatNumber(threshold)} ${threshold === 1 ? 'walk' : 'walks'}`;
    case 'total_distance_m':
      return `Goal: ${formatDistance(threshold)} total distance`;
    case 'cats_count':
      return `Goal: ${formatNumber(threshold)} ${
        threshold === 1 ? 'cat card' : 'cat cards'
      }`;
    case 'weekly_active_days':
      return `Goal: ${formatNumber(threshold)} active days in any week`;
    default:
      return `Goal: ${formatNumber(threshold)}`;
  }
}

export interface SeedAchievementDefinition {
  id: string;
  title: string;
  description: string;
  icon: string;
  points: number;
  metric: AchievementMetric;
  threshold: number;
  sort_order: number;
}

export const SEED_ACHIEVEMENTS: readonly SeedAchievementDefinition[] = [
  {
    id: 'first_walk',
    title: 'First Stroll',
    description: 'Complete your very first walk.',
    icon: '👟',
    points: 25,
    metric: 'walks_count',
    threshold: 1,
    sort_order: 10,
  },
  {
    id: 'walks_5',
    title: 'Neighborhood Regular',
    description: 'Complete 5 walks at your own pace.',
    icon: '🥾',
    points: 40,
    metric: 'walks_count',
    threshold: 5,
    sort_order: 20,
  },
  {
    id: 'walks_25',
    title: 'Steady Explorer',
    description: 'Complete 25 walks.',
    icon: '🧭',
    points: 100,
    metric: 'walks_count',
    threshold: 25,
    sort_order: 30,
  },
  {
    id: 'walks_100',
    title: 'Century Walker',
    description: 'Complete 100 walks.',
    icon: '🏅',
    points: 250,
    metric: 'walks_count',
    threshold: 100,
    sort_order: 40,
  },
  {
    id: 'distance_10km',
    title: '10 km Milestone',
    description: 'Cover 10 km of total walking distance.',
    icon: '🌱',
    points: 40,
    metric: 'total_distance_m',
    threshold: 10000,
    sort_order: 50,
  },
  {
    id: 'distance_50km',
    title: '50 km Journey',
    description: 'Cover 50 km of total walking distance.',
    icon: '🌳',
    points: 100,
    metric: 'total_distance_m',
    threshold: 50000,
    sort_order: 60,
  },
  {
    id: 'distance_100km',
    title: '100 km Horizon',
    description: 'Cover 100 km of total walking distance.',
    icon: '⛰️',
    points: 250,
    metric: 'total_distance_m',
    threshold: 100000,
    sort_order: 70,
  },
  {
    id: 'first_cat',
    title: 'First Cat Discovered',
    description: 'Add your first accepted cat sighting to your collection.',
    icon: '🐱',
    points: 25,
    metric: 'cats_count',
    threshold: 1,
    sort_order: 80,
  },
  {
    id: 'cats_5',
    title: 'Friendly Observer',
    description: 'Collect 5 cat cards through respectful, no-flash sightings.',
    icon: '🐾',
    points: 50,
    metric: 'cats_count',
    threshold: 5,
    sort_order: 90,
  },
  {
    id: 'cats_25',
    title: 'Cat Whisperer',
    description: 'Collect 25 cat cards in your personal collection.',
    icon: '😺',
    points: 125,
    metric: 'cats_count',
    threshold: 25,
    sort_order: 100,
  },
  {
    id: 'cats_50',
    title: 'Feline Archivist',
    description: 'Collect 50 cat cards in your personal collection.',
    icon: '👑',
    points: 250,
    metric: 'cats_count',
    threshold: 50,
    sort_order: 110,
  },
  {
    id: 'weekly_days_3',
    title: '3 Active Days in a Week',
    description: 'Head out for a walk or steps on 3 different days in a single week.',
    icon: '☀️',
    points: 40,
    metric: 'weekly_active_days',
    threshold: 3,
    sort_order: 120,
  },
  {
    id: 'weekly_days_5',
    title: '5 Active Days in a Week',
    description: 'Enjoy 5 active days in a single week—rest days are always welcome!',
    icon: '🌟',
    points: 75,
    metric: 'weekly_active_days',
    threshold: 5,
    sort_order: 130,
  },
];

export interface SeedChallengeTemplate {
  id: string;
  period: ChallengePeriod;
  metric: ChallengeMetric;
  target: number;
  easy_target: number;
  title: string;
  easy_title: string;
  description: string;
  icon: string;
  difficulty: ChallengeDifficulty;
  sort_order: number;
}

export const SEED_CHALLENGE_TEMPLATES: readonly SeedChallengeTemplate[] = [
  {
    id: 'daily_walk_time',
    period: 'daily',
    metric: 'moving_time_s',
    target: 900,
    easy_target: 600,
    title: '15-Minute Walk',
    easy_title: '10-Minute Walk',
    description: 'Spend time walking outdoors today at a comfortable pace.',
    icon: '⏱️',
    difficulty: 'easy',
    sort_order: 10,
  },
  {
    id: 'daily_steps',
    period: 'daily',
    metric: 'steps',
    target: 5000,
    easy_target: 3000,
    title: '5,000 Steps Today',
    easy_title: '3,000 Steps Today',
    description: 'Accumulate steps throughout the day.',
    icon: '👣',
    difficulty: 'easy',
    sort_order: 20,
  },
  {
    id: 'daily_distance',
    period: 'daily',
    metric: 'distance_m',
    target: 1500,
    easy_target: 1000,
    title: '1.5 km Walk',
    easy_title: '1 km Walk',
    description: 'Cover walking distance across your walks today.',
    icon: '🥾',
    difficulty: 'easy',
    sort_order: 30,
  },
  {
    id: 'weekly_walks',
    period: 'weekly',
    metric: 'walks',
    target: 3,
    easy_target: 2,
    title: '3 Walks This Week',
    easy_title: '2 Walks This Week',
    description: 'Complete walks across the week whenever suits your schedule.',
    icon: '👟',
    difficulty: 'standard',
    sort_order: 40,
  },
  {
    id: 'weekly_distance',
    period: 'weekly',
    metric: 'distance_m',
    target: 10000,
    easy_target: 6000,
    title: '10 km Weekly Total',
    easy_title: '6 km Weekly Total',
    description: 'Build up your walking distance over the week.',
    icon: '🗺️',
    difficulty: 'standard',
    sort_order: 50,
  },
  {
    id: 'weekly_active_days',
    period: 'weekly',
    metric: 'active_days',
    target: 4,
    easy_target: 3,
    title: 'Walk on 4 Different Days',
    easy_title: 'Walk on 3 Different Days',
    description: 'Be active on different days this week—rest days always welcome!',
    icon: '📅',
    difficulty: 'standard',
    sort_order: 60,
  },
  {
    id: 'weekly_sightings',
    period: 'weekly',
    metric: 'sightings',
    target: 2,
    easy_target: 1,
    title: '2 Cat Sightings',
    easy_title: '1 Cat Sighting',
    description: 'Spot and photograph cats respectfully from a distance anywhere.',
    icon: '🐱',
    difficulty: 'standard',
    sort_order: 70,
  },
];
