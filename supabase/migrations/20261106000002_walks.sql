-- Phase 3: GPS Walk Tracking
-- Creates the `walks` table with owner-only RLS and server-side sanity checks
-- (flags implausible average speeds > 4.2 m/s ~15 km/h as `is_suspicious`).

create table if not exists public.walks (
  id uuid primary key default gen_random_uuid(),
  client_id uuid unique not null,
  user_id uuid not null references public.profiles(id) on delete cascade,
  started_at timestamptz not null,
  ended_at timestamptz not null,
  duration_s integer not null check (duration_s >= 0),
  moving_time_s integer not null check (moving_time_s >= 0),
  distance_m numeric not null check (distance_m >= 0),
  avg_speed_mps numeric not null default 0 check (avg_speed_mps >= 0),
  route_polyline text not null default '',
  point_count integer not null default 0 check (point_count >= 0),
  status text not null default 'completed' check (status in ('completed')),
  is_suspicious boolean not null default false,
  created_at timestamptz not null default now(),
  constraint walks_valid_timestamps check (ended_at >= started_at)
);

create index if not exists idx_walks_user_started_at
  on public.walks (user_id, started_at desc);

-- Server-side sanity & anti-cheat trigger on walk insert
create or replace function public.validate_walk_before_insert()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_calc_speed numeric;
begin
  if new.ended_at < new.started_at then
    raise exception 'Walk ended_at cannot be earlier than started_at';
  end if;

  if new.distance_m < 0 or new.duration_s < 0 or new.moving_time_s < 0 then
    raise exception 'Walk distance and duration must be non-negative';
  end if;

  if new.moving_time_s > 0 then
    v_calc_speed := new.distance_m / new.moving_time_s;
  else
    v_calc_speed := 0;
  end if;

  new.avg_speed_mps := round(v_calc_speed, 3);

  -- Flag walks faster than ~15 km/h (4.2 m/s) or implausible distance jumps as suspicious
  if v_calc_speed > 4.2 or new.distance_m > 100000 then
    new.is_suspicious := true;
  else
    new.is_suspicious := false;
  end if;

  return new;
end;
$$;

drop trigger if exists check_walk_sanity on public.walks;
create trigger check_walk_sanity
  before insert on public.walks
  for each row
  execute function public.validate_walk_before_insert();

-- Row-Level Security (owner-only select, insert, delete)
alter table public.walks enable row level security;

drop policy if exists "Users can read own walks" on public.walks;
create policy "Users can read own walks"
  on public.walks
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own walks" on public.walks;
create policy "Users can insert own walks"
  on public.walks
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete own walks" on public.walks;
create policy "Users can delete own walks"
  on public.walks
  for delete
  to authenticated
  using (auth.uid() = user_id);

grant select, insert, delete on public.walks to authenticated;
