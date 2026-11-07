-- Phase 11: Privacy, Safety, Data Controls & Content Moderation
-- Sets up:
-- 1. `reports` table with auto-hide logic (>= 3 open reports auto-hides content from friends)
-- 2. Bulk data deletion RPCs (`delete_all_user_walks`, `delete_all_user_sightings`)
-- 3. Edge function security & deletion support

-- 1. Reports table
create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  target_type text not null check (
    target_type in ('sighting', 'cat_card', 'profile', 'activity_event')
  ),
  target_id text not null,
  reason text not null check (
    reason in ('animal_harm', 'inappropriate', 'personal_info', 'spam', 'other')
  ),
  details text check (details is null or char_length(details) <= 500),
  status text not null default 'open' check (
    status in ('open', 'actioned', 'dismissed')
  ),
  created_at timestamptz not null default now()
);

create index if not exists idx_reports_target
  on public.reports (target_type, target_id, status);

create index if not exists idx_reports_reporter
  on public.reports (reporter_id, created_at desc);

alter table public.reports enable row level security;

drop policy if exists "Users can read own filed reports" on public.reports;
create policy "Users can read own filed reports"
  on public.reports
  for select
  to authenticated
  using (auth.uid() = reporter_id);

drop policy if exists "Users can submit reports" on public.reports;
create policy "Users can submit reports"
  on public.reports
  for insert
  to authenticated
  with check (auth.uid() = reporter_id);

revoke update, delete on public.reports from anon, authenticated;
grant select, insert on public.reports to authenticated;
grant all on public.reports to service_role;

-- 2. Helper function: check if an activity_event has >= 3 open reports (auto-hide)
create or replace function public.is_content_reported_hidden(p_target_type text, p_target_id text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select count(*) >= 3
  from public.reports r
  where r.target_type = p_target_type
    and r.target_id = p_target_id
    and r.status = 'open';
$$;

grant execute on function public.is_content_reported_hidden(text, text) to authenticated, service_role;

-- Update activity_events RLS policy to respect auto-hide from friends
drop policy if exists "Users and friends can read activity events" on public.activity_events;
create policy "Users and friends can read activity events"
  on public.activity_events
  for select
  to authenticated
  using (
    auth.uid() = user_id
    or (
      public.is_friend(auth.uid(), user_id)
      and not public.is_content_reported_hidden('activity_event', id::text)
    )
  );

-- 3. RPC: submit_report
create or replace function public.submit_report(
  p_target_type text,
  p_target_id text,
  p_reason text,
  p_details text default null
)
returns public.reports
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_report public.reports;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  if p_target_type not in ('sighting', 'cat_card', 'profile', 'activity_event') then
    raise exception 'Invalid report target type';
  end if;

  if p_reason not in ('animal_harm', 'inappropriate', 'personal_info', 'spam', 'other') then
    raise exception 'Invalid report reason';
  end if;

  insert into public.reports (reporter_id, target_type, target_id, reason, details)
  values (v_user_id, p_target_type, p_target_id, p_reason, p_details)
  returning * into v_report;

  return v_report;
end;
$$;

grant execute on function public.submit_report(text, text, text, text) to authenticated;

-- 4. Bulk Data Deletion RPCs for user data controls
create or replace function public.delete_all_user_walks()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_count integer;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  with deleted as (
    delete from public.walks
    where user_id = v_user_id
    returning id
  )
  select count(*)::integer into v_count from deleted;

  return v_count;
end;
$$;

grant execute on function public.delete_all_user_walks() to authenticated;

create or replace function public.delete_all_user_sightings()
returns table (
  deleted_sightings_count integer,
  deleted_cats_count integer
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_s_count integer;
  v_c_count integer;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  with del_sightings as (
    delete from public.sightings
    where user_id = v_user_id
    returning id
  )
  select count(*)::integer into v_s_count from del_sightings;

  with del_cats as (
    delete from public.cats
    where user_id = v_user_id
    returning id
  )
  select count(*)::integer into v_c_count from del_cats;

  return query select v_s_count, v_c_count;
end;
$$;

grant execute on function public.delete_all_user_sightings() to authenticated;

-- 5. RPC to get full user export data as JSON
create or replace function public.export_user_account_data()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_profile jsonb;
  v_privacy jsonb;
  v_walks jsonb;
  v_sightings jsonb;
  v_cats jsonb;
  v_daily jsonb;
  v_points jsonb;
  v_achievements jsonb;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  select to_jsonb(p) into v_profile from public.profiles p where p.id = v_user_id;
  select to_jsonb(ps) into v_privacy from public.privacy_settings ps where ps.user_id = v_user_id;

  select coalesce(jsonb_agg(to_jsonb(w)), '[]'::jsonb)
  into v_walks
  from public.walks w
  where w.user_id = v_user_id;

  select coalesce(jsonb_agg(to_jsonb(s)), '[]'::jsonb)
  into v_sightings
  from public.sightings s
  where s.user_id = v_user_id;

  select coalesce(jsonb_agg(to_jsonb(c)), '[]'::jsonb)
  into v_cats
  from public.cats c
  where c.user_id = v_user_id;

  select coalesce(jsonb_agg(to_jsonb(da)), '[]'::jsonb)
  into v_daily
  from public.daily_activity da
  where da.user_id = v_user_id;

  select coalesce(jsonb_agg(to_jsonb(pl)), '[]'::jsonb)
  into v_points
  from public.points_ledger pl
  where pl.user_id = v_user_id;

  select coalesce(jsonb_agg(to_jsonb(ua)), '[]'::jsonb)
  into v_achievements
  from public.user_achievements ua
  where ua.user_id = v_user_id;

  return jsonb_build_object(
    'exported_at', now(),
    'profile', v_profile,
    'privacy_settings', v_privacy,
    'walks', v_walks,
    'sightings', v_sightings,
    'cats', v_cats,
    'daily_activity', v_daily,
    'points_ledger', v_points,
    'user_achievements', v_achievements
  );
end;
$$;

grant execute on function public.export_user_account_data() to authenticated;
