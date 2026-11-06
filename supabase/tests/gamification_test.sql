-- Phase 9 SQL Test Suite: Gamification Triggers, Idempotency, Daily Caps, Suspicious Walks & Walk Deletion
-- Run inside a transaction that rolls back at the end so it leaves no test artifacts.

begin;

do $$
declare
  v_user_id uuid := gen_random_uuid();
  v_walk_1 uuid := gen_random_uuid();
  v_walk_2 uuid := gen_random_uuid();
  v_walk_3 uuid := gen_random_uuid();
  v_walk_4 uuid := gen_random_uuid();
  v_walk_suspicious uuid := gen_random_uuid();
  v_walk_points_count integer;
  v_total_points integer;
  v_points_before_delete integer;
  v_points_after_delete integer;
  v_sighting_id uuid;
  v_sighting_pts_count integer;
  v_i integer;
begin
  -- 1. Create a test auth user & profile
  insert into auth.users (id, email)
  values (v_user_id, 'phase9_test_' || replace(v_user_id::text, '-', '') || '@example.com');

  -- 2. Insert first qualifying walk (2,500 m, 1,500 s moving -> 20 walk pts + 10 distance pts + 25 first_walk achievement + daily challenge pts)
  insert into public.walks (
    id, client_id, user_id, started_at, ended_at, duration_s, moving_time_s, distance_m
  ) values (
    v_walk_1, gen_random_uuid(), v_user_id,
    now() - interval '30 minutes', now(), 1800, 1500, 2500
  );

  -- Verify idempotency: re-evaluating achievements & challenges produces zero duplicate ledger rows
  select coalesce(sum(amount), 0)::integer into v_total_points
  from public.points_ledger
  where user_id = v_user_id;

  perform public.evaluate_achievements(v_user_id);
  perform public.refresh_challenge_progress(v_user_id, (now() at time zone 'utc')::date);

  if (select coalesce(sum(amount), 0)::integer from public.points_ledger where user_id = v_user_id) <> v_total_points then
    raise exception 'Idempotency check failed: re-running evaluation changed total points';
  end if;

  -- 3. Verify daily walk cap (max 3 rewarded walks/day; 4th walk gets 0 walk points)
  insert into public.walks (id, client_id, user_id, started_at, ended_at, duration_s, moving_time_s, distance_m)
  values
    (v_walk_2, gen_random_uuid(), v_user_id, now() - interval '25 minutes', now(), 1200, 900, 1000),
    (v_walk_3, gen_random_uuid(), v_user_id, now() - interval '20 minutes', now(), 1200, 900, 1000),
    (v_walk_4, gen_random_uuid(), v_user_id, now() - interval '15 minutes', now(), 1200, 900, 1000);

  select count(*)::integer into v_walk_points_count
  from public.points_ledger
  where user_id = v_user_id and source_type = 'walk';

  if v_walk_points_count <> 3 then
    raise exception 'Daily walk cap check failed: expected 3 rewarded walks, got %', v_walk_points_count;
  end if;

  -- 4. Verify suspicious walk (> 4.2 m/s speed) earns 0 walk points
  insert into public.walks (id, client_id, user_id, started_at, ended_at, duration_s, moving_time_s, distance_m)
  values (v_walk_suspicious, gen_random_uuid(), v_user_id, now() - interval '10 minutes', now(), 600, 600, 9000);

  if exists (
    select 1 from public.points_ledger
    where user_id = v_user_id and source_id = v_walk_suspicious::text
  ) then
    raise exception 'Suspicious walk check failed: suspicious walk was awarded points';
  end if;

  -- 5. Verify deleting a walk does NOT create negative points or remove awarded points (MVP policy)
  select coalesce(sum(amount), 0)::integer into v_points_before_delete
  from public.points_ledger
  where user_id = v_user_id;

  delete from public.walks where id = v_walk_2;

  select coalesce(sum(amount), 0)::integer into v_points_after_delete
  from public.points_ledger
  where user_id = v_user_id;

  if v_points_after_delete <> v_points_before_delete then
    raise exception 'Walk deletion check failed: points changed from % to %', v_points_before_delete, v_points_after_delete;
  end if;

  -- 6. Verify daily sighting cap (max 5 rewarded sightings/day; 6th still creates a cat card but 0 sighting points)
  for v_i in 1..6 loop
    v_sighting_id := gen_random_uuid();
    insert into public.sightings (
      id, user_id, photo_path, sha256, phash, taken_at, status
    ) values (
      v_sighting_id,
      v_user_id,
      v_user_id::text || '/' || v_sighting_id::text || '.jpg',
      repeat(v_i::text, 64),
      substr(md5(v_i::text), 1, 16),
      now(),
      'accepted'
    );
  end loop;

  select count(*)::integer into v_sighting_pts_count
  from public.points_ledger
  where user_id = v_user_id and source_type = 'sighting';

  if v_sighting_pts_count <> 5 then
    raise exception 'Daily sighting cap check failed: expected 5 rewarded sightings, got %', v_sighting_pts_count;
  end if;

  if (select count(*)::integer from public.cats where user_id = v_user_id) <> 6 then
    raise exception '6th accepted sighting should still create a cat card in collection';
  end if;
end
$$;

rollback;
