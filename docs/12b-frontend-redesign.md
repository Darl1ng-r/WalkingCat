# Phase 12B — Frontend Redesign (Glassmorphism, Bento Grid & Live Map)

## Goal
Transform the **StrayCat Walk** user interface from basic utility cards into a modern, tactile, editorial mobile experience inspired by the two reference designs:
1. **Full-Bleed Interactive Live Map & Glassmorphic Overlays:** Real map tiles (interactive Leaflet/MapLibre satellite & street tiles on Web + `expo-maps` on iOS/Android) displaying the walked path polyline, custom start/end pins, compass (`N`) & recenter controls, top floating frosted-glass filter pills, and a rounded bottom sheet walk/challenge card.
2. **Floating Glassmorphic Bottom Dock Bar:** Replace the standard flat tab bar with the floating frosted-glass capsule dock from Reference 2 — featuring an active white pill indicator (`Explore`, `Walk`, `Cats`, `League`, `Profile`) plus a floating circular `+` (`🐾 Spot Cat`) quick-action button beside the dock.
3. **Bento Grid & League Podium Aesthetics:** Crisp slate-white canvas (`#F6F7FB`), rounded-3xl bento cards (`24–28px` radius) with subtle depth, high-contrast charcoal segmented tabs (`#1E2029`), 3-bar "My Progress" strip, 3D pentagon League Emblem row (`Bronze`, `Silver`, `Gold`, `Diamond`, `Emerald`, `Ruby`), and the 3-pillar Leaderboard Podium (`#2` coral, `#1` royal purple, `#3` coral) with floating avatars and a sticky `"You #2"` pill.
4. **Professional Illustrations & Collectible Artwork:** Replace basic placeholder SVGs and bare emoji headers with high-craft illustrated cat portraits (`Marmalade`, `Professor Whiskers`, `Mochi`, `Captain Boots`) and custom 3D-styled League & Badge emblems.

---

## Why Execute This Before Phase 13B
- **Zero Throwaway UI:** Every upcoming Phase 13 feature (13B Assisted Cat Matching & Seasonal Collections, 13D Group Challenges) will inherit the new Bento, Glass, and Podium components automatically.
- **Clean Separation of Concerns:** Because all Supabase RPCs, SQLite queues, and TanStack Query hooks live in `src/features/*/api.ts` and `hooks.ts`, we can overhaul the visual presentation layer (`tailwind.config.js`, `src/constants/theme.ts`, `src/components/ui/*`, and `src/app/*`) without breaking a single backend rule or unit test.

---

## Execution Plan (Step-by-Step)

