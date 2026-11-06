import { AppConfig } from '@/constants/config';

export interface GeoPoint {
  latitude: number;
  longitude: number;
  timestamp: number; // epoch ms
  accuracy?: number | null;
  speed?: number | null;
}

export interface PauseInterval {
  pausedAt: number; // epoch ms
  resumedAt: number | null; // epoch ms (null if currently paused)
}

const EARTH_RADIUS_M = 6_371_000;
const MAX_PLAUSIBLE_SPEED_MPS = 8.0; // ~28.8 km/h jump threshold
const GAP_THRESHOLD_MS = 60_000; // 60 seconds
const MAX_GAP_BRIDGE_SPEED_MPS = 3.0; // max speed to bridge a >60s GPS gap

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/**
 * Great-circle distance in meters between two coordinates using the Haversine formula.
 */
export function haversine(
  a: { latitude: number; longitude: number },
  b: { latitude: number; longitude: number }
): number {
  const dLat = toRadians(b.latitude - a.latitude);
  const dLon = toRadians(b.longitude - a.longitude);
  const lat1 = toRadians(a.latitude);
  const lat2 = toRadians(b.latitude);

  const sinLat = Math.sin(dLat / 2);
  const sinLon = Math.sin(dLon / 2);

  const h =
    sinLat * sinLat + Math.cos(lat1) * Math.cos(lat2) * sinLon * sinLon;
  const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(Math.max(0, 1 - h)));

  return EARTH_RADIUS_M * c;
}

export function isTimestampPaused(
  timestamp: number,
  pauseIntervals: readonly PauseInterval[]
): boolean {
  for (const interval of pauseIntervals) {
    const end = interval.resumedAt ?? Number.POSITIVE_INFINITY;
    if (timestamp >= interval.pausedAt && timestamp <= end) {
      return true;
    }
  }
  return false;
}

function didPauseBetween(
  t1: number,
  t2: number,
  pauseIntervals: readonly PauseInterval[]
): boolean {
  for (const interval of pauseIntervals) {
    const end = interval.resumedAt ?? Number.POSITIVE_INFINITY;
    if (interval.pausedAt <= t2 && end >= t1) {
      return true;
    }
  }
  return false;
}

/**
 * Filters raw GPS samples:
 * - Drops points with poor horizontal accuracy (> 30m)
 * - Drops points recorded during a pause interval
 * - Drops stationary GPS jitter (< 2.5m movement)
 * - Drops implausible teleport jumps (> 8 m/s implied speed)
 */
export function filterPoints(
  points: readonly GeoPoint[],
  pauseIntervals: readonly PauseInterval[] = [],
  maxAccuracyMeters = AppConfig.walk.maxValidAccuracyMeters
): GeoPoint[] {
  const sorted = [...points].sort((a, b) => a.timestamp - b.timestamp);
  const accepted: GeoPoint[] = [];

  for (const point of sorted) {
    if (
      point.accuracy !== undefined &&
      point.accuracy !== null &&
      point.accuracy > maxAccuracyMeters
    ) {
      continue;
    }

    if (isTimestampPaused(point.timestamp, pauseIntervals)) {
      continue;
    }

    const prev = accepted[accepted.length - 1];
    if (!prev) {
      accepted.push(point);
      continue;
    }

    const dtSeconds = (point.timestamp - prev.timestamp) / 1000;
    if (dtSeconds <= 0) {
      continue;
    }

    const dist = haversine(prev, point);

    // Filter out stationary GPS jitter (< 2.5 meters over short intervals)
    if (dist < 2.5 && dtSeconds < 30) {
      continue;
    }

    const impliedSpeed = dist / dtSeconds;
    if (impliedSpeed > MAX_PLAUSIBLE_SPEED_MPS) {
      continue;
    }

    accepted.push(point);
  }

  return accepted;
}

/**
 * Computes total walking distance in meters across filtered points.
 * Does not bridge distance across pause intervals or across >60s GPS gaps with implausible speed.
 */
export function totalDistance(
  points: readonly GeoPoint[],
  pauseIntervals: readonly PauseInterval[] = []
): number {
  if (points.length < 2) {
    return 0;
  }

  let sum = 0;
  for (let i = 1; i < points.length; i += 1) {
    const prev = points[i - 1];
    const curr = points[i];

    if (didPauseBetween(prev.timestamp, curr.timestamp, pauseIntervals)) {
      continue;
    }

    const dtMs = curr.timestamp - prev.timestamp;
    const dist = haversine(prev, curr);

    if (dtMs > GAP_THRESHOLD_MS) {
      const gapSpeed = dist / (dtMs / 1000);
      if (gapSpeed > MAX_GAP_BRIDGE_SPEED_MPS) {
        continue;
      }
    }

    sum += dist;
  }

  return sum;
}

