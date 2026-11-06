import { Linking } from 'react-native';

import { logger } from '@/lib/logger';
import type { HealthPermissionState, HealthProvider } from './types';

type HealthConnectModule = typeof import('react-native-health-connect');

const REQUIRED_PERMISSIONS = [
  { accessType: 'read', recordType: 'Steps' },
  { accessType: 'read', recordType: 'ActiveCaloriesBurned' },
] as const;

const HEALTH_CONNECT_PLAY_STORE_URL =
  'https://play.google.com/store/apps/details?id=com.google.android.apps.healthdata';

function getHealthConnect(): HealthConnectModule | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('react-native-health-connect') as HealthConnectModule;
  } catch (err) {
    logger.info('Health Connect native module unavailable in this runtime', {
      error: String(err),
    });
    return null;
  }
}

export const healthProvider: HealthProvider = {
  sourceName: 'health_connect',
  displayName: 'Health Connect',

  async isAvailable(): Promise<boolean> {
    const hc = getHealthConnect();
    if (!hc) return false;
    try {
      const status = await hc.getSdkStatus();
      return status === hc.SdkAvailabilityStatus.SDK_AVAILABLE;
    } catch {
      return false;
    }
  },

  async getPermissionState(): Promise<HealthPermissionState> {
    const hc = getHealthConnect();
    if (!hc) return 'unavailable';

    try {
      const status = await hc.getSdkStatus();
      if (status === hc.SdkAvailabilityStatus.SDK_UNAVAILABLE_PROVIDER_UPDATE_REQUIRED) {
        return 'install_required';
      }
      if (status !== hc.SdkAvailabilityStatus.SDK_AVAILABLE) {
        return 'unavailable';
      }

      const initialized = await hc.initialize();
      if (!initialized) return 'unavailable';

      const granted = await hc.getGrantedPermissions();
      const hasSteps = granted.some(
        (p) =>
          'recordType' in p &&
          p.recordType === 'Steps' &&
          p.accessType === 'read'
      );

      return hasSteps ? 'connected' : 'not_connected';
    } catch {
      return 'unavailable';
    }
  },

  async requestPermissions(): Promise<HealthPermissionState> {
    const hc = getHealthConnect();
    if (!hc) return 'unavailable';

    try {
      const status = await hc.getSdkStatus();
      if (status === hc.SdkAvailabilityStatus.SDK_UNAVAILABLE_PROVIDER_UPDATE_REQUIRED) {
        return 'install_required';
      }
      if (status !== hc.SdkAvailabilityStatus.SDK_AVAILABLE) {
        return 'unavailable';
      }

      await hc.initialize();
      const granted = await hc.requestPermission([...REQUIRED_PERMISSIONS]);
      const hasSteps = granted.some(
        (p) =>
          'recordType' in p &&
          p.recordType === 'Steps' &&
          p.accessType === 'read'
      );

      return hasSteps ? 'connected' : 'denied';
    } catch (err) {
      logger.warn('Health Connect requestPermission failed', { error: String(err) });
      return 'denied';
    }
  },

  async getSteps(start: Date, end: Date): Promise<number | null> {
    const hc = getHealthConnect();
    if (!hc) return null;

    try {
      await hc.initialize();
      const result = await hc.aggregateRecord({
        recordType: 'Steps',
        timeRangeFilter: {
          operator: 'between',
          startTime: start.toISOString(),
          endTime: end.toISOString(),
        },
      });
      const count = result?.COUNT_TOTAL;
      return typeof count === 'number' && Number.isFinite(count) ? Math.round(count) : 0;
    } catch (err) {
      logger.warn('Health Connect getSteps failed', { error: String(err) });
      return null;
    }
  },

  async getActiveCalories(start: Date, end: Date): Promise<number | null> {
    const hc = getHealthConnect();
    if (!hc) return null;

    try {
      await hc.initialize();
      const result = await hc.aggregateRecord({
        recordType: 'ActiveCaloriesBurned',
        timeRangeFilter: {
          operator: 'between',
          startTime: start.toISOString(),
          endTime: end.toISOString(),
        },
      });
      const kcal = result?.ACTIVE_CALORIES_TOTAL?.inKilocalories;
      return typeof kcal === 'number' && Number.isFinite(kcal) && kcal > 0
        ? Math.round(kcal)
        : null;
    } catch (err) {
      logger.warn('Health Connect getActiveCalories failed', { error: String(err) });
      return null;
    }
  },

  openSettings(): void {
    const hc = getHealthConnect();
    if (hc) {
      try {
        hc.openHealthConnectSettings();
        return;
      } catch {
        // Fallback to Play Store / system settings
      }
    }
    Linking.openURL(HEALTH_CONNECT_PLAY_STORE_URL).catch(() => {
      Linking.openSettings().catch(() => {});
    });
  },
};
