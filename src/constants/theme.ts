/**
 * Design system tokens mirrored in JS for APIs that require raw values
 * (e.g. NativeTabs, StatusBar, Map polylines, SymbolView tintColor).
 * Tailwind / NativeWind classes remain the primary styling mechanism.
 */

export const BrandColors = {
  primary: '#7C66DC',
  primaryLight: '#9B88E8',
  primaryDark: '#634EC4',
  primaryMuted: '#EFEBFD',
  secondary: '#58B957',
  secondaryLight: '#6FD06E',
  secondaryDark: '#439B42',
  secondaryMuted: '#E6F6E6',
  coral: '#E9806E',
  coralMuted: '#FCECE9',
  charcoal: '#1E2029',
  danger: '#E11D48',
  dangerLight: '#F43F5E',
  dangerMuted: '#FFE4E6',
} as const;

export const Colors = {
  light: {
    text: '#141720',
    textSecondary: '#64748B',
    background: '#F5F6FA',
    surface: '#FFFFFF',
    surfaceElevated: '#EDF0F7',
    border: '#E8ECF4',
    primary: BrandColors.primary,
    secondary: BrandColors.secondary,
    danger: BrandColors.danger,
  },
  dark: {
    text: '#F8FAFC',
    textSecondary: '#94A3B8',
    background: '#0B0E14',
    surface: '#151923',
    surfaceElevated: '#1E2433',
    border: '#252C3D',
    primary: BrandColors.primaryLight,
    secondary: BrandColors.secondaryLight,
    danger: BrandColors.dangerLight,
  },
} as const;

export const Radii = {
  sm: 12,
  button: 9999,
  card: 24,
  xl: 28,
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
