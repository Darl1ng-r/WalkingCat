-- Phase 8: Personal Cat Collection
-- Creates `public.cats`, idempotent trigger creating a cat card whenever a sighting
-- transitions to `accepted` (with `cat_id is null`), aggregate maintenance on delete,
-- and owner-checked `link_sighting_to_cat` / `unlink_sighting` RPCs.

create table if not exists public.cats (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  card_number integer not null default 1 check (card_number >= 1),
  nickname text check (nickname is null or (char_length(trim(nickname)) between 1 and 30)),
  cover_sighting_id uuid references public.sightings(id) on delete set null,
  cover_photo_path text,
  sighting_count integer not null default 1 check (sighting_count >= 1),
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  area_geohash text check (area_geohash is null or char_length(area_geohash) <= 5),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_cats_user_created_at
  on public.cats (user_id, created_at desc);

create index if not exists idx_cats_user_sighting_count
  on public.cats (user_id, sighting_count desc, last_seen_at desc);

-- Link sightings.cat_id to public.cats(id)
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'sightings_cat_id_fkey'
  ) then
    alter table public.sightings
      add constraint sightings_cat_id_fkey
      foreign key (cat_id) references public.cats(id) on delete set null;
  end if;
end
$$;

create index if not exists idx_sightings_cat_id
  on public.sightings (cat_id, taken_at desc)
  where cat_id is not null;

