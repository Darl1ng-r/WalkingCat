import { describe, expect, it } from '@jest/globals';

import { toGeohash } from '../geohash';
import {
  bytesToHex,
  checkCaptureCooldown,
  computeTargetResizeDimensions,
  validateImageDimensions,
  validateProcessedFileSize,
} from '../guardrails';

describe('sightings utilities', () => {
  describe('toGeohash', () => {
    it('encodes known coordinates to standard 5-character geohashes', () => {
      // San Francisco (37.7749, -122.4194) -> 9q8yy
      expect(toGeohash(37.7749, -122.4194, 5)).toBe('9q8yy');
      // London (51.5074, -0.1278) -> gcpvj
      expect(toGeohash(51.5074, -0.1278, 5)).toBe('gcpvj');
    });

    it('clamps precision to at most 5 characters to protect location privacy', () => {
      const hash = toGeohash(37.7749, -122.4194, 9);
      expect(hash).toHaveLength(5);
      expect(hash).toBe('9q8yy');
    });

    it('throws on out-of-range coordinates', () => {
      expect(() => toGeohash(95, 0)).toThrow();
      expect(() => toGeohash(0, 185)).toThrow();
    });
  });

  describe('checkCaptureCooldown', () => {
    it('allows first capture or capture after 10 seconds', () => {
      expect(checkCaptureCooldown(null, 100_000).allowed).toBe(true);
      expect(checkCaptureCooldown(90_000, 100_000).allowed).toBe(true);
    });

    it('blocks capture within 10s window and returns remaining seconds', () => {
      const res = checkCaptureCooldown(95_000, 100_000, 10_000);
      expect(res.allowed).toBe(false);
      expect(res.remainingSeconds).toBe(5);
    });
  });

  describe('validateImageDimensions & computeTargetResizeDimensions', () => {
    it('rejects images smaller than 400x400', () => {
      expect(validateImageDimensions(320, 480).valid).toBe(false);
      expect(validateImageDimensions(400, 400).valid).toBe(true);
      expect(validateImageDimensions(3024, 4032).valid).toBe(true);
    });

    it('scales longest side down to 1600px while preserving aspect ratio', () => {
      expect(computeTargetResizeDimensions(1200, 900)).toBeNull();
      expect(computeTargetResizeDimensions(4000, 3000)).toEqual({
        width: 1600,
        height: 1200,
      });
      expect(computeTargetResizeDimensions(3000, 4000)).toEqual({
        width: 1200,
        height: 1600,
      });
    });

    it('validates file size under 10 MB and converts bytes to hex', () => {
      expect(validateProcessedFileSize(500_000).valid).toBe(true);
      expect(validateProcessedFileSize(11 * 1024 * 1024).valid).toBe(false);
      expect(bytesToHex(new Uint8Array([0, 15, 255]))).toBe('000fff');
    });
  });
});
