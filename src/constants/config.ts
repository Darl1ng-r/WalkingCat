/**
 * App-wide constants and configuration limits.
 * Authoritative point/validation thresholds live on the server (Phase 7 & 9);
 * these client constants support display and client-side guardrails.
 */

export const AppConfig = {
  appName: 'StrayCat Walk',
  scheme: 'walkingcat',
  walk: {
    minSaveDistanceMeters: 50,
    minSaveDurationSeconds: 60,
    maxValidAccuracyMeters: 30,
    defaultRouteTrimMeters: 150,
  },
  sightings: {
    captureCooldownMs: 10_000,
    maxImageDimensionPx: 1600,
    minImageDimensionPx: 400,
    jpegQuality: 0.8,
    geohashPrecision: 5,
  },
} as const;
