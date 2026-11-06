-- Phase 4: Steps & Calories (HealthKit / Health Connect)
-- Adds `steps`, `active_kcal`, and `kcal_source` columns to `walks`
-- and creates the `daily_activity` table with owner-only RLS.

alter table public.walks
  add column if not exists steps integer check (steps is null or steps >= 0),
  add column if not exists active_kcal numeric check (active_kcal is null or active_kcal >= 0),
  add column if not exists kcal_source text check (kcal_source is null or kcal_source in ('health', 'estimate'));

create table if not exists public.daily_activity (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  date date not null,
  steps integer not null default 0 check (steps >= 0),
  active_kcal numeric check (active_kcal is null or active_kcal >= 0),
  kcal_source text check (kcal_source is null or kcal_source in ('health', 'estimate')),
  source text not null default 'none' check (source in ('healthkit', 'health_connect', 'none')),
  updated_at timestamptz not null default now(),
  constraint daily_activity_user_date_key unique (user_id, date)
);

create index if not exists idx_daily_activity_user_date
  on public.daily_activity (user_id, date desc);

drop trigger if exists set_daily_activity_updated_at on public.daily_activity;
create trigger set_daily_activity_updated_at
  before update on public.daily_activity
  for each row
  execute function public.set_updated_at();

alter table public.daily_activity enable row level security;

drop policy if exists "Users can read own daily activity" on public.daily_activity;
create policy "Users can read own daily activity"
  on public.daily_activity
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own daily activity" on public.daily_activity;
create policy "Users can insert own daily activity"
  on public.daily_activity
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own daily activity" on public.daily_activity;
create policy "Users can update own daily activity"
  on public.daily_activity
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

grant select, insert, update on public.daily_activity to authenticated;
