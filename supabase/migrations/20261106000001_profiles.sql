-- Phase 2: Profiles & Privacy Settings
-- Enables citext for case-insensitive unique usernames, creates profiles and privacy_settings tables,
-- sets up automatic profile creation on auth.users insert, and enforces strict Row-Level Security.

create extension if not exists citext with schema extensions;

-- 1. Profiles table
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username extensions.citext unique not null,
  display_name text,
  avatar_url text,
  weight_kg numeric check (weight_kg is null or (weight_kg >= 20 and weight_kg <= 300)),
  onboarded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_username_format check (username ~* '^[a-z0-9_]{3,20}$')
);

-- 2. Privacy settings table (created alongside profile with all sharing OFF / private by default)
create table if not exists public.privacy_settings (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  share_walks_with_friends boolean not null default false,
  share_milestones_with_friends boolean not null default false,
  show_on_friends_leaderboard boolean not null default false,
  share_cat_cards boolean not null default false,
  discoverable_by_username boolean not null default false,
  save_sighting_area boolean not null default false,
  hide_route_ends boolean not null default true,
  hide_route_ends_m integer not null default 150 check (hide_route_ends_m in (100, 150, 300)),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 3. Automatic updated_at trigger helper
create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
  before update on public.profiles
  for each row
  execute function public.set_updated_at();

drop trigger if exists set_privacy_settings_updated_at on public.privacy_settings;
create trigger set_privacy_settings_updated_at
  before update on public.privacy_settings
  for each row
  execute function public.set_updated_at();

-- 4. Trigger on auth.users insert -> creates profile + default privacy_settings
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_temp_username text;
begin
  -- Generate a deterministic temporary username matching ^[a-z0-9_]{3,20}$ (e.g. walker_a1b2c3d4e5f6)
  v_temp_username := 'walker_' || substr(replace(new.id::text, '-', ''), 1, 12);

  insert into public.profiles (id, username, display_name)
  values (
    new.id,
    v_temp_username,
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;

  insert into public.privacy_settings (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

-- 5. Safe RPC to check if a username is available without exposing all profiles rows
create or replace function public.is_username_available(p_username text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_username is null or p_username !~* '^[a-z0-9_]{3,20}$' then
    return false;
  end if;

  return not exists (
    select 1
    from public.profiles p
    where p.username = p_username::extensions.citext
      and (auth.uid() is null or p.id <> auth.uid())
  );
end;
$$;

grant execute on function public.is_username_available(text) to authenticated;

-- 6. Row-Level Security (RLS)
alter table public.profiles enable row level security;
alter table public.privacy_settings enable row level security;

-- Profiles policies: owner can select & update own row
drop policy if exists "Users can read own profile" on public.profiles;
create policy "Users can read own profile"
  on public.profiles
  for select
  to authenticated
  using (auth.uid() = id);

drop policy if exists "Users can insert own profile" on public.profiles;
create policy "Users can insert own profile"
  on public.profiles
  for insert
  to authenticated
  with check (auth.uid() = id);

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
  on public.profiles
  for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Privacy settings policies: owner can select & update own row
drop policy if exists "Users can read own privacy settings" on public.privacy_settings;
create policy "Users can read own privacy settings"
  on public.privacy_settings
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own privacy settings" on public.privacy_settings;
create policy "Users can insert own privacy settings"
  on public.privacy_settings
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own privacy settings" on public.privacy_settings;
create policy "Users can update own privacy settings"
  on public.privacy_settings
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

grant select, insert, update on public.profiles to authenticated;
grant select, insert, update on public.privacy_settings to authenticated;
