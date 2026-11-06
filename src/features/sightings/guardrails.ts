import { AppConfig } from '@/constants/config';

export interface CaptureCooldownCheck {
  allowed: boolean;
  remainingSeconds: number;
}

/**
 * Enforces the 10-second minimum interval between photo captures.
 */
export function checkCaptureCooldown(
  lastCaptureAtMs: number | null,
  nowMs: number = Date.now(),
  cooldownMs: number = AppConfig.sightings.captureCooldownMs
): CaptureCooldownCheck {
  if (lastCaptureAtMs === null || lastCaptureAtMs <= 0) {
    return { allowed: true, remainingSeconds: 0 };
  }

  const elapsed = nowMs - lastCaptureAtMs;
  if (elapsed >= cooldownMs) {
    return { allowed: true, remainingSeconds: 0 };
  }

  const remainingSeconds = Math.max(1, Math.ceil((cooldownMs - elapsed) / 1000));
  return { allowed: false, remainingSeconds };
}

export interface DimensionValidationResult {
  valid: boolean;
  reason?: string;
}

/**
 * Rejects images where either width or height is smaller than `minDimensionPx` (400 px).
 */
export function validateImageDimensions(
  width: number,
  height: number,
  minDimensionPx: number = AppConfig.sightings.minImageDimensionPx
): DimensionValidationResult {
  if (
    !Number.isFinite(width) ||
    !Number.isFinite(height) ||
    width <= 0 ||
    height <= 0
  ) {
    return {
      valid: false,
      reason: 'Could not read image dimensions. Please take another photo.',
    };
  }

  if (width < minDimensionPx || height < minDimensionPx) {
    return {
      valid: false,
      reason: `Photo resolution is too small (${Math.round(width)}×${Math.round(height)} px). Minimum required is ${minDimensionPx}×${minDimensionPx} px.`,
    };
  }

  return { valid: true };
}

/**
 * Computes the target `{ width, height }` so the longest side is at most `maxDimensionPx` (1600 px),
 * preserving aspect ratio. Returns `null` if both dimensions are already <= `maxDimensionPx`.
 */
export function computeTargetResizeDimensions(
  width: number,
  height: number,
  maxDimensionPx: number = AppConfig.sightings.maxImageDimensionPx
): { width: number; height: number } | null {
  const longestSide = Math.max(width, height);
  if (longestSide <= maxDimensionPx) {
    return null;
  }

  const scale = maxDimensionPx / longestSide;
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

/**
 * Validates that a processed JPEG file is under `maxFileSizeBytes` (10 MB) and non-empty.
 */
export function validateProcessedFileSize(
  sizeBytes: number,
  maxBytes: number = AppConfig.sightings.maxFileSizeBytes
): DimensionValidationResult {
  if (!Number.isFinite(sizeBytes) || sizeBytes <= 0) {
    return {
      valid: false,
      reason: 'Processed photo file is empty. Please retake the photo.',
    };
  }

  if (sizeBytes > maxBytes) {
    return {
      valid: false,
      reason: 'Photo file size exceeds the 10 MB limit. Please retake the photo.',
    };
  }

  return { valid: true };
}

/**
 * Converts an ArrayBuffer or Uint8Array into a lowercase 64-char hex string.
 */
export function bytesToHex(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let hex = '';
  for (let i = 0; i < bytes.length; i += 1) {
    hex += (bytes[i] ?? 0).toString(16).padStart(2, '0');
  }
  return hex;
}
