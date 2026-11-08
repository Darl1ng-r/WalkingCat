# Phase 12B — Frontend Redesign (Glassmorphism, Bento Grid & Live Map)

## Goal
Transform the **StrayCat Walk** user interface from basic utility cards into a modern, tactile, editorial mobile experience inspired by the two reference designs:
1. **Full-Bleed Interactive Live Map & Glassmorphic Overlays:** Real map tiles (interactive Leaflet satellite & street tiles on Web + `expo-maps` on iOS/Android) displaying the walked path polyline, custom start/end pins, compass (`N`) & recenter controls, top floating frosted-glass filter pills, and a rounded bottom sheet walk/challenge card.
2. **Floating Glassmorphic Bottom Dock Bar:** Replace the standard flat tab bar with the floating frosted-glass capsule dock from Reference 2 — featuring an active white pill indicator (`Explore`, `Walk`, `Cats`, `League`, `Profile`) plus a floating circular `+` (`🐾 Spot Cat`) quick-action button beside the dock.
3. **Bento Grid & League Podium Aesthetics:** Crisp slate-white canvas (`#F5F6FA`), rounded-bento cards (`24–28px` radius) with subtle depth, high-contrast charcoal segmented tabs (`#1E2029`), 3-bar "My Progress" strip, 3D pentagon League Emblem row (`Bronze`, `Silver`, `Gold`, `Diamond`, `Emerald`, `Ruby`), and the 3-pillar Leaderboard Podium (`#2` coral, `#1` royal purple, `#3` coral) with floating avatars and a sticky `"You #2"` pill.
4. **Professional Illustrations & Collectible Artwork:** Replace basic placeholder SVGs and bare emoji headers with high-craft illustrated cat portraits (`Marmalade`, `Professor Whiskers`, `Mochi`, `Captain Boots`) and custom 3D-styled League & Badge emblems.

---

## Why Execute This Before Phase 13B
- **Zero Throwaway UI:** Every upcoming Phase 13 feature (13B Assisted Cat Matching & Seasonal Collections, 13D Group Challenges) will inherit the new Bento, Glass, and Podium components automatically.
- **Clean Separation of Concerns:** Because all Supabase RPCs, SQLite queues, and TanStack Query hooks live in `src/features/*/api.ts` and `hooks.ts`, we can overhaul the visual presentation layer (`tailwind.config.js`, `src/constants/theme.ts`, `src/components/ui/*`, and `src/app/*`) without breaking a single backend rule or unit test.

---

## Execution Plan (Step-by-Step)

