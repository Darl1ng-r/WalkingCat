import { describe, expect, it } from '@jest/globals';

import {
  computeCollectionHeaderStats,
  formatCatCardNumber,
  formatCoarseAreaLabel,
  getCatDisplayName,
  sortCatCards,
  validateCatNickname,
  type CatCardItem,
} from '../utils';

const SAMPLE_CATS: CatCardItem[] = [
  {
    id: 'cat-1',
    user_id: 'u-1',
    card_number: 1,
    nickname: 'Mochi',
    cover_sighting_id: 's-1',
    cover_photo_path: 'u-1/s-1.jpg',
    coverUrl: null,
    sighting_count: 1,
    first_seen_at: '2026-11-01T10:00:00Z',
    last_seen_at: '2026-11-01T10:00:00Z',
    area_geohash: null,
    created_at: '2026-11-01T10:00:00Z',
  },
  {
    id: 'cat-2',
    user_id: 'u-1',
    card_number: 2,
    nickname: null,
    cover_sighting_id: 's-2',
    cover_photo_path: 'u-1/s-2.jpg',
    coverUrl: null,
    sighting_count: 4,
    first_seen_at: '2026-11-02T12:00:00Z',
    last_seen_at: '2026-11-05T14:00:00Z',
    area_geohash: '9q8yy',
    created_at: '2026-11-02T12:00:00Z',
  },
  {
    id: 'cat-3',
    user_id: 'u-1',
    card_number: 3,
    nickname: 'Biscuit',
    cover_sighting_id: 's-3',
    cover_photo_path: 'u-1/s-3.jpg',
    coverUrl: null,
    sighting_count: 2,
    first_seen_at: '2026-11-06T09:00:00Z',
    last_seen_at: '2026-11-06T09:00:00Z',
    area_geohash: null,
    created_at: '2026-11-06T09:00:00Z',
  },
];

describe('cat collection utilities', () => {
  it('formats sequential card numbers with leading zeros', () => {
    expect(formatCatCardNumber(1)).toBe('#001');
    expect(formatCatCardNumber(12)).toBe('#012');
    expect(formatCatCardNumber(145)).toBe('#145');
  });

  it('returns custom nickname or default Unnamed cat #N', () => {
    expect(getCatDisplayName('Mochi', 1)).toBe('Mochi');
    expect(getCatDisplayName(null, 12)).toBe('Unnamed cat #12');
    expect(getCatDisplayName('   ', 5)).toBe('Unnamed cat #5');
  });

  it('validates nicknames up to 30 characters and allows clearing', () => {
    expect(validateCatNickname('  Sunny  ')).toEqual({
      valid: true,
      sanitized: 'Sunny',
    });
    expect(validateCatNickname('   ')).toEqual({
      valid: true,
      sanitized: null,
    });
    expect(validateCatNickname('a'.repeat(31)).valid).toBe(false);
  });

  it('sorts cat cards by newest, most_seen, and a_z', () => {
    const newest = sortCatCards(SAMPLE_CATS, 'newest');
    expect(newest.map((c) => c.id)).toEqual(['cat-3', 'cat-2', 'cat-1']);

    const mostSeen = sortCatCards(SAMPLE_CATS, 'most_seen');
    expect(mostSeen.map((c) => c.id)).toEqual(['cat-2', 'cat-3', 'cat-1']);

    const az = sortCatCards(SAMPLE_CATS, 'a_z');
    // Biscuit, Mochi, Unnamed cat #2
    expect(az.map((c) => c.id)).toEqual(['cat-3', 'cat-1', 'cat-2']);
  });

  it('computes header stats accurately', () => {
    const stats = computeCollectionHeaderStats(SAMPLE_CATS);
    expect(stats.totalCats).toBe(3);
    expect(stats.totalSightings).toBe(7); // 1 + 4 + 2
    expect(stats.discoveryDaysCount).toBe(4);
  });

  it('returns privacy-safe coarse area label without coordinates', () => {
    expect(formatCoarseAreaLabel(null)).toBeNull();
    expect(formatCoarseAreaLabel('9q8yy')).toBe(
      'Seen around your neighborhood'
    );
  });
});
