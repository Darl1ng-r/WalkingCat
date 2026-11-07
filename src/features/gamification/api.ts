import {
  getLocalChallengeDifficultySetting,
  setLocalChallengeDifficultySetting,
} from '@/lib/db';
import { demoState, isDemoMode } from '@/lib/demo-data';
import { isSupabaseConfigured } from '@/lib/env';
import { logger } from '@/lib/logger';
import { supabase } from '@/lib/supabase';
import {
  calculateWalkPointsBreakdown,
  DEFAULT_POINT_RULES,
  SEED_ACHIEVEMENTS,
  SEED_CHALLENGE_TEMPLATES,
  type AchievementMetric,
  type ChallengeDifficulty,
  type ChallengeMetric,
  type ChallengePeriod,
} from './rules';

export interface PointsSummary {
  totalPoints: number;
  weekPoints: number;
  todayPoints: number;
}

export interface AchievementItem {
  id: string;
  title: string;
  description: string;
  icon: string;
  points: number;
  metric: AchievementMetric;
  threshold: number;
  sort_order: number;
  unlocked: boolean;
  unlockedAt: string | null;
}

export interface ChallengeInstanceItem {
  instanceId: string;
  challengeId: string;
  period: ChallengePeriod;
  metric: ChallengeMetric;
  title: string;
  description: string;
  icon: string;
  target: number;
  progress: number;
  rewardPoints: number;
  periodStart: string;
  periodEnd: string;
  completedAt: string | null;
}

export interface ChallengesOverview {
  difficulty: ChallengeDifficulty;
  activeDaily: ChallengeInstanceItem[];
  activeWeekly: ChallengeInstanceItem[];
  completedHistory: ChallengeInstanceItem[];
}

export interface WalkRewardLedgerLine {
  id: string;
  amount: number;
  reason: string;
  sourceType:
    | 'walk'
    | 'walk_distance'
    | 'steps_milestone'
    | 'sighting'
    | 'achievement'
    | 'challenge';
}

export interface WalkRewardsSummary {
  totalPointsEarned: number;
  lines: WalkRewardLedgerLine[];
  isEstimatePreview: boolean;
  reasonNotRewarded: 'too_short' | 'daily_cap_reached' | 'suspicious' | null;
}

function getTodayUtcDateStr(now = new Date()): string {
  return now.toISOString().slice(0, 10);
}

function getWeekUtcBounds(now = new Date()): { start: string; end: string } {
  const utcDay = now.getUTCDay(); // 0=Sun, 1=Mon
  const diffToMonday = utcDay === 0 ? -6 : 1 - utcDay;
  const monday = new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate() + diffToMonday
    )
  );
  const sunday = new Date(
    Date.UTC(
      monday.getUTCFullYear(),
      monday.getUTCMonth(),
      monday.getUTCDate() + 6
    )
  );
  return {
    start: monday.toISOString().slice(0, 10),
    end: sunday.toISOString().slice(0, 10),
  };
}

/**
 * Fetches the user's server-authoritative points summary (`totalPoints`, `weekPoints`, `todayPoints`).
 */
export async function getPointsSummary(): Promise<PointsSummary> {
  if (!isSupabaseConfigured) {
    if (isDemoMode) {
      return {
        totalPoints: demoState.totalEarnedPoints,
        weekPoints: 185,
        todayPoints: 45,
      };
    }
    return { totalPoints: 0, weekPoints: 0, todayPoints: 0 };
  }

  const { data, error } = await supabase.rpc('get_points_summary');
  if (error || !data || data.length === 0) {
    if (error) {
      logger.warn('Failed to fetch points summary', { error: error.message });
    }
    return { totalPoints: 0, weekPoints: 0, todayPoints: 0 };
  }

  const row = data[0];
  return {
    totalPoints: Number(row?.total_points ?? 0),
    weekPoints: Number(row?.week_points ?? 0),
    todayPoints: Number(row?.today_points ?? 0),
  };
}

/**
 * Lists all achievements (both unlocked and locked), sorted by `sort_order`.
 */
export async function listAchievements(): Promise<AchievementItem[]> {
  if (!isSupabaseConfigured) {
    return SEED_ACHIEVEMENTS.map((a, idx) => ({
      ...a,
      unlocked: isDemoMode ? idx < 4 : false,
      unlockedAt: isDemoMode && idx < 4 ? '2026-11-01T14:20:00.000Z' : null,
    }));
  }

  const [{ data: defs }, { data: unlockedRows }] = await Promise.all([
    supabase
      .from('achievements')
      .select('id, title, description, icon, points, metric, threshold, sort_order')
      .order('sort_order', { ascending: true }),
    supabase
      .from('user_achievements')
      .select('achievement_id, unlocked_at'),
  ]);

  const unlockedMap = new Map<string, string>();
  for (const row of unlockedRows ?? []) {
    unlockedMap.set(row.achievement_id, row.unlocked_at);
  }

  const sourceDefs =
    defs && defs.length > 0 ? defs : SEED_ACHIEVEMENTS;

  return sourceDefs.map((a) => {
    const unlockedAt = unlockedMap.get(a.id) ?? null;
    return {
      id: a.id,
      title: a.title,
      description: a.description,
      icon: a.icon,
      points: a.points,
      metric: a.metric,
      threshold: Number(a.threshold),
      sort_order: a.sort_order,
      unlocked: Boolean(unlockedAt),
      unlockedAt,
    };
  });
}

