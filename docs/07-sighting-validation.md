# Phase 7 — Sighting Validation Backend

## Goal
Automatically validate each pending sighting on the server: confirm it likely contains a cat, catch near-duplicates, enforce rate limits, and set the status to `accepted`, `rejected`, or `flagged` (manual review). The app reflects the outcome in real time. Conservative by design: **when unsure, flag — never auto-reward**.

## Prerequisites
- Phase 6 (pending sightings + photos in private storage).

## Out of scope
- Points for accepted sightings (Phase 9 hooks into the `accepted` transition).
- Individual-cat recognition (post-MVP).
- A full admin web app — use the Supabase dashboard + a SQL view for the review queue in MVP.

## Tech
- **Supabase Edge Function** `validate-sighting` (Deno, TypeScript).
- Triggered by a **Database Webhook** on `sightings` INSERT (or invoked by the client right after insert as a fallback; function must be idempotent).
- Cat detection via a hosted vision API — pick one and document it in `PROGRESS.md`:
  - **Google Cloud Vision** label/object detection (`Cat` label score), or
  - **Gemini API** with a strict JSON prompt (`{"contains_cat": bool, "confidence": 0-1, "is_real_photo": bool}`).
  API key stored as an Edge Function secret (`supabase secrets set`), never in the app.
- Perceptual hash (dHash 64-bit) computed in the function using a Deno-compatible image lib (e.g. `imagescript`).

## Data / schema
Migration `<ts>_validation.sql`:
- `sightings` add: `validated_at timestamptz`, `validation_meta jsonb` (scores, model, durations — no PII).
- `sighting_reviews` view: `flagged` sightings oldest first (service-role only).
- SQL function `hamming_distance(a text, b text)` (or compare in the function).
- Config table `app_config` (key/value) for thresholds so they can change without redeploy.

## Decision rules (initial values in `app_config`)

| Check | Rule | Result |
|---|---|---|
| File sanity | missing / not decodable / < 400 px | `rejected` (`invalid_image`) |
| Exact duplicate | same `sha256` for user (DB unique) | blocked at insert |
| Near duplicate | dHash Hamming ≤ 6 vs the user's sightings in last 30 days | `rejected` (`duplicate`) |
| Cat confidence | ≥ 0.80 | pass |
| | 0.50 – 0.80 | `flagged` (`uncertain`) |
| | < 0.50 | `rejected` (`no_cat_detected`) |
| Not a real photo (screen/print), if model supports it | suspected | `flagged` |
| Rate limit | > 30 submissions / 24 h | `flagged` (`rate_limited`) |
| Unsafe content (vision safe-search) | likely | `rejected` + auto-report |

Rewardable cap (points) is enforced in Phase 9, not here.

## Tasks
- [ ] 7.1 Migration + `app_config` seed with thresholds above.
- [ ] 7.2 Edge Function skeleton: verify webhook secret, load sighting by id, **skip if status ≠ pending** (idempotent).
- [ ] 7.3 Download photo with service role; compute dHash; store `phash`.
- [ ] 7.4 Near-duplicate check.
- [ ] 7.5 Rate-limit check (count user's sightings last 24 h).
- [ ] 7.6 Vision call with timeout (10 s) + 1 retry; on persistent failure leave `pending` and record error → a scheduled job (pg_cron, every 10 min) retries stale pendings; after 3 failures → `flagged`.
- [ ] 7.7 Write final status, `cat_confidence`, `reject_reason`, `validation_meta`, `validated_at`.
- [ ] 7.8 Unit-test decision logic as a pure function `decide(inputs, config)` (Deno test).
- [ ] 7.9 App: subscribe via Supabase Realtime (or poll every 5 s for ≤ 2 min) to update the sighting status chip. Friendly messages:
  - accepted → "Nice find! Added to your collection." (collection itself in Phase 8)
  - flagged → "We'll take a closer look — this can take a little while."
  - rejected `no_cat_detected` → "We couldn't spot a cat in this photo. Try again from a distance with zoom."
  - rejected `duplicate` → "Looks like you've already submitted this sighting."
- [ ] 7.10 Manual review: document how to approve/reject flagged sightings in the Supabase dashboard (SQL snippet in `supabase/README.md`); approving uses a `review_sighting(id, decision)` function (service role) so downstream triggers fire.

## Acceptance criteria
- [ ] Clear cat photo → `accepted` within ~10 s.
- [ ] Photo of a dog / empty street → `rejected` with the right message.
- [ ] Same scene shot twice a few seconds apart → second is `rejected (duplicate)`.
- [ ] Vision API down → sightings stay pending, then retry, never auto-accepted.
- [ ] Client cannot change `status` (verify RLS / column privileges).
- [ ] No API keys in the app bundle.

## Manual test script
1. Submit a cat photo → accepted.
2. Submit a photo of a shoe → rejected.
3. Take two near-identical shots → second rejected as duplicate.
4. Temporarily set a wrong API key → stays pending → fix key → retried.

## Pitfalls
- The UI must never claim to *identify* a specific cat — only "a cat was detected".
- Keep vision costs bounded: images are already resized (1600 px); consider sending 512 px to the API.
- Don't put any user identifiers in prompts to third-party APIs.
