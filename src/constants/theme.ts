/**
 * Design system tokens mirrored in JS for APIs that require raw values
 * (e.g. NativeTabs, StatusBar, Map polylines, SymbolView tintColor).
 * Tailwind / NativeWind classes remain the primary styling mechanism.
 */

export const BrandColors = {
  primary: '#F4A97B',
  primaryLight: '#F8C29F',
  primaryDark: '#191A26',
  primaryMuted: '#FCE8D5',
  secondary: '#191A26',
  secondaryLight: '#2A2C3E',
  secondaryDark: '#11121B',
  secondaryMuted: '#F3EFEA',
  coral: '#F4A97B',
  coralMuted: '#FCE8D5',
  charcoal: '#191A26',
  danger: '#D9534F',
  dangerLight: '#E67370',
  dangerMuted: '#FDECEB',
} as const;

export const Colors = {
  light: {
    text: '#191A26',
    textSecondary: '#6E7085',
    background: '#FAF8F5',
    surface: '#FFFFFF',
    surfaceElevated: '#FCE8D5',
    border: '#191A26',
    primary: BrandColors.primary,
    secondary: BrandColors.secondary,
    danger: BrandColors.danger,
  },
  dark: {
    text: '#FAF8F5',
    textSecondary: '#9EA1B8',
    background: '#12131C',
    surface: '#191A26',
    surfaceElevated: '#232536',
    border: '#35384F',
    primary: BrandColors.primary,
    secondary: BrandColors.primaryLight,
    danger: BrandColors.dangerLight,
  },
} as const;

export const Radii = {
  sm: 12,
  button: 9999,
  card: 22,
  xl: 26,
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