/**
 * Updates the user's challenge difficulty ('easy' | 'standard') both locally and on the server.
 */
export async function updateChallengeDifficulty(
  difficulty: ChallengeDifficulty
): Promise<ChallengeDifficulty> {
  setLocalChallengeDifficultySetting(difficulty);

  if (!isSupabaseConfigured) {
    return difficulty;
  }

  const { error } = await supabase.rpc('set_challenge_difficulty', {
    p_difficulty: difficulty,
  });

  if (error) {
    logger.warn('Failed to update server challenge difficulty', {
      error: error.message,
    });
  }

  return difficulty;
}

/**
 * Lists active daily challenges, active weekly challenges, and completed challenge history.
 */
export async function listChallengesWithProgress(
  overrideDifficulty?: ChallengeDifficulty
): Promise<ChallengesOverview> {
  const localDifficulty =
    overrideDifficulty ?? getLocalChallengeDifficultySetting();
  const todayStr = getTodayUtcDateStr();
  const weekBounds = getWeekUtcBounds();

  const buildFallback = (
    diff: ChallengeDifficulty
  ): ChallengesOverview => {
    const activeDaily: ChallengeInstanceItem[] = SEED_CHALLENGE_TEMPLATES.filter(
      (t) => t.period === 'daily'
    ).map((t, idx) => {
      const target = diff === 'easy' ? t.easy_target : t.target;
      const demoProgress = isDemoMode
        ? idx === 0
          ? target
          : Math.round(target * 0.65)
        : 0;
      return {
        instanceId: `${t.id}:${todayStr}`,
        challengeId: t.id,
        period: t.period,
        metric: t.metric,
        title: diff === 'easy' ? t.easy_title : t.title,
        description: t.description,
        icon: t.icon,
        target,
        progress: demoProgress,
        rewardPoints: DEFAULT_POINT_RULES.dailyChallengePoints,
        periodStart: todayStr,
        periodEnd: todayStr,
        completedAt:
          isDemoMode && idx === 0 ? new Date().toISOString() : null,
      };
    });

    const activeWeekly: ChallengeInstanceItem[] =
      SEED_CHALLENGE_TEMPLATES.filter((t) => t.period === 'weekly').map(
        (t, idx) => {
          const target = diff === 'easy' ? t.easy_target : t.target;
          const demoProgress = isDemoMode
            ? Math.round(target * (idx === 0 ? 0.8 : 0.6))
            : 0;
          return {
            instanceId: `${t.id}:${weekBounds.start}`,
            challengeId: t.id,
            period: t.period,
            metric: t.metric,
            title: diff === 'easy' ? t.easy_title : t.title,
            description: t.description,
            icon: t.icon,
            target,
            progress: demoProgress,
            rewardPoints: DEFAULT_POINT_RULES.weeklyChallengePoints,
            periodStart: weekBounds.start,
            periodEnd: weekBounds.end,
            completedAt: null,
          };
        }
      );

    return {
      difficulty: diff,
      activeDaily,
      activeWeekly,
      completedHistory: isDemoMode ? activeDaily.slice(0, 1) : [],
    };
  };

  if (!isSupabaseConfigured) {
    return buildFallback(localDifficulty);
  }

  // Ensure active challenge instances exist on the server for today (idempotent)
  await supabase
    .rpc('ensure_active_challenge_instances', { p_date: todayStr })
    .then(
      () => {},
      () => {}
    );

  const [
    { data: templates },
    { data: instances },
    { data: progressRows },
  ] = await Promise.all([
    supabase
      .from('challenges')
      .select(
        'id, period, metric, target, easy_target, title, easy_title, description, icon, difficulty, sort_order'
      )
      .order('sort_order', { ascending: true }),
    supabase
      .from('challenge_instances')
      .select('id, challenge_id, period_start, period_end')
      .order('period_start', { ascending: false })
      .limit(50),
    supabase
      .from('challenge_progress')
      .select('instance_id, progress, completed_at'),
  ]);

  if (!templates || templates.length === 0 || !instances || instances.length === 0) {
    return buildFallback(localDifficulty);
  }

  const templateById = new Map(templates.map((t) => [t.id, t]));
  const progressByInstanceId = new Map(
    (progressRows ?? []).map((p) => [p.instance_id, p])
  );

  const activeDaily: ChallengeInstanceItem[] = [];
  const activeWeekly: ChallengeInstanceItem[] = [];
  const completedHistory: ChallengeInstanceItem[] = [];

  for (const inst of instances) {
    const tmpl = templateById.get(inst.challenge_id);
    if (!tmpl) continue;

    const prog = progressByInstanceId.get(inst.id);
    const effectiveTarget =
      localDifficulty === 'easy'
        ? Number(tmpl.easy_target)
        : Number(tmpl.target);
    const effectiveTitle =
      localDifficulty === 'easy' ? tmpl.easy_title : tmpl.title;
    const progressVal = Number(prog?.progress ?? 0);
    const completedAt = prog?.completed_at ?? null;

    const item: ChallengeInstanceItem = {
      instanceId: inst.id,
      challengeId: tmpl.id,
      period: tmpl.period,
      metric: tmpl.metric,
      title: effectiveTitle,
      description: tmpl.description,
      icon: tmpl.icon,
      target: effectiveTarget,
      progress: progressVal,
      rewardPoints:
        tmpl.period === 'weekly'
          ? DEFAULT_POINT_RULES.weeklyChallengePoints
          : DEFAULT_POINT_RULES.dailyChallengePoints,
      periodStart: inst.period_start,
      periodEnd: inst.period_end,
      completedAt,
    };

    const isActiveForToday =
      inst.period_start <= todayStr && inst.period_end >= todayStr;

    if (isActiveForToday) {
      if (tmpl.period === 'daily') {
        activeDaily.push(item);
      } else {
        activeWeekly.push(item);
      }
    }

    if (completedAt) {
      completedHistory.push(item);
    }
  }

  return {
    difficulty: localDifficulty,
    activeDaily,
    activeWeekly,
    completedHistory: completedHistory.sort(
      (a, b) =>
        new Date(b.completedAt ?? 0).getTime() -
        new Date(a.completedAt ?? 0).getTime()
    ),
  };
}

