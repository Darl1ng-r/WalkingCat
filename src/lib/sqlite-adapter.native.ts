import type { SQLiteSyncDb } from './sqlite-adapter';

export type { SQLiteSyncDb } from './sqlite-adapter';

export function openSyncDatabase(name: string): SQLiteSyncDb | null {
  if (process.env.NODE_ENV === 'test') {
    return null;
  }
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const SQLite = require('expo-sqlite') as {
    openDatabaseSync: (dbName: string) => SQLiteSyncDb;
  };
  return SQLite.openDatabaseSync(name);
}

export function installNativeLocalStoragePolyfill(): void {
  if (process.env.NODE_ENV === 'test') {
    return;
  }
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('expo-sqlite/localStorage/install');
}
