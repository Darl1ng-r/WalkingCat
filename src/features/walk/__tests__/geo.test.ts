import { describe, expect, it } from '@jest/globals';

import {
  computeDurations,
  decodePolyline,
  encodePolyline,
  filterPoints,
  getRouteBounds,
  haversine,
  simplifyRoute,
  totalDistance,
  trimRouteEnds,
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

  describe('trimRouteEnds & getRouteBounds', () => {
    it('returns empty array when route is shorter than 2 * trimMeters', () => {
      // ~222m total, trim 150m from each end -> <= 300m -> empty
      const shortRoute = [
        { latitude: 0, longitude: 0 },
        { latitude: 0.001, longitude: 0 },
        { latitude: 0.002, longitude: 0 },
      ];
      expect(trimRouteEnds(shortRoute, 150)).toEqual([]);
    });

    it('trims 150m off both ends of a longer route and preserves intermediate vertices', () => {
      // 0.001 deg lat is ~111.195m. 5 segments of 0.001 deg = ~556m total.
      const route = [
        { latitude: 0, longitude: 0 },
        { latitude: 0.001, longitude: 0 },
        { latitude: 0.002, longitude: 0 },
        { latitude: 0.003, longitude: 0 },
        { latitude: 0.004, longitude: 0 },
        { latitude: 0.005, longitude: 0 },
      ];

      const fullDist = haversine(route[0], route[5]);
      const trimmed = trimRouteEnds(route, 150);

      expect(trimmed.length).toBeGreaterThanOrEqual(4);
      const trimmedDist = haversine(trimmed[0], trimmed[trimmed.length - 1]);
      expect(trimmedDist).toBeCloseTo(fullDist - 300, 0);
    });

    it('returns original points when trimMeters is 0', () => {
      const route = [
        { latitude: 10, longitude: 20 },
        { latitude: 10.01, longitude: 20.01 },
      ];
      expect(trimRouteEnds(route, 0)).toEqual(route);
    });

    it('computes route bounding center and zoom level', () => {
      const bounds = getRouteBounds([
        { latitude: 37.77, longitude: -122.42 },
        { latitude: 37.78, longitude: -122.4 },
      ]);
      expect(bounds).not.toBeNull();
      expect(bounds?.center.latitude).toBeCloseTo(37.775, 4);
      expect(bounds?.center.longitude).toBeCloseTo(-122.41, 4);
      expect(bounds?.zoom).toBe(14);
    });
  });
});
