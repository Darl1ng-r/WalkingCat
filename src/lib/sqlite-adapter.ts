export interface SQLiteSyncDb {
  execSync(source: string): void;
  runSync(source: string, ...params: (string | number | null)[]): unknown;
  getFirstSync<T>(source: string, ...params: (string | number | null)[]): T | null;
  getAllSync<T>(source: string, ...params: (string | number | null)[]): T[];
}

export function openSyncDatabase(_name: string): SQLiteSyncDb | null {
  return null;
}

export function installNativeLocalStoragePolyfill(): void {
  // No-op on web (globalThis.localStorage is natively available in browsers)
}
