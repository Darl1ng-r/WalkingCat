-- Phase 13A: Collectible Cat Card Themes & Profile Cosmetics
-- Sets up:
-- 1. `cosmetic_items` catalog (card themes, profile banners, walker titles)
-- 2. `user_cosmetics` unlocked inventory with `points_spent` tracking
-- 3. `cats.theme_id`, `profiles.equipped_banner_id`, `profiles.equipped_title_id`
-- 4. Server-authoritative RPCs: `get_cosmetics_wallet`, `unlock_cosmetic`,
--    `equip_cat_card_theme`, `equip_profile_cosmetic`
-- 5. Updates `share_cat_card_to_friends`, `public_profiles`, `get_friend_profile_summary`,
--    and `export_user_account_data`

-- 1. Cosmetics Catalog Table
create table if not exists public.cosmetic_items (
  id text primary key,
  category text not null check (
    category in ('card_theme', 'profile_banner', 'profile_title')
  ),
  name text not null,
  description text not null,
  icon text not null,
  cost_points integer not null check (cost_points >= 0),
  rarity text not null check (
    rarity in ('starter', 'common', 'rare', 'epic', 'legendary')
  ),
  metadata jsonb not null default '{}'::jsonb,
  sort_order integer not null default 0
);

alter table public.cosmetic_items enable row level security;

drop policy if exists "Authenticated users can read cosmetic catalog" on public.cosmetic_items;
create policy "Authenticated users can read cosmetic catalog"
  on public.cosmetic_items
  for select
  to authenticated
  using (true);

grant select on public.cosmetic_items to authenticated, service_role;