### Step 1 — Design System & Glass/Bento Primitives (`tailwind.config.js`, `src/constants/theme.ts`, `src/components/ui/`)
- [ ] Update color palette & typography tokens:
  - Crisp editorial light canvas (`#F6F7FB`), pure white bento cards (`#FFFFFF`), deep obsidian dark mode (`#0F1117` / `#181B24`).
  - Vibrant action emerald (`#58B957` from Reference 2's "Start Challenge" CTA), royal podium purple (`#7C66DC` from Reference 1's `#1` pillar), and warm coral (`#E9806E` from Reference 1's `#2/#3` pillars).
- [ ] Build reusable UI primitives in `src/components/ui/`:
  - `GlassView` / `GlassPill`: Frosted translucent container (`backdrop-blur-xl`, `bg-white/75` or `bg-black/45`, `border-white/30`).
  - `BentoCard`: Multi-span bento grid container with soft elevation shadow and optional header badge.
  - `SegmentedControl`: Charcoal active pill (`#1E2029`) inside a soft rounded track (`#F1F3F8`), matching Reference 1 ("My League" / "Friends League").
  - `LeagueEmblemRow`: 6-tier pentagon shield emblems (`Bronze`, `Silver`, `Gold`, `Diamond`, `Emerald`, `Ruby`) with glossy gradients and lock states.

### Step 2 — Floating Glassmorphic Bottom Dock (`src/components/ui/floating-dock.tsx` & `src/app/(tabs)/_layout.tsx`)
- [ ] Build the custom floating bottom dock matching Reference 2:
  - Frosted dark-glass capsule (`rgba(28, 30, 38, 0.78)` with `backdrop-blur-xl` and inner specular border) floating above the bottom safe area.
  - Active tab rendered as a crisp white capsule pill with dark icon + label; inactive tabs rendered with clean white/80 icons + labels + optional notification badge (`3`).
  - Detached circular `+` (`🐾`) floating action button on the right that launches `/sighting/capture` (or starts a walk).

### Step 3 — Professional Illustrations & Cat Portraits (`assets/images/demo/`)
- [ ] Generate high-craft illustrated cat portraits for the 4 neighborhood cats (`Marmalade`, `Professor Whiskers`, `Mochi`, `Captain Boots`) and hero artwork so the Collection, Cat Detail, and Activity Feed look like a real published iOS/Android release.

### Step 4 — Interactive Live Map & Walk Experience (`src/features/walk/components/route-map.web.tsx` & `src/app/(tabs)/walk.tsx`)
- [ ] Upgrade `RouteMap` on Web to render an interactive **Leaflet / OpenStreetMap + Esri Satellite toggle** live map canvas (with smooth pan/zoom, glowing walked path polyline, pulsed current-location marker, start/end pins, compass `N` badge, and recenter button) while keeping native `expo-maps` on iOS/Android.
- [ ] Redesign `/(tabs)/walk` to match Reference 2:
  - Full-screen map canvas with floating glass filter/mode pills at the top (`All`, `Live Route`, `Satellite`, `Sightings`).
  - Floating bottom white sheet card (`rounded-t-[32px]`) with live walk metrics (Distance, Duration, Steps, Pace), reward preview pills (`+25 XP`, `+15 Paw Pts`), and the vibrant green pill CTA (`▶ Start Walk` / `⏸ Pause` / `⏹ Finish Walk`).

### Step 5 — Bento Home Dashboard & Collectible Cards (`src/app/(tabs)/index.tsx`, `src/app/(tabs)/collection.tsx`, `src/app/cat/[id].tsx`, `src/app/cosmetics.tsx`)
- [ ] Redesign **Home (`/(tabs)/index.tsx`)** as a Bento Grid:
  - Top greeting + League tier badge + Paw Points pill.
  - "MY PROGRESS" 3-bar horizontal bento card (Steps progress, Walk distance goal, Weekly active days) matching Reference 1.
  - Mini Live Route preview bento tile + Active Daily Challenge card with stacked friend avatars (`+23`) and green `▶ Start Walk` button.
- [ ] Redesign **Collection (`/(tabs)/collection.tsx`)**, **Cat Detail (`/cat/[id]`)**, and **Paw Points Boutique (`/cosmetics`)** with tactile collector card frames, holographic foil badges, and segmented filter tabs.

### Step 6 — Friends League Podium & Profile (`src/app/(tabs)/social.tsx`, `src/app/friend/[id].tsx`, `src/app/(tabs)/profile.tsx`)
- [ ] Redesign **Social / League (`/(tabs)/social.tsx`)** directly after Reference 1:
  - Top 6 Pentagon League Emblems (`Bronze`, `Silver`, `Gold`, `Diamond`, `Emerald`, `Ruby`).
  - Charcoal Segmented Switcher (`Friends League` | `Activity Feed` | `Friends`).
  - "MY PROGRESS" 3-bar summary card.
  - **3-Pillar Podium Card:** `#2` (left, coral `#E9806E`), `#1` (center, tall purple `#7C66DC`), `#3` (right, coral `#E9806E`) with circular avatars, names, and point pills (`245`, `223`, `195`).
  - Ranked list below the podium + floating `"You #2"` pill.
- [ ] Redesign **Profile (`/(tabs)/profile.tsx`)** with a Bento stats header, equipped banner & walker title showcase, and clean grouped settings cards.

### Step 7 — Verification & Quality Gates
- [ ] Run `npx tsc --noEmit`, `npx expo lint`, `npx jest --watchAll=false`, and verify live rendering on `http://localhost:8081`.
