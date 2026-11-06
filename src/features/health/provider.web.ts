import type { HealthPermissionState, HealthProvider } from './types';

export const healthProvider: HealthProvider = {
  sourceName: 'none',
  displayName: 'Health App',
  async isAvailable(): Promise<boolean> {
    return false;
  },
  async getPermissionState(): Promise<HealthPermissionState> {
    return 'unavailable';
  },
  async requestPermissions(): Promise<HealthPermissionState> {
    return 'unavailable';
  },
  async getSteps(): Promise<number | null> {
    return null;
  },
  async getActiveCalories(): Promise<number | null> {
    return null;
  },
  openSettings(): void {},
};
