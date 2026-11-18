import { z } from 'zod';

/**
 * Validated runtime environment variables.
 * Uses safe fallback URLs in test/unconfigured local dev while exposing
 * `isSupabaseConfigured` and `isGoogleMapsConfigured`.
 */
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  EXPO_PUBLIC_SUPABASE_URL: z.string().url().default('https://placeholder.supabase.co'),
  EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1).default('placeholder-anon-key'),
  EXPO_PUBLIC_GOOGLE_MAPS_API_KEY: z.string().optional().default(''),
});

export type Env = z.infer<typeof envSchema>;

const rawUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const rawKey =
  process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const rawGoogleMapsKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY?.trim() ?? '';

export const isSupabaseConfigured = Boolean(
  rawUrl && rawKey && !rawUrl.includes('placeholder.supabase.co')
);

export const isGoogleMapsConfigured = Boolean(
  rawGoogleMapsKey &&
    !rawGoogleMapsKey.includes('placeholder') &&
    !rawGoogleMapsKey.includes('YOUR_')
);

export const env: Env = envSchema.parse({
  NODE_ENV: process.env.NODE_ENV ?? 'development',
  EXPO_PUBLIC_SUPABASE_URL: rawUrl || 'https://placeholder.supabase.co',
  EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: rawKey || 'placeholder-anon-key',
  EXPO_PUBLIC_GOOGLE_MAPS_API_KEY: rawGoogleMapsKey,
});
