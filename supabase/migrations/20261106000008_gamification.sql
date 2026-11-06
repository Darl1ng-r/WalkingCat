-- Phase 9: Points, Achievements & Weekly Challenges
-- Server-authoritative points ledger, achievements, daily/weekly challenge templates & instances,
-- idempotent triggers with anti-farming daily caps, and pg_cron scheduling.
-- Note on walk deletion (MVP): Deleting a walk does NOT insert negative points into `points_ledger`;
-- awarded points remain in the append-only ledger.
-- Note on challenge periods (MVP): Daily and weekly challenge instances use user-agnostic UTC dates
-- (`00:00 UTC`).

-- 1. Add challenge_difficulty preference to profiles ('easy' | 'standard')
alter table public.profiles
  add column if not exists challenge_difficulty text not null default 'standard'
  check (challenge_difficulty in ('easy', 'standard'));

-- 2. Seed tunable point rules into app_config
insert into public.app_config (key, value, description)
values
  ('points_walk_completed', '20'::jsonb, 'Points awarded for a qualifying walk (>= 500m and >= 10 min moving, not suspicious)'),
  ('points_walk_min_distance_m', '500'::jsonb, 'Minimum walk distance in meters to qualify for walk completion points'),
  ('points_walk_min_moving_time_s', '600'::jsonb, 'Minimum moving time in seconds to qualify for walk completion points'),
  ('points_walk_daily_cap', '3'::jsonb, 'Maximum number of rewarded walks per UTC day'),
  ('points_walk_distance_per_km', '5'::jsonb, 'Distance bonus points per full kilometer on a rewarded walk'),
  ('points_walk_distance_max_km', '10'::jsonb, 'Maximum kilometers counted for distance bonus per walk'),
  ('points_steps_5k', '10'::jsonb, 'Points awarded once per day when reaching 5,000 daily steps'),
  ('points_steps_8k', '10'::jsonb, 'Points awarded once per day when reaching 8,000 daily steps'),
  ('points_steps_10k', '10'::jsonb, 'Points awarded once per day when reaching 10,000 daily steps'),
  ('points_sighting_accepted', '15'::jsonb, 'Points awarded for an accepted cat sighting'),
  ('points_sighting_daily_cap', '5'::jsonb, 'Maximum number of rewarded cat sightings per UTC day'),
  ('points_challenge_daily', '25'::jsonb, 'Points awarded for completing a daily challenge instance'),
  ('points_challenge_weekly', '75'::jsonb, 'Points awarded for completing a weekly challenge instance')
on conflict (key) do nothing;

-- Helper to read integer config values from app_config
create or replace function public.get_config_int(p_key text, p_default integer)
returns integer
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_val jsonb;
begin
  select c.value into v_val
  from public.app_config c
  where c.key = p_key;

  if v_val is null then
    return p_default;
  end if;

  return coalesce((v_val #>> '{}')::integer, p_default);
exception
  when others then
    return p_default;
end;
$$;

-- 3. Append-only Points Ledger (no client insert/update/delete)
create table if not exists public.points_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  amount integer not null check (amount > 0),
  reason text not null,
  source_type text not null check (
    source_type in (
      'walk',
      'walk_distance',
      'steps_milestone',
      'sighting',
      'achievement',
      'challenge'
    )
  ),
  source_id text not null,
  created_at timestamptz not null default now(),
  constraint points_ledger_idempotent_key unique (user_id, source_type, source_id)
);

create index if not exists idx_points_ledger_user_created
  on public.points_ledger (user_id, created_at desc);

alter table public.points_ledger enable row level security;

drop policy if exists "Users can read own points ledger" on public.points_ledger;
create policy "Users can read own points ledger"
  on public.points_ledger
  for select
  to authenticated
  using (auth.uid() = user_id);

revoke all on public.points_ledger from anon, authenticated;
grant select on public.points_ledger to authenticated;

-- 4. Achievements & User Achievements
create table if not exists public.achievements (
  id text primary key,
  title text not null,
  description text not null,
  icon text not null,
  points integer not null check (points > 0),
  metric text not null check (
    metric in ('walks_count', 'total_distance_m', 'cats_count', 'weekly_active_days')
  ),
  threshold numeric not null check (threshold > 0),
  sort_order integer not null default 0
);

alter table public.achievements enable row level security;

drop policy if exists "Authenticated users can read achievements" on public.achievements;
create policy "Authenticated users can read achievements"
  on public.achievements
  for select
  to authenticated
  using (true);

grant select on public.achievements to authenticated;

create table if not exists public.user_achievements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  achievement_id text not null references public.achievements(id) on delete cascade,
  unlocked_at timestamptz not null default now(),
  constraint user_achievements_unique_key unique (user_id, achievement_id)
);

