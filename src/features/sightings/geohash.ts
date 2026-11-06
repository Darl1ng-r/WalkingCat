import { AppConfig } from '@/constants/config';

const BASE32_ALPHABET = '0123456789bcdefghjkmnpqrstuvwxyz';

/**
 * Encodes a latitude/longitude pair into a coarse geohash string.
 * Enforces a hard maximum precision of 5 characters (~4.9 km x 4.9 km cell)
 * to guarantee that exact cat or user locations are never stored.
 */
export function toGeohash(
  latitude: number,
  longitude: number,
  precision: number = AppConfig.sightings.geohashPrecision
): string {
  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    latitude < -90 ||
    latitude > 90 ||
    longitude < -180 ||
    longitude > 180
  ) {
    throw new Error('Invalid latitude or longitude for geohash');
  }

  // Hard cap at 5 characters per privacy rules
  const safePrecision = Math.min(5, Math.max(1, Math.floor(precision)));

  let minLat = -90.0;
  let maxLat = 90.0;
  let minLon = -180.0;
  let maxLon = 180.0;

  let hash = '';
  let isEvenBit = true;
  let bit = 0;
  let ch = 0;

  while (hash.length < safePrecision) {
    if (isEvenBit) {
      const mid = (minLon + maxLon) / 2;
      if (longitude >= mid) {
        ch = (ch << 1) | 1;
        minLon = mid;
      } else {
        ch = ch << 1;
        maxLon = mid;
      }
    } else {
      const mid = (minLat + maxLat) / 2;
      if (latitude >= mid) {
        ch = (ch << 1) | 1;
        minLat = mid;
      } else {
        ch = ch << 1;
        maxLat = mid;
      }
    }

    isEvenBit = !isEvenBit;
    bit += 1;

    if (bit === 5) {
      hash += BASE32_ALPHABET[ch] ?? '0';
      bit = 0;
      ch = 0;
    }
  }

  return hash;
}
