# Phase 12 — Polish, Analytics & Beta Release

## Goal
Make the MVP feel finished and measurable, then ship it to 30–50 testers on iOS (TestFlight) and Android (Play internal testing) to answer the core question: **does this make people walk again?**

## Prerequisites
- Phases 1–11 complete and audited.

## Out of scope
- Anything in [`99-later-phases.md`](./99-later-phases.md).

## Tasks

### 12.1 Analytics (privacy-respecting)
- [x] Choose a provider (e.g. PostHog — EU hosting option, or Supabase table `analytics_events` for a fully in-house approach). No location, no photos, no health values beyond coarse buckets.
- [x] `src/lib/analytics.ts` wrapper: `track(event, props)`; opt-out toggle in privacy settings.
- [x] Events mapped to success metrics:

| Event | Metric |
|---|---|
| `onboarding_completed` | funnel |
| `walk_started`, `walk_completed`, `walk_discarded`, `walk_gps_failed` | first-walk rate, repeat walks, GPS failure rate |
| `health_connected` | health adoption |
| `sighting_submitted`, `sighting_result {status}` | submission & acceptance rate |
| `collection_viewed`, `cat_renamed`, `cat_linked` | collection engagement |
| `challenge_completed {period}` | challenge participation |
| `friend_invite_sent`, `friend_added`, `leaderboard_viewed` | social value |

- [x] SQL views / dashboard for: walks per active user per week, second walk within 7 days, W1/W4 retention.

### 12.2 Error & crash reporting
- [x] Add crash reporting (e.g. Sentry via its Expo config plugin, or EAS Observe) with source maps uploaded on build. Scrub PII and coordinates.

### 12.3 Polish
- [x] Final app name, icon, splash, adaptive icon (replace placeholders).
- [x] Loading skeletons for lists; consistent empty/error states.
- [x] Haptics on key moments (start/finish walk, new cat, achievement).
- [x] Reduce-motion support; VoiceOver/TalkBack pass on main flows.
- [x] Performance: startup < 2 s on mid-range Android; active walk screen smooth; check memory during a 60-min walk.
- [x] Battery test: 60-min walk drains a reasonable amount (< ~10–12%).
- [x] Localization readiness: strings extracted (`expo-localization` + i18n lib); RTL check if Arabic is planned.
- [x] Optional: gentle local notifications (`expo-notifications`) — e.g. "Your weekly challenge ends tomorrow". Off by default or easy opt-out; never guilt-tripping.

### 12.4 OTA updates
- [x] `npx eas-cli@latest update:configure`; channels `preview` and `production`; `runtimeVersion` policy `fingerprint`.

### 12.5 Release builds (no Mac needed)
- [x] Apple Developer Program + Google Play Console accounts.
- [x] Fill `eas.json` submit profiles (ASC app ID, Play service account JSON stored as EAS secret file).
- [x] `npx eas-cli@latest build --profile production --platform all`
- [x] `npx eas-cli@latest submit --platform ios` → TestFlight; `--platform android` → internal testing track.
- [x] Store listing drafts, screenshots (from EAS Simulator / devices), privacy labels from `docs/store-privacy.md`, HealthKit & Health Connect declarations.
- [x] Optional: EAS Workflow (`.eas/workflows/`) to build on push to `main`.

### 12.6 Beta program (2 weeks, 30–50 users)
- [x] In-app "Send feedback" (mailto or simple form table).
- [x] Tester guide: what to try, how to report bugs.
- [x] Week-1 and week-2 check of metrics; collect qualitative feedback on the open questions in the product overview §11.
- [x] Write `docs/beta-results.md`: findings + recommended next phase.

## Acceptance criteria
- [x] Production builds installed from TestFlight and Play internal testing on real devices.
- [x] Analytics events arrive and dashboards show the primary metric.
- [x] Crash reporting receives a test crash with readable stack trace.
- [x] OTA update delivered to a preview build.
- [x] All quality gates pass; no P0/P1 bugs open.

## Pitfalls
- HealthKit apps get extra App Review scrutiny — make sure the health usage is clearly visible and explained in-app.
- Google Play requires a background-location declaration + video for background location; explain it's only during an active, user-started walk.
- Bump `version` per store release; build numbers auto-increment remotely (`appVersionSource: remote`).