-- Seed Cosmetic Catalog
insert into public.cosmetic_items (
  id, category, name, description, icon, cost_points, rarity, metadata, sort_order
)
values
  -- Card Themes
  (
    'theme_classic_amber',
    'card_theme',
    'Classic Amber',
    'Warm terracotta frame for everyday neighborhood discoveries.',
    '🐾',
    0,
    'starter',
    '{"border_class":"border-border dark:border-border-dark","surface_class":"bg-surface dark:bg-surface-dark","badge_class":"bg-primary","accent_label":null,"foil":false}'::jsonb,
    10
  ),
  (
    'theme_forest_moss',
    'card_theme',
    'Botanical Moss',
    'Earthy sage-green frame inspired by leafy park strolls.',
    '🌿',
    50,
    'common',
    '{"border_class":"border-2 border-emerald-600/70 dark:border-emerald-400/70","surface_class":"bg-emerald-50/70 dark:bg-emerald-950/30","badge_class":"bg-emerald-600","accent_label":"🌿 Park Edition","foil":false}'::jsonb,
    20
  ),
  (
    'theme_sunset_coral',
    'card_theme',
    'Golden Hour Coral',
    'Soft dusk frame for evening twilight walks.',
    '🌅',
    100,
    'rare',
    '{"border_class":"border-2 border-amber-500/80 dark:border-amber-400/80","surface_class":"bg-amber-50/80 dark:bg-amber-950/30","badge_class":"bg-amber-600","accent_label":"🌅 Sunset Edition","foil":false}'::jsonb,
    30
  ),
  (
    'theme_sakura_blossom',
    'card_theme',
    'Sakura Blossom',
    'Delicate petal-pink border with spring blossom accents.',
    '🌸',
    125,
    'rare',
    '{"border_class":"border-2 border-pink-400/80 dark:border-pink-400/70","surface_class":"bg-pink-50/70 dark:bg-pink-950/30","badge_class":"bg-pink-500","accent_label":"🌸 Blossom","foil":false}'::jsonb,
    40
  ),
  (
    'theme_starlight_cosmic',
    'card_theme',
    'Midnight Starlight',
    'Deep indigo cosmic frame with stardust shimmer.',
    '✨',
    200,
    'epic',
    '{"border_class":"border-2 border-indigo-500 dark:border-indigo-400","surface_class":"bg-indigo-50/80 dark:bg-indigo-950/40","badge_class":"bg-indigo-600","accent_label":"✨ Starlight Foil","foil":true}'::jsonb,
    50
  ),
  (
    'theme_golden_foil',
    'card_theme',
    'Royal Gold Foil',
    'Collector’s holographic gold foil frame for treasured felines.',
    '👑',
    350,
    'legendary',
    '{"border_class":"border-2 border-yellow-500 dark:border-yellow-400","surface_class":"bg-yellow-50/90 dark:bg-yellow-950/40","badge_class":"bg-yellow-600","accent_label":"👑 Collector Foil","foil":true}'::jsonb,
    60
  ),

  -- Profile Banners
  (
    'banner_meadow',
    'profile_banner',
    'Morning Meadow',
    'Fresh sunlit greenery for every walker.',
    '🌱',
    0,
    'starter',
    '{"banner_class":"bg-primary-muted/40 border-border dark:bg-surface-dark dark:border-border-dark"}'::jsonb,
    110
  ),
  (
    'banner_cozy_rooftops',
    'profile_banner',
    'Cozy Rooftops',
    'Warm terracotta tiles where neighborhood cats nap.',
    '🏘️',
    60,
    'common',
    '{"banner_class":"bg-amber-100/70 border-amber-400/60 dark:bg-amber-950/40 dark:border-amber-500/50"}'::jsonb,
    120
  ),
  (
    'banner_twilight_harbor',
    'profile_banner',
    'Twilight Harbor',
    'Calm coastal breeze and evening lantern glow.',
    '🌊',
    120,
    'rare',
    '{"banner_class":"bg-sky-100/70 border-sky-400/60 dark:bg-sky-950/40 dark:border-sky-500/50"}'::jsonb,
    130
  ),
  (
    'banner_aurora_sky',
    'profile_banner',
    'Aurora Night Walk',
    'Luminous northern lights over quiet evening paths.',
    '🌌',
    220,
    'epic',
    '{"banner_class":"bg-indigo-100/80 border-indigo-500/70 dark:bg-indigo-950/50 dark:border-indigo-400/60"}'::jsonb,
    140
  ),

  -- Profile Titles
  (
    'title_stroller',
    'profile_title',
    'Neighborhood Stroller',
    'Default friendly walker title.',
    '👟',
    0,
    'starter',
    '{"title_label":"👟 Neighborhood Stroller"}'::jsonb,
    210
  ),
  (
    'title_cat_spotter',
    'profile_title',
    'Gentle Cat Spotter',
    'For walkers who always keep a respectful distance.',
    '🔭',
    40,
    'common',
    '{"title_label":"🔭 Gentle Cat Spotter"}'::jsonb,
    220
  ),
  (
    'title_rain_or_shine',
    'profile_title',
    'Rain or Shine Walker',
    'Steady steps in every season.',
    '🌦️',
    90,
    'rare',
    '{"title_label":"🌦️ Rain or Shine Walker"}'::jsonb,
    230
  ),
  (
    'title_feline_chronicler',
    'profile_title',
    'Feline Chronicler',
    'Curator of a distinguished cat card album.',
    '📖',
    180,
    'epic',
    '{"title_label":"📖 Feline Chronicler"}'::jsonb,
    240
  ),
  (
    'title_legend_of_the_ave',
    'profile_title',
    'Guardian of the Avenue',
    'Master walker and friend to all community cats.',
    '🏆',
    300,
    'legendary',
    '{"title_label":"🏆 Guardian of the Avenue"}'::jsonb,
    250
  )
on conflict (id) do update
set
  category = excluded.category,
  name = excluded.name,
  description = excluded.description,
  icon = excluded.icon,
  cost_points = excluded.cost_points,
  rarity = excluded.rarity,
  metadata = excluded.metadata,
  sort_order = excluded.sort_order;

-- 2. User Unlocked Cosmetics Table
create table if not exists public.user_cosmetics (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  cosmetic_id text not null references public.cosmetic_items(id) on delete cascade,
  points_spent integer not null default 0 check (points_spent >= 0),
  unlocked_at timestamptz not null default now(),
  constraint user_cosmetics_unique_key unique (user_id, cosmetic_id)
);

create index if not exists idx_user_cosmetics_user
  on public.user_cosmetics (user_id, unlocked_at desc);

alter table public.user_cosmetics enable row level security;

