# Phase 11 — Privacy, Safety & Moderation

## Goal
Complete the trust layer required before any real users: privacy settings screen, data export & deletion (walks, sightings, photos, full account), content reporting & moderation workflow, permission management, and animal-welfare guidance — plus a privacy/security audit of everything built so far.

> Many privacy defaults were built into earlier phases. This phase **centralizes, completes, and audits** them. App stores require in-app account deletion.

## Prerequisites
- Phases 1–10 complete.

## Out of scope
- Community map, welfare partner integrations (post-MVP).
- Automated ML moderation beyond Phase 7 safe-search.

## Data / schema
Migration `<ts>_privacy_moderation.sql`:
- `privacy_settings` finalize: `share_milestones_with_friends`, `show_on_friends_leaderboard`, `share_cat_cards`, `discoverable_by_username`, `save_sighting_area` (default **false**), `hide_route_ends` (default **true**, distance `hide_route_ends_m` default 150).
- `reports`: `id`, `reporter_id`, `target_type` (`sighting`,`cat_card`,`profile`,`activity_event`), `target_id`, `reason` (`animal_harm`,`inappropriate`,`personal_info`,`spam`,`other`), `details text`, `status` (`open`,`actioned`,`dismissed`), `created_at`. Reporter can insert/read own; moderators via service role.
- Auto-hide: content with ≥ 3 open reports hidden from friends pending review.
- Edge Function `delete-account`: deletes storage objects, all user rows (cascade), then `auth.admin.deleteUser`. Requires recent re-auth.
- Edge Function `export-data`: JSON of profile, walks (with routes), sightings metadata, cats, points; photos as signed URLs; emailed or downloaded.

## Tasks

### 11.1 Privacy settings screen (`settings/privacy`)
- [x] Toggles for all `privacy_settings` with plain-language explanations (use `@expo/ui` switches/sections).
- [x] "Hide start and end of routes" + distance picker (100 / 150 / 300 m).
- [x] Make Phase 5 route trimming read from this setting (server-backed).

### 11.2 Permissions screen (`settings/permissions`)
- [x] Status of Location, Camera, Health (+ Notifications if added) with why-we-need-it text and "Open Settings" buttons.

### 11.3 Data controls (`settings/account`)
- [x] Delete individual walks / sightings (already exists — verify).
- [x] "Delete all my walks", "Delete all my photos & sightings" (confirm, irreversible warning).
- [x] **Delete account** (type-to-confirm + re-auth) → `delete-account` function → sign out.
- [x] **Export my data**.

### 11.4 Reporting
- [x] Report action (⋯ menu) on shared cat cards, friend activity events, friend profiles.
- [x] Report sheet: reason + optional details; confirmation "Thanks — we'll review this".
- [x] Moderation runbook `supabase/MODERATION.md`: how to review reports & flagged sightings, actions (hide, delete, warn, ban), response target (e.g. 48 h).

### 11.5 Animal-welfare guidance
- [x] "Respectful Cat Spotting" screen (from Profile and from the camera screen): distance, zoom, no flash, no touching/chasing/feeding, private property, what to do if a cat seems hurt (contact local animal-welfare organization — **no promises of assistance**).
- [x] Audit every challenge/achievement text: none reward approaching or specific places/times.

### 11.6 Legal & store requirements
- [x] Privacy Policy & Terms (hosted page; link in settings and sign-up). Must cover: location, health data (never sold, never used for ads), photos, third-party vision processing, retention, deletion.
- [x] Health data disclosure text for App Store (HealthKit) and Google Play (Health Connect declaration form).
- [x] App Store privacy "nutrition label" + Google Play Data safety answers drafted in `docs/store-privacy.md`.

### 11.7 Security & privacy audit (checklist)
- [x] Every table has RLS; run a script that attempts cross-user reads/writes on every table with a second test account.
- [x] Storage policies: private bucket, path-scoped.
- [x] No coordinates in: `sightings`, `cats`, `activity_events`, logs, analytics.
- [x] No secrets in app bundle (`grep` the export).
- [x] Location updates stop when no walk is active.
- [x] EXIF stripped from photos (re-verify).
- [x] Rate limits on Edge Functions (sightings, invites, search).

## Acceptance criteria
- [x] All settings persist and actually change behavior (verify each).
- [x] Account deletion removes auth user, DB rows, and storage objects (verified in dashboard).
- [x] Reports land in `reports`; 3 reports auto-hide content.
- [x] Audit checklist 100% checked; findings fixed.
- [x] Privacy policy reachable before sign-up.

## Manual test script
1. Toggle off leaderboard visibility → friend no longer sees you.
2. Report a friend's shared cat card from another account → row in `reports`.
3. Export data → JSON contains own data only.
4. Delete account → cannot sign in; storage folder empty.

## Pitfalls
- Deleting an account must also remove the user from friends' leaderboards and events (cascades).
- Don't let moderators' tooling ship in the app bundle.
