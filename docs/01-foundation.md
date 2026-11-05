# Phase 1 — Foundation: Design System, Navigation Shell & Tooling

## Goal
Replace the Expo starter template with the real app skeleton: tab navigation, a small design system, providers, testing setup, and a working **development build** on a real phone. No backend, no features yet — just a solid base every later phase builds on.

## Prerequisites
- Project scaffolded (Expo SDK 58, Expo Router, NativeWind, `eas.json`) — ✅ done.

## Out of scope
- Supabase, auth, any real data.
- Location, camera, health, maps.
- Final branding/logo (use placeholders).

## Packages
```bash
npx expo install @tanstack/react-query zustand zod
npx expo install expo-dev-client expo-haptics
npx expo install -- --save-dev jest-expo jest @testing-library/react-native @types/jest
```

## Tasks

### 1.1 Clean the template
- [ ] Delete starter-only files: `src/app/explore.tsx`, `src/components/app-tabs*.tsx`, `animated-icon*`, `external-link.tsx`, `scripts/reset-project.js`, and the `reset-project` npm script. Keep `themed-*` only if reused, otherwise remove.
- [ ] Remove unused starter assets.

### 1.2 Design tokens
- [ ] Extend `tailwind.config.js` with the theme: brand colors (`primary` warm orange, `secondary` calm green, `surface`, `muted`, `danger`), radii, font sizes. Support dark mode via `dark:` classes (`darkMode: 'class'` or system — follow NativeWind v4 docs).
- [ ] `src/constants/theme.ts` exports the same tokens as JS (for places that can't use `className`, e.g. map polylines).

### 1.3 UI primitives — `src/components/ui/`
Build minimal, accessible, NativeWind-styled components. Each with typed props and variants:
- [ ] `Screen` (safe-area + optional scroll + background)
- [ ] `Text` (variants: `title`, `heading`, `body`, `caption`, `label`)
- [ ] `Button` (variants: `primary`, `secondary`, `ghost`, `danger`; sizes; `loading`; haptic on press)
- [ ] `Card`
- [ ] `StatTile` (label + big value + unit — used everywhere for distance/time/steps)
- [ ] `EmptyState` (icon, title, message, optional action)
- [ ] `ErrorState` (message + retry)
- [ ] `index.ts` barrel export

### 1.4 Navigation shell
- [ ] Route groups: `src/app/(tabs)/` with 5 tabs: **Home**, **Walk**, **Collection**, **Social**, **Profile**. Each shows a placeholder `EmptyState` describing the future feature.
- [ ] Use Expo Router's tabs (check SDK 58 docs for `NativeTabs` vs JS `Tabs`; prefer native tabs if stable). Icons via `expo-symbols` (SF Symbols iOS / Material on Android).
- [ ] Root `_layout.tsx`: imports `global.css`, wraps app in `QueryClientProvider`, `GestureHandlerRootView`, `SafeAreaProvider`, theme provider; keeps splash until ready.
- [ ] Add a `+not-found.tsx` screen.

### 1.5 Lib setup
- [ ] `src/lib/query-client.ts` — QueryClient with sensible defaults (retry 2, staleTime 30s).
- [ ] `src/lib/env.ts` — Zod schema for env vars (empty for now, ready for Phase 2).
- [ ] `src/lib/logger.ts` — thin wrapper (`info`, `warn`, `error`), silent in production.
- [ ] `src/lib/format.ts` — `formatDistance(m)`, `formatDuration(s)`, `formatPace(sPerKm)`, `formatNumber(n)` (locale-aware). **Unit tested.**
- [ ] `src/constants/config.ts` — placeholder for app constants.

### 1.6 Testing setup
- [ ] Configure Jest with `jest-expo` preset in `package.json`; add `"test": "jest"` script.
- [ ] Write tests for `format.ts` and one render test for `Button`.

### 1.7 Development build
- [ ] Add `expo-dev-client`. Run `npx eas-cli@latest login` and `npx eas-cli@latest init` (adds `extra.eas.projectId`).
- [ ] Build: `npx eas-cli@latest build --profile development --platform android` and install on a phone.
- [ ] (If Apple Developer account available) register device with `eas device:create` and build iOS dev client.
- [ ] Document the exact commands used in `PROGRESS.md`.

## Acceptance criteria
- [ ] App opens to the Home tab; all 5 tabs navigate; no starter content remains.
- [ ] Light and dark mode both look correct.
- [ ] `npx tsc --noEmit`, `npx expo lint`, `npx jest` all pass.
- [ ] App runs on a real phone through the development build with hot reload.

## Manual test script
1. Launch app → splash → Home.
2. Tap every tab; rotate nothing (portrait-locked).
3. Toggle system dark mode → colors switch.
4. Increase system font size → text scales, layout doesn't break.

## Pitfalls
- NativeWind v4 needs `jsxImportSource: 'nativewind'` (already in `babel.config.js`) — don't remove it.
- Don't import feature code into `components/ui`.
- `react-compiler` experiment is on: avoid mutating props/state; prefer plain functions over manual `useMemo`.
