import { describe, expect, it } from '@jest/globals';

import {
  calculateDailyStepsMilestonePoints,
  calculateSightingPoints,
  calculateWalkPointsBreakdown,
  computeChallengeProgressRatio,
  formatAchievementGoalLabel,
  formatChallengeProgressText,
  formatChallengeTimeRemaining,
  SEED_ACHIEVEMENTS,
  SEED_CHALLENGE_TEMPLATES,
} from '../rules';

describe('Gamification Rules (Phase 9)', () => {
  describe('calculateWalkPointsBreakdown', () => {
    it('awards 20 base points + 5 per full km (capped at 10 km) for qualifying walks', () => {
      const res2km = calculateWalkPointsBreakdown({
        distanceMeters: 2450,
        movingTimeSeconds: 1200,
      });
      expect(res2km).toEqual({
        qualifies: true,
        walkPoints: 20,
        distanceBonusPoints: 10,
        fullKmCount: 2,
        totalPoints: 30,
        reasonNotRewarded: null,
      });

      const res15km = calculateWalkPointsBreakdown({
        distanceMeters: 15_200,
        movingTimeSeconds: 7200,
      });
      expect(res15km.fullKmCount).toBe(10);
      expect(res15km.distanceBonusPoints).toBe(50);
      expect(res15km.totalPoints).toBe(70);
    });

    it('awards 0 points when walk is shorter than 500 m or 10 min moving', () => {
      expect(
        calculateWalkPointsBreakdown({
          distanceMeters: 450,
          movingTimeSeconds: 900,
        })
      ).toEqual({
        qualifies: false,
        walkPoints: 0,
        distanceBonusPoints: 0,
        fullKmCount: 0,
        totalPoints: 0,
        reasonNotRewarded: 'too_short',
      });

      expect(
        calculateWalkPointsBreakdown({
          distanceMeters: 1200,
          movingTimeSeconds: 500,
        }).reasonNotRewarded
      ).toBe('too_short');
    });

    it('enforces the daily cap of 3 rewarded walks per day', () => {
      const fourthWalk = calculateWalkPointsBreakdown({
        distanceMeters: 2000,
        movingTimeSeconds: 1200,
        rewardedWalksTodayCount: 3,
      });
      expect(fourthWalk.qualifies).toBe(false);
      expect(fourthWalk.totalPoints).toBe(0);
      expect(fourthWalk.reasonNotRewarded).toBe('daily_cap_reached');
    });

    it('awards 0 points for suspicious walks', () => {
      const suspicious = calculateWalkPointsBreakdown({
        distanceMeters: 5000,
        movingTimeSeconds: 700,
        isSuspicious: true,
      });
      expect(suspicious.qualifies).toBe(false);
      expect(suspicious.totalPoints).toBe(0);
      expect(suspicious.reasonNotRewarded).toBe('suspicious');
    });
  });

  describe('calculateDailyStepsMilestonePoints & calculateSightingPoints', () => {
    it('awards 10 points each for 5k, 8k, and 10k daily step milestones', () => {
      expect(calculateDailyStepsMilestonePoints(4999)).toEqual({
        milestonesReached: [],
        totalPoints: 0,
      });
      expect(calculateDailyStepsMilestonePoints(6200)).toEqual({
        milestonesReached: [5000],
        totalPoints: 10,
      });
      expect(calculateDailyStepsMilestonePoints(8500)).toEqual({
        milestonesReached: [5000, 8000],
        totalPoints: 20,
      });
      expect(calculateDailyStepsMilestonePoints(12_000)).toEqual({
        milestonesReached: [5000, 8000, 10000],
        totalPoints: 30,
      });
    });

    it('awards 15 points per accepted cat sighting up to 5 sightings/day', () => {
      expect(calculateSightingPoints(0)).toBe(15);
      expect(calculateSightingPoints(4)).toBe(15);
      expect(calculateSightingPoints(5)).toBe(0);
      expect(calculateSightingPoints(8)).toBe(0);
    });
  });

  describe('Challenge & Achievement Formatting', () => {
    it('formats challenge progress text and clamps progress ratio to [0, 1]', () => {
      expect(formatChallengeProgressText('steps', 3200, 5000)).toBe(
        '3,200 / 5,000 steps'
      );
      expect(formatChallengeProgressText('active_days', 2, 4)).toBe(
        '2 / 4 active days'
      );
      expect(computeChallengeProgressRatio(2500, 5000)).toBe(0.5);
      expect(computeChallengeProgressRatio(8000, 5000)).toBe(1);
      expect(computeChallengeProgressRatio(-10, 5000)).toBe(0);
    });

    it('formats calm time remaining labels and achievement goals', () => {
      const nowMs = Date.UTC(2026, 10, 6, 18, 0, 0);
      expect(formatChallengeTimeRemaining('2026-11-06', nowMs)).toBe(
        '6h left today'
      );
      expect(formatChallengeTimeRemaining('2026-11-08', nowMs)).toBe(
        '3 days left this week'
      );
      expect(formatAchievementGoalLabel('cats_count', 5)).toBe(
        'Goal: 5 cat cards'
      );
      expect(SEED_ACHIEVEMENTS.length).toBe(13);
      expect(SEED_CHALLENGE_TEMPLATES.length).toBe(7);
    });
  });
});
