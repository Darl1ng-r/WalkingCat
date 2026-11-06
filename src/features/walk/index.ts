export {
  deleteWalk,
  getActivityDashboardSummary,
  getWalk,
  listPendingLocalWalks,
  listWalks,
  type ListWalksPage,
  type WalkDetailRecord,
  type WalkListItem,
} from './api';
export {
  ActivityBarChart,
  type ActivityBarChartProps,
  type ChartMetric,
} from './components/activity-bar-chart';
export { RouteMap, type RouteMapProps } from './components/route-map';
export {
  buildActivityDashboardSummary,
  enumerateDateKeys,
  getCurrentWeekDateRange,
  getEncouragingCopy,
  getLocaleWeekStartDay,
  getTrailingDaysDateRange,
  parseLocalDateKey,
  toLocalDateKey,
  type ActivityDashboardSummary,
  type DailyActivityPoint,
  type RawActivitySummaryRow,
} from './dashboard';
export {
  computeDurations,
  decodePolyline,
  encodePolyline,
  filterPoints,
  getRouteBounds,
  haversine,
  isTimestampPaused,
  simplifyRoute,
  totalDistance,
  trimRouteEnds,
  type GeoPoint,
  type PauseInterval,
  type RouteBounds,
} from './geo';
export {
  useActivityDashboard,
  useDeleteWalkMutation,
  useRoutePrivacyTrim,
  useWalkDetail,
  useWalkHistory,
  WALK_QUERY_KEYS,
} from './hooks';
export {
  startWalkLocationTracking,
  stopWalkLocationTracking,
  WALK_LOCATION_TASK_NAME,
} from './location-task';
export {
  checkCurrentLocationPermission,
  openDeviceLocationSettings,
  requestWalkLocationPermissions,
  type WalkPermissionOutcome,
} from './permissions';
export {
  useWalkStore,
  type CompletedWalkSummary,
  type WalkSessionStatus,
  type WalkStoreState,
} from './store';
export { syncPendingWalks, type SyncWalksResult } from './sync';
