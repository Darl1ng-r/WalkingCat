-- Phase 10: Friends, Weekly Leaderboards, Milestone Activity Events & Opt-In Cat Card Sharing
-- Enforces strict privacy & anti-cheat rules:
-- - Walks, routes, sightings, and cats remain strictly owner-only.
-- - Calories never appear in leaderboards, activity events, or friend profiles.
-- - Shared cat cards never include `area_geohash` or coordinates.
-- - Leaderboard excludes `is_suspicious` walks, counts only health-sourced steps (`healthkit`/`health_connect`),
--   and caps daily steps at 60,000 while flagging outliers.

-- 1. Update privacy_settings defaults for friends-only features (share_cat_cards remains false / per-card opt-in)
alter table public.privacy_settings
  alter column show_on_friends_leaderboard set default true,
  alter column share_milestones_with_friends set default true,
  alter column discoverable_by_username set default true,
  alter column share_cat_cards set default false;

insert into public.app_config (key, value, description)
values
  ('leaderboard_max_daily_steps', '60000'::jsonb, 'Maximum daily steps counted toward the weekly friends leaderboard before capping and flagging as an outlier')
on conflict (key) do nothing;

-- 2. Friendships table (unique unordered pair, no self-friendship)
create table if not exists public.friendships (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.profiles(id) on delete cascade,
  addressee_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending' check (
    status in ('pending', 'accepted', 'declined', 'blocked')
  ),
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  constraint friendships_no_self check (requester_id <> addressee_id)
);

create unique index if not exists idx_friendships_unordered_pair
  on public.friendships (
    least(requester_id, addressee_id),
    greatest(requester_id, addressee_id)
  );

create index if not exists idx_friendships_requester
  on public.friendships (requester_id, status);

create index if not exists idx_friendships_addressee
  on public.friendships (addressee_id, status);

alter table public.friendships enable row level security;

-- Helper: is_friend(a, b) -> true when accepted friendship exists between a and b
create or replace function public.is_friend(p_a uuid, p_b uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.friendships f
    where f.status = 'accepted'
      and f.requester_id in (p_a, p_b)
      and f.addressee_id in (p_a, p_b)
      and p_a <> p_b
  );
$$;

grant execute on function public.is_friend(uuid, uuid) to authenticated, service_role;

-- Helper: is_blocked_between(a, b) -> true when either user has blocked the other
create or replace function public.is_blocked_between(p_a uuid, p_b uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.friendships f
    where f.status = 'blocked'
      and f.requester_id in (p_a, p_b)
      and f.addressee_id in (p_a, p_b)
  );
$$;

grant execute on function public.is_blocked_between(uuid, uuid) to authenticated, service_role;

-- RLS on friendships: users can see non-blocked friendships they are part of, or rows they blocked themselves
drop policy if exists "Users can read own friendships" on public.friendships;
create policy "Users can read own friendships"
  on public.friendships
  for select
  to authenticated
  using (
    (auth.uid() = requester_id or auth.uid() = addressee_id)
    and (status <> 'blocked' or auth.uid() = requester_id)
  );

revoke insert, update, delete on public.friendships from anon, authenticated;
grant select on public.friendships to authenticated;

-- 3. Public Profiles view (exposes ONLY id, username, display_name, avatar_url, created_at — never weight_kg)
create or replace view public.public_profiles
with (security_invoker = false)
as
select
  p.id,
  p.username::text as username,
  p.display_name,
  p.avatar_url,
  p.created_at
from public.profiles p
left join public.privacy_settings ps on ps.user_id = p.id
where
  auth.uid() is not null
  and not public.is_blocked_between(auth.uid(), p.id)
  and (
    p.id = auth.uid()
    or public.is_friend(auth.uid(), p.id)
    or coalesce(ps.discoverable_by_username, true) = true
    or exists (
      select 1
      from public.friendships f
      where f.status = 'pending'
        and f.requester_id in (auth.uid(), p.id)
        and f.addressee_id in (auth.uid(), p.id)
    )
  );

revoke all on public.public_profiles from anon;
grant select on public.public_profiles to authenticated, service_role;

-- 4. Friend Invites table & RPCs
create table if not exists public.friend_invites (
  code text primary key check (code ~ '^[A-Z0-9]{6,12}$'),
  user_id uuid not null references public.profiles(id) on delete cascade,
  expires_at timestamptz not null default (now() + interval '14 days'),
  uses integer not null default 0 check (uses >= 0),
  max_uses integer not null default 25 check (max_uses > 0),
  created_at timestamptz not null default now()
);

