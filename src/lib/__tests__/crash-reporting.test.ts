import { describe, expect, it } from '@jest/globals';

import {
  captureException,
  scrubContextExtra,
  scrubSensitiveInfo,
} from '../crash-reporting';

describe('Privacy-Scrubbed Crash Reporting (Phase 12)', () => {
  describe('Sensitive Info Redaction', () => {
    it('redacts email addresses', () => {
      const text = 'Crash occurred for user alice@example.com in walk process';
      expect(scrubSensitiveInfo(text)).toBe(
        'Crash occurred for user [REDACTED] in walk process'
      );
    });

    it('redacts bearer tokens and JWT strings', () => {
      const text =
        'Authorization Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.doNotLeakThis';
      expect(scrubSensitiveInfo(text)).toContain('[REDACTED]');
      expect(text).not.toBe(scrubSensitiveInfo(text));
    });

    it('redacts passwords in error strings', () => {
      const text = 'Connection failed: password="superSecretPassword"';
      expect(scrubSensitiveInfo(text)).toBe('Connection failed: [REDACTED]');
    });
  });

  describe('Context Extra Sanitization', () => {
    it('redacts coordinates, polylines, and secret keys', () => {
      const rawContext = {
        component: 'ActiveWalkScreen',
        latitude: 37.7749,
        longitude: -122.4194,
        polyline: 'secret_raw_gps_polyline',
        user_email: 'tester@test.com',
        safe_counter: 42,
      };

      const cleaned = scrubContextExtra(rawContext);
      expect(cleaned.latitude).toBe('[REDACTED]');
      expect(cleaned.longitude).toBe('[REDACTED]');
      expect(cleaned.polyline).toBe('[REDACTED]');
      expect(cleaned.component).toBe('ActiveWalkScreen');
      expect(cleaned.safe_counter).toBe(42);
    });

    it('safely handles empty or missing context', () => {
      expect(scrubContextExtra(undefined)).toEqual({});
      expect(scrubContextExtra({})).toEqual({});
    });
  });

  describe('captureException Execution', () => {
    it('does not throw when capturing errors', () => {
      expect(() => {
        captureException(new Error('Sample test error: user@test.com'), {
          component: 'WalkTracker',
          action: 'startWalk',
        });
      }).not.toThrow();

      expect(() => {
        captureException('String error message', { component: 'Collection' });
      }).not.toThrow();
    });
  });
});
