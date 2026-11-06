/**
 * Pure calorie estimation formula when connected health data is unavailable.
 *
 * Formula:
 *   kcal = MET * weight_kg * hours
 *
 * Walking MET tiers (Compendium of Physical Activities):
 *   - Slow pace (< 4.0 km/h / < 1.11 m/s): 2.8 MET
 *   - Moderate pace (4.0 – 5.5 km/h / 1.11 – 1.53 m/s): 3.5 MET
 *   - Brisk pace (> 5.5 km/h / > 1.53 m/s): 4.3 MET
 *
 * When the user has not provided a body weight in their profile, a neutral
 * default of 70 kg is used and `usedDefaultWeight` is returned as `true`
 * so the UI can state that transparently.
 */

export const DEFAULT_WEIGHT_KG = 70;

export interface CalorieEstimateInput {
  movingTimeSeconds: number;
  distanceMeters: number;
  weightKg?: number | null;
}

export interface CalorieEstimateResult {
  kcal: number;
  met: number;
  weightKgUsed: number;
  usedDefaultWeight: boolean;
}

export function getWalkingMet(speedMps: number): number {
  const speedKmh = speedMps * 3.6;
  if (speedKmh < 4.0) {
    return 2.8;
  }
  if (speedKmh <= 5.5) {
    return 3.5;
  }
  return 4.3;
}

export function estimateWalkingCalories({
  movingTimeSeconds,
  distanceMeters,
  weightKg,
}: CalorieEstimateInput): CalorieEstimateResult {
  const safeSeconds = Math.max(0, Number.isFinite(movingTimeSeconds) ? movingTimeSeconds : 0);
  const safeDistance = Math.max(0, Number.isFinite(distanceMeters) ? distanceMeters : 0);

  const hasValidUserWeight =
    typeof weightKg === 'number' &&
    Number.isFinite(weightKg) &&
    weightKg >= 20 &&
    weightKg <= 300;

  const weightKgUsed = hasValidUserWeight ? weightKg : DEFAULT_WEIGHT_KG;
  const usedDefaultWeight = !hasValidUserWeight;

  if (safeSeconds <= 0 || safeDistance <= 0) {
    return {
      kcal: 0,
      met: 2.8,
      weightKgUsed,
      usedDefaultWeight,
    };
  }

  const speedMps = safeDistance / safeSeconds;
  const met = getWalkingMet(speedMps);
  const hours = safeSeconds / 3600;
  const rawKcal = met * weightKgUsed * hours;

  return {
    kcal: Math.round(rawKcal),
    met,
    weightKgUsed,
    usedDefaultWeight,
  };
}