/**
 * Fetches the points breakdown and any newly unlocked achievements / completed challenges
 * for a finished walk (`walkId`). Falls back to a pure estimate preview if offline.
 */
export async function getWalkRewardsSummary(
  walkId: string,
  walkMeta: {
    distanceMeters: number;
    movingTimeSeconds: number;
  }
): Promise<WalkRewardsSummary> {
  const estimate = calculateWalkPointsBreakdown({
    distanceMeters: walkMeta.distanceMeters,
    movingTimeSeconds: walkMeta.movingTimeSeconds,
  });

  const buildEstimateResult = (): WalkRewardsSummary => {
    const lines: WalkRewardLedgerLine[] = [];
    if (estimate.qualifies) {
      lines.push({
        id: 'est-walk',
        amount: estimate.walkPoints,
        reason: 'Completed walk',
        sourceType: 'walk',
      });
      if (estimate.distanceBonusPoints > 0) {
        lines.push({
          id: 'est-dist',
          amount: estimate.distanceBonusPoints,
          reason: `Walk distance bonus (${estimate.fullKmCount} km)`,
          sourceType: 'walk_distance',
        });
      }
    }
    return {
      totalPointsEarned: estimate.totalPoints,
      lines,
      isEstimatePreview: true,
      reasonNotRewarded: estimate.reasonNotRewarded,
    };
  };

  if (!walkId || !isSupabaseConfigured) {
    return buildEstimateResult();
  }

  const recentThresholdIso = new Date(Date.now() - 3 * 60 * 1000).toISOString();

  const { data: ledgerRows, error } = await supabase
    .from('points_ledger')
    .select('id, amount, reason, source_type, source_id, created_at')
    .or(`source_id.eq.${walkId},created_at.gte.${recentThresholdIso}`)
    .order('created_at', { ascending: true });

  if (error || !ledgerRows) {
    return buildEstimateResult();
  }

  // Keep rows directly tied to this walkId OR achievement/challenge unlocks from the last 3 minutes
  const relevantRows = ledgerRows.filter(
    (r) =>
      r.source_id === walkId ||
      r.source_type === 'achievement' ||
      r.source_type === 'challenge'
  );

  if (relevantRows.length === 0) {
    return buildEstimateResult();
  }

  const lines: WalkRewardLedgerLine[] = relevantRows.map((r) => ({
    id: r.id,
    amount: r.amount,
    reason: r.reason,
    sourceType: r.source_type,
  }));

  const totalPointsEarned = lines.reduce((sum, l) => sum + l.amount, 0);

  return {
    totalPointsEarned,
    lines,
    isEstimatePreview: false,
    reasonNotRewarded: null,
  };
}