create index if not exists idx_user_achievements_user
  on public.user_achievements (user_id, unlocked_at desc);

alter table public.user_achievements enable row level security;

drop policy if exists "Users can read own unlocked achievements" on public.user_achievements;
create policy "Users can read own unlocked achievements"
  on public.user_achievements
  for select
  to authenticated
  using (auth.uid() = user_id);

revoke all on public.user_achievements from anon, authenticated;
grant select on public.user_achievements to authenticated;

-- Seed MVP achievements
insert into public.achievements (id, title, description, icon, points, metric, threshold, sort_order)
values
  ('first_walk', 'First Stroll', 'Complete your very first walk.', '👟', 25, 'walks_count', 1, 10),
  ('walks_5', 'Neighborhood Regular', 'Complete 5 walks at your own pace.', '🥾', 40, 'walks_count', 5, 20),
  ('walks_25', 'Steady Explorer', 'Complete 25 walks.', '🧭', 100, 'walks_count', 25, 30),
  ('walks_100', 'Century Walker', 'Complete 100 walks.', '🏅', 250, 'walks_count', 100, 40),
  ('distance_10km', '10 km Milestone', 'Cover 10 km of total walking distance.', '🌱', 40, 'total_distance_m', 10000, 50),
  ('distance_50km', '50 km Journey', 'Cover 50 km of total walking distance.', '🌳', 100, 'total_distance_m', 50000, 60),
  ('distance_100km', '100 km Horizon', 'Cover 100 km of total walking distance.', '⛰️', 250, 'total_distance_m', 100000, 70),
  ('first_cat', 'First Cat Discovered', 'Add your first accepted cat sighting to your collection.', '🐱', 25, 'cats_count', 1, 80),
  ('cats_5', 'Friendly Observer', 'Collect 5 cat cards through respectful, no-flash sightings.', '🐾', 50, 'cats_count', 5, 90),
  ('cats_25', 'Cat Whisperer', 'Collect 25 cat cards in your personal collection.', '😺', 125, 'cats_count', 25, 100),
  ('cats_50', 'Feline Archivist', 'Collect 50 cat cards in your personal collection.', '👑', 250, 'cats_count', 50, 110),
  ('weekly_days_3', '3 Active Days in a Week', 'Head out for a walk or steps on 3 different days in a single week.', '☀️', 40, 'weekly_active_days', 3, 120),
  ('weekly_days_5', '5 Active Days in a Week', 'Enjoy 5 active days in a single week—rest days are always welcome!', '🌟', 75, 'weekly_active_days', 5, 130)
on conflict (id) do update
set
  title = excluded.title,
  description = excluded.description,
  icon = excluded.icon,
  points = excluded.points,
  metric = excluded.metric,
  threshold = excluded.threshold,
  sort_order = excluded.sort_order;

-- 5. Challenges, Challenge Instances & Challenge Progress
create table if not exists public.challenges (
  id text primary key,
  period text not null check (period in ('daily', 'weekly')),
  metric text not null check (
    metric in ('walks', 'distance_m', 'moving_time_s', 'steps', 'active_days', 'sightings')
  ),
  target numeric not null check (target > 0),
  easy_target numeric not null check (easy_target > 0),
  title text not null,
  easy_title text not null,
  description text not null,
  icon text not null default '🎯',
  difficulty text not null default 'standard' check (difficulty in ('easy', 'standard')),
  sort_order integer not null default 0
);

