export type HealthPermissionState =
  | 'not_connected'
  | 'connected'
  | 'denied'
  | 'unavailable'
  | 'install_required';

export type HealthSourceName = 'healthkit' | 'health_connect' | 'none';

export interface HealthProvider {
  readonly sourceName: HealthSourceName;
  readonly displayName: string;
  isAvailable(): Promise<boolean>;
  getPermissionState(): Promise<HealthPermissionState>;
  requestPermissions(): Promise<HealthPermissionState>;
  getSteps(start: Date, end: Date): Promise<number | null>;
  getActiveCalories(start: Date, end: Date): Promise<number | null>;
  openSettings(): void;
}
