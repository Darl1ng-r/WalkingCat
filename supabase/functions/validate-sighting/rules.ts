export interface ValidationConfig {
  minImageDimensionPx: number;
  dhashMaxHammingDistance: number;
  dhashLookbackDays: number;
  catAcceptThreshold: number;
  catFlagThreshold: number;
  dailySubmissionRateLimit: number;
  maxValidationRetries: number;
}

export const DEFAULT_VALIDATION_CONFIG: ValidationConfig = {
  minImageDimensionPx: 400,
  dhashMaxHammingDistance: 6,
  dhashLookbackDays: 30,
  catAcceptThreshold: 0.8,
  catFlagThreshold: 0.5,
  dailySubmissionRateLimit: 30,
  maxValidationRetries: 3,
};

export interface ValidationDecisionInputs {
  imageValid: boolean;
  width: number;
  height: number;
  dhash: string | null;
  recentPhashes: readonly string[];
  submissionsLast24h: number;
  containsCat: boolean;
  catConfidence: number;
  isRealPhoto?: boolean;
  isSafe?: boolean;
}

export type SightingRejectReason =
  | 'invalid_image'
  | 'duplicate'
  | 'no_cat_detected'
  | 'uncertain'
  | 'suspected_screen_or_print'
  | 'rate_limited'
  | 'unsafe_content'
  | 'validation_error'
  | 'manual_review_rejected';

export interface ValidationDecisionResult {
  status: 'accepted' | 'rejected' | 'flagged';
  rejectReason: SightingRejectReason | null;
  catConfidence: number | null;
  matchedDuplicatePhash: string | null;
  minHammingDistance: number | null;
  autoReport: boolean;
}

export function computeDHash64FromGrayscale(
  grid9x8: readonly number[]
): string {
  if (grid9x8.length < 72) {
    throw new Error('Expected a 9x8 (72-pixel) grayscale grid for dHash');
  }

  let hex = '';
  let nibble = 0;
  let bitCount = 0;

  for (let row = 0; row < 8; row += 1) {
    const rowOffset = row * 9;
    for (let col = 0; col < 8; col += 1) {
      const left = grid9x8[rowOffset + col] ?? 0;
      const right = grid9x8[rowOffset + col + 1] ?? 0;
      const bit = left > right ? 1 : 0;
      nibble = (nibble << 1) | bit;
      bitCount += 1;

      if (bitCount === 4) {
        hex += nibble.toString(16);
        nibble = 0;
        bitCount = 0;
      }
    }
  }

  return hex;
}

const POPCOUNT_4BIT = [
  0, 1, 1, 2, 1, 2, 2, 3, 1, 2, 2, 3, 2, 3, 3, 4,
] as const;

export function hammingDistanceHex64(a: string, b: string): number {
  const cleanA = a.trim().toLowerCase();
  const cleanB = b.trim().toLowerCase();

  if (
    cleanA.length !== 16 ||
    cleanB.length !== 16 ||
    !/^[0-9a-f]{16}$/.test(cleanA) ||
    !/^[0-9a-f]{16}$/.test(cleanB)
  ) {
    return 64;
  }

  let distance = 0;
  for (let i = 0; i < 16; i += 1) {
    const na = parseInt(cleanA[i] ?? '0', 16);
    const nb = parseInt(cleanB[i] ?? '0', 16);
    distance += POPCOUNT_4BIT[na ^ nb] ?? 0;
  }

  return distance;
}

export function decideSightingValidation(
  inputs: ValidationDecisionInputs,
  overrides: Partial<ValidationConfig> = {}
): ValidationDecisionResult {
  const cfg: ValidationConfig = {
    ...DEFAULT_VALIDATION_CONFIG,
    ...overrides,
  };

  const safeConfidence = Number.isFinite(inputs.catConfidence)
    ? Math.max(0, Math.min(1, Math.round(inputs.catConfidence * 1000) / 1000))
    : 0;

  if (
    !inputs.imageValid ||
    !Number.isFinite(inputs.width) ||
    !Number.isFinite(inputs.height) ||
    inputs.width < cfg.minImageDimensionPx ||
    inputs.height < cfg.minImageDimensionPx
  ) {
    return {
      status: 'rejected',
      rejectReason: 'invalid_image',
      catConfidence: null,
      matchedDuplicatePhash: null,
      minHammingDistance: null,
      autoReport: false,
    };
  }

  if (inputs.isSafe === false) {
    return {
      status: 'rejected',
      rejectReason: 'unsafe_content',
      catConfidence: safeConfidence,
      matchedDuplicatePhash: null,
      minHammingDistance: null,
      autoReport: true,
    };
  }

  let minHammingDistance: number | null = null;
  let matchedDuplicatePhash: string | null = null;

  if (inputs.dhash) {
    for (const prevHash of inputs.recentPhashes) {
      if (!prevHash) continue;
      const dist = hammingDistanceHex64(inputs.dhash, prevHash);
      if (minHammingDistance === null || dist < minHammingDistance) {
        minHammingDistance = dist;
      }
      if (dist <= cfg.dhashMaxHammingDistance && matchedDuplicatePhash === null) {
        matchedDuplicatePhash = prevHash;
      }
    }
  }

  if (matchedDuplicatePhash !== null) {
    return {
      status: 'rejected',
      rejectReason: 'duplicate',
      catConfidence: safeConfidence,
      matchedDuplicatePhash,
      minHammingDistance,
      autoReport: false,
    };
  }

  if (inputs.submissionsLast24h > cfg.dailySubmissionRateLimit) {
    return {
      status: 'flagged',
      rejectReason: 'rate_limited',
      catConfidence: safeConfidence,
      matchedDuplicatePhash: null,
      minHammingDistance,
      autoReport: false,
    };
  }

  if (inputs.isRealPhoto === false) {
    return {
      status: 'flagged',
      rejectReason: 'suspected_screen_or_print',
      catConfidence: safeConfidence,
      matchedDuplicatePhash: null,
      minHammingDistance,
      autoReport: false,
    };
  }

  if (!inputs.containsCat || safeConfidence < cfg.catFlagThreshold) {
    return {
      status: 'rejected',
      rejectReason: 'no_cat_detected',
      catConfidence: safeConfidence,
      matchedDuplicatePhash: null,
      minHammingDistance,
      autoReport: false,
    };
  }

  if (safeConfidence < cfg.catAcceptThreshold) {
    return {
      status: 'flagged',
      rejectReason: 'uncertain',
      catConfidence: safeConfidence,
      matchedDuplicatePhash: null,
      minHammingDistance,
      autoReport: false,
    };
  }

  return {
    status: 'accepted',
    rejectReason: null,
    catConfidence: safeConfidence,
    matchedDuplicatePhash: null,
    minHammingDistance,
    autoReport: false,
  };
}