alter table public.challenges enable row level security;

drop policy if exists "Authenticated users can read challenges" on public.challenges;
create policy "Authenticated users can read challenges"
  on public.challenges
  for select
  to authenticated
  using (true);

grant select on public.challenges to authenticated;

-- Seed MVP challenge templates (Standard + Easy ~60% targets)
insert into public.challenges (
  id, period, metric, target, easy_target, title, easy_title, description, icon, difficulty, sort_order
)
values
  ('daily_walk_time', 'daily', 'moving_time_s', 900, 600, '15-Minute Walk', '10-Minute Walk', 'Spend time walking outdoors today at a comfortable pace.', '⏱️', 'easy', 10),
  ('daily_steps', 'daily', 'steps', 5000, 3000, '5,000 Steps Today', '3,000 Steps Today', 'Accumulate steps throughout the day.', '👣', 'easy', 20),
  ('daily_distance', 'daily', 'distance_m', 1500, 1000, '1.5 km Walk', '1 km Walk', 'Cover walking distance across your walks today.', '🥾', 'easy', 30),
  ('weekly_walks', 'weekly', 'walks', 3, 2, '3 Walks This Week', '2 Walks This Week', 'Complete walks across the week whenever suits your schedule.', '👟', 'standard', 40),
  ('weekly_distance', 'weekly', 'distance_m', 10000, 6000, '10 km Weekly Total', '6 km Weekly Total', 'Build up your walking distance over the week.', '🗺️', 'standard', 50),
  ('weekly_active_days', 'weekly', 'active_days', 4, 3, 'Walk on 4 Different Days', 'Walk on 3 Different Days', 'Be active on different days this week—rest days always welcome!', '📅', 'standard', 60),
  ('weekly_sightings', 'weekly', 'sightings', 2, 1, '2 Cat Sightings', '1 Cat Sighting', 'Spot and photograph cats respectfully from a distance anywhere.', '🐱', 'standard', 70)
on conflict (id) do update
set
  period = excluded.period,
  metric = excluded.metric,
  target = excluded.target,
  easy_target = excluded.easy_target,
  title = excluded.title,
  easy_title = excluded.easy_title,
  description = excluded.description,
  icon = excluded.icon,
  difficulty = excluded.difficulty,
  sort_order = excluded.sort_order;

create table if not exists public.challenge_instances (
  id uuid primary key default gen_random_uuid(),
  challenge_id text not null references public.challenges(id) on delete cascade,
  period_start date not null,
  period_end date not null,
  created_at timestamptz not null default now(),
  constraint challenge_instances_unique_key unique (challenge_id, period_start),
  constraint challenge_instances_valid_dates check (period_end >= period_start)
);

create index if not exists idx_challenge_instances_dates
  on public.challenge_instances (period_start, period_end);

alter table public.challenge_instances enable row level security;

drop policy if exists "Authenticated users can read challenge instances" on public.challenge_instances;
create policy "Authenticated users can read challenge instances"
  on public.challenge_instances
  for select
  to authenticated
  using (true);

grant select on public.challenge_instances to authenticated;

create table if not exists public.challenge_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  instance_id uuid not null references public.challenge_instances(id) on delete cascade,
  progress numeric not null default 0 check (progress >= 0),
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  constraint challenge_progress_unique_key unique (user_id, instance_id)
);

create index if not exists idx_challenge_progress_user
  on public.challenge_progress (user_id, updated_at desc);

alter table public.challenge_progress enable row level security;

drop policy if exists "Users can read own challenge progress" on public.challenge_progress;
create policy "Users can read own challenge progress"
  on public.challenge_progress
  for select
  to authenticated
  using (auth.uid() = user_id);

revoke all on public.challenge_progress from anon, authenticated;
grant select on public.challenge_progress to authenticated;