### Step 1 — Design System & Glass/Bento Primitives (`tailwind.config.js`, `src/constants/theme.ts`, `src/components/ui/`)
- [x] Update color palette & typography tokens:
  - Crisp editorial light canvas (`#F5F6FA`), pure white bento cards (`#FFFFFF`), deep obsidian dark mode (`#0D0F14` / `#161922`).
  - Vibrant action emerald (`#58B957` from Reference 2's "Start Challenge" CTA), royal podium purple (`#7C66DC` from Reference 1's `#1` pillar), and warm coral (`#E9806E` from Reference 1's `#2/#3` pillars).
- [x] Build reusable UI primitives in `src/components/ui/`:
  - `GlassView` / `GlassPill`: Frosted translucent container (`backdrop-blur-xl`, `bg-white/80` or `bg-[#1C1E26]/78`, `border-white/20`).
  - `ProgressStripBento`: 3-bar horizontal bento strip (`🟠 Paw Points`, `🟣 Cat Cards`, `🟢 Daily Steps`).
  - `SegmentedControl`: Charcoal active pill (`#1E2029`) inside a soft rounded track (`#ECEEF5`), matching Reference 1 ("My League" / "Friends League").
  - `LeagueEmblemRow`: 6-tier pentagon shield emblems (`Bronze`, `Silver`, `Gold`, `Diamond`, `Emerald`, `Ruby`) with glossy gradients and lock states.
  - `LeaguePodium`: 3-pillar leaderboard podium (`#2` coral, `#1` tall purple, `#3` coral) with circular avatars and score badges.

### Step 2 — Floating Glassmorphic Bottom Dock (`src/components/ui/floating-dock.tsx` & `src/app/(tabs)/_layout.tsx`)
- [x] Build the custom floating bottom dock matching Reference 2:
  - Frosted dark-glass capsule (`rgba(28, 30, 38, 0.82)` with `backdrop-blur-xl` and inner specular border) floating above the bottom safe area.
  - Active tab rendered as a crisp white capsule pill with dark icon + label; inactive tabs rendered with clean white/85 icons + labels + notification badge (`3`).
  - Detached circular `+` floating action button on the right that launches `/sighting/capture`.

### Step 3 — Professional Illustrations & Cat Portraits (`public/demo/` & `assets/images/demo/`)
- [x] Generate high-craft illustrated cat portraits for the 4 neighborhood cats (`Marmalade`, `Professor Whiskers`, `Mochi`, `Captain Boots`) and custom illustrated walker avatars (`DEMO_AVATARS`) so the Collection, Cat Detail, Leaderboard, and Activity Feed look like a real published iOS/Android release.

### Step 4 — Interactive Live Map & Walk Experience (`src/features/walk/components/route-map.web.tsx` & `src/app/(tabs)/walk.tsx`)
- [x] Upgrade `RouteMap` on Web to render an interactive **Leaflet / OpenStreetMap + Esri World Imagery Satellite toggle** live map canvas (with smooth pan/zoom, glowing walked path polyline, walker live avatar pin, cat sighting callout bubbles, compass `N` badge, and recenter button) while keeping native `expo-maps` on iOS/Android.
- [x] Redesign `/(tabs)/walk` to match Reference 2:
  - Full-screen map canvas with floating glass filter/mode pills at the top (`All`, `Live Route`, `Cat Spots`, `Street Map`).
  - Floating bottom white sheet card (`rounded-t-[32px]`) with stacked walker avatars (`+23`), reward preview pills (`+120 XP`, `+65 Paw Pts`), live walk metrics, and the vibrant green pill CTA (`▶ Start Walk` / `⏸ Pause` / `⏹ Finish Walk`).

### Step 5 — Bento Home Dashboard & Collectible Cards (`src/app/(tabs)/index.tsx`, `src/app/(tabs)/collection.tsx`, `src/features/collection/components/cat-card.tsx`)
- [x] Redesign **Home (`/(tabs)/index.tsx`)** as a Bento Grid:
  - Top greeting + illustrated user avatar + League tier badge + Paw Points pill.
  - "MY PROGRESS" 3-bar horizontal bento card matching Reference 1.
  - Interactive Live Map Route Hero Bento card with stacked friend avatars (`+23`), `+120 XP` / `+65 Paw Pts` pills, and green `▶ Start Walk` button.
  - 2-column Bento row pairing Featured Cat Card (`#001 Marmalade`) with Gold League Rank `#2` & Cosmetics Boutique tiles.
- [x] Redesign **Collection (`/(tabs)/collection.tsx`)** and **CatCard (`src/features/collection/components/cat-card.tsx`)** with taller `176px` illustrated portraits, glassmorphic `#001` collector badges, `ProgressStripBento`, and `SegmentedControl` sorting.

### Step 6 — Friends League Podium & Profile (`src/app/(tabs)/social.tsx`, `src/app/(tabs)/profile.tsx`)
- [x] Redesign **Social / League (`/(tabs)/social.tsx`)** directly after Reference 1:
  - Top 6 Pentagon League Emblems (`Bronze`, `Silver`, `Gold`, `Diamond`, `Emerald`, `Ruby`).
  - Charcoal Segmented Switcher (`Friends League` | `Activity` | `Friends` | `Requests`).
  - "MY PROGRESS" 3-bar summary card.
  - **3-Pillar Podium Card:** `#2` (left, coral `#E9806E`), `#1` (center, tall purple `#7C66DC`), `#3` (right, coral `#E9806E`) with circular avatars, names, and point pills.
  - Ranked list below the podium with league sub-badges (`💎 Diamond`, `🥇 Gold`, `🥈 Silver`, `🛡️ Bronze`) + floating `"You #2 in Gold League"` pill.
- [x] Redesign **Profile (`/(tabs)/profile.tsx`)** with an illustrated avatar header, equipped banner & walker title showcase, `LeagueEmblemRow`, and clean bento settings cards.

### Step 7 — Verification & Quality Gates
- [x] Run `npx tsc --noEmit`, `npx expo lint`, `npx jest --watchAll=false`, and verify live rendering on `http://localhost:8081`.
