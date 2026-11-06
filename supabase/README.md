# Supabase Backend & Sighting Moderation Guide

This directory contains SQL migrations (`supabase/migrations/`) and Deno Edge Functions (`supabase/functions/`) for **StrayCat Walk**.

---

## 1. Deploying the Sighting Validation Edge Function (Phase 7)

Set the Gemini Vision API key secret (never stored in the mobile app) and deploy `validate-sighting`:

```bash
npx supabase secrets set GEMINI_API_KEY="<your-gemini-api-key>"
npx supabase secrets set VALIDATION_WEBHOOK_SECRET="<random-secret>"
npx supabase functions deploy validate-sighting
```

### Database Webhook + `pg_cron` Retry Schedule

In the Supabase SQL Editor, configure a Database Webhook on `public.sightings` (`INSERT`) pointing to `validate-sighting`, and optional 10-minute retry cron for stale `pending` rows:

```sql
-- View any sightings stuck in 'pending' for > 2 minutes:
select id, user_id, created_at, validation_attempts, validation_meta
from public.sightings
where status = 'pending'
  and created_at < now() - interval '2 minutes';
```

---

## 2. Manual Review Queue (`sighting_reviews`)

Sightings with uncertain cat confidence (`0.50 – 0.80`), suspected screen/print photos, or rate-limited submissions (`> 30 / 24 h`) are marked `status = 'flagged'`.

### Inspect Flagged Sightings (Oldest First)

Run in the Supabase SQL Editor (service role):

```sql
select
  id,
  user_id,
  photo_path,
  cat_confidence,
  reject_reason,
  taken_at,
  validation_meta
from public.sighting_reviews;
```

### Approve or Reject a Flagged Sighting

Always use `public.review_sighting(id, decision, reason)` so downstream collection (Phase 8) and points/achievements (Phase 9) triggers fire properly:

```sql
-- Approve a flagged sighting:
select public.review_sighting(
  '00000000-0000-0000-0000-000000000000'::uuid,
  'accepted'
);

-- Reject a flagged sighting:
select public.review_sighting(
  '00000000-0000-0000-0000-000000000000'::uuid,
  'rejected',
  'no_cat_detected'
);
```

---

## 3. Tuning Validation Thresholds Without Redeploying

Thresholds live in `public.app_config`:

```sql
select key, value, description from public.app_config;

-- Example: adjust cat_accept_threshold
update public.app_config
set value = '0.82'::jsonb,
    updated_at = now()
where key = 'cat_accept_threshold';
```
