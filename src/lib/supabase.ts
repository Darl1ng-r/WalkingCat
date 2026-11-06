import { createClient, type SupportedStorage } from '@supabase/supabase-js';
import { Platform } from 'react-native';

import type { Database } from './database.types';
import { env } from './env';

function getAuthStorage(): SupportedStorage | undefined {
  if (Platform.OS === 'web' || process.env.NODE_ENV === 'test') {
    if (typeof globalThis.localStorage !== 'undefined') {
      return globalThis.localStorage;
    }
    const memoryStore = new Map<string, string>();
    return {
      getItem: (key: string) => memoryStore.get(key) ?? null,
      setItem: (key: string, value: string) => {
        memoryStore.set(key, value);
      },
      removeItem: (key: string) => {
        memoryStore.delete(key);
      },
    };
  }

  // Install expo-sqlite's localStorage polyfill on native (iOS & Android)
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('expo-sqlite/localStorage/install');
  return globalThis.localStorage;
}

export const supabase = createClient<Database>(
  env.EXPO_PUBLIC_SUPABASE_URL,
  env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  {
    auth: {
      storage: getAuthStorage(),
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  }
);
