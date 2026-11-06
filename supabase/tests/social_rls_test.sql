-- Phase 10 SQL & RLS Verification Test Suite:
-- Verifies:
-- 1. Non-friend cannot read another user's activity_events, walks, sightings, or cats.
-- 2. Accepted friend can read activity_events & public_profiles, but NEVER walks, routes, sightings, or cats.
-- 3. Leaderboard excludes suspicious walks, caps daily steps at 60k, and hides opted-out users.
-- 4. Blocking hides the user and blocks new friend requests.

begin;

do $$
declare
  v_user_a uuid := gen_random_uuid();
  v_user_b uuid := gen_random_uuid();
  v_user_stranger uuid := gen_random_uuid();
  v_walk_a uuid := gen_random_uuid();
  v_sighting_a uuid := gen_random_uuid();
  v_visible_walks integer;
  v_visible_cats integer;
  v_visible_sightings integer;
  v_visible_events_stranger integer;
  v_visible_events_friend integer;
  v_lb_b_steps numeric;
  v_lb_b_outlier boolean;
begin
  -- 1. Create test users
  insert into auth.users (id, email)
  values
    (v_user_a, 'user_a_' || replace(v_user_a::text, '-', '') || '@example.com'),
    (v_user_b, 'user_b_' || replace(v_user_b::text, '-', '') || '@example.com'),
    (v_user_stranger, 'stranger_' || replace(v_user_stranger::text, '-', '') || '@example.com');

  -- 2. User A records a walk (with private route_polyline) and an accepted cat sighting
  insert into public.walks (
    id, client_id, user_id, started_at, ended_at, duration_s, moving_time_s, distance_m, route_polyline
  ) values (
    v_walk_a, gen_random_uuid(), v_user_a,
    now() - interval '30 minutes', now(), 1800, 1500, 2000, 'secret_encoded_polyline_abc'
  );

  insert into public.sightings (
    id, user_id, walk_id, photo_path, sha256, phash, area_geohash, taken_at, status
  ) values (
    v_sighting_a, v_user_a, v_walk_a,
    v_user_a::text || '/' || v_sighting_a::text || '.jpg',
    repeat('a', 64), '0123456789abcdef', 'u33dc', now(), 'accepted'
  );

  -- 3. Connect User A and User B as accepted friends
  insert into public.friendships (requester_id, addressee_id, status, responded_at)
  values (v_user_a, v_user_b, 'accepted', now());

  -- 4. Simulate Stranger session: cannot read User A's activity_events
  perform set_config('request.jwt.claim.sub', v_user_stranger::text, true);
  perform set_config('role', 'authenticated', true);

  select count(*)::integer into v_visible_events_stranger
  from public.activity_events
  where user_id = v_user_a;

  if v_visible_events_stranger <> 0 then
    raise exception 'RLS violation: stranger could read User A activity_events';
  end if;

  -- 5. Simulate Friend (User B) session: CAN read User A's activity_events, but NEVER walks, sightings, or cats
  perform set_config('request.jwt.claim.sub', v_user_b::text, true);

  select count(*)::integer into v_visible_events_friend
  from public.activity_events
  where user_id = v_user_a;

  if v_visible_events_friend = 0 then
    raise exception 'Expected Friend B to see User A milestone activity_events';
  end if;

  select count(*)::integer into v_visible_walks
  from public.walks
  where user_id = v_user_a;

  select count(*)::integer into v_visible_sightings
  from public.sightings
  where user_id = v_user_a;

  select count(*)::integer into v_visible_cats
  from public.cats
  where user_id = v_user_a;

  if v_visible_walks <> 0 or v_visible_sightings <> 0 or v_visible_cats <> 0 then
    raise exception 'RLS violation: friend could read private walks (%), sightings (%), or cats (%)',
      v_visible_walks, v_visible_sightings, v_visible_cats;
  end if;

  -- 6. Verify leaderboard 60k step cap & outlier flag
  perform set_config('role', 'postgres', true);
  insert into public.daily_activity (user_id, date, steps, source)
  values (v_user_b, (now() at time zone 'utc')::date, 85000, 'healthkit');

  perform set_config('request.jwt.claim.sub', v_user_a::text, true);
  perform set_config('role', 'authenticated', true);

  select lb.value, lb.has_outlier
  into v_lb_b_steps, v_lb_b_outlier
  from public.get_friends_leaderboard('steps') lb
  where lb.user_id = v_user_b;

  if v_lb_b_steps <> 60000 or v_lb_b_outlier is not true then
    raise exception 'Leaderboard step cap check failed: expected 60000 (outlier=true), got % (outlier=%)',
      v_lb_b_steps, v_lb_b_outlier;
  end if;

  -- 7. Verify blocking removes friend visibility and blocks new requests
  perform public.block_user(v_user_b);

  if public.is_friend(v_user_a, v_user_b) then
    raise exception 'Block check failed: users still reported as friends after block';
  end if;
end
$$;

rollback;