create index if not exists idx_friend_invites_user
  on public.friend_invites (user_id, expires_at desc);

alter table public.friend_invites enable row level security;

drop policy if exists "Users can read own friend invites" on public.friend_invites;
create policy "Users can read own friend invites"
  on public.friend_invites
  for select
  to authenticated
  using (auth.uid() = user_id);

revoke insert, update, delete on public.friend_invites from anon, authenticated;
grant select on public.friend_invites to authenticated;

create or replace function public.create_friend_invite()
returns public.friend_invites
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_existing public.friend_invites;
  v_chars constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  v_code text := '';
  v_i integer;
  v_created public.friend_invites;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  -- Reuse active invite if one exists with > 24h remaining and remaining uses
  select *
  into v_existing
  from public.friend_invites fi
  where fi.user_id = v_user_id
    and fi.expires_at > now() + interval '1 day'
    and fi.uses < fi.max_uses
  order by fi.expires_at desc
  limit 1;

  if v_existing.code is not null then
    return v_existing;
  end if;

  for v_i in 1..8 loop
    v_code := v_code || substr(v_chars, floor(random() * length(v_chars) + 1)::integer, 1);
  end loop;

  insert into public.friend_invites (code, user_id, expires_at, uses, max_uses)
  values (v_code, v_user_id, now() + interval '14 days', 0, 25)
  returning * into v_created;

  return v_created;
end;
$$;

grant execute on function public.create_friend_invite() to authenticated;

