# StrayCat Walk — Content Moderation Runbook

This document defines the moderation procedures for user reports and flagged cat sightings in StrayCat Walk.

## 1. Principles & Objectives
1. **Animal Welfare First**: Immediate zero-tolerance removal and account suspension for any content depicting animal cruelty, distress, baiting, or improper handling.
2. **User Privacy**: No street addresses, personal license plates, private property backyards, identifiable faces, or location coordinates.
3. **Safe & Respectful Community**: Prevent harassment, non-cat spam, hate speech, and abusive interactions between friends.
4. **Response Target**: All filed reports in `reports` with `status = 'open'` must be reviewed and actioned within **48 hours** (welfare concerns prioritized within **6 hours**).

---

## 2. Automated Defenses
- **Auto-Hide Threshold**: Any `activity_event` receiving **3 or more open reports** (`is_content_reported_hidden`) is automatically excluded from friends' queries by Row Level Security (RLS) pending manual review.
- **Client-Side EXIF Stripping**: Image geolocation coordinates (GPS latitude/longitude) and device metadata are stripped on-device before upload.
- **Gemini Vision Validation**: Photos submitted to `validate-sighting` are checked for safety (`is_safe`) and cat content (`contains_cat`, `is_real_photo`).

---

## 3. Moderation Queue Triage

Moderators review tickets using service-role access or Supabase Studio SQL editor.

### View Open Reports Queue
```sql
select
  r.id,
  r.created_at,
  r.target_type,
  r.target_id,
  r.reason,
  r.details,
  p.username as reporter_username
from public.reports r
join public.profiles p on p.id = r.reporter_id
where r.status = 'open'
order by
  case when r.reason = 'animal_harm' then 0 else 1 end,
  r.created_at asc;
```

---

## 4. Moderation Actions

### Action 1: Dismiss Report (No Violation)
When content complies with community rules:
```sql
update public.reports
set status = 'dismissed'
where id = '<report-id>';
```

### Action 2: Actioned — Hide / Delete Milestone
```sql
-- Mark report as actioned
update public.reports
set status = 'actioned'
where id = '<report-id>';

-- Delete violating activity event
delete from public.activity_events
where id = '<target-id>'::uuid;
```

### Action 3: Actioned — Delete Sighting & Storage Photo
```sql
-- 1. Mark report actioned
update public.reports
set status = 'actioned'
where id = '<report-id>';

-- 2. Reject sighting with moderation note
update public.sightings
set status = 'rejected',
    reject_reason = 'Moderation violation: content removed for community guidelines'
where id = '<sighting-id>'::uuid;

-- 3. Delete photo object from private bucket using Supabase Storage API
-- storage.from('sighting-photos').remove(['<user_id>/<file_name>'])
```

### Action 4: User Suspension / Ban
For repeated violations, harassment, or animal harm:
```sql
-- 1. Disconnect and block friendships
delete from public.friendships
where user_id = '<user-id>' or friend_id = '<user-id>';

-- 2. Revoke user sessions and disable auth via Supabase Admin API
-- supabase.auth.admin.deleteUser('<user-id>')
-- or set user_metadata -> banned: true
```

---

## 5. Audit Logging
Every action taken by a moderator should be recorded with timestamp, moderator identity, action taken, and case notes.
