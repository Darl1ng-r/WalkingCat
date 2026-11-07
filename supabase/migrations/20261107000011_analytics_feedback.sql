-- Phase 12: Privacy-Respecting Analytics, In-App Feedback & Retention Metrics
-- Sets up:
-- 1. `analytics_events` table (strictly telemetry, no coordinates, no health numbers, opt-out support)
-- 2. `feedback` table for tester bug reports & feature suggestions
-- 3. `privacy_settings.analytics_opt_out` column
-- 4. Analytical views for weekly active walkers and 7-day retention

-- 1. Analytics Events
create table if not exists public.analytics_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  event_name text not null,
  properties jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_analytics_events_name_time
  on public.analytics_events (event_name, created_at desc);

create index if not exists idx_analytics_events_user
  on public.analytics_events (user_id, created_at desc);

alter table public.analytics_events enable row level security;

-- Authenticated users can insert their own events
drop policy if exists "Users can insert analytics events" on public.analytics_events;
create policy "Users can insert analytics events"
  on public.analytics_events
  for insert
  to authenticated
  with check (auth.uid() = user_id or user_id is null);

-- Events are read-only for service role (team dashboards)
revoke select, update, delete on public.analytics_events from anon, authenticated;
grant insert on public.analytics_events to authenticated;
grant all on public.analytics_events to service_role;

-- 2. User Feedback Table
create table if not exists public.feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  category text not null check (category in ('bug', 'idea', 'praise', 'other')),
  message text not null check (char_length(message) >= 5 and char_length(message) <= 2000),
  app_version text,
  platform text,
  created_at timestamptz not null default now()
);

create index if not exists idx_feedback_created
  on public.feedback (created_at desc);

alter table public.feedback enable row level security;

drop policy if exists "Users can submit feedback" on public.feedback;
create policy "Users can submit feedback"
  on public.feedback
  for insert
  to authenticated
  with check (auth.uid() = user_id or user_id is null);

drop policy if exists "Users can view own feedback" on public.feedback;
create policy "Users can view own feedback"
  on public.feedback
  for select
  to authenticated
  using (auth.uid() = user_id);

grant select, insert on public.feedback to authenticated;
grant all on public.feedback to service_role;

-- 3. Add analytics_opt_out to privacy_settings
alter table public.privacy_settings
  add column if not exists analytics_opt_out boolean not null default false;

-- 4. Analytical Views for MVP Product Metrics
create or replace view public.v_weekly_active_walkers as
select
  date_trunc('week', w.started_at) as week_start,
  count(distinct w.user_id) as active_walkers,
  count(w.id) as total_walks,
  round(avg(w.moving_time_s)::numeric, 1) as avg_duration_s,
  round(avg(w.distance_m)::numeric, 1) as avg_distance_m
from public.walks w
group by date_trunc('week', w.started_at)
order by week_start desc;

create or replace view public.v_walk_retention_7d as
with first_walks as (
  select
    user_id,
    min(started_at) as first_walk_at
  from public.walks
  group by user_id
),
subsequent_walks as (
  select distinct
    fw.user_id
  from first_walks fw
  join public.walks w
    on w.user_id = fw.user_id
   and w.started_at > fw.first_walk_at
   and w.started_at <= fw.first_walk_at + interval '7 days'
)
select
  count(fw.user_id) as total_first_walkers,
  count(sw.user_id) as repeat_walkers_within_7d,
  round(
    case
      when count(fw.user_id) > 0
      then (count(sw.user_id)::numeric / count(fw.user_id)::numeric) * 100
      else 0
    end,
    1
  ) as repeat_rate_pct
from first_walks fw
left join subsequent_walks sw on sw.user_id = fw.user_id;

grant select on public.v_weekly_active_walkers to service_role;
grant select on public.v_walk_retention_7d to service_role;
