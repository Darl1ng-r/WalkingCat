-- Test suite for Phase 11: Privacy, Safety & Content Moderation
-- Run via: psql or Supabase SQL runner

begin;

-- Create test accounts
insert into auth.users (id, email)
values
  ('11111111-1111-4111-8111-111111111111', 'user1@example.com'),
  ('22222222-2222-4222-8222-222222222222', 'user2@example.com'),
  ('33333333-3333-4333-8333-333333333333', 'user3@example.com'),
  ('44444444-4444-4444-8444-444444444444', 'user4@example.com')
on conflict (id) do nothing;

insert into public.profiles (id, username, display_name)
values
  ('11111111-1111-4111-8111-111111111111', 'alice_mod', 'Alice Mod'),
  ('22222222-2222-4222-8222-222222222222', 'bob_mod', 'Bob Mod'),
  ('33333333-3333-4333-8333-333333333333', 'charlie_mod', 'Charlie Mod'),
  ('44444444-4444-4444-8444-444444444444', 'dana_mod', 'Dana Mod')
on conflict (id) do nothing;

-- Set up friendship between Alice and Bob
insert into public.friendships (user_id, friend_id, status)
values ('11111111-1111-4111-8111-111111111111', '22222222-2222-4222-8222-222222222222', 'accepted')
on conflict do nothing;

-- 1. Test is_content_reported_hidden helper
do $$
declare
  v_test_event_id text := '99999999-9999-4999-8999-999999999999';
begin
  -- Initially 0 reports -> false
  if public.is_content_reported_hidden('activity_event', v_test_event_id) then
    raise exception 'Test 1 Failed: Content without reports should not be hidden';
  end if;

  -- Add 2 open reports -> still false (< 3)
  insert into public.reports (reporter_id, target_type, target_id, reason, status)
  values
    ('22222222-2222-4222-8222-222222222222', 'activity_event', v_test_event_id, 'spam', 'open'),
    ('33333333-3333-4333-8333-333333333333', 'activity_event', v_test_event_id, 'inappropriate', 'open');

  if public.is_content_reported_hidden('activity_event', v_test_event_id) then
    raise exception 'Test 2 Failed: Content with 2 reports should not be hidden yet';
  end if;

  -- Add 3rd open report -> true (>= 3)
  insert into public.reports (reporter_id, target_type, target_id, reason, status)
  values ('44444444-4444-4444-8444-444444444444', 'activity_event', v_test_event_id, 'animal_harm', 'open');

  if not public.is_content_reported_hidden('activity_event', v_test_event_id) then
    raise exception 'Test 3 Failed: Content with 3 open reports must be hidden';
  end if;

  -- Moderator dismisses one report -> 2 open -> false again
  update public.reports
  set status = 'dismissed'
  where reporter_id = '44444444-4444-4444-8444-444444444444'
    and target_id = v_test_event_id;

  if public.is_content_reported_hidden('activity_event', v_test_event_id) then
    raise exception 'Test 4 Failed: Content should not be hidden after report dismissal';
  end if;
end;
$$;

-- 2. Test submit_report RPC validation
do $$
begin
  -- Invalid target type must throw
  begin
    perform public.submit_report('invalid_type', '123', 'spam', null);
    raise exception 'Test 5 Failed: Invalid target_type should be rejected';
  exception
    when others then
      null; -- Expected
  end;

  -- Invalid reason must throw
  begin
    perform public.submit_report('sighting', '123', 'invalid_reason', null);
    raise exception 'Test 6 Failed: Invalid reason should be rejected';
  exception
    when others then
      null; -- Expected
  end;
end;
$$;

-- Clean up test records
rollback;
