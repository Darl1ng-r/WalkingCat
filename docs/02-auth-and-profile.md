# Phase 2 — Backend, Authentication & Profile

## Goal
Connect Supabase, let users create an account, sign in/out, stay signed in, complete a short onboarding, and have a basic profile. Establish the migration workflow used by every later phase.

## Prerequisites
- Phase 1 complete (tabs, UI primitives, providers).

## Out of scope
- Social login (Apple/Google) — optional later; email first. (Note: if Google login is added later, Apple requires Sign in with Apple too.)
- Friends, avatars upload beyond a simple picker (avatar upload optional).
- Location / health permissions (requested later, *when needed*).

## Packages
```bash
npx eas-cli@latest integrations:supabase:connect   # creates/links project, installs @supabase/supabase-js + expo-sqlite, writes .env.local
npx expo install expo-secure-store                  # only if needed for non-session secrets
```
Install the Supabase CLI for migrations (dev tool, not an app dependency): `npx supabase init` → creates `supabase/`.

## Data / schema
Migration `supabase/migrations/<ts>_profiles.sql`:
- `profiles` (`id uuid pk references auth.users on delete cascade`, `username citext unique not null` (3–20 chars, `[a-z0-9_]`), `display_name text`, `avatar_url text`, `weight_kg numeric null` (optional, for calorie estimates), `onboarded_at timestamptz null`, `created_at`, `updated_at`).
- Trigger: on `auth.users` insert → create a `profiles` row with a generated temporary username.
- RLS: user can `select`/`update` own row. (Friends visibility added in Phase 10.)
- `privacy_settings` row created alongside profile with **all sharing off** (table defined now, used later).

## Tasks

### 2.1 Supabase client
- [ ] `src/lib/supabase.ts` exactly as the Expo Supabase guide (uses `expo-sqlite/localStorage/install`, `detectSessionInUrl: false`).
- [ ] Add env vars to `src/lib/env.ts` Zod schema.
- [ ] Generate types: `npx supabase gen types typescript --project-id <ref> > src/lib/database.types.ts`; pass generic to `createClient<Database>`.
- [ ] Add `npm run db:types` script.

### 2.2 Auth feature — `src/features/auth/`
- [ ] `useSession()` hook: subscribes to `onAuthStateChange`, exposes `session`, `user`, `isLoading`.
- [ ] Refresh handling: start/stop auto refresh on `AppState` change (per Supabase RN guidance).
- [ ] API: `signUp(email, password)`, `signIn`, `signOut`, `resetPassword`.
- [ ] Zod schemas for forms; friendly error mapping (wrong password, email taken, weak password, network).

### 2.3 Routing & auth gate
- [ ] `(auth)` group: `sign-in.tsx`, `sign-up.tsx`, `forgot-password.tsx`.
- [ ] Root layout protects `(tabs)` using Expo Router's protected routes / redirect pattern (check SDK 58 router docs: "Authentication in Expo Router").
- [ ] Splash stays visible until session is resolved (no flicker).

### 2.4 Onboarding (`(auth)/onboarding/`)
3 short screens, shown once (until `onboarded_at` set):
- [ ] **Welcome:** core promise — *Walk a little farther. Discover a little more.*
- [ ] **Respect the cats:** welfare rules (distance, no flash, no touching/chasing/feeding). User taps "I understand".
- [ ] **Your profile:** choose unique username (live availability check, debounced), display name, optional weight (explain: only used for calorie *estimates*, can skip).
- [ ] Do **not** request any permissions during onboarding.

### 2.5 Profile tab
- [ ] Shows avatar (initials fallback), display name, @username, member since.
- [ ] Edit profile screen (display name, username, weight).
- [ ] Sign out button.
- [ ] Placeholder rows for: Privacy, Permissions, Account (filled in Phase 11).

## Acceptance criteria
- [ ] New user can sign up → onboarding → lands on Home.
- [ ] Killing and reopening the app keeps the user signed in.
- [ ] Sign out returns to sign-in; protected screens unreachable when signed out.
- [ ] RLS verified: a second test user cannot read/update the first user's profile (test via SQL or a script).
- [ ] Migration files committed; types regenerated; tsc/lint/tests pass.

## Manual test script
1. Sign up with a new email → onboarding → pick a taken username (shows error) → pick a free one.
2. Force-quit, reopen → still signed in, onboarding not shown again.
3. Sign out → sign in with wrong password → friendly error → correct password works.
4. Airplane mode → sign-in shows a network error, not a crash.

## Pitfalls
- Never ship the service-role key in the app.
- Supabase email confirmation: decide (enable for production; can be disabled in dev). Document the choice in `PROGRESS.md`.
- Usernames: enforce uniqueness in DB (`citext unique`), not only in UI.
