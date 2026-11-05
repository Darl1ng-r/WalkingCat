# Phase 5 — Walk History & Activity Dashboard

## Goal
Users can browse their past walks, open any walk to see its route and stats, delete walks, and view simple daily / weekly / monthly activity summaries — framed as personal progress, not pressure.

## Prerequisites
- Phase 3 (walks saved) and Phase 4 (steps/kcal fields, `daily_activity`).

## Out of scope
- Cat sightings on walk detail (add the section in Phase 8 once sightings exist — leave a slot).
- Points / achievements display (Phase 9).
- Friends comparisons (Phase 10).

## Packages
- A lightweight chart solution. Prefer something already compatible with Reanimated 4 / New Architecture (e.g. `victory-native` with Skia, or simple custom bars built with `View`s). **Simple custom bars are acceptable and preferred for MVP** — avoid heavy deps.
- `@shopify/flash-list` (via `npx expo install`) for the history list.

## Data / schema
Migration `<ts>_activity_views.sql`:
- SQL function `get_activity_summary(p_from date, p_to date)` → per-day rows: `date, walks_count, distance_m, moving_time_s, steps` (joins `walks` + `daily_activity`, `security invoker`, scoped to `auth.uid()`).
- Index: `walks (user_id, started_at desc)`.

## Tasks
- [ ] 5.1 `src/features/walk/api.ts`: `listWalks({ cursor })` (paginated, newest first), `getWalk(id)`, `deleteWalk(id)`.
- [ ] 5.2 **History screen** (`src/app/history/index.tsx`, reachable from Home and Profile): FlashList of walk rows — date, duration, distance, steps (if any), mini static route thumbnail (optional; a small non-interactive map or just an icon in MVP). Infinite scroll, pull-to-refresh, empty state ("Your walks will appear here").
- [ ] 5.3 Include not-yet-synced local walks at the top with a "Waiting to upload" badge.
- [ ] 5.4 **Walk detail** (`src/app/walk/[id].tsx`): map with decoded polyline fitted to bounds, stats grid (distance, duration, moving time, avg pace, steps, kcal + source label), date/time, "Delete walk" (confirm). Placeholder section "Cats spotted on this walk" (hidden until Phase 8).
- [ ] 5.5 **Privacy trim (display):** on the detail map, optionally hide the first/last 150 m of the route (setting default **on**, stored locally for now; moves to privacy settings in Phase 11). Pure function `trimRouteEnds(points, meters)` with tests.
- [ ] 5.6 **Dashboard** on Home: "This week" card — walks, distance, steps, active days (e.g. "4 of 7 days"); bar chart of last 7 days (distance or steps toggle). Link to a **Progress screen** with week / month tabs.
- [ ] 5.7 Encouraging, non-judgmental copy: celebrate what was done ("You walked on 3 days this week 🎉"), never "You missed…".
- [ ] 5.8 Week starts on the user's locale first day; all dates displayed in local time.

## Acceptance criteria
- [ ] History shows all walks (synced + pending), paginates smoothly with 200+ walks.
- [ ] Walk detail map matches the recorded route; ends trimmed when setting is on.
- [ ] Deleting a walk removes it from server, list, and summaries.
- [ ] Dashboard numbers equal the sum of the underlying walks (spot-check).
- [ ] No negative/shaming language anywhere.

## Manual test script
1. Record 3 short walks → all appear in history, newest first.
2. Open one → route + stats; delete → gone from list and weekly totals.
3. Offline walk shows "Waiting to upload".
4. Change device timezone → dates still sensible.

## Pitfalls
- Day bucketing: compute "day" in the **user's local timezone**, not UTC (pass tz offset or compute client-side).
- Don't fetch full polylines for the list — select only the columns needed.
