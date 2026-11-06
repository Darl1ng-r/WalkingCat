import * as Location from 'expo-location';
import { Linking, Platform } from 'react-native';

export type WalkPermissionOutcome =
  | { status: 'granted'; backgroundGranted: boolean }
  | { status: 'denied_can_ask' }
  | { status: 'denied_settings_required' }
  | { status: 'services_disabled' }
  | { status: 'approximate_only' };

export async function checkCurrentLocationPermission(): Promise<{
  foregroundGranted: boolean;
  backgroundGranted: boolean;
  canAskAgain: boolean;
}> {
  if (Platform.OS === 'web') {
    return { foregroundGranted: true, backgroundGranted: false, canAskAgain: true };
  }

  const fg = await Location.getForegroundPermissionsAsync();
  const bg = await Location.getBackgroundPermissionsAsync();

  return {
    foregroundGranted: fg.status === Location.PermissionStatus.GRANTED,
    backgroundGranted: bg.status === Location.PermissionStatus.GRANTED,
    canAskAgain: fg.canAskAgain,
  };
}

/**
 * Requests foreground location first, checks that location services and full accuracy
 * are enabled, and then requests background location so screen-off walk tracking works.
 */
export async function requestWalkLocationPermissions(): Promise<WalkPermissionOutcome> {
  if (Platform.OS === 'web') {
    return { status: 'granted', backgroundGranted: false };
  }

  const servicesEnabled = await Location.hasServicesEnabledAsync();
  if (!servicesEnabled) {
    return { status: 'services_disabled' };
  }

  const fg = await Location.requestForegroundPermissionsAsync();
  if (fg.status !== Location.PermissionStatus.GRANTED) {
    return fg.canAskAgain
      ? { status: 'denied_can_ask' }
      : { status: 'denied_settings_required' };
  }

  // On Android, check if the user only granted approximate/coarse location
  if (Platform.OS === 'android' && fg.android?.accuracy === 'coarse') {
    return { status: 'approximate_only' };
  }

  // Attempt background permission for locked-screen tracking (optional fallback if denied)
  let backgroundGranted = false;
  try {
    const bg = await Location.requestBackgroundPermissionsAsync();
    backgroundGranted = bg.status === Location.PermissionStatus.GRANTED;
  } catch {
    backgroundGranted = false;
  }

  return {
    status: 'granted',
    backgroundGranted,
  };
}

export function openDeviceLocationSettings(): void {
  Linking.openSettings().catch(() => {});
}
