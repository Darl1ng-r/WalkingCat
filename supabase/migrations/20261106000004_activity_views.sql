-- Phase 5: Walk History & Activity Dashboard
-- Ensures the (user_id, started_at desc) index on walks and provides
-- `get_activity_summary(p_from, p_to, p_tz_offset_minutes)` scoped to auth.uid().

create index if not exists idx_walks_user_started_at
  on public.walks (user_id, started_at desc);

create or replace function public.get_activity_summary(
  p_from date,
  p_to date,
  p_tz_offset_minutes integer default 0
)
returns table (
  date date,
  walks_count integer,
  distance_m numeric,
  moving_time_s integer,
  steps integer
)
language sql
stable
security invoker
set search_path = ''
as $$
  with days as (
    select generate_series(p_from, p_to, interval '1 day')::date as day_date
  ),
  walk_Rollup as (
    select
      ((w.started_at + make_interval(mins => coalesce(p_tz_offset_minutes, 0))) at time zone 'UTC')::date as local_date,
      count(*)::integer as walks_count,
      coalesce(sum(w.distance_m), 0)::numeric as distance_m,
      coalesce(sum(w.moving_time_s), 0)::integer as moving_time_s,
      coalesce(sum(w.steps), 0)::integer as walk_steps
    from public.walks w
    where w.user_id = auth.uid()
      and w.is_suspicious = false
      and ((w.started_at + make_interval(mins => coalesce(p_tz_offset_minutes, 0))) at time zone 'UTC')::date
          between p_from and p_to
    group by 1
  ),
  daily_health as (
    select
      da.date as local_date,
      da.steps
    from public.daily_activity da
    where da.user_id = auth.uid()
      and da.date between p_from and p_to
  )
  select
    d.day_date as date,
    coalesce(wr.walks_count, 0)::integer as walks_count,
    coalesce(wr.distance_m, 0)::numeric as distance_m,
    coalesce(wr.moving_time_s, 0)::integer as moving_time_s,
    greatest(coalesce(dh.steps, 0), coalesce(wr.walk_steps, 0))::integer as steps
  from days d
  left join walk_Rollup wr on wr.local_date = d.day_date
  left join daily_health dh on dh.local_date = d.day_date
  order by d.day_date asc;
$$;

grant execute on function public.get_activity_summary(date, date, integer) to authenticated;
