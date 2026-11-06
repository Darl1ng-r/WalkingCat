import { Linking } from 'react-native';

import { logger } from '@/lib/logger';
import type { HealthPermissionState, HealthProvider } from './types';

const READ_TYPES = [
  'HKQuantityTypeIdentifierStepCount',
  'HKQuantityTypeIdentifierActiveEnergyBurned',
] as const;

type HealthKitModule = typeof import('@kingstinct/react-native-healthkit');

function getHealthKit(): HealthKitModule | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('@kingstinct/react-native-healthkit') as HealthKitModule;
  } catch (err) {
    logger.info('HealthKit native module unavailable in this runtime', {
      error: String(err),
    });
    return null;
  }
}

export const healthProvider: HealthProvider = {
  sourceName: 'healthkit',
  displayName: 'Apple Health',

  async isAvailable(): Promise<boolean> {
    const hk = getHealthKit();
    if (!hk) return false;
    try {
      return await hk.isHealthDataAvailableAsync();
    } catch {
      return false;
    }
  },

  async getPermissionState(): Promise<HealthPermissionState> {
    const hk = getHealthKit();
    if (!hk) return 'unavailable';

    try {
      const available = await hk.isHealthDataAvailableAsync();
      if (!available) return 'unavailable';

      const status = await hk.getRequestStatusForAuthorization({
        toRead: READ_TYPES,
      });

      // AuthorizationRequestStatus.unnecessary === 2 means the user has already responded to the sheet
      if (status === 2) {
        return 'connected';
      }
      return 'not_connected';
    } catch {
      return 'unavailable';
    }
  },

  async requestPermissions(): Promise<HealthPermissionState> {
    const hk = getHealthKit();
    if (!hk) return 'unavailable';

    try {
      const available = await hk.isHealthDataAvailableAsync();
      if (!available) return 'unavailable';

      const ok = await hk.requestAuthorization({
        toRead: READ_TYPES,
      });
      return ok ? 'connected' : 'denied';
    } catch (err) {
      logger.warn('HealthKit requestAuthorization failed', { error: String(err) });
      return 'unavailable';
    }
  },

  async getSteps(start: Date, end: Date): Promise<number | null> {
    const hk = getHealthKit();
    if (!hk) return null;

    try {
      const stats = await hk.queryStatisticsForQuantity(
        'HKQuantityTypeIdentifierStepCount',
        ['cumulativeSum'],
        {
          filter: {
            date: {
              startDate: start,
              endDate: end,
            },
          },
          unit: 'count',
        }
      );

      const qty = stats?.sumQuantity?.quantity;
      return typeof qty === 'number' && Number.isFinite(qty) ? Math.round(qty) : 0;
    } catch (err) {
      logger.warn('HealthKit getSteps failed', { error: String(err) });
      return null;
    }
  },

  async getActiveCalories(start: Date, end: Date): Promise<number | null> {
    const hk = getHealthKit();
    if (!hk) return null;

    try {
      const stats = await hk.queryStatisticsForQuantity(
        'HKQuantityTypeIdentifierActiveEnergyBurned',
        ['cumulativeSum'],
        {
          filter: {
            date: {
              startDate: start,
              endDate: end,
            },
          },
          unit: 'kcal',
        }
      );

      const qty = stats?.sumQuantity?.quantity;
      return typeof qty === 'number' && Number.isFinite(qty) && qty > 0
        ? Math.round(qty)
        : null;
    } catch (err) {
      logger.warn('HealthKit getActiveCalories failed', { error: String(err) });
      return null;
    }
  },

  openSettings(): void {
    Linking.openURL('x-apple-health://').catch(() => {
      Linking.openSettings().catch(() => {});
    });
  },
};
