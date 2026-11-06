import { describe, expect, it } from '@jest/globals';

import { formatDistance, formatDuration, formatNumber, formatPace } from '../format';

describe('format utilities', () => {
  describe('formatDistance', () => {
    it('formats distances under 1000m in meters', () => {
      expect(formatDistance(0)).toBe('0 m');
      expect(formatDistance(42.4)).toBe('42 m');
      expect(formatDistance(999)).toBe('999 m');
    });

    it('formats distances 1000m and above in kilometers with 2 decimal places', () => {
      expect(formatDistance(1000)).toBe('1.00 km');
      expect(formatDistance(2456)).toBe('2.46 km');
    });

    it('clamps negative or non-finite values to 0 m', () => {
      expect(formatDistance(-50)).toBe('0 m');
      expect(formatDistance(Number.NaN)).toBe('0 m');
    });
  });

  describe('formatDuration', () => {
    it('formats seconds under 1 hour as MM:SS', () => {
      expect(formatDuration(0)).toBe('00:00');
      expect(formatDuration(65)).toBe('01:05');
      expect(formatDuration(3599)).toBe('59:59');
    });

    it('formats durations 1 hour or longer as H:MM:SS', () => {
      expect(formatDuration(3600)).toBe('1:00:00');
      expect(formatDuration(3661)).toBe('1:01:01');
    });

    it('handles negative or non-finite values safely', () => {
      expect(formatDuration(-10)).toBe('00:00');
      expect(formatDuration(Number.NaN)).toBe('00:00');
    });
  });

  describe('formatPace', () => {
    it('formats valid pace in minutes and seconds per km', () => {
      expect(formatPace(600)).toBe('10:00 /km');
      expect(formatPace(725)).toBe('12:05 /km');
    });

    it('returns placeholder for zero, negative, or implausible paces', () => {
      expect(formatPace(0)).toBe('--:-- /km');
      expect(formatPace(-300)).toBe('--:-- /km');
      expect(formatPace(9000)).toBe('--:-- /km');
      expect(formatPace(Number.NaN)).toBe('--:-- /km');
    });
  });

  describe('formatNumber', () => {
    it('formats integers with locale grouping', () => {
      expect(formatNumber(0)).toBe('0');
      expect(formatNumber(8432)).toBe('8,432');
    });
  });
});
