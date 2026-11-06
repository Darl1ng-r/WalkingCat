import { describe, expect, it } from '@jest/globals';

import {
  computeDurations,
  decodePolyline,
  encodePolyline,
  filterPoints,
  haversine,
  simplifyRoute,
  totalDistance,
  type GeoPoint,
  type PauseInterval,
} from '../geo';

describe('walk geo utilities', () => {
  describe('haversine', () => {
    it('returns 0 for identical coordinates', () => {
      const pt = { latitude: 37.7749, longitude: -122.4194 };
      expect(haversine(pt, pt)).toBe(0);
    });

    it('calculates known distance accurately (~111.32 km per degree latitude)', () => {
      const a = { latitude: 0, longitude: 0 };
      const b = { latitude: 0.001, longitude: 0 }; // ~111.32m
      const dist = haversine(a, b);
      expect(dist).toBeGreaterThan(110);
      expect(dist).toBeLessThan(113);
    });
  });

  describe('filterPoints & totalDistance', () => {
    it('drops inaccurate points (>30m), stationary jitter (<2.5m), and supersonic jumps', () => {
      const baseTime = 1_700_000_000_000;
      const raw: GeoPoint[] = [
        { latitude: 0, longitude: 0, accuracy: 10, timestamp: baseTime },
        // Stationary jitter (~0.5m) -> should be dropped
        { latitude: 0.000004, longitude: 0, accuracy: 8, timestamp: baseTime + 5000 },
        // Inaccurate fix (55m) -> should be dropped
        { latitude: 0.0002, longitude: 0, accuracy: 55, timestamp: baseTime + 10_000 },
        // Valid walking step (~11.1m over 15s -> 0.74 m/s)
        { latitude: 0.0001, longitude: 0, accuracy: 10, timestamp: baseTime + 15_000 },
        // Teleport jump (~1.11km in 5s -> 222 m/s) -> should be dropped
        { latitude: 0.01, longitude: 0, accuracy: 10, timestamp: baseTime + 20_000 },
        // Valid next walking step (~22.2m from start over 30s)
        { latitude: 0.0002, longitude: 0, accuracy: 10, timestamp: baseTime + 30_000 },
      ];

      const filtered = filterPoints(raw);
      expect(filtered).toHaveLength(3);

      const dist = totalDistance(filtered);
      expect(dist).toBeGreaterThan(21);
      expect(dist).toBeLessThan(24);
    });

    it('ignores points during pause intervals and does not bridge distance across a pause', () => {
      const baseTime = 1_700_000_000_000;
      const pauses: PauseInterval[] = [
        { pausedAt: baseTime + 10_000, resumedAt: baseTime + 25_000 },
      ];

      const raw: GeoPoint[] = [
        { latitude: 0, longitude: 0, accuracy: 5, timestamp: baseTime },
        { latitude: 0.0001, longitude: 0, accuracy: 5, timestamp: baseTime + 8000 },
        // Point inside pause -> ignored
        { latitude: 0.0005, longitude: 0, accuracy: 5, timestamp: baseTime + 15_000 },
        // Resumed at a new location (e.g. user took bus while paused) -> bridge across pause ignored
        { latitude: 0.0002, longitude: 0, accuracy: 5, timestamp: baseTime + 30_000 },
        // Walked another ~11.1m after resume
        { latitude: 0.0003, longitude: 0, accuracy: 5, timestamp: baseTime + 40_000 },
      ];

      const filtered = filterPoints(raw, pauses);
      expect(filtered).toHaveLength(4);

      const dist = totalDistance(filtered, pauses);
      // Only first segment (~11.1m) + post-resume segment (~11.1m) = ~22.2m
      expect(dist).toBeGreaterThan(21);
      expect(dist).toBeLessThan(24);
    });
  });

  describe('computeDurations', () => {
    it('subtracts paused intervals from total duration', () => {
      const start = 1_000_000;
      const end = start + 600_000; // 600s (10 min)
      const pauses: PauseInterval[] = [
        { pausedAt: start + 100_000, resumedAt: start + 220_000 }, // 120s pause
      ];

      const { durationSeconds, movingTimeSeconds } = computeDurations(
        start,
        end,
        pauses
      );
      expect(durationSeconds).toBe(600);
      expect(movingTimeSeconds).toBe(480);
    });
  });

  describe('simplifyRoute & polyline encoding', () => {
    it('preserves start and end points while simplifying collinear intermediate points', () => {
      const straightLine = [
        { latitude: 37.77, longitude: -122.41 },
        { latitude: 37.771, longitude: -122.41 },
        { latitude: 37.772, longitude: -122.41 },
        { latitude: 37.773, longitude: -122.41 },
      ];

      const simplified = simplifyRoute(straightLine, 5);
      expect(simplified).toHaveLength(2);
      expect(simplified[0]).toEqual(straightLine[0]);
      expect(simplified[1]).toEqual(straightLine[3]);
    });

    it('round-trips coordinates through encodePolyline and decodePolyline', () => {
      const coords = [
        { latitude: 38.5, longitude: -120.2 },
        { latitude: 40.7, longitude: -120.95 },
        { latitude: 43.252, longitude: -126.453 },
      ];

      const encoded = encodePolyline(coords);
      expect(encoded).toBe('_p~iF~ps|U_ulLnnqC_mqNvxq`@');

      const decoded = decodePolyline(encoded);
      expect(decoded).toHaveLength(3);
      expect(decoded[0]?.latitude).toBeCloseTo(38.5, 4);
      expect(decoded[2]?.longitude).toBeCloseTo(-126.453, 4);
    });
  });
});
