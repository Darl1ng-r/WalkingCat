import { describe, expect, it } from '@jest/globals';

import {
  buildInviteDeepLink,
  capDailyStepsForLeaderboard,
  formatActivityEventCopy,
  formatLeaderboardValue,
  getWeekStartDateString,
  LEADERBOARD_METRICS,
  parseInviteCodeFromInput,
} from '../utils';

describe('Social & Leaderboard Utilities (Phase 10)', () => {
  it('excludes calories from leaderboard metrics', () => {
    const keys = LEADERBOARD_METRICS.map((m) => m.key);
    expect(keys).toEqual(['steps', 'distance_m', 'walks', 'challenge_points']);
    expect(keys).not.toContain('calories');
    expect(keys).not.toContain('active_kcal');
  });

  it('computes Monday week start date for this_week and last_week', () => {
    // Friday 2026-11-06 UTC
    const ref = new Date(Date.UTC(2026, 10, 6, 14, 0, 0));
    expect(getWeekStartDateString('this_week', ref)).toBe('2026-11-02');
    expect(getWeekStartDateString('last_week', ref)).toBe('2026-10-26');
  });

  it('formats leaderboard values per metric', () => {
    expect(formatLeaderboardValue('steps', 8420)).toBe('8,420 steps');
    expect(formatLeaderboardValue('distance_m', 3250)).toBe('3.25 km');
    expect(formatLeaderboardValue('walks', 1)).toBe('1 walk');
    expect(formatLeaderboardValue('walks', 4)).toBe('4 walks');
    expect(formatLeaderboardValue('challenge_points', 150)).toBe('150 pts');
  });

  it('caps daily steps at 60,000 and flags outliers', () => {
    expect(capDailyStepsForLeaderboard(14_200)).toEqual({
      countedSteps: 14_200,
      isOutlier: false,
    });
    expect(capDailyStepsForLeaderboard(60_000)).toEqual({
      countedSteps: 60_000,
      isOutlier: false,
    });
    expect(capDailyStepsForLeaderboard(85_000)).toEqual({
      countedSteps: 60_000,
      isOutlier: true,
    });
  });

  it('builds and parses invite codes from raw strings and deep links', () => {
    expect(buildInviteDeepLink('ab23cd45')).toBe('walkingcat://invite/AB23CD45');
    expect(parseInviteCodeFromInput('walkingcat://invite/xy98zw12')).toBe(
      'XY98ZW12'
    );
    expect(parseInviteCodeFromInput('  k7m9p2q4 ')).toBe('K7M9P2Q4');
    expect(parseInviteCodeFromInput('ab')).toBeNull();
    expect(parseInviteCodeFromInput('')).toBeNull();
  });

  it('formats milestone and shared cat card events without exposing location or calories', () => {
    const walkCopy = formatActivityEventCopy(
      'walk_completed',
      { distance_m: 2400, moving_time_s: 1500, active_kcal: 140 },
      'Maya'
    );
    expect(walkCopy.headline).toContain('Maya completed a 2.40 km walk');
    expect(walkCopy.subtitle).not.toContain('kcal');

    const catCopy = formatActivityEventCopy(
      'cat_card_shared',
      {
        cat_id: 'cat-12',
        card_number: 12,
        nickname: 'Mochi',
        sighting_count: 3,
        cover_photo_path: 'user-1/sighting-1.jpg',
        area_geohash: 'u33dc',
      },
      'Maya'
    );
    expect(catCopy.headline).toBe('Maya shared cat card #012: Mochi');
    expect(catCopy.subtitle).toContain('Location kept private');
    expect(catCopy.subtitle).not.toContain('u33dc');
    expect(catCopy.sharedCatCard?.displayName).toBe('Mochi');
  });
});