create or replace function public.redeem_friend_invite(p_code text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_clean_code text := upper(trim(coalesce(p_code, '')));
  v_invite public.friend_invites;
  v_existing public.friendships;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  select *
  into v_invite
  from public.friend_invites fi
  where fi.code = v_clean_code;

  if v_invite.code is null then
    raise exception 'Invalid invite code.';
  end if;

  if v_invite.expires_at < now() or v_invite.uses >= v_invite.max_uses then
    raise exception 'This invite code has expired.';
  end if;

  if v_invite.user_id = v_user_id then
    raise exception 'You cannot redeem your own invite code.';
  end if;

  if public.is_blocked_between(v_user_id, v_invite.user_id) then
    raise exception 'Cannot connect with this user.';
  end if;

  select *
  into v_existing
  from public.friendships f
  where least(f.requester_id, f.addressee_id) = least(v_user_id, v_invite.user_id)
    and greatest(f.requester_id, f.addressee_id) = greatest(v_user_id, v_invite.user_id);

  if v_existing.id is not null then
    if v_existing.status <> 'accepted' then
      update public.friendships
      set
        status = 'accepted',
        responded_at = now()
      where id = v_existing.id;
    end if;
  else
    insert into public.friendships (requester_id, addressee_id, status, responded_at)
    values (v_invite.user_id, v_user_id, 'accepted', now());
  end if;

  update public.friend_invites
  set uses = uses + 1
  where code = v_invite.code;

  return v_invite.user_id;
end;
$$;

grant execute on function public.redeem_friend_invite(text) to authenticated;

-- 5. Username Search & Friendship Action RPCs
create or replace function public.search_discoverable_users(p_query text)
returns table (
  id uuid,
  username text,
  display_name text,
  avatar_url text,
  friendship_status text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_q text := lower(trim(coalesce(p_query, '')));
begin
  if v_user_id is null or char_length(v_q) < 3 then
    return;
  end if;

  -- Strip leading '@' if typed
  if left(v_q, 1) = '@' then
    v_q := substr(v_q, 2);
  end if;

  if char_length(v_q) < 3 then
    return;
  end if;

  return query
  select
    p.id,
    p.username::text as username,
    p.display_name,
    p.avatar_url,
    f.status as friendship_status
  from public.profiles p
  left join public.privacy_settings ps on ps.user_id = p.id
  left join public.friendships f
    on least(f.requester_id, f.addressee_id) = least(v_user_id, p.id)
   and greatest(f.requester_id, f.addressee_id) = greatest(v_user_id, p.id)
  where p.id <> v_user_id
    and coalesce(ps.discoverable_by_username, true) = true
    and not public.is_blocked_between(v_user_id, p.id)
    and p.username::text ilike (v_q || '%')
  order by
    case when lower(p.username::text) = v_q then 0 else 1 end,
    p.username::text asc
  limit 20;
end;
$$;

grant execute on function public.search_discoverable_users(text) to authenticated;

create or replace function public.send_friend_request(p_target_user_id uuid)
returns public.friendships
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_existing public.friendships;
  v_result public.friendships;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  if p_target_user_id is null or p_target_user_id = v_user_id then
    raise exception 'Invalid user.';
  end if;

  if public.is_blocked_between(v_user_id, p_target_user_id) then
    raise exception 'Cannot send a friend request to this user.';
  end if;

  select *
  into v_existing
  from public.friendships f
  where least(f.requester_id, f.addressee_id) = least(v_user_id, p_target_user_id)
    and greatest(f.requester_id, f.addressee_id) = greatest(v_user_id, p_target_user_id);

  if v_existing.id is not null then
    if v_existing.status = 'accepted' then
      return v_existing;
    elsif v_existing.status = 'pending' and v_existing.addressee_id = v_user_id then
      -- Mutual request: accept immediately
      update public.friendships
      set status = 'accepted', responded_at = now()
      where id = v_existing.id
      returning * into v_result;
      return v_result;
    elsif v_existing.status = 'pending' then
      return v_existing;
    else
      -- Previously declined: re-open as pending from v_user_id
      update public.friendships
      set
        requester_id = v_user_id,
        addressee_id = p_target_user_id,
        status = 'pending',
        created_at = now(),
        responded_at = null
      where id = v_existing.id
      returning * into v_result;
      return v_result;
    end if;
  end if;

  insert into public.friendships (requester_id, addressee_id, status)
  values (v_user_id, p_target_user_id, 'pending')
  returning * into v_result;

  return v_result;
end;
$$;

grant execute on function public.send_friend_request(uuid) to authenticated;

create or replace function public.respond_friend_request(
  p_friendship_id uuid,
  p_decision text
)
returns public.friendships
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_row public.friendships;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  if p_decision not in ('accepted', 'declined') then
    raise exception 'Decision must be accepted or declined';
  end if;

  update public.friendships
  set
    status = p_decision,
    responded_at = now()
  where id = p_friendship_id
    and addressee_id = v_user_id
    and status = 'pending'
  returning * into v_row;

  if v_row.id is null then
    raise exception 'Friend request not found.';
  end if;

  return v_row;
end;
$$;

grant execute on function public.respond_friend_request(uuid, text) to authenticated;

create or replace function public.remove_or_cancel_friendship(p_other_user_id uuid)
returns void
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

  delete from public.friendships
  where least(requester_id, addressee_id) = least(v_user_id, p_other_user_id)
    and greatest(requester_id, addressee_id) = greatest(v_user_id, p_other_user_id)
    and status in ('pending', 'accepted', 'declined');
end;
$$;

grant execute on function public.remove_or_cancel_friendship(uuid) to authenticated;

create or replace function public.block_user(p_target_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_existing_id uuid;
begin
  if v_user_id is null or p_target_user_id is null or v_user_id = p_target_user_id then
    raise exception 'Invalid block request';
  end if;

  select f.id
  into v_existing_id
  from public.friendships f
  where least(f.requester_id, f.addressee_id) = least(v_user_id, p_target_user_id)
    and greatest(f.requester_id, f.addressee_id) = greatest(v_user_id, p_target_user_id);

  if v_existing_id is not null then
    update public.friendships
    set
      requester_id = v_user_id,
      addressee_id = p_target_user_id,
      status = 'blocked',
      responded_at = now()
    where id = v_existing_id;
  else
    insert into public.friendships (requester_id, addressee_id, status, responded_at)
    values (v_user_id, p_target_user_id, 'blocked', now());
  end if;
end;
$$;

grant execute on function public.block_user(uuid) to authenticated;

-- 6. Activity Events (milestones only; no routes, no coordinates, no calories) & Reactions
create table if not exists public.activity_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null check (
    type in (
      'walk_completed',
      'achievement_unlocked',
      'collection_milestone',
      'challenge_completed',
      'cat_card_shared'
    )
  ),
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_activity_events_user_created
  on public.activity_events (user_id, created_at desc);

alter table public.activity_events enable row level security;

drop policy if exists "Users and friends can read activity events" on public.activity_events;
create policy "Users and friends can read activity events"
  on public.activity_events
  for select
  to authenticated
  using (
    auth.uid() = user_id
    or public.is_friend(auth.uid(), user_id)
  );

revoke insert, update, delete on public.activity_events from anon, authenticated;
grant select on public.activity_events to authenticated;

create table if not exists public.reactions (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.activity_events(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  emoji text not null check (emoji in ('👏', '🐾', '❤️', '🔥')),
  created_at timestamptz not null default now(),
  constraint reactions_unique_user_event unique (event_id, user_id)
);

create index if not exists idx_reactions_event
  on public.reactions (event_id);

alter table public.reactions enable row level security;

drop policy if exists "Users and friends can read reactions" on public.reactions;
create policy "Users and friends can read reactions"
  on public.reactions
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.activity_events ae
      where ae.id = event_id
        and (ae.user_id = auth.uid() or public.is_friend(auth.uid(), ae.user_id))
    )
  );

drop policy if exists "Users can insert own reactions on visible events" on public.reactions;
create policy "Users can insert own reactions on visible events"
  on public.reactions
  for insert
  to authenticated
  with check (
    auth.uid() = user_id
    and exists (
      select 1
      from public.activity_events ae
      where ae.id = event_id
        and (ae.user_id = auth.uid() or public.is_friend(auth.uid(), ae.user_id))
    )
  );

drop policy if exists "Users can update own reactions" on public.reactions;
create policy "Users can update own reactions"
  on public.reactions
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete own reactions" on public.reactions;
create policy "Users can delete own reactions"
  on public.reactions
  for delete
  to authenticated
  using (auth.uid() = user_id);

grant select, insert, update, delete on public.reactions to authenticated;

-- Helper: checks if user has `share_milestones_with_friends` enabled
create or replace function public.should_emit_milestone_event(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select ps.share_milestones_with_friends from public.privacy_settings ps where ps.user_id = p_user_id),
    true
  );
$$;

-- Trigger 6a: Emit walk_completed milestone event (distance + duration only; NEVER polyline/coords/kcal)
create or replace function public.trg_emit_walk_milestone_event()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.is_suspicious = false
     and new.distance_m >= 500
     and public.should_emit_milestone_event(new.user_id)
  then
    insert into public.activity_events (user_id, type, payload)
    values (
      new.user_id,
      'walk_completed',
      jsonb_build_object(
        'walk_id', new.id,
        'distance_m', round(new.distance_m),
        'moving_time_s', new.moving_time_s
      )
    );
  end if;
  return new;
end;
$$;

drop trigger if exists trg_after_walk_emit_milestone on public.walks;
create trigger trg_after_walk_emit_milestone
  after insert on public.walks
  for each row
  execute function public.trg_emit_walk_milestone_event();

-- Trigger 6b: Emit achievement_unlocked milestone event
create or replace function public.trg_emit_achievement_milestone_event()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_ach record;
begin
  if public.should_emit_milestone_event(new.user_id) then
    select a.title, a.icon, a.points
    into v_ach
    from public.achievements a
    where a.id = new.achievement_id;

    if v_ach.title is not null then
      insert into public.activity_events (user_id, type, payload)
      values (
        new.user_id,
        'achievement_unlocked',
        jsonb_build_object(
          'achievement_id', new.achievement_id,
          'title', v_ach.title,
          'icon', v_ach.icon,
          'points', v_ach.points
        )
      );
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_after_achievement_emit_milestone on public.user_achievements;
create trigger trg_after_achievement_emit_milestone
  after insert on public.user_achievements
  for each row
  execute function public.trg_emit_achievement_milestone_event();

-- Trigger 6c: Emit collection_milestone event when user reaches 1, 5, 10, 25, 50 cats
create or replace function public.trg_emit_collection_milestone_event()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_cats_count integer;
begin
  if public.should_emit_milestone_event(new.user_id) then
    select count(*)::integer
    into v_cats_count
    from public.cats c
    where c.user_id = new.user_id;

    if v_cats_count in (1, 5, 10, 25, 50) then
      insert into public.activity_events (user_id, type, payload)
      values (
        new.user_id,
        'collection_milestone',
        jsonb_build_object('cats_count', v_cats_count)
      );
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_after_cat_emit_milestone on public.cats;
create trigger trg_after_cat_emit_milestone
  after insert on public.cats
  for each row
  execute function public.trg_emit_collection_milestone_event();

-- Trigger 6d: Emit challenge_completed milestone event
create or replace function public.trg_emit_challenge_milestone_event()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_ch record;
begin
  if new.completed_at is not null
     and (tg_op = 'INSERT' or old.completed_at is null)
     and public.should_emit_milestone_event(new.user_id)
  then
    select c.title, c.icon, c.period
    into v_ch
    from public.challenge_instances ci
    join public.challenges c on c.id = ci.challenge_id
    where ci.id = new.instance_id;

    if v_ch.title is not null then
      insert into public.activity_events (user_id, type, payload)
      values (
        new.user_id,
        'challenge_completed',
        jsonb_build_object(
          'instance_id', new.instance_id,
          'title', v_ch.title,
          'icon', v_ch.icon,
          'period', v_ch.period
        )
      );
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_after_challenge_emit_milestone on public.challenge_progress;
create trigger trg_after_challenge_emit_milestone
  after insert or update of completed_at on public.challenge_progress
  for each row
  execute function public.trg_emit_challenge_milestone_event();

-- 7. RPC: share_cat_card_to_friends(p_cat_id uuid) -> opt-in per-card share (no area_geohash, no coordinates)
create or replace function public.share_cat_card_to_friends(p_cat_id uuid)
returns public.activity_events
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_cat public.cats;
  v_photo_path text;
  v_event public.activity_events;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  select *
  into v_cat
  from public.cats c
  where c.id = p_cat_id
    and c.user_id = v_user_id;

  if v_cat.id is null then
    raise exception 'Cat card not found or not owned by you.';
  end if;

  v_photo_path := v_cat.cover_photo_path;
  if v_photo_path is null and v_cat.cover_sighting_id is not null then
    select s.photo_path
    into v_photo_path
    from public.sightings s
    where s.id = v_cat.cover_sighting_id;
  end if;

  insert into public.activity_events (user_id, type, payload)
  values (
    v_user_id,
    'cat_card_shared',
    jsonb_build_object(
      'cat_id', v_cat.id,
      'card_number', v_cat.card_number,
      'nickname', v_cat.nickname,
      'sighting_count', v_cat.sighting_count,
      'cover_photo_path', v_photo_path
    )
  )
  returning * into v_event;

  return v_event;
end;
$$;

grant execute on function public.share_cat_card_to_friends(uuid) to authenticated;

-- 8. Weekly Friends Leaderboard RPC (Metrics: steps, distance_m, walks, challenge_points; Calories excluded!)
create or replace function public.get_friends_leaderboard(
  p_metric text,
  p_week_start date default date_trunc('week', (now() at time zone 'utc'))::date
)
returns table (
  rank integer,
  user_id uuid,
  username text,
  display_name text,
  avatar_url text,
  value numeric,
  is_self boolean,
  has_outlier boolean
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_week_end date := p_week_start + 6;
  v_max_daily_steps integer;
begin
  if v_user_id is null then
    return;
  end if;

  if p_metric not in ('steps', 'distance_m', 'walks', 'challenge_points') then
    raise exception 'Unsupported leaderboard metric: %. Calories are never compared.', p_metric;
  end if;

  v_max_daily_steps := public.get_config_int('leaderboard_max_daily_steps', 60000);

  return query
  with eligible_users as (
    select
      p.id as uid,
      p.username::text as uname,
      p.display_name as dname,
      p.avatar_url as aurl
    from public.profiles p
    left join public.privacy_settings ps on ps.user_id = p.id
    where (
      p.id = v_user_id
      or (
        public.is_friend(v_user_id, p.id)
        and coalesce(ps.show_on_friends_leaderboard, true) = true
        and not public.is_blocked_between(v_user_id, p.id)
      )
    )
  ),
  aggregated as (
    select
      eu.uid,
      eu.uname,
      eu.dname,
      eu.aurl,
      case
        when p_metric = 'steps' then coalesce((
          select sum(least(da.steps, v_max_daily_steps))::numeric
          from public.daily_activity da
          where da.user_id = eu.uid
            and da.date between p_week_start and v_week_end
            and da.source in ('healthkit', 'health_connect')
        ), 0)
        when p_metric = 'distance_m' then coalesce((
          select round(sum(w.distance_m))::numeric
          from public.walks w
          where w.user_id = eu.uid
            and w.is_suspicious = false
            and (w.started_at at time zone 'utc')::date between p_week_start and v_week_end
        ), 0)
        when p_metric = 'walks' then coalesce((
          select count(*)::numeric
          from public.walks w
          where w.user_id = eu.uid
            and w.is_suspicious = false
            and (w.started_at at time zone 'utc')::date between p_week_start and v_week_end
        ), 0)
        when p_metric = 'challenge_points' then coalesce((
          select sum(pl.amount)::numeric
          from public.points_ledger pl
          where pl.user_id = eu.uid
            and pl.source_type = 'challenge'
            and (pl.created_at at time zone 'utc')::date between p_week_start and v_week_end
        ), 0)
        else 0
      end as metric_value,
      case
        when p_metric = 'steps' then exists (
          select 1
          from public.daily_activity da
          where da.user_id = eu.uid
            and da.date between p_week_start and v_week_end
            and da.source in ('healthkit', 'health_connect')
            and da.steps > v_max_daily_steps
        )
        else false
      end as outlier_flag
    from eligible_users eu
  )
  select
    row_number() over (order by a.metric_value desc, coalesce(a.dname, a.uname) asc)::integer as rank,
    a.uid as user_id,
    a.uname as username,
    a.dname as display_name,
    a.aurl as avatar_url,
    a.metric_value as value,
    (a.uid = v_user_id) as is_self,
    a.outlier_flag as has_outlier
  from aggregated a
  order by rank asc;
end;
$$;

grant execute on function public.get_friends_leaderboard(text, date) to authenticated;

-- 9. Friend Profile Summary RPC (display name, username, achievements count, this week's opted-in stats)
create or replace function public.get_friend_profile_summary(p_friend_id uuid)
returns table (
  user_id uuid,
  username text,
  display_name text,
  avatar_url text,
  member_since timestamptz,
  achievements_count integer,
  show_on_leaderboard boolean,
  week_steps numeric,
  week_distance_m numeric,
  week_walks numeric,
  week_challenge_points numeric
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_caller uuid := auth.uid();
  v_week_start date := date_trunc('week', (now() at time zone 'utc'))::date;
  v_week_end date := v_week_start + 6;
  v_max_daily_steps integer := public.get_config_int('leaderboard_max_daily_steps', 60000);
  v_show_stats boolean;
begin
  if v_caller is null or p_friend_id is null then
    return;
  end if;

  if p_friend_id <> v_caller and not public.is_friend(v_caller, p_friend_id) then
    return;
  end if;

  if public.is_blocked_between(v_caller, p_friend_id) then
    return;
  end if;

  select coalesce(ps.show_on_friends_leaderboard, true)
  into v_show_stats
  from public.privacy_settings ps
  where ps.user_id = p_friend_id;

  v_show_stats := coalesce(v_show_stats, true);

  return query
  select
    p.id as user_id,
    p.username::text as username,
    p.display_name,
    p.avatar_url,
    p.created_at as member_since,
    (
      select count(*)::integer
      from public.user_achievements ua
      where ua.user_id = p.id
    ) as achievements_count,
    v_show_stats as show_on_leaderboard,
    case
      when v_show_stats then coalesce((
        select sum(least(da.steps, v_max_daily_steps))::numeric
        from public.daily_activity da
        where da.user_id = p.id
          and da.date between v_week_start and v_week_end
          and da.source in ('healthkit', 'health_connect')
      ), 0)
      else 0
    end as week_steps,
    case
      when v_show_stats then coalesce((
        select round(sum(w.distance_m))::numeric
        from public.walks w
        where w.user_id = p.id
          and w.is_suspicious = false
          and (w.started_at at time zone 'utc')::date between v_week_start and v_week_end
      ), 0)
      else 0
    end as week_distance_m,
    case
      when v_show_stats then coalesce((
        select count(*)::numeric
        from public.walks w
        where w.user_id = p.id
          and w.is_suspicious = false
          and (w.started_at at time zone 'utc')::date between v_week_start and v_week_end
      ), 0)
      else 0
    end as week_walks,
    case
      when v_show_stats then coalesce((
        select sum(pl.amount)::numeric
        from public.points_ledger pl
        where pl.user_id = p.id
          and pl.source_type = 'challenge'
          and (pl.created_at at time zone 'utc')::date between v_week_start and v_week_end
      ), 0)
      else 0
    end as week_challenge_points
  from public.profiles p
  where p.id = p_friend_id;
end;
$$;

grant execute on function public.get_friend_profile_summary(uuid) to authenticated;

-- 10. Broadcast friendships, activity_events, and reactions over Supabase Realtime
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    begin
      alter publication supabase_realtime add table public.friendships;
    exception
      when duplicate_object then null;
    end;
    begin
      alter publication supabase_realtime add table public.activity_events;
    exception
      when duplicate_object then null;
    end;
    begin
      alter publication supabase_realtime add table public.reactions;
    exception
      when duplicate_object then null;
    end;
  end if;
end
$$;
