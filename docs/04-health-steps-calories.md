# Phase 4 — Steps & Calories (HealthKit / Health Connect)

## Goal
Read steps (and active calories when available) from Apple Health (iOS) and Health Connect (Android) with user permission. Show daily steps and per-walk steps/calories. When no health source is available, show a clearly labelled **estimate** for calories and explain why steps are missing.

## Prerequisites
- Phase 3 complete (walks with start/end timestamps).
- Development build (health libraries are native).

## Out of scope
- Writing data to health platforms.
- Heart rate, workouts, sleep, or any other health type.
- Dashboard charts (Phase 5).

## Packages (verify SDK 58 compatibility first)
- iOS: `@kingstinct/react-native-healthkit` (has an Expo config plugin) — or the best maintained alternative at implementation time.
- Android: `react-native-health-connect` + `expo-health-connect` config plugin (or equivalent).
- `expo-build-properties` if a minimum Android SDK / iOS target bump is required.

`app.json`:
- iOS: HealthKit entitlement, `NSHealthShareUsageDescription` ("…to show your steps and an estimate of calories burned during walks. We never write to Health."). Do **not** add `NSHealthUpdateUsageDescription` unless writing.
- Android: Health Connect read permissions for `Steps` and `ActiveCaloriesBurned` only; the required permissions-rationale activity/intent (privacy policy screen).
- **Rebuild dev client.**

## Data / schema
Migration `<ts>_health.sql`:
- `walks` add: `steps int null`, `active_kcal numeric null`, `kcal_source text check in ('health','estimate') null`.
- `daily_activity`: `user_id`, `date date`, `steps int`, `active_kcal numeric null`, `source text` (`healthkit`/`health_connect`/`none`), `updated_at`, **unique(user_id, date)**. Upsert only. Owner-only RLS (friends read added in Phase 10 for leaderboard aggregates).

## Architecture
`src/features/health/`
- `provider.ts` — a single interface hiding platform differences:
  ```ts
  interface HealthProvider {
    isAvailable(): Promise<boolean>;
    requestPermissions(): Promise<HealthPermissionState>;
    getPermissionState(): Promise<HealthPermissionState>;
    getSteps(start: Date, end: Date): Promise<number | null>;
    getActiveCalories(start: Date, end: Date): Promise<number | null>;
  }
  ```
- `provider.ios.ts`, `provider.android.ts`, `provider.web.ts` (returns unavailable) — platform file extensions.
- `calories.ts` — pure estimate: `kcal ≈ MET × weight_kg × hours`, MET by speed (e.g. 2.8 slow < 4 km/h, 3.5 moderate, 4.3 brisk > 5.5 km/h). If no weight, use a neutral default **and** say so. **Unit tested.** Document the formula in-app ("How is this estimated?").
- `useTodaySteps()`, `useWalkHealthData(walk)` hooks (TanStack Query).

### Avoiding double counting
- Use the platform's **aggregated statistics query** (HealthKit `HKStatisticsQuery` cumulative sum; Health Connect `aggregate`) — both deduplicate phone + wearable sources. Never sum raw samples yourself.

## Tasks
- [x] 4.1 Install libs + config plugins; rebuild dev client.
- [x] 4.2 Implement `HealthProvider` for iOS and Android + web stub.
- [x] 4.3 Permission UX: "Connect Health" card on Home (not during onboarding). Explain what is read and why. States: not connected / connected / denied / unavailable (e.g. Health Connect app not installed → link to install on Android).
- [x] 4.4 On walk finish: query steps + active kcal for `[started_at, ended_at]`; if kcal unavailable → compute estimate; store with `kcal_source`.
- [x] 4.5 Show steps + kcal on the walk summary with a small "estimate" / "from Apple Health" / "from Health Connect" label.
- [x] 4.6 Daily sync: on app foreground (throttled to once per 15 min) upsert today's and yesterday's `daily_activity`.
- [x] 4.7 Home tab: "Today" card with steps (or "Connect Health to see steps"), walks today, distance today.
- [x] 4.8 Settings → Permissions: show health status + "Manage in Health / Health Connect".

## Acceptance criteria
- [x] With permission: today's steps match the Health/Health Connect app (±1%).
- [x] Walk steps are attached after finishing a walk.
- [x] Without permission or on unsupported devices: app works fully; calories show "Estimate" label; steps show a friendly explanation.
- [x] No calorie figure anywhere is shown without a source label.
- [x] Phone + watch wearers don't get doubled steps.

## Manual test script
1. Fresh install → no health prompt until tapping "Connect Health".
2. Deny → app still works; card shows how to enable.
3. Grant → Home shows steps matching the health app.
4. Walk 5 min → summary shows steps and kcal with source label.
5. Android without Health Connect installed → install prompt.

## Pitfalls
- iOS never tells you if *read* permission was denied (returns empty data) — treat 0/empty as "maybe not permitted" and show a soft hint.
- Health data timestamps can arrive late (wearable sync) — re-query walk steps once on next app open if the walk ended < 2 h ago.
- Calories are **never** used for points or leaderboards.
