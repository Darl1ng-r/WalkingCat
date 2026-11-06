# Build Progress

> Update this file at the end of every phase. The AI reads it at the start of each session to know where we are.

## Status

| Phase | Status | Date | Notes |
|---|---|---|---|
| Setup — Expo SDK 58 + Router + NativeWind + eas.json | ✅ Done | 2026-11-06 | tsc + lint passing |
| 1 Foundation | ✅ Done | 2026-11-06 | Design system, 5-tab NativeTabs shell, QueryClient, Jest tests (11/11 passing) |
| 2 Auth & profile | ✅ Done | 2026-11-06 | Supabase client (`expo-sqlite` session storage), SQL migration (`profiles`, `privacy_settings`, RLS), auth screens, 3-step onboarding, profile & edit profile, 19/19 tests passing |
| 3 Walk tracking | ✅ Done | 2026-11-06 | Local SQLite point buffer + offline upload queue, Haversine/jitter/Douglas-Peucker/Polyline in `geo.ts`, background `TaskManager` + foreground watcher, `RouteMap` (`expo-maps`), crash recovery, 26/26 tests passing |
| 4 Health (steps & calories) | ⬜ Not started | | |
| 5 History & dashboard | ⬜ Not started | | |
| 6 Cat camera & sightings | ⬜ Not started | | |
| 7 Sighting validation | ⬜ Not started | | |
| 8 Cat collection | ⬜ Not started | | |
| 9 Points, achievements, challenges | ⬜ Not started | | |
| 10 Friends & leaderboards | ⬜ Not started | | |
| 11 Privacy, safety, moderation | ⬜ Not started | | |
| 12 Polish, analytics, beta | ⬜ Not started | | |

Legend: ⬜ Not started · 🟨 In progress · ✅ Done · ⛔ Blocked

## Decisions log
Record any decision that later phases must respect.

| Date | Decision | Reason |
|---|---|---|
| 2026-11-06 | Backend = Supabase (Auth, Postgres+RLS, Storage, Edge Functions) | First-class Expo integration, RLS for privacy |
| 2026-11-06 | Each accepted sighting = new cat card; user may manually link to an existing cat | Avoid unreliable automatic cat identification in MVP |
| 2026-11-06 | Points/achievements/validation computed server-side only | Anti-cheat, single source of truth |
| 2026-11-06 | Leaderboards friends-only, weekly, separate metrics, no calories | Product principles |
| 2026-11-06 | Use `expo-router/native-tabs` (`NativeTabs`) for `(tabs)` | Official SDK 58 native tab bar with SF Symbols (`sf`) & Material (`md`) icons |
| 2026-11-06 | Support both email confirmation ON and OFF in sign-up flow | `signUp` checks `requiresEmailConfirmation` (`user && !session`) so dev (confirm off) and prod (confirm on) both work seamlessly |

## Open questions
- Vision provider for cat detection (Google Cloud Vision vs Gemini) — decide in Phase 7.
- Final app name & branding — needed by Phase 12.
- Supabase region (data residency) — decide in Phase 2.
- Apple Developer account availability for iOS dev builds.

## Useful commands
```bash
npx expo start --dev-client
npx eas-cli@latest build --profile development --platform android
npx tsc --noEmit && npx expo lint && npx jest
npm run db:types        # after Phase 2
```
