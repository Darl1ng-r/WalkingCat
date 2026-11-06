# Build Progress

> Update this file at the end of every phase. The AI reads it at the start of each session to know where we are.

## Status

| Phase | Status | Date | Notes |
|---|---|---|---|
| Setup — Expo SDK 58 + Router + NativeWind + eas.json | ✅ Done | 2026-11-06 | tsc + lint passing |
| 1 Foundation | ✅ Done | 2026-11-06 | Design system, 5-tab NativeTabs shell, QueryClient, Jest tests (11/11 passing) |
| 2 Auth & profile | ✅ Done | 2026-11-06 | Supabase client (`expo-sqlite` session storage), SQL migration (`profiles`, `privacy_settings`, RLS), auth screens, 3-step onboarding, profile & edit profile, 19/19 tests passing |
| 3 Walk tracking | ✅ Done | 2026-11-06 | Local SQLite point buffer + offline upload queue, Haversine/jitter/Douglas-Peucker/Polyline in `geo.ts`, background `TaskManager` + foreground watcher, `RouteMap` (`expo-maps`), crash recovery, 26/26 tests passing |
| 4 Health (steps & calories) | ✅ Done | 2026-11-06 | HealthKit (`queryStatisticsForQuantity` cumulativeSum) & Health Connect (`aggregateRecord`) providers, MET calorie estimator (`calories.ts`), walk health enrichment + 2h delayed wearable re-sync, 15m throttled daily sync, Home Today card & Permissions screen, 30/30 tests passing |
| 5 History & dashboard | ✅ Done | 2026-11-06 | `get_activity_summary` RPC migration, paginated `listWalks`/`getWalk`/`deleteWalk`, `@shopify/flash-list` History screen with pending upload badge, Walk Detail screen with `trimRouteEnds(150m)` privacy toggle & route bounds fitting, Home "This Week" card + Progress screen (`ActivityBarChart`), 40/40 tests passing |
| 6 Cat camera & sightings | ✅ Done | 2026-11-06 | `sightings` table + private `sighting-photos` bucket migration, `WelfareSheet`, no-flash `CameraView` with zoom presets, EXIF-stripping `processCapturedPhoto` + `expo-crypto` SHA-256, `toGeohash` (≤5 chars), offline `pending_sighting_uploads` queue, 1h signed URL cache, 48/48 tests passing |
| 7 Sighting validation | ✅ Done | 2026-11-06 | `20261106000006_validation.sql` (`app_config`, `hamming_distance`, `sighting_reviews` view, `review_sighting` RPC), `validate-sighting` Edge Function (64-bit dHash, near-duplicate & rate-limit checks, Gemini 2.5 Flash vision with 10s timeout + 1 retry), Realtime + 5s poll status updates, 57/57 tests passing |
| 8 Cat collection | ✅ Done | 2026-11-06 | `20261106000007_cats.sql` (`cats` table, idempotent triggers, `link_sighting_to_cat` & `unlink_sighting` RPCs), `CatCard` with Reanimated reveal, 2-col `FlashList` Collection screen + Recent Submissions, `/cat/[id]` detail & timeline, `NewCatAcceptedSheet`, Walk Detail sightings section, 63/63 tests passing |
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
| 2026-11-06 | Vision provider = Gemini API (`gemini-2.5-flash`) in `validate-sighting` Edge Function | Single structured JSON call checks `contains_cat`, `confidence`, `is_real_photo` (screen/print detection), and `is_safe` without exposing API keys in the app |

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