/**
 * Computes elapsed wall-clock seconds and active moving seconds (excluding pauses).
 */
export function computeDurations(
  startedAtMs: number,
  endedAtMs: number,
  pauseIntervals: readonly PauseInterval[]
): { durationSeconds: number; movingTimeSeconds: number } {
  const totalMs = Math.max(0, endedAtMs - startedAtMs);
  let pausedMs = 0;

  for (const interval of pauseIntervals) {
    const start = Math.max(startedAtMs, interval.pausedAt);
    const end = Math.min(endedAtMs, interval.resumedAt ?? endedAtMs);
    if (end > start) {
      pausedMs += end - start;
    }
  }

  const movingMs = Math.max(0, totalMs - pausedMs);
  return {
    durationSeconds: Math.round(totalMs / 1000),
    movingTimeSeconds: Math.round(movingMs / 1000),
  };
}

function perpendicularDistanceMeters(
  point: { latitude: number; longitude: number },
  lineStart: { latitude: number; longitude: number },
  lineEnd: { latitude: number; longitude: number }
): number {
  const latScale = 111_320;
  const lonScale = 111_320 * Math.cos(toRadians(lineStart.latitude));

  const x0 = (point.longitude - lineStart.longitude) * lonScale;
  const y0 = (point.latitude - lineStart.latitude) * latScale;
  const x1 = (lineEnd.longitude - lineStart.longitude) * lonScale;
  const y1 = (lineEnd.latitude - lineStart.latitude) * latScale;

  const lineLenSq = x1 * x1 + y1 * y1;
  if (lineLenSq === 0) {
    return Math.hypot(x0, y0);
  }

  const t = Math.max(0, Math.min(1, (x0 * x1 + y0 * y1) / lineLenSq));
  const projX = t * x1;
  const projY = t * y1;

  return Math.hypot(x0 - projX, y0 - projY);
}

/**
 * Ramer-Douglas-Peucker polyline simplification (tolerance in meters).
 * Always preserves the first and last point.
 */
export function simplifyRoute<T extends { latitude: number; longitude: number }>(
  points: readonly T[],
  toleranceMeters = 5
): T[] {
  if (points.length <= 2) {
    return [...points];
  }

  let maxDist = 0;
  let maxIndex = 0;
  const first = points[0];
  const last = points[points.length - 1];

  for (let i = 1; i < points.length - 1; i += 1) {
    const dist = perpendicularDistanceMeters(points[i], first, last);
    if (dist > maxDist) {
      maxDist = dist;
      maxIndex = i;
    }
  }

  if (maxDist > toleranceMeters) {
    const left = simplifyRoute(points.slice(0, maxIndex + 1), toleranceMeters);
    const right = simplifyRoute(points.slice(maxIndex), toleranceMeters);
    return [...left.slice(0, -1), ...right];
  }

  return [first, last];
}

function encodeSignedNumber(num: number): string {
  let sgnNum = num << 1;
  if (num < 0) {
    sgnNum = ~sgnNum;
  }
  let encoded = '';
  while (sgnNum >= 0x20) {
    encoded += String.fromCharCode((0x20 | (sgnNum & 0x1f)) + 63);
    sgnNum >>= 5;
  }
  encoded += String.fromCharCode(sgnNum + 63);
  return encoded;
}

/**
 * Google Encoded Polyline Algorithm Format (precision 1e5).
 */
export function encodePolyline(
  points: readonly { latitude: number; longitude: number }[]
): string {
  let lastLat = 0;
  let lastLng = 0;
  let result = '';

  for (const point of points) {
    const lat = Math.round(point.latitude * 1e5);
    const lng = Math.round(point.longitude * 1e5);

    const dLat = lat - lastLat;
    const dLng = lng - lastLng;

    result += encodeSignedNumber(dLat);
    result += encodeSignedNumber(dLng);

    lastLat = lat;
    lastLng = lng;
  }

  return result;
}

/**
 * Decodes a Google Encoded Polyline string into coordinates.
 */
export function decodePolyline(
  encoded: string
): { latitude: number; longitude: number }[] {
  if (!encoded) {
    return [];
  }

  const poly: { latitude: number; longitude: number }[] = [];
  let index = 0;
  const len = encoded.length;
  let lat = 0;
  let lng = 0;

  while (index < len) {
    let b: number;
    let shift = 0;
    let result = 0;

    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20 && index <= len);

    const dlat = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
    lat += dlat;

    shift = 0;
    result = 0;

    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20 && index <= len);

    const dlng = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
    lng += dlng;

    poly.push({
      latitude: lat / 1e5,
      longitude: lng / 1e5,
    });
  }

  return poly;
}
