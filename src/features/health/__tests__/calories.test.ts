import { describe, expect, it } from '@jest/globals';

import {
  DEFAULT_WEIGHT_KG,
  estimateWalkingCalories,
  getWalkingMet,
} from '../calories';

describe('calorie estimation', () => {
  describe('getWalkingMet', () => {
    it('selects slow (2.8), moderate (3.5), and brisk (4.3) MET tiers by speed', () => {
      expect(getWalkingMet(0.9)).toBe(2.8); // 3.24 km/h
      expect(getWalkingMet(1.3)).toBe(3.5); // 4.68 km/h
      expect(getWalkingMet(1.7)).toBe(4.3); // 6.12 km/h
    });
  });

  describe('estimateWalkingCalories', () => {
    it('returns 0 kcal when duration or distance is 0', () => {
      const res = estimateWalkingCalories({
        movingTimeSeconds: 0,
        distanceMeters: 1000,
        weightKg: 70,
      });
      expect(res.kcal).toBe(0);
      expect(res.usedDefaultWeight).toBe(false);
    });

    it('estimates calories using user weight and moderate walking MET (3.5)', () => {
      // 30 minutes (0.5h) at 4.5 km/h (2250m) with 80 kg weight -> 3.5 * 80 * 0.5 = 140 kcal
      const res = estimateWalkingCalories({
        movingTimeSeconds: 1800,
        distanceMeters: 2250,
        weightKg: 80,
      });
      expect(res.met).toBe(3.5);
      expect(res.weightKgUsed).toBe(80);
      expect(res.usedDefaultWeight).toBe(false);
      expect(res.kcal).toBe(140);
    });

    it('falls back to DEFAULT_WEIGHT_KG (70 kg) and sets usedDefaultWeight when weight is omitted', () => {
      // 60 minutes (1.0h) at 3.6 km/h (3600m -> slow 2.8 MET) with null weight -> 2.8 * 70 * 1.0 = 196 kcal
      const res = estimateWalkingCalories({
        movingTimeSeconds: 3600,
        distanceMeters: 3600,
        weightKg: null,
      });
      expect(res.met).toBe(2.8);
      expect(res.weightKgUsed).toBe(DEFAULT_WEIGHT_KG);
      expect(res.usedDefaultWeight).toBe(true);
      expect(res.kcal).toBe(196);
    });
  });
});
