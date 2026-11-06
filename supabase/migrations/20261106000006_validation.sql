-- Phase 7: Sighting Validation Backend
-- Adds validation metadata columns to `sightings`, creates `app_config` with tunable
-- thresholds, `hamming_distance` for 64-bit hex dHashes, `sighting_reviews` queue view,
-- and `review_sighting(id, decision)` for service-role manual moderation.

alter table public.sightings
  add column if not exists validated_at timestamptz,
  add column if not exists validation_attempts integer not null default 0 check (validation_attempts >= 0),
  add column if not exists validation_meta jsonb not null default '{}'::jsonb;

create index if not exists idx_sightings_user_phash_recent
  on public.sightings (user_id, created_at desc)
  where phash is not null;

create index if not exists idx_sightings_pending_retry
  on public.sightings (created_at asc)
  where status = 'pending';

-- Tunable server-side configuration table
create table if not exists public.app_config (
  key text primary key,
  value jsonb not null,
  description text,
  updated_at timestamptz not null default now()
);

alter table public.app_config enable row level security;

drop policy if exists "Authenticated users can read app_config" on public.app_config;
create policy "Authenticated users can read app_config"
  on public.app_config
  for select
  to authenticated
  using (true);

grant select on public.app_config to authenticated;

insert into public.app_config (key, value, description)
values
  ('min_image_dimension_px', '400'::jsonb, 'Minimum width and height in pixels for a valid sighting photo'),
  ('dhash_max_hamming_distance', '6'::jsonb, 'Maximum 64-bit dHash Hamming distance to treat two photos as near-duplicates'),
  ('dhash_lookback_days', '30'::jsonb, 'Days to look back when checking a user''s sighting perceptual hashes'),
  ('cat_accept_threshold', '0.80'::jsonb, 'Minimum cat detection confidence to automatically accept a sighting'),
  ('cat_flag_threshold', '0.50'::jsonb, 'Minimum cat detection confidence to flag a sighting for manual review instead of rejecting'),
  ('daily_submission_rate_limit', '30'::jsonb, 'Maximum sighting submissions per 24 hours before flagging as rate_limited'),
  ('max_validation_retries', '3'::jsonb, 'Maximum vision validation attempts before flagging a pending sighting')
on conflict (key) do nothing;

-- Bitwise Hamming distance between two 16-character hexadecimal (64-bit) dHash strings
create or replace function public.hamming_distance(a text, b text)
returns integer
language plpgsql
immutable
strict
set search_path = ''
as $$
declare
  v_a text := lower(trim(a));
  v_b text := lower(trim(b));
  v_len integer := char_length(v_a);
  v_dist integer := 0;
  v_i integer;
  v_na integer;
  v_nb integer;
  v_xor integer;
begin
  if v_len <> char_length(v_b) or v_len = 0 then
    return 64;
  end if;

  for v_i in 1..v_len loop
    v_na := ('x' || substr(v_a, v_i, 1))::bit(4)::integer;
    v_nb := ('x' || substr(v_b, v_i, 1))::bit(4)::integer;
    v_xor := v_na # v_nb;
    while v_xor > 0 loop
      v_dist := v_dist + (v_xor & 1);
      v_xor := v_xor >> 1;
    end loop;
  end loop;

  return v_dist;
end;
$$;

grant execute on function public.hamming_distance(text, text) to authenticated, service_role;

-- Service-role review queue view: flagged sightings oldest first
create or replace view public.sighting_reviews
with (security_invoker = false)
as
select
  s.id,
  s.user_id,
  s.walk_id,
  s.photo_path,
  s.sha256,
  s.phash,
  s.taken_at,
  s.area_geohash,
  s.status,
  s.reject_reason,
  s.cat_confidence,
  s.validation_attempts,
  s.validation_meta,
  s.created_at
from public.sightings s
where s.status = 'flagged'
order by s.created_at asc;

revoke all on public.sighting_reviews from anon, authenticated;
grant select on public.sighting_reviews to service_role;

-- Service-role manual review RPC so downstream triggers (Phase 8 collection & Phase 9 points) fire cleanly
create or replace function public.review_sighting(
  p_sighting_id uuid,
  p_decision text,
  p_reason text default null
)
returns public.sightings
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_updated public.sightings;
begin
  if p_decision not in ('accepted', 'rejected') then
    raise exception 'Decision must be accepted or rejected';
  end if;

  update public.sightings
  set
    status = p_decision,
    reject_reason = case
      when p_decision = 'accepted' then null
      else coalesce(p_reason, reject_reason, 'manual_review_rejected')
    end,
    validated_at = now(),
    validation_meta = coalesce(validation_meta, '{}'::jsonb) || jsonb_build_object(
      'manual_review', true,
      'reviewed_at', now()
    )
  where id = p_sighting_id
  returning * into v_updated;

  if v_updated.id is null then
    raise exception 'Sighting % not found', p_sighting_id;
  end if;

  return v_updated;
end;
$$;

revoke all on function public.review_sighting(uuid, text, text) from public, anon, authenticated;
grant execute on function public.review_sighting(uuid, text, text) to service_role;

-- Ensure sightings changes are broadcast over Supabase Realtime
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    begin
      alter publication supabase_realtime add table public.sightings;
    exception
      when duplicate_object then null;
    end;
  end if;
end
$$;
