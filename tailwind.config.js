/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#7C66DC',
          light: '#9B88E8',
          dark: '#634EC4',
          muted: '#EFEBFD',
        },
        secondary: {
          DEFAULT: '#58B957',
          light: '#6FD06E',
          dark: '#439B42',
          muted: '#E6F6E6',
        },
        coral: {
          DEFAULT: '#E9806E',
          light: '#F29D8E',
          dark: '#D46654',
          muted: '#FCECE9',
        },
        charcoal: {
          DEFAULT: '#1E2029',
          light: '#2D303E',
        },
        background: {
          DEFAULT: '#F5F6FA',
          dark: '#0B0E14',
        },
        surface: {
          DEFAULT: '#FFFFFF',
          dark: '#151923',
          elevated: '#EDF0F7',
          'elevated-dark': '#1E2433',
        },
        muted: {
          DEFAULT: '#64748B',
          dark: '#94A3B8',
        },
        foreground: {
          DEFAULT: '#141720',
          dark: '#F8FAFC',
        },
        border: {
          DEFAULT: '#E8ECF4',
          dark: '#252C3D',
        },
        danger: {
          DEFAULT: '#E11D48',
          light: '#F43F5E',
          muted: '#FFE4E6',
        },
      },
      borderRadius: {
        card: '24px',
        bento: '28px',
        button: '9999px',
        pill: '9999px',
      },
    },
  },
  plugins: [],
};