-- Helper: recompute cat aggregates from its accepted sightings, or delete if 0 remain
create or replace function public.recompute_cat_aggregates(p_cat_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer;
  v_first_seen timestamptz;
  v_last_seen timestamptz;
  v_cover_id uuid;
  v_cover_path text;
  v_geohash text;
begin
  if p_cat_id is null then
    return;
  end if;

  select
    count(*)::integer,
    min(s.taken_at),
    max(s.taken_at)
  into v_count, v_first_seen, v_last_seen
  from public.sightings s
  where s.cat_id = p_cat_id
    and s.status = 'accepted';

  if coalesce(v_count, 0) = 0 then
    delete from public.cats where id = p_cat_id;
    return;
  end if;

  -- Latest accepted sighting is used for cover photo; earliest geohash is preserved
  select s.id, s.photo_path
  into v_cover_id, v_cover_path
  from public.sightings s
  where s.cat_id = p_cat_id
    and s.status = 'accepted'
  order by s.taken_at desc, s.created_at desc
  limit 1;

  select s.area_geohash
  into v_geohash
  from public.sightings s
  where s.cat_id = p_cat_id
    and s.status = 'accepted'
    and s.area_geohash is not null
  order by s.taken_at asc
  limit 1;

  update public.cats
  set
    sighting_count = v_count,
    first_seen_at = v_first_seen,
    last_seen_at = v_last_seen,
    cover_sighting_id = v_cover_id,
    cover_photo_path = v_cover_path,
    area_geohash = coalesce(v_geohash, area_geohash),
    updated_at = now()
  where id = p_cat_id;
end;
$$;

-- Trigger function: when a sighting becomes 'accepted' and has no cat_id, create a new cat card
create or replace function public.handle_sighting_accepted_cat()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_next_number integer;
  v_new_cat_id uuid;
begin
  if new.status = 'accepted' and new.cat_id is null then
    select coalesce(max(c.card_number), 0) + 1
    into v_next_number
    from public.cats c
    where c.user_id = new.user_id;

    insert into public.cats (
      user_id,
      card_number,
      nickname,
      cover_sighting_id,
      cover_photo_path,
      sighting_count,
      first_seen_at,
      last_seen_at,
      area_geohash
    )
    values (
      new.user_id,
      v_next_number,
      null,
      null,
      new.photo_path,
      1,
      new.taken_at,
      new.taken_at,
      new.area_geohash
    )
    returning id into v_new_cat_id;

    new.cat_id := v_new_cat_id;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_sighting_accepted_create_cat on public.sightings;
create trigger trg_sighting_accepted_create_cat
  before insert or update of status on public.sightings
  for each row
  execute function public.handle_sighting_accepted_cat();

-- After trigger to set cover_sighting_id once the sighting row is committed
create or replace function public.handle_sighting_after_cat_sync()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    if old.cat_id is not null then
      perform public.recompute_cat_aggregates(old.cat_id);
    end if;
    return old;
  end if;

  if new.status = 'accepted' and new.cat_id is not null then
    perform public.recompute_cat_aggregates(new.cat_id);
  end if;

  return new;
end;
$$;

drop trigger if exists trg_sighting_after_cat_sync on public.sightings;
create trigger trg_sighting_after_cat_sync
  after insert or update of status, cat_id or delete on public.sightings
  for each row
  execute function public.handle_sighting_after_cat_sync();

-- RPC: Manually link an accepted sighting to an existing cat owned by the same user
create or replace function public.link_sighting_to_cat(
  p_sighting_id uuid,
  p_cat_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_sighting public.sightings;
  v_target_cat public.cats;
  v_old_cat_id uuid;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  select * into v_sighting
  from public.sightings
  where id = p_sighting_id
    and user_id = v_user_id;

  if v_sighting.id is null then
    raise exception 'Sighting not found or access denied';
  end if;

  if v_sighting.status <> 'accepted' then
    raise exception 'Only accepted sightings can be linked to a cat card';
  end if;

  select * into v_target_cat
  from public.cats
  where id = p_cat_id
    and user_id = v_user_id;

  if v_target_cat.id is null then
    raise exception 'Target cat card not found or access denied';
  end if;

  v_old_cat_id := v_sighting.cat_id;
  if v_old_cat_id = p_cat_id then
    return p_cat_id;
  end if;

  update public.sightings
  set cat_id = p_cat_id
  where id = p_sighting_id;

  perform public.recompute_cat_aggregates(p_cat_id);
  if v_old_cat_id is not null then
    perform public.recompute_cat_aggregates(v_old_cat_id);
  end if;

  return p_cat_id;
end;
$$;

grant execute on function public.link_sighting_to_cat(uuid, uuid) to authenticated;

-- RPC: Unlink a sighting from a multi-sighting cat into its own fresh cat card
create or replace function public.unlink_sighting(
  p_sighting_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_sighting public.sightings;
  v_old_cat_id uuid;
  v_old_count integer;
  v_next_number integer;
  v_new_cat_id uuid;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  select * into v_sighting
  from public.sightings
  where id = p_sighting_id
    and user_id = v_user_id;

  if v_sighting.id is null then
    raise exception 'Sighting not found or access denied';
  end if;

  v_old_cat_id := v_sighting.cat_id;
  if v_old_cat_id is not null then
    select count(*)::integer into v_old_count
    from public.sightings
    where cat_id = v_old_cat_id
      and status = 'accepted';

    if coalesce(v_old_count, 0) <= 1 then
      return v_old_cat_id;
    end if;
  end if;

  select coalesce(max(c.card_number), 0) + 1
  into v_next_number
  from public.cats c
  where c.user_id = v_user_id;

  insert into public.cats (
    user_id,
    card_number,
    nickname,
    cover_sighting_id,
    cover_photo_path,
    sighting_count,
    first_seen_at,
    last_seen_at,
    area_geohash
  )
  values (
    v_user_id,
    v_next_number,
    null,
    v_sighting.id,
    v_sighting.photo_path,
    1,
    v_sighting.taken_at,
    v_sighting.taken_at,
    v_sighting.area_geohash
  )
  returning id into v_new_cat_id;

  update public.sightings
  set cat_id = v_new_cat_id
  where id = p_sighting_id;

  if v_old_cat_id is not null then
    perform public.recompute_cat_aggregates(v_old_cat_id);
  end if;

  return v_new_cat_id;
end;
$$;

grant execute on function public.unlink_sighting(uuid) to authenticated;

-- Row-Level Security on `public.cats` (owner-only read, update nickname, delete)
alter table public.cats enable row level security;

drop policy if exists "Users can read own cats" on public.cats;
create policy "Users can read own cats"
  on public.cats
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can update own cats" on public.cats;
create policy "Users can update own cats"
  on public.cats
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete own cats" on public.cats;
create policy "Users can delete own cats"
  on public.cats
  for delete
  to authenticated
  using (auth.uid() = user_id);

grant select, update, delete on public.cats to authenticated;
