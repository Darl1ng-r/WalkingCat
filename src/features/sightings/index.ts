export {
  getSightingById,
  getSignedSightingPhotoUrl,
  listSightingsForWalk,
  type SightingStatus,
  type SightingSummaryItem,
} from './api';
export {
  WalkSightingsList,
  type WalkSightingsListProps,
} from './components/walk-sightings-list';
export {
  WelfareSheet,
  type WelfareSheetProps,
} from './components/welfare-sheet';
export { toGeohash } from './geohash';
export {
  bytesToHex,
  checkCaptureCooldown,
  computeTargetResizeDimensions,
  validateImageDimensions,
  validateProcessedFileSize,
  type CaptureCooldownCheck,
  type DimensionValidationResult,
} from './guardrails';
export {
  SIGHTINGS_QUERY_KEYS,
  useCameraWelfareAck,
  useSaveSightingAreaSetting,
  useSightingValidationStatus,
  useSyncPendingSightings,
  useWalkSightings,
} from './hooks';
export {
  deleteLocalSightingFile,
  processCapturedPhoto,
  type ProcessedSightingPhoto,
  type RawCapturedPhoto,
} from './process';
export {
  submitSightingPhoto,
  syncPendingSightings,
  type SubmitSightingOutcome,
} from './sync';
export {
  computeDHash64FromGrayscale,
  decideSightingValidation,
  DEFAULT_VALIDATION_CONFIG,
  getSightingStatusCopy,
  hammingDistanceHex64,
  type SightingRejectReason,
  type SightingStatusCopy,
  type ValidationConfig,
  type ValidationDecisionInputs,
  type ValidationDecisionResult,
} from './validation-rules';
