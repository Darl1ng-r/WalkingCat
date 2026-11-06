import { describe, expect, it } from '@jest/globals';

import { toGeohash } from '../geohash';
import {
  bytesToHex,
  checkCaptureCooldown,
  computeTargetResizeDimensions,
  validateImageDimensions,
  validateProcessedFileSize,
} from '../guardrails';
import {
  computeDHash64FromGrayscale,
  decideSightingValidation,
  getSightingStatusCopy,
  hammingDistanceHex64,
} from '../validation-rules';

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

  describe('dHash & decideSightingValidation', () => {
    it('computes 64-bit hex dHash and bitwise Hamming distance', () => {
      const ascendingGrid = Array.from({ length: 72 }, (_, idx) => idx);
      const descendingGrid = Array.from({ length: 72 }, (_, idx) => 255 - idx);

      const hashAsc = computeDHash64FromGrayscale(ascendingGrid);
      const hashDesc = computeDHash64FromGrayscale(descendingGrid);

      expect(hashAsc).toBe('0000000000000000');
      expect(hashDesc).toBe('ffffffffffffffff');
      expect(hammingDistanceHex64(hashAsc, hashDesc)).toBe(64);
      expect(hammingDistanceHex64('0000000000000000', '000000000000000f')).toBe(
        4
      );
    });

    it('accepts high-confidence (>=0.80) cat photos that pass all checks', () => {
      const res = decideSightingValidation({
        imageValid: true,
        width: 1600,
        height: 1200,
        dhash: '1234567890abcdef',
        recentPhashes: ['fedcba0987654321'],
        submissionsLast24h: 3,
        containsCat: true,
        catConfidence: 0.92,
        isRealPhoto: true,
        isSafe: true,
      });

      expect(res.status).toBe('accepted');
      expect(res.rejectReason).toBeNull();
      expect(res.catConfidence).toBe(0.92);
    });

    it('flags uncertain cat confidence (0.50 - 0.80) for manual review', () => {
      const res = decideSightingValidation({
        imageValid: true,
        width: 1200,
        height: 900,
        dhash: '1234567890abcdef',
        recentPhashes: [],
        submissionsLast24h: 1,
        containsCat: true,
        catConfidence: 0.65,
      });

      expect(res.status).toBe('flagged');
      expect(res.rejectReason).toBe('uncertain');
    });

    it('rejects low confidence (<0.50) or non-cat photos with no_cat_detected', () => {
      const res = decideSightingValidation({
        imageValid: true,
        width: 1200,
        height: 900,
        dhash: '1234567890abcdef',
        recentPhashes: [],
        submissionsLast24h: 1,
        containsCat: false,
        catConfidence: 0.12,
      });

      expect(res.status).toBe('rejected');
      expect(res.rejectReason).toBe('no_cat_detected');
    });

    it('rejects near-duplicates when dHash Hamming distance <= 6', () => {
      const res = decideSightingValidation({
        imageValid: true,
        width: 1200,
        height: 900,
        dhash: '0000000000000000',
        recentPhashes: ['000000000000000f'], // Hamming distance 4 <= 6
        submissionsLast24h: 2,
        containsCat: true,
        catConfidence: 0.95,
      });

      expect(res.status).toBe('rejected');
      expect(res.rejectReason).toBe('duplicate');
      expect(res.minHammingDistance).toBe(4);
    });

    it('flags submissions exceeding the 24-hour rate limit (>30)', () => {
      const res = decideSightingValidation({
        imageValid: true,
        width: 1200,
        height: 900,
        dhash: '1234567890abcdef',
        recentPhashes: [],
        submissionsLast24h: 31,
        containsCat: true,
        catConfidence: 0.95,
      });

      expect(res.status).toBe('flagged');
      expect(res.rejectReason).toBe('rate_limited');
    });

    it('flags suspected screen or print photos', () => {
      const res = decideSightingValidation({
        imageValid: true,
        width: 1200,
        height: 900,
        dhash: '1234567890abcdef',
        recentPhashes: [],
        submissionsLast24h: 1,
        containsCat: true,
        catConfidence: 0.95,
        isRealPhoto: false,
      });

      expect(res.status).toBe('flagged');
      expect(res.rejectReason).toBe('suspected_screen_or_print');
    });

    it('rejects unsafe content and sets autoReport=true', () => {
      const res = decideSightingValidation({
        imageValid: true,
        width: 1200,
        height: 900,
        dhash: '1234567890abcdef',
        recentPhashes: [],
        submissionsLast24h: 1,
        containsCat: false,
        catConfidence: 0,
        isSafe: false,
      });

      expect(res.status).toBe('rejected');
      expect(res.rejectReason).toBe('unsafe_content');
      expect(res.autoReport).toBe(true);
    });

    it('returns friendly status copy matching Phase 7 specs', () => {
      expect(getSightingStatusCopy('accepted').friendlyMessage).toBe(
        'Nice find! Added to your collection.'
      );
      expect(getSightingStatusCopy('flagged', 'uncertain').friendlyMessage).toBe(
        "We'll take a closer look — this can take a little while."
      );
      expect(
        getSightingStatusCopy('rejected', 'no_cat_detected').friendlyMessage
      ).toBe(
        "We couldn't spot a cat in this photo. Try again from a distance with zoom."
      );
      expect(
        getSightingStatusCopy('rejected', 'duplicate').friendlyMessage
      ).toBe("Looks like you've already submitted this sighting.");
    });
  });
});
