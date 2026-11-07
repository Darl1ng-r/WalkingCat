# Phase 13A — Card Themes & Profile Cosmetics

## Goal
Give walkers a meaningful, joyful way to spend their earned **Paw Points** by unlocking and equipping **Collectible Cat Card Themes** (frames, foils, and badges) and **Profile Cosmetics** (banners and walker titles) — while keeping lifetime points and leaderboards intact and strictly respecting all privacy and cat-welfare rules.

## Why this phase matters
- **Completes the core reward loop:** Phases 3–9 built a server-authoritative points engine (`points_ledger`), but points were previously display-only. Cosmetics turn daily walks, step milestones, and challenges into tangible collection expression.
- **Reinforces walking & welfare principles:** Every cosmetic is unlocked with general Paw Points earned primarily through walking and challenges — never by approaching cats or visiting specific locations.
- **Dual-balance architecture:** Lifetime earned points in `points_ledger` remain append-only (so weekly leaderboards and lifetime totals never decrease), while `user_cosmetics` records `points_spent` to compute `available_points = total_earned - total_spent` server-side.

## Prerequisites
- Phases 1–12 complete.

## Out of scope
- Real-money IAP / paid cosmetic purchases (Phase 99F).
- Assisted AI same-cat matching or gallery uploads (later 13A sub-items).

## Data / schema
Migration `supabase/migrations/20261107000012_cosmetics.sql`:
- `cosmetic_items` (seeded catalog):
  - `id text primary key`
  - `category text not null check (category in ('card_theme', 'profile_banner', 'profile_title'))`
  - `name text not null`
  - `description text not null`
  - `icon text not null`
  - `cost_points integer not null check (cost_points >= 0)`
  - `rarity text not null check (rarity in ('starter', 'common', 'rare', 'epic', 'legendary'))`
  - `Visual tokens (jsonb)`: border/surface/badge colors, foil shimmer flag, title text
  - `sort_order integer not null default 0`
- `user_cosmetics` (unlocked inventory):
  - `id uuid primary key default gen_random_uuid()`
  - `user_id uuid not null references public.profiles(id) on delete cascade`
  - `cosmetic_id text not null references public.cosmetic_items(id) on delete cascade`
  - `points_spent integer not null check (points_spent >= 0)`
  - `unlocked_at timestamptz not null default now()`
  - `unique (user_id, cosmetic_id)`
  - RLS: users can read own rows; inserts happen only via `SECURITY DEFINER` RPC `unlock_cosmetic`.
- Schema extensions:
  - `cats.theme_id text not null default 'theme_classic_amber' references public.cosmetic_items(id)`
  - `profiles.equipped_banner_id text not null default 'banner_meadow' references public.cosmetic_items(id)`
  - `profiles.equipped_title_id text references public.cosmetic_items(id)`
- Server-authoritative RPCs:
  - `get_cosmetics_wallet()`: returns `total_earned_points`, `total_spent_points`, `available_points`.
  - `unlock_cosmetic(p_cosmetic_id text)`: idempotent; checks `available_points >= cost_points`, inserts into `user_cosmetics`, returns updated wallet + unlock record.
  - `equip_cat_card_theme(p_cat_id uuid, p_theme_id text)`: verifies cat ownership + theme ownership (or starter `cost_points = 0`), updates `cats.theme_id`.
  - `equip_profile_cosmetic(p_slot text, p_cosmetic_id text)`: verifies ownership (or null/starter), updates `profiles.equipped_banner_id` or `profiles.equipped_title_id`.
  - Update `share_cat_card(p_cat_id uuid)` to include `theme_id` in `activity_events.payload`.
  - Update `public_profiles` view and `get_friend_profile_summary` RPC to expose `equipped_banner_id` and `equipped_title_id`.

## Tasks

### 13A.1 Database migration & types
- [x] Create `supabase/migrations/20261107000012_cosmetics.sql` with `cosmetic_items`, `user_cosmetics`, RLS, seeded items, and RPCs.
- [x] Create `supabase/tests/cosmetics_test.sql` to verify point balance math, idempotent unlocking, insufficient funds rejection, and ownership checks.
- [x] Update `src/lib/database.types.ts` with new tables, columns, views, and RPC signatures.

### 13A.2 Cosmetics feature module (`src/features/cosmetics/`)
- [x] `catalog.ts`: Client-side fallback definitions and visual styling tokens for card themes (Classic Amber, Forest Moss, Sunset Coral, Starlight Cosmic, Sakura Blossom, Golden Paw Foil), profile banners, and walker titles.
- [x] `api.ts` & `hooks.ts`: `getCosmeticsOverview`, `unlockCosmetic`, `equipCatCardTheme`, `equipProfileCosmetic`, TanStack Query hooks + cache invalidation.
- [x] Components: `CosmeticThemePreview`, `CatThemePickerModal`.

### 13A.3 Collection, Profile & Social integration
- [x] Update `CatCard` (`src/features/collection/components/cat-card.tsx`) and `/cat/[id]` (`src/app/cat/[id].tsx`) to render card themes (custom frame border, tinted surface, corner badge/foil accent) and allow equipping unlocked themes per cat card.
- [x] Update `/cosmetics` screen (`src/app/cosmetics.tsx`) for browsing the Paw Points Boutique (Card Themes, Profile Banners, Walker Titles), unlocking items with haptic feedback, and equipping profile cosmetics.
- [x] Update Profile (`src/app/(tabs)/profile.tsx`) and Friend Profile (`src/app/friend/[id].tsx`) to display equipped banner and walker title, plus a link to `/cosmetics`.
- [x] Update Social Activity Feed (`src/app/(tabs)/social.tsx`) to display the shared cat card's equipped theme.

### 13A.4 Verification & quality gates
- [x] Unit tests in `src/features/cosmetics/__tests__/cosmetics.test.ts` covering wallet calculations, unlock eligibility, rarity/theme resolution, and edge cases.
- [x] Run `npx tsc --noEmit`, `npx expo lint`, `npx jest --watchAll=false`, and `npx expo-doctor`.

## Acceptance criteria
- [x] Users can view their Available Paw Points vs. Lifetime Points in `/cosmetics`.
- [x] Unlocking a cosmetic deducts from Available Paw Points without reducing lifetime points or weekly leaderboard scores.
- [x] Unlocked card themes can be applied to any cat card in `/cat/[id]` and render on the Collection grid, Cat Detail hero card, and shared cat card events.
- [x] Unlocked profile banners and walker titles render on the user's Profile and Friend Profile screens.
- [x] All quality gates pass with 0 errors.