-- 6. Ensure active daily and weekly challenge instances exist for a given UTC date
create or replace function public.ensure_active_challenge_instances(
  p_date date default (now() at time zone 'utc')::date
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_week_start date := date_trunc('week', p_date::timestamp)::date;
  v_week_end date := v_week_start + 6;
begin
  -- Daily instances for p_date
  insert into public.challenge_instances (challenge_id, period_start, period_end)
  select c.id, p_date, p_date
  from public.challenges c
  where c.period = 'daily'
  on conflict (challenge_id, period_start) do nothing;

  -- Weekly instances for the ISO week containing p_date
  insert into public.challenge_instances (challenge_id, period_start, period_end)
  select c.id, v_week_start, v_week_end
  from public.challenges c
  where c.period = 'weekly'
  on conflict (challenge_id, period_start) do nothing;
end;
$$;

grant execute on function public.ensure_active_challenge_instances(date) to authenticated, service_role;

-- Seed initial instances for today
select public.ensure_active_challenge_instances((now() at time zone 'utc')::date);

-- Schedule daily challenge instance generation at 00:00 UTC via pg_cron if available
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.schedule(
      'ensure-daily-weekly-challenge-instances',
      '0 0 * * *',
      $cron$select public.ensure_active_challenge_instances((now() at time zone 'utc')::date);$cron$
    );
  end if;
exception
  when others then
    null;
end
$$;

-- 7. Idempotent Achievement Evaluation
create or replace function public.evaluate_achievements(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_walks_count integer := 0;
  v_total_distance_m numeric := 0;
  v_cats_count integer := 0;
  v_week_start date := date_trunc('week', (now() at time zone 'utc'))::date;
  v_week_end date := v_week_start + 6;
  v_weekly_active_days integer := 0;
  v_ach record;
  v_metric_val numeric;
  v_inserted_id uuid;
begin
  if p_user_id is null then
    return;
  end if;

  select
    count(*)::integer,
    coalesce(sum(w.distance_m), 0)
  into v_walks_count, v_total_distance_m
  from public.walks w
  where w.user_id = p_user_id
    and w.is_suspicious = false;

  select count(*)::integer
  into v_cats_count
  from public.cats c
  where c.user_id = p_user_id;

  select count(distinct d.active_date)::integer
  into v_weekly_active_days
  from (
    select (w.started_at at time zone 'utc')::date as active_date
    from public.walks w
    where w.user_id = p_user_id
      and w.is_suspicious = false
      and (w.started_at at time zone 'utc')::date between v_week_start and v_week_end
    union
    select da.date as active_date
    from public.daily_activity da
    where da.user_id = p_user_id
      and da.steps > 0
      and da.date between v_week_start and v_week_end
  ) d;

  for v_ach in
    select a.id, a.title, a.points, a.metric, a.threshold
    from public.achievements a
    order by a.sort_order asc
  loop
    v_metric_val := case v_ach.metric
      when 'walks_count' then v_walks_count
      when 'total_distance_m' then v_total_distance_m
      when 'cats_count' then v_cats_count
      when 'weekly_active_days' then v_weekly_active_days
      else 0
    end;

    if v_metric_val >= v_ach.threshold then
      v_inserted_id := null;

      insert into public.user_achievements (user_id, achievement_id)
      values (p_user_id, v_ach.id)
      on conflict (user_id, achievement_id) do nothing
      returning id into v_inserted_id;

      -- Award achievement points idempotently
      insert into public.points_ledger (user_id, amount, reason, source_type, source_id)
      values (
        p_user_id,
        v_ach.points,
        'Achievement unlocked: ' || v_ach.title,
        'achievement',
        v_ach.id
      )
      on conflict (user_id, source_type, source_id) do nothing;
    end if;
  end loop;
end;
$$;

-- 8. Refresh Challenge Progress & Award Completion Points
create or replace function public.refresh_challenge_progress(
  p_user_id uuid,
  p_ref_date date default (now() at time zone 'utc')::date
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_difficulty text := 'standard';
  v_daily_pts integer;
  v_weekly_pts integer;
  v_inst record;
  v_progress numeric;
  v_effective_target numeric;
  v_effective_title text;
  v_reward integer;
begin
  if p_user_id is null then
    return;
  end if;

  perform public.ensure_active_challenge_instances(p_ref_date);

  select coalesce(p.challenge_difficulty, 'standard')
  into v_difficulty
  from public.profiles p
  where p.id = p_user_id;

  v_daily_pts := public.get_config_int('points_challenge_daily', 25);
  v_weekly_pts := public.get_config_int('points_challenge_weekly', 75);

  for v_inst in
    select
      ci.id as instance_id,
      ci.period_start,
      ci.period_end,
      c.id as challenge_id,
      c.period,
      c.metric,
      c.target,
      c.easy_target,
      c.title,
      c.easy_title
    from public.challenge_instances ci
    join public.challenges c on c.id = ci.challenge_id
    where ci.period_start <= p_ref_date
      and ci.period_end >= p_ref_date
  loop
    v_progress := 0;

    if v_inst.metric = 'walks' then
      select count(*)::numeric
      into v_progress
      from public.walks w
      where w.user_id = p_user_id
        and w.is_suspicious = false
        and (w.started_at at time zone 'utc')::date between v_inst.period_start and v_inst.period_end;

    elsif v_inst.metric = 'distance_m' then
      select coalesce(sum(w.distance_m), 0)
      into v_progress
      from public.walks w
      where w.user_id = p_user_id
        and w.is_suspicious = false
        and (w.started_at at time zone 'utc')::date between v_inst.period_start and v_inst.period_end;

    elsif v_inst.metric = 'moving_time_s' then
      select coalesce(sum(w.moving_time_s), 0)::numeric
      into v_progress
      from public.walks w
      where w.user_id = p_user_id
        and w.is_suspicious = false
        and (w.started_at at time zone 'utc')::date between v_inst.period_start and v_inst.period_end;

    elsif v_inst.metric = 'steps' then
      select coalesce(sum(da.steps), 0)::numeric
      into v_progress
      from public.daily_activity da
      where da.user_id = p_user_id
        and da.date between v_inst.period_start and v_inst.period_end;

    elsif v_inst.metric = 'active_days' then
      select count(distinct d.active_date)::numeric
      into v_progress
      from (
        select (w.started_at at time zone 'utc')::date as active_date
        from public.walks w
        where w.user_id = p_user_id
          and w.is_suspicious = false
          and (w.started_at at time zone 'utc')::date between v_inst.period_start and v_inst.period_end
        union
        select da.date as active_date
        from public.daily_activity da
        where da.user_id = p_user_id
          and da.steps > 0
          and da.date between v_inst.period_start and v_inst.period_end
      ) d;

    elsif v_inst.metric = 'sightings' then
      select count(*)::numeric
      into v_progress
      from public.sightings s
      where s.user_id = p_user_id
        and s.status = 'accepted'
        and (s.taken_at at time zone 'utc')::date between v_inst.period_start and v_inst.period_end;
    end if;

    v_effective_target := case
      when v_difficulty = 'easy' then v_inst.easy_target
      else v_inst.target
    end;

    v_effective_title := case
      when v_difficulty = 'easy' then v_inst.easy_title
      else v_inst.title
    end;

    insert into public.challenge_progress (user_id, instance_id, progress, completed_at, updated_at)
    values (
      p_user_id,
      v_inst.instance_id,
      v_progress,
      case when v_progress >= v_effective_target then now() else null end,
      now()
    )
    on conflict (user_id, instance_id) do update
    set
      progress = excluded.progress,
      completed_at = coalesce(public.challenge_progress.completed_at, excluded.completed_at),
      updated_at = now();

    if v_progress >= v_effective_target then
      v_reward := case when v_inst.period = 'weekly' then v_weekly_pts else v_daily_pts end;

      insert into public.points_ledger (user_id, amount, reason, source_type, source_id)
      values (
        p_user_id,
        v_reward,
        'Challenge completed: ' || v_effective_title,
        'challenge',
        v_inst.instance_id::text
      )
      on conflict (user_id, source_type, source_id) do nothing;
    end if;
  end loop;
end;
$$;

-- 9. Trigger: on_walk_inserted -> award walk + distance points, update challenges & achievements
create or replace function public.on_walk_inserted()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_walk_date date := (new.started_at at time zone 'utc')::date;
  v_min_dist integer;
  v_min_time integer;
  v_daily_cap integer;
  v_walk_pts integer;
  v_km_pts integer;
  v_max_km integer;
  v_rewarded_today integer;
  v_full_km integer;
  v_dist_bonus integer;
begin
  if new.is_suspicious = false then
    v_min_dist := public.get_config_int('points_walk_min_distance_m', 500);
    v_min_time := public.get_config_int('points_walk_min_moving_time_s', 600);
    v_daily_cap := public.get_config_int('points_walk_daily_cap', 3);
    v_walk_pts := public.get_config_int('points_walk_completed', 20);
    v_km_pts := public.get_config_int('points_walk_distance_per_km', 5);
    v_max_km := public.get_config_int('points_walk_distance_max_km', 10);

    if new.distance_m >= v_min_dist and new.moving_time_s >= v_min_time then
      -- Count rewarded walks for this user on the same UTC date
      select count(*)::integer
      into v_rewarded_today
      from public.points_ledger pl
      join public.walks w on w.id::text = pl.source_id
      where pl.user_id = new.user_id
        and pl.source_type = 'walk'
        and (w.started_at at time zone 'utc')::date = v_walk_date;

      if v_rewarded_today < v_daily_cap then
        insert into public.points_ledger (user_id, amount, reason, source_type, source_id)
        values (
          new.user_id,
          v_walk_pts,
          'Completed walk',
          'walk',
          new.id::text
        )
        on conflict (user_id, source_type, source_id) do nothing;

        v_full_km := least(floor(new.distance_m / 1000.0)::integer, v_max_km);
        v_dist_bonus := v_full_km * v_km_pts;

        if v_dist_bonus > 0 then
          insert into public.points_ledger (user_id, amount, reason, source_type, source_id)
          values (
            new.user_id,
            v_dist_bonus,
            'Walk distance bonus (' || v_full_km || ' km)',
            'walk_distance',
            new.id::text
          )
          on conflict (user_id, source_type, source_id) do nothing;
        end if;
      end if;
    end if;
  end if;

  perform public.refresh_challenge_progress(new.user_id, v_walk_date);
  perform public.evaluate_achievements(new.user_id);

  return new;
end;
$$;

drop trigger if exists trg_on_walk_inserted_gamification on public.walks;
create trigger trg_on_walk_inserted_gamification
  after insert on public.walks
  for each row
  execute function public.on_walk_inserted();

-- 10. Trigger: on_sighting_accepted -> award sighting points (cap 5/day), update challenges & achievements
create or replace function public.on_sighting_accepted()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_sighting_date date := (new.taken_at at time zone 'utc')::date;
  v_sighting_pts integer;
  v_daily_cap integer;
  v_rewarded_today integer;
begin
  if new.status = 'accepted' then
    v_sighting_pts := public.get_config_int('points_sighting_accepted', 15);
    v_daily_cap := public.get_config_int('points_sighting_daily_cap', 5);

    select count(*)::integer
    into v_rewarded_today
    from public.points_ledger pl
    join public.sightings s on s.id::text = pl.source_id
    where pl.user_id = new.user_id
      and pl.source_type = 'sighting'
      and (s.taken_at at time zone 'utc')::date = v_sighting_date;

    if v_rewarded_today < v_daily_cap then
      insert into public.points_ledger (user_id, amount, reason, source_type, source_id)
      values (
        new.user_id,
        v_sighting_pts,
        'Accepted cat sighting',
        'sighting',
        new.id::text
      )
      on conflict (user_id, source_type, source_id) do nothing;
    end if;

    perform public.refresh_challenge_progress(new.user_id, v_sighting_date);
    perform public.evaluate_achievements(new.user_id);
  end if;

  return new;
end;
$$;

drop trigger if exists trg_on_sighting_accepted_gamification on public.sightings;
create trigger trg_on_sighting_accepted_gamification
  after insert or update of status on public.sightings
  for each row
  execute function public.on_sighting_accepted();

-- 11. Trigger: on_daily_activity_upserted -> step milestones (5k/8k/10k) + step challenges & achievements
create or replace function public.on_daily_activity_upserted()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_pts_5k integer;
  v_pts_8k integer;
  v_pts_10k integer;
begin
  v_pts_5k := public.get_config_int('points_steps_5k', 10);
  v_pts_8k := public.get_config_int('points_steps_8k', 10);
  v_pts_10k := public.get_config_int('points_steps_10k', 10);

  if new.steps >= 5000 then
    insert into public.points_ledger (user_id, amount, reason, source_type, source_id)
    values (
      new.user_id,
      v_pts_5k,
      'Daily step milestone: 5,000 steps',
      'steps_milestone',
      new.date::text || ':5000'
    )
    on conflict (user_id, source_type, source_id) do nothing;
  end if;

  if new.steps >= 8000 then
    insert into public.points_ledger (user_id, amount, reason, source_type, source_id)
    values (
      new.user_id,
      v_pts_8k,
      'Daily step milestone: 8,000 steps',
      'steps_milestone',
      new.date::text || ':8000'
    )
    on conflict (user_id, source_type, source_id) do nothing;
  end if;

  if new.steps >= 10000 then
    insert into public.points_ledger (user_id, amount, reason, source_type, source_id)
    values (
      new.user_id,
      v_pts_10k,
      'Daily step milestone: 10,000 steps',
      'steps_milestone',
      new.date::text || ':10000'
    )
    on conflict (user_id, source_type, source_id) do nothing;
  end if;

  perform public.refresh_challenge_progress(new.user_id, new.date);
  perform public.evaluate_achievements(new.user_id);

  return new;
end;
$$;

drop trigger if exists trg_on_daily_activity_gamification on public.daily_activity;
create trigger trg_on_daily_activity_gamification
  after insert or update of steps on public.daily_activity
  for each row
  execute function public.on_daily_activity_upserted();

-- 12. RPC: get_points_summary() -> total_points, week_points, today_points
create or replace function public.get_points_summary()
returns table (
  total_points bigint,
  week_points bigint,
  today_points bigint
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_today_start timestamptz := date_trunc('day', now() at time zone 'utc') at time zone 'utc';
  v_week_start timestamptz := date_trunc('week', now() at time zone 'utc') at time zone 'utc';
begin
  if v_user_id is null then
    return query select 0::bigint, 0::bigint, 0::bigint;
    return;
  end if;

  return query
  select
    coalesce(sum(pl.amount), 0)::bigint as total_points,
    coalesce(sum(pl.amount) filter (where pl.created_at >= v_week_start), 0)::bigint as week_points,
    coalesce(sum(pl.amount) filter (where pl.created_at >= v_today_start), 0)::bigint as today_points
  from public.points_ledger pl
  where pl.user_id = v_user_id;
end;
$$;

grant execute on function public.get_points_summary() to authenticated;

-- 13. RPC: set_challenge_difficulty(p_difficulty text) -> updates user difficulty & refreshes challenges
create or replace function public.set_challenge_difficulty(p_difficulty text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  if p_difficulty not in ('easy', 'standard') then
    raise exception 'Difficulty must be easy or standard';
  end if;

  update public.profiles
  set
    challenge_difficulty = p_difficulty,
    updated_at = now()
  where id = v_user_id;

  perform public.refresh_challenge_progress(v_user_id, (now() at time zone 'utc')::date);

  return p_difficulty;
end;
$$;

grant execute on function public.set_challenge_difficulty(text) to authenticated;

-- 14. Broadcast points_ledger, user_achievements, and challenge_progress over Supabase Realtime
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    begin
      alter publication supabase_realtime add table public.points_ledger;
    exception
      when duplicate_object then null;
    end;
    begin
      alter publication supabase_realtime add table public.user_achievements;
    exception
      when duplicate_object then null;
    end;
    begin
      alter publication supabase_realtime add table public.challenge_progress;
    exception
      when duplicate_object then null;
    end;
  end if;
end
$$;
