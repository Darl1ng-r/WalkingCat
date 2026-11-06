/**
 * Pure formatting helpers for activity units (meters, seconds, pace, numbers).
 * Stored values are always metric & UTC; conversion happens only in the UI.
 */

export function formatDistance(meters: number, locale = 'en-US'): string {
  const safeMeters = Math.max(0, Number.isFinite(meters) ? meters : 0);

  if (safeMeters < 1000) {
    return `${Math.round(safeMeters).toLocaleString(locale)} m`;
  }

  const km = safeMeters / 1000;
  return `${km.toLocaleString(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} km`;
}

export function formatDuration(seconds: number): string {
  const totalSeconds = Math.max(0, Math.floor(Number.isFinite(seconds) ? seconds : 0));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;

  const pad = (n: number) => String(n).padStart(2, '0');

  if (hours > 0) {
    return `${hours}:${pad(minutes)}:${pad(secs)}`;
  }

  return `${pad(minutes)}:${pad(secs)}`;
}

export function formatPace(secondsPerKm: number): string {
  if (!Number.isFinite(secondsPerKm) || secondsPerKm <= 0 || secondsPerKm > 7200) {
    return '--:-- /km';
  }

  const rounded = Math.round(secondsPerKm);
  const minutes = Math.floor(rounded / 60);
  const seconds = rounded % 60;

  return `${minutes}:${String(seconds).padStart(2, '0')} /km`;
}

export function formatNumber(value: number, locale = 'en-US'): string {
  const safeValue = Number.isFinite(value) ? value : 0;
  return Math.round(safeValue).toLocaleString(locale);
}
