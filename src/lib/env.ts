import { z } from 'zod';

/**
 * Validated runtime environment variables.
 * Uses safe fallback URLs in test/unconfigured local dev while exposing `isSupabaseConfigured`
 * so the UI can clearly alert the developer if `.env.local` has not been created yet.
 */
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  EXPO_PUBLIC_SUPABASE_URL: z.string().url().default('https://placeholder.supabase.co'),
  EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1).default('placeholder-anon-key'),
});

export type Env = z.infer<typeof envSchema>;

const rawUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const rawKey =
  process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(
  rawUrl && rawKey && !rawUrl.includes('placeholder.supabase.co')
);

export const env: Env = envSchema.parse({
  NODE_ENV: process.env.NODE_ENV ?? 'development',
  EXPO_PUBLIC_SUPABASE_URL: rawUrl || 'https://placeholder.supabase.co',
  EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: rawKey || 'placeholder-anon-key',
});
