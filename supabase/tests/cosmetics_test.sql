-- Phase 13A SQL Test: Cosmetics Wallet, Unlock, and Equip RPCs
begin;

do $$
declare
  v_user_id uuid := '00000000-0000-0000-0000-00000000013a';
  v_cat_id uuid := '00000000-0000-0000-0000-00000000c13a';
  v_wallet record;
  v_unlock record;
  v_equipped text;
  v_err_caught boolean := false;
begin
  -- Create test auth user & profile
  insert into auth.users (id, email)
  values (v_user_id, 'cosmetics_test@example.com')
  on conflict (id) do nothing;

  insert into public.profiles (id, username, display_name)
  values (v_user_id, 'cosmetic_tester', 'Cosmetic Tester')
  on conflict (id) do nothing;

  -- Simulate authenticated session as v_user_id
  perform set_config('request.jwt.claim.sub', v_user_id::text, true);
  perform set_config('request.jwt.claims', json_build_object('sub', v_user_id::text, 'role', 'authenticated')::text, true);

  -- Grant 100 Paw Points via points_ledger
  insert into public.points_ledger (user_id, amount, source_type, source_id)
  values (v_user_id, 100, 'walk', 'test_walk_100pts');

  -- 1. Check initial wallet balance
  select * into v_wallet from public.get_cosmetics_wallet();
  assert v_wallet.total_earned_points = 100, 'Expected 100 total earned points';
  assert v_wallet.total_spent_points = 0, 'Expected 0 spent points initially';
  assert v_wallet.available_points = 100, 'Expected 100 available points initially';

  -- 2. Unlock a 50-point theme ('theme_forest_moss')
  select * into v_unlock from public.unlock_cosmetic('theme_forest_moss');
  assert v_unlock.cosmetic_id = 'theme_forest_moss', 'Expected theme_forest_moss unlocked';
  assert v_unlock.points_spent = 50, 'Expected 50 points spent';
  assert v_unlock.available_points = 50, 'Expected 50 available points remaining';
  assert v_unlock.already_unlocked = false, 'Expected already_unlocked = false on first unlock';

  -- 3. Idempotent re-call on same item does not deduct points again
  select * into v_unlock from public.unlock_cosmetic('theme_forest_moss');
  assert v_unlock.already_unlocked = true, 'Expected already_unlocked = true on repeat unlock';
  assert v_unlock.available_points = 50, 'Expected available points unchanged (50)';

  -- 4. Attempting to unlock 350-point item with 50 available raises exception
  v_err_caught := false;
  begin
    perform public.unlock_cosmetic('theme_golden_foil');
  exception when others then
    v_err_caught := true;
  end;
  assert v_err_caught = true, 'Expected insufficient points error for theme_golden_foil';

  -- 5. Create a cat card and test equipping unlocked vs locked themes
  insert into public.cats (id, user_id, card_number, nickname, sighting_count)
  values (v_cat_id, v_user_id, 1, 'Mossy Whiskers', 1);

  v_equipped := public.equip_cat_card_theme(v_cat_id, 'theme_forest_moss');
  assert v_equipped = 'theme_forest_moss', 'Expected cat card theme equipped to theme_forest_moss';

  v_err_caught := false;
  begin
    perform public.equip_cat_card_theme(v_cat_id, 'theme_golden_foil');
  exception when others then
    v_err_caught := true;
  end;
  assert v_err_caught = true, 'Expected error when equipping unowned paid cat card theme';

  -- 6. Unlock and equip a profile title ('title_cat_spotter', 40 pts)
  select * into v_unlock from public.unlock_cosmetic('title_cat_spotter');
  assert v_unlock.available_points = 10, 'Expected 10 available points after spending 40';

  v_equipped := public.equip_profile_cosmetic('title', 'title_cat_spotter');
  assert v_equipped = 'title_cat_spotter', 'Expected profile title equipped to title_cat_spotter';
end;
$$;

rollback;
