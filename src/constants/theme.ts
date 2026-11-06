/**
 * Design system tokens mirrored in JS for APIs that require raw values
 * (e.g. NativeTabs, StatusBar, Map polylines, SymbolView tintColor).
 * Tailwind / NativeWind classes remain the primary styling mechanism.
 */

export const BrandColors = {
  primary: '#F97316',
  primaryLight: '#FB923C',
  primaryDark: '#EA580C',
  primaryMuted: '#FFEDD5',
  secondary: '#16A34A',
  secondaryLight: '#22C55E',
  secondaryDark: '#15803D',
  secondaryMuted: '#DCFCE7',
  danger: '#DC2626',
  dangerLight: '#EF4444',
  dangerMuted: '#FEE2E2',
} as const;

export const Colors = {
  light: {
    text: '#0F172A',
    textSecondary: '#64748B',
    background: '#FAF8F5',
    surface: '#FFFFFF',
    surfaceElevated: '#F1F5F9',
    border: '#E2E8F0',
    primary: BrandColors.primary,
    secondary: BrandColors.secondary,
    danger: BrandColors.danger,
  },
  dark: {
    text: '#F8FAFC',
    textSecondary: '#94A3B8',
    background: '#0F172A',
    surface: '#1E293B',
    surfaceElevated: '#334155',
    border: '#334155',
    primary: BrandColors.primaryLight,
    secondary: BrandColors.secondaryLight,
    danger: BrandColors.dangerLight,
  },
} as const;

export const Radii = {
  sm: 8,
  button: 12,
  card: 16,
  xl: 24,
  pill: 9999,
} as const;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export type ThemeMode = 'light' | 'dark';
export type ThemePalette = (typeof Colors)[ThemeMode];