drop policy if exists "Users can read own unlocked cosmetics" on public.user_cosmetics;
create policy "Users can read own unlocked cosmetics"
  on public.user_cosmetics
  for select
  to authenticated
  using (auth.uid() = user_id);

revoke all on public.user_cosmetics from anon, authenticated;
grant select on public.user_cosmetics to authenticated;
grant all on public.user_cosmetics to service_role;

-- 3. Add Equipped Cosmetic Columns to `cats` and `profiles`
alter table public.cats
  add column if not exists theme_id text not null default 'theme_classic_amber'
  references public.cosmetic_items(id);

alter table public.profiles
  add column if not exists equipped_banner_id text not null default 'banner_meadow'
  references public.cosmetic_items(id);

alter table public.profiles
  add column if not exists equipped_title_id text not null default 'title_stroller'
  references public.cosmetic_items(id);

-- 4. RPC: get_cosmetics_wallet() -> total_earned_points, total_spent_points, available_points
create or replace function public.get_cosmetics_wallet()
returns table (
  total_earned_points bigint,
  total_spent_points bigint,
  available_points bigint
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_earned bigint;
  v_spent bigint;
begin
  if v_user_id is null then
    return query select 0::bigint, 0::bigint, 0::bigint;
    return;
  end if;

  select coalesce(sum(pl.amount), 0)::bigint
  into v_earned
  from public.points_ledger pl
  where pl.user_id = v_user_id;

  select coalesce(sum(uc.points_spent), 0)::bigint
  into v_spent
  from public.user_cosmetics uc
  where uc.user_id = v_user_id;

  return query select v_earned, v_spent, greatest(0::bigint, v_earned - v_spent);
end;
$$;

grant execute on function public.get_cosmetics_wallet() to authenticated;

-- 5. RPC: unlock_cosmetic(p_cosmetic_id text) -> idempotent server-checked purchase
create or replace function public.unlock_cosmetic(p_cosmetic_id text)
returns table (
  cosmetic_id text,
  points_spent integer,
  available_points bigint,
  already_unlocked boolean
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_item public.cosmetic_items;
  v_existing public.user_cosmetics;
  v_earned bigint;
  v_spent bigint;
  v_available bigint;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  -- Lock user profile row to serialize concurrent unlock requests
  perform 1 from public.profiles p where p.id = v_user_id for update;

  select *
  into v_item
  from public.cosmetic_items ci
  where ci.id = p_cosmetic_id;

  if v_item.id is null then
    raise exception 'Cosmetic item not found';
  end if;

  -- Check if already unlocked
  select *
  into v_existing
  from public.user_cosmetics uc
  where uc.user_id = v_user_id
    and uc.cosmetic_id = p_cosmetic_id;

  select coalesce(sum(pl.amount), 0)::bigint
  into v_earned
  from public.points_ledger pl
  where pl.user_id = v_user_id;

  select coalesce(sum(uc.points_spent), 0)::bigint
  into v_spent
  from public.user_cosmetics uc
  where uc.user_id = v_user_id;

  v_available := greatest(0::bigint, v_earned - v_spent);

  if v_existing.id is not null then
    return query select v_item.id, v_existing.points_spent, v_available, true;
    return;
  end if;

  if v_available < v_item.cost_points then
    raise exception 'Insufficient Paw Points (need %, have % available)', v_item.cost_points, v_available;
  end if;

  insert into public.user_cosmetics (user_id, cosmetic_id, points_spent)
  values (v_user_id, v_item.id, v_item.cost_points);

  v_available := greatest(0::bigint, v_available - v_item.cost_points);

  return query select v_item.id, v_item.cost_points, v_available, false;
end;
$$;

grant execute on function public.unlock_cosmetic(text) to authenticated;

-- 6. RPC: equip_cat_card_theme(p_cat_id uuid, p_theme_id text)
create or replace function public.equip_cat_card_theme(
  p_cat_id uuid,
  p_theme_id text
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_cat public.cats;
  v_item public.cosmetic_items;
  v_owns boolean;
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
    raise exception 'Cat card not found or not owned by you';
  end if;

  select *
  into v_item
  from public.cosmetic_items ci
  where ci.id = p_theme_id
    and ci.category = 'card_theme';

  if v_item.id is null then
    raise exception 'Invalid card theme';
  end if;

  if v_item.cost_points > 0 then
    select exists (
      select 1
      from public.user_cosmetics uc
      where uc.user_id = v_user_id
        and uc.cosmetic_id = p_theme_id
    ) into v_owns;

    if not coalesce(v_owns, false) then
      raise exception 'Unlock this card theme before equipping it';
    end if;
  end if;

  update public.cats
  set
    theme_id = p_theme_id,
    updated_at = now()
  where id = p_cat_id
    and user_id = v_user_id;

  return p_theme_id;
end;
$$;

grant execute on function public.equip_cat_card_theme(uuid, text) to authenticated;

-- 7. RPC: equip_profile_cosmetic(p_slot text, p_cosmetic_id text)
create or replace function public.equip_profile_cosmetic(
  p_slot text,
  p_cosmetic_id text
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_expected_category text;
  v_item public.cosmetic_items;
  v_owns boolean;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  if p_slot = 'banner' then
    v_expected_category := 'profile_banner';
  elsif p_slot = 'title' then
    v_expected_category := 'profile_title';
  else
    raise exception 'Slot must be banner or title';
  end if;

  select *
  into v_item
  from public.cosmetic_items ci
  where ci.id = p_cosmetic_id
    and ci.category = v_expected_category;

  if v_item.id is null then
    raise exception 'Invalid cosmetic item for slot %', p_slot;
  end if;

  if v_item.cost_points > 0 then
    select exists (
      select 1
      from public.user_cosmetics uc
      where uc.user_id = v_user_id
        and uc.cosmetic_id = p_cosmetic_id
    ) into v_owns;

    if not coalesce(v_owns, false) then
      raise exception 'Unlock this cosmetic before equipping it';
    end if;
  end if;

  if p_slot = 'banner' then
    update public.profiles
    set
      equipped_banner_id = p_cosmetic_id,
      updated_at = now()
    where id = v_user_id;
  else
    update public.profiles
    set
      equipped_title_id = p_cosmetic_id,
      updated_at = now()
    where id = v_user_id;
  end if;

  return p_cosmetic_id;
end;
$$;

grant execute on function public.equip_profile_cosmetic(text, text) to authenticated;

-- 8. Update share_cat_card_to_friends to include `theme_id` in activity_events payload
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
      'cover_photo_path', v_photo_path,
      'theme_id', v_cat.theme_id
    )
  )
  returning * into v_event;

  return v_event;
end;
$$;

grant execute on function public.share_cat_card_to_friends(uuid) to authenticated;

-- 9. Update `public_profiles` view and `get_friend_profile_summary` to expose non-PII banner/title cosmetics
create or replace view public.public_profiles
with (security_invoker = false)
as
select
  p.id,
  p.username::text as username,
  p.display_name,
  p.avatar_url,
  p.created_at,
  p.equipped_banner_id,
  p.equipped_title_id
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

drop function if exists public.get_friend_profile_summary(uuid);
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
  week_challenge_points numeric,
  equipped_banner_id text,
  equipped_title_id text
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
    end as week_challenge_points,
    p.equipped_banner_id,
    p.equipped_title_id
  from public.profiles p
  where p.id = p_friend_id;
end;
$$;

grant execute on function public.get_friend_profile_summary(uuid) to authenticated;

-- Update `export_user_account_data` to include `user_cosmetics`
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
  v_cosmetics jsonb;
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

  select coalesce(jsonb_agg(to_jsonb(uc)), '[]'::jsonb)
  into v_cosmetics
  from public.user_cosmetics uc
  where uc.user_id = v_user_id;

  return jsonb_build_object(
    'exported_at', now(),
    'profile', v_profile,
    'privacy_settings', v_privacy,
    'walks', v_walks,
    'sightings', v_sightings,
    'cats', v_cats,
    'daily_activity', v_daily,
    'points_ledger', v_points,
    'user_achievements', v_achievements,
    'user_cosmetics', v_cosmetics
  );
end;
$$;

grant execute on function public.export_user_account_data() to authenticated;
