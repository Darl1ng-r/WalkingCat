-- Phase 6: In-App Cat Camera & Sighting Submission
-- Creates the `sightings` table with client-generated UUID PK, unique (user_id, sha256)
-- constraint, owner-only select/insert/delete RLS (status locked to 'pending' on client insert),
-- and the private `sighting-photos` storage bucket.

create table if not exists public.sightings (
  id uuid primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  walk_id uuid references public.walks(id) on delete set null,
  photo_path text not null,
  sha256 text not null check (sha256 ~ '^[a-f0-9]{64}$'),
  phash text,
  taken_at timestamptz not null,
  area_geohash text check (area_geohash is null or char_length(area_geohash) <= 5),
  status text not null default 'pending' check (status in ('pending', 'accepted', 'rejected', 'flagged')),
  reject_reason text,
  cat_confidence numeric,
  cat_id uuid,
  created_at timestamptz not null default now(),
  constraint sightings_user_sha256_unique unique (user_id, sha256)
);

create index if not exists idx_sightings_user_taken_at
  on public.sightings (user_id, taken_at desc);

create index if not exists idx_sightings_walk_id
  on public.sightings (walk_id)
  where walk_id is not null;

-- Row-Level Security: owner can select, insert (pending only), and delete.
-- No UPDATE policy for authenticated users so status / cat_confidence can only be modified by server.
alter table public.sightings enable row level security;

drop policy if exists "Users can read own sightings" on public.sightings;
create policy "Users can read own sightings"
  on public.sightings
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own pending sightings" on public.sightings;
create policy "Users can insert own pending sightings"
  on public.sightings
  for insert
  to authenticated
  with check (
    auth.uid() = user_id
    and status = 'pending'
    and cat_confidence is null
  );

drop policy if exists "Users can delete own sightings" on public.sightings;
create policy "Users can delete own sightings"
  on public.sightings
  for delete
  to authenticated
  using (auth.uid() = user_id);

grant select, insert, delete on public.sightings to authenticated;

-- Private storage bucket: sighting-photos
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'sighting-photos',
  'sighting-photos',
  false,
  10485760, -- 10 MB
  array['image/jpeg']
)
on conflict (id) do update
  set public = false,
      file_size_limit = 10485760,
      allowed_mime_types = array['image/jpeg'];

drop policy if exists "Users can upload own sighting photos" on storage.objects;
create policy "Users can upload own sighting photos"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'sighting-photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "Users can read own sighting photos" on storage.objects;
create policy "Users can read own sighting photos"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'sighting-photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists "Users can delete own sighting photos" on storage.objects;
create policy "Users can delete own sighting photos"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'sighting-photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
