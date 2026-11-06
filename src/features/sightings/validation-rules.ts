import type { SightingStatus } from './api';

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

/**
 * Computes a 64-bit difference hash (dHash) as a 16-character lowercase hex string
 * from a 9x8 (72-element) grayscale luminance array.
 */
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

/**
 * Computes the bitwise Hamming distance (0..64) between two 16-character hex dHashes.
 */
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

/**
 * Pure server-side decision function for sighting validation.
 * Conservative by design: when unsure, flags for manual review — never auto-rewards.
 */
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

  // 1. File sanity check
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

  // 2. Unsafe content check (vision safe-search)
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

  // 3. Near-duplicate check via 64-bit dHash Hamming distance
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

  // 4. Rate limit check (> 30 submissions in 24h)
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

  // 5. Screen / print spoof check
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

  // 6. Cat confidence thresholds
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

export interface SightingStatusCopy {
  badgeLabel: string;
  friendlyMessage: string;
  tone: 'neutral' | 'success' | 'warning' | 'danger';
}

/**
 * Returns user-facing badge and friendly status copy for any sighting validation state.
 * Never claims to identify an individual cat — only that a cat was detected.
 */
export function getSightingStatusCopy(
  status: SightingStatus,
  rejectReason?: string | null,
  isUploading = false
): SightingStatusCopy {
  if (isUploading) {
    return {
      badgeLabel: '⏳ Waiting to upload',
      friendlyMessage:
        'Saved on your device — will upload and validate automatically when online.',
      tone: 'neutral',
    };
  }

  switch (status) {
    case 'accepted':
      return {
        badgeLabel: '✓ Accepted',
        friendlyMessage: 'Nice find! Added to your collection.',
        tone: 'success',
      };

    case 'flagged':
      return {
        badgeLabel: '🔍 Under review',
        friendlyMessage:
          "We'll take a closer look — this can take a little while.",
        tone: 'warning',
      };

    case 'rejected':
      if (rejectReason === 'duplicate') {
        return {
          badgeLabel: 'Duplicate sighting',
          friendlyMessage:
            "Looks like you've already submitted this sighting.",
          tone: 'danger',
        };
      }
      if (rejectReason === 'invalid_image') {
        return {
          badgeLabel: 'Photo unreadable',
          friendlyMessage:
            "This photo couldn't be read clearly. Try taking another photo in steady light.",
          tone: 'danger',
        };
      }
      return {
        badgeLabel: 'No cat detected',
        friendlyMessage:
          "We couldn't spot a cat in this photo. Try again from a distance with zoom.",
        tone: 'danger',
      };

    case 'pending':
    default:
      return {
        badgeLabel: '🔍 Checking…',
        friendlyMessage: 'Checking your photo for a cat…',
        tone: 'neutral',
      };
  }
}
