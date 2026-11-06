import { describe, expect, it } from '@jest/globals';

import {
  buildActivityDashboardSummary,
  getCurrentWeekDateRange,
  getEncouragingCopy,
  getLocaleWeekStartDay,
  getTrailingDaysDateRange,
  parseLocalDateKey,
  toLocalDateKey,
} from '../dashboard';

describe('walk dashboard utilities', () => {
  it('round-trips local YYYY-MM-DD keys without UTC shift', () => {
    const key = '2026-11-06';
    const parsed = parseLocalDateKey(key);
    expect(toLocalDateKey(parsed)).toBe(key);
  });

  it('determines locale week start day accurately across regions', () => {
    expect(getLocaleWeekStartDay('en-US')).toBe(0); // Sunday
    expect(getLocaleWeekStartDay('en-GB')).toBe(1); // Monday
    expect(getLocaleWeekStartDay('de-DE')).toBe(1); // Monday
  });

  it('computes 7-day week window starting on locale first day', () => {
    // 2026-11-06 is a Friday
    const fri = new Date(2026, 10, 6, 15, 30, 0);

    const usWeek = getCurrentWeekDateRange(fri, 'en-US');
    expect(usWeek.dateKeys).toHaveLength(7);
    expect(usWeek.fromDate).toBe('2026-11-01'); // Sunday
    expect(usWeek.toDate).toBe('2026-11-07'); // Saturday

    const gbWeek = getCurrentWeekDateRange(fri, 'en-GB');
    expect(gbWeek.dateKeys).toHaveLength(7);
    expect(gbWeek.fromDate).toBe('2026-11-02'); // Monday
    expect(gbWeek.toDate).toBe('2026-11-08'); // Sunday
  });

  it('computes trailing 30-day window ending on today', () => {
    const today = new Date(2026, 10, 6, 10, 0, 0);
    const range = getTrailingDaysDateRange(30, today);
    expect(range.dateKeys).toHaveLength(30);
    expect(range.toDate).toBe('2026-11-06');
  });

  it('aggregates server rows and pending offline walks accurately', () => {
    const now = new Date(2026, 10, 6, 14, 0, 0);
    const summary = buildActivityDashboardSummary({
      fromDate: '2026-11-01',
      toDate: '2026-11-07',
      period: 'week',
      now,
      serverRows: [
        {
          date: '2026-11-02',
          walks_count: 1,
          distance_m: 1500,
          moving_time_s: 1200,
          steps: 2100,
        },
        {
          date: '2026-11-04',
          walks_count: 2,
          distance_m: 3200,
          moving_time_s: 2400,
          steps: 4500,
        },
      ],
      pendingWalks: [
        {
          walk_id: 'local-1',
          attempts: 0,
          last_error: null,
          created_at: now.getTime(),
          payload: {
            client_id: 'local-1',
            started_at: new Date(2026, 10, 6, 9, 0, 0).toISOString(),
            ended_at: new Date(2026, 10, 6, 9, 20, 0).toISOString(),
            duration_s: 1200,
            moving_time_s: 1100,
            distance_m: 1300,
            avg_speed_mps: 1.18,
            route_polyline: '',
            point_count: 20,
            steps: 1700,
            active_kcal: 70,
            kcal_source: 'estimate',
          },
        },
      ],
    });

    expect(summary.totalWalks).toBe(4);
    expect(summary.totalDistanceMeters).toBe(6000);
    expect(summary.totalMovingTimeSeconds).toBe(4700);
    expect(summary.totalSteps).toBe(8300);
    expect(summary.activeDaysCount).toBe(3);
    expect(summary.encouragingTitle).toBe('You walked on 3 days this week 🎉');
  });

  it('never produces negative or shaming language for 0 walks', () => {
    const copy = getEncouragingCopy(0, 0, 'week');
    expect(copy.title.toLowerCase()).not.toContain('missed');
    expect(copy.title.toLowerCase()).not.toContain('failed');
    expect(copy.subtitle.toLowerCase()).not.toContain('missed');
    expect(copy.subtitle.toLowerCase()).not.toContain('behind');
  });
});
