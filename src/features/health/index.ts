export {
  DEFAULT_WEIGHT_KG,
  estimateWalkingCalories,
  getWalkingMet,
  type CalorieEstimateInput,
  type CalorieEstimateResult,
} from './calories';
export { HEALTH_TODAY_QUERY_KEY, useTodayHealthSummary } from './hooks';
export { healthProvider } from './provider';
export {
  fetchTodayActivitySummary,
  getLocalDayBounds,
  resolveWalkHealthData,
  syncDailyHealthActivity,
  toLocalDateString,
  type TodayActivitySummary,
  type WalkHealthResolution,
} from './sync';
export type {
  HealthPermissionState,
  HealthProvider,
  HealthSourceName,
} from './types';
