import { describe, expect, it } from '@jest/globals';

import {
  getDistanceBucket,
  getLocalAnalyticsOptOutSetting,
  getStepsBucket,
  sanitizeAnalyticsProps,
  setLocalAnalyticsOptOutSetting,
  track,
} from '../analytics';

describe('Privacy-Respecting Analytics (Phase 12)', () => {
  describe('Coarse Bucketing Helpers', () => {
    it('buckets distances into coarse non-identifying ranges', () => {
      expect(getDistanceBucket(250)).toBe('< 500m');
      expect(getDistanceBucket(750)).toBe('500m - 1km');
      expect(getDistanceBucket(1500)).toBe('1km - 3km');
      expect(getDistanceBucket(4200)).toBe('3km - 5km');
      expect(getDistanceBucket(8500)).toBe('5km - 10km');
      expect(getDistanceBucket(14000)).toBe('10km+');
    });

    it('buckets steps into coarse non-identifying ranges', () => {
      expect(getStepsBucket(500)).toBe('< 1k');
      expect(getStepsBucket(1500)).toBe('1k - 3k');
      expect(getStepsBucket(4000)).toBe('3k - 5k');
      expect(getStepsBucket(6200)).toBe('5k - 8k');
      expect(getStepsBucket(9200)).toBe('8k - 10k');
      expect(getStepsBucket(15000)).toBe('10k+');
    });
  });

  describe('Sanitizer & Redaction Guardrails', () => {
    it('strips coordinates, routes, polylines, and passwords', () => {
      const dirty = {
        duration_s: 1200,
        distance_bucket: '1km - 3km',
        latitude: 37.7749,
        longitude: -122.4194,
        lat: 37.77,
        lon: -122.41,
        route: 'encoded_secret_route',
        polyline: 'secret_polyline',
        password: 'my_password123',
        token: 'bearer_secret',
        calories: 340,
        nested: {
          steps_bucket: '3k - 5k',
          coordinates: [37.7, -122.4],
          safe_prop: 'ok',
        },
      };

      const cleaned = sanitizeAnalyticsProps(dirty);

      expect(cleaned.duration_s).toBe(1200);
      expect(cleaned.distance_bucket).toBe('1km - 3km');
      expect(cleaned.latitude).toBeUndefined();
      expect(cleaned.longitude).toBeUndefined();
      expect(cleaned.lat).toBeUndefined();
      expect(cleaned.lon).toBeUndefined();
      expect(cleaned.route).toBeUndefined();
      expect(cleaned.polyline).toBeUndefined();
      expect(cleaned.password).toBeUndefined();
      expect(cleaned.token).toBeUndefined();
      expect(cleaned.calories).toBeUndefined();

      const nested = cleaned.nested as Record<string, unknown>;
      expect(nested.steps_bucket).toBe('3k - 5k');
      expect(nested.safe_prop).toBe('ok');
      expect(nested.coordinates).toBeUndefined();
    });

    it('handles empty or undefined properties safely', () => {
      expect(sanitizeAnalyticsProps(undefined)).toEqual({});
      expect(sanitizeAnalyticsProps({})).toEqual({});
    });
  });

  describe('Opt-out Preference & Delivery', () => {
    it('persists and retrieves user opt-out status', () => {
      setLocalAnalyticsOptOutSetting(true);
      expect(getLocalAnalyticsOptOutSetting()).toBe(true);

      setLocalAnalyticsOptOutSetting(false);
      expect(getLocalAnalyticsOptOutSetting()).toBe(false);
    });

    it('does not throw when tracking events', async () => {
      await expect(
        track('onboarding_completed', { has_display_name: true })
      ).resolves.not.toThrow();

      await expect(
        track('walk_completed', {
          duration_s: 1800,
          distance_bucket: '3km - 5km',
          steps_bucket: '5k - 8k',
        })
      ).resolves.not.toThrow();
    });
  });
});
