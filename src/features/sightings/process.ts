import * as Crypto from 'expo-crypto';
import { Directory, File, Paths } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { Platform } from 'react-native';

import { AppConfig } from '@/constants/config';
import { logger } from '@/lib/logger';
import {
  bytesToHex,
  computeTargetResizeDimensions,
  validateImageDimensions,
  validateProcessedFileSize,
} from './guardrails';

export interface RawCapturedPhoto {
  uri: string;
  width: number;
  height: number;
}

export interface ProcessedSightingPhoto {
  sightingId: string;
  localFileUri: string;
  width: number;
  height: number;
  sizeBytes: number;
  sha256: string;
}

/**
 * Processes a raw camera photo for sighting submission:
 * 1. Validates minimum dimensions (>= 400 x 400 px).
 * 2. Re-encodes as JPEG (quality 0.8) and resizes longest side to <= 1600 px,
 *    stripping all EXIF/GPS metadata.
 * 3. Validates processed file size (< 10 MB).
 * 4. Computes SHA-256 hex digest using `expo-crypto`.
 * 5. Copies processed file to `Paths.document/sightings/{sightingId}.jpg` for offline persistence.
 */
export async function processCapturedPhoto(
  raw: RawCapturedPhoto
): Promise<ProcessedSightingPhoto> {
  const dimCheck = validateImageDimensions(raw.width, raw.height);
  if (!dimCheck.valid) {
    throw new Error(dimCheck.reason ?? 'Photo dimensions are too small.');
  }

  const sightingId = Crypto.randomUUID();
  const resizeTarget = computeTargetResizeDimensions(
    raw.width,
    raw.height,
    AppConfig.sightings.maxImageDimensionPx
  );

  const manipulatorContext = ImageManipulator.manipulate(raw.uri);
  if (resizeTarget) {
    manipulatorContext.resize(resizeTarget);
  }

  const imageRef = await manipulatorContext.renderAsync();
  const manipulated = await imageRef.saveAsync({
    compress: AppConfig.sightings.jpegQuality,
    format: SaveFormat.JPEG,
  });

  if (Platform.OS === 'web') {
    const response = await fetch(manipulated.uri);
    const arrayBuffer = await response.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);

    const sizeCheck = validateProcessedFileSize(bytes.byteLength);
    if (!sizeCheck.valid) {
      throw new Error(sizeCheck.reason ?? 'Photo file is too large.');
    }

    const digestBuffer = await Crypto.digest(
      Crypto.CryptoDigestAlgorithm.SHA256,
      bytes
    );

    return {
      sightingId,
      localFileUri: manipulated.uri,
      width: manipulated.width,
      height: manipulated.height,
      sizeBytes: bytes.byteLength,
      sha256: bytesToHex(digestBuffer),
    };
  }

  const tempFile = new File(manipulated.uri);
  const sightingsDir = new Directory(Paths.document, 'sightings');
  if (!sightingsDir.exists) {
    sightingsDir.create({ intermediates: true, idempotent: true });
  }

  const permanentFile = new File(sightingsDir, `${sightingId}.jpg`);
  tempFile.copySync(permanentFile, { overwrite: true });

  const bytes = await permanentFile.bytes();
  const sizeCheck = validateProcessedFileSize(bytes.byteLength);
  if (!sizeCheck.valid) {
    deleteLocalSightingFile(permanentFile.uri);
    throw new Error(sizeCheck.reason ?? 'Photo file is too large.');
  }

  const digestBuffer = await Crypto.digest(
    Crypto.CryptoDigestAlgorithm.SHA256,
    bytes
  );
  const sha256 = bytesToHex(digestBuffer);

  return {
    sightingId,
    localFileUri: permanentFile.uri,
    width: manipulated.width,
    height: manipulated.height,
    sizeBytes: bytes.byteLength,
    sha256,
  };
}

/**
 * Safely deletes a local processed sighting JPEG from the device document directory.
 */
export function deleteLocalSightingFile(localFileUri: string): void {
  if (!localFileUri || Platform.OS === 'web') {
    return;
  }

  try {
    const file = new File(localFileUri);
    if (file.exists) {
      file.delete();
    }
  } catch (err) {
    logger.warn('Failed to delete local sighting photo file', {
      localFileUri,
      error: String(err),
    });
  }
}
