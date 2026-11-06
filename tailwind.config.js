/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#F97316',
          light: '#FB923C',
          dark: '#EA580C',
          muted: '#FFEDD5',
        },
        secondary: {
          DEFAULT: '#16A34A',
          light: '#22C55E',
          dark: '#15803D',
          muted: '#DCFCE7',
        },
        background: {
          DEFAULT: '#FAF8F5',
          dark: '#0F172A',
        },
        surface: {
          DEFAULT: '#FFFFFF',
          dark: '#1E293B',
          elevated: '#F1F5F9',
          'elevated-dark': '#334155',
        },
        muted: {
          DEFAULT: '#64748B',
          dark: '#94A3B8',
        },
        foreground: {
          DEFAULT: '#0F172A',
          dark: '#F8FAFC',
        },
        border: {
          DEFAULT: '#E2E8F0',
          dark: '#334155',
        },
        danger: {
          DEFAULT: '#DC2626',
          light: '#EF4444',
          muted: '#FEE2E2',
        },
      },
      borderRadius: {
        card: '16px',
        button: '12px',
        pill: '9999px',
      },
    },
  },
  plugins: [],
};
