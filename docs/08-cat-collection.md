# Phase 8 — Personal Cat Collection

## Goal
Accepted sightings become entries in the user's **private cat collection**, shown as collectible cards. Users can nickname cats, optionally mark a new sighting as "the same cat as…" one they already have (manual, user-controlled), and revisit discoveries — without revealing exact locations.

## Product decision (MVP)
- Each accepted sighting **creates a new cat card by default**.
- The user may **manually** link a sighting to an existing cat of theirs ("I've seen this one before"). This increases that cat's `sighting_count`.
- No automatic individual-cat matching (post-MVP). UI says "sighting", never "we recognized this cat".

## Prerequisites
- Phase 7 (sightings reach `accepted`).

## Out of scope
- Sharing cards with friends (Phase 10 adds optional share-to-friends).
- Card themes/cosmetics unlocks (post-MVP or Phase 9 stretch).
- Any map of cat locations.

## Data / schema
Migration `<ts>_cats.sql`:
- `cats`: `id`, `user_id`, `nickname text null` (≤ 30 chars), `cover_sighting_id uuid`, `sighting_count int default 1`, `first_seen_at`, `last_seen_at`, `area_geohash text null` (coarse, from first sighting if saved), `created_at`.
- Trigger on `sightings` status → `accepted` (and `cat_id is null`): create a `cats` row, set `sightings.cat_id`. Must be idempotent.
- Function `link_sighting_to_cat(p_sighting_id, p_cat_id)`: owner check; moves sighting to the target cat; deletes the auto-created cat if it now has 0 sightings; recomputes counts/dates. Function `unlink_sighting(p_sighting_id)` creates a new cat again.
- RLS: owner-only for `cats`.

## Tasks
- [ ] 8.1 Migration, trigger, and link/unlink functions (+ SQL tests or a test script).
- [ ] 8.2 `src/features/collection/api.ts`: `listCats({ sort })`, `getCat(id)` (with sightings), `renameCat`, `linkSighting`, `unlinkSighting`, `deleteSighting`.
- [ ] 8.3 **Collection tab:** grid of cards (photo via signed URL, nickname or "Unnamed cat #12", sighting count badge, first-seen date). Header stats: total cats, total sightings, days with discoveries. Sort: newest / most seen / A–Z. Empty state encouraging a walk (not "go find cats").
- [ ] 8.4 **Card design:** playful collectible look (rounded, subtle border, number like `#012`), reusable `CatCard` component; reveal animation for newly accepted cards (Reanimated, subtle; respects reduce-motion).
- [ ] 8.5 **Cat detail** `src/app/cat/[id].tsx`: hero photo, nickname (tap to edit), stats (first seen, last seen, sightings), timeline of sightings (photo + date + linked walk), general area label only if saved (e.g. "Seen around your neighborhood" — never coordinates).
- [ ] 8.6 After a sighting is accepted, show a sheet: "New cat added! 🐱" with options **Give a nickname** / **I've seen this cat before** (pick from existing cats grid) / **Done**.
- [ ] 8.7 Walk detail (Phase 5 placeholder): show "Cats spotted on this walk".
- [ ] 8.8 Delete sighting (confirm) → removes photo from storage + updates cat; deleting last sighting deletes the cat.
- [ ] 8.9 Pending/flagged/rejected sightings visible in a small "Recent submissions" list on the Collection tab (so users know what happened).

## Acceptance criteria
- [ ] Every accepted sighting appears as a card within seconds of acceptance.
- [ ] Linking two sightings → one card with count 2; unlinking restores two cards.
- [ ] Renaming persists; nickname length validated.
- [ ] Deleting removes photo from storage (verify bucket).
- [ ] No coordinates displayed or fetched anywhere in the collection.
- [ ] Grid scrolls smoothly with 100+ cards (FlashList, image caching).

## Manual test script
1. Submit 2 cat photos → 2 cards appear with reveal animation.
2. Link the second to the first → 1 card, count 2, timeline shows both.
3. Rename → persists after restart.
4. Delete one sighting → count 1; delete the last → card gone.

## Pitfalls
- Signed URLs expire — cache and refresh on error.
- Trigger + client both creating cats = duplicates. **Only the DB trigger creates cats.**
