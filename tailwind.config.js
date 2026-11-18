/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Rubik', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['Rubik', 'Plus Jakarta Sans', 'system-ui', '-apple-system', 'sans-serif'],
      },
      colors: {
        primary: {
          DEFAULT: '#F4A97B',
          light: '#F8C29F',
          dark: '#191A26',
          muted: '#FCE8D5',
        },
        secondary: {
          DEFAULT: '#191A26',
          light: '#2A2C3E',
          dark: '#11121B',
          muted: '#F3EFEA',
        },
        coral: {
          DEFAULT: '#F4A97B',
          light: '#F8C29F',
          dark: '#E08B57',
          muted: '#FCE8D5',
        },
        charcoal: {
          DEFAULT: '#191A26',
          light: '#252738',
        },
        background: {
          DEFAULT: '#FAF8F5',
          dark: '#12131C',
        },
        surface: {
          DEFAULT: '#FFFFFF',
          dark: '#191A26',
          elevated: '#FCE8D5',
          'elevated-dark': '#232536',
        },
        muted: {
          DEFAULT: '#6E7085',
          dark: '#9EA1B8',
        },
        foreground: {
          DEFAULT: '#191A26',
          dark: '#FAF8F5',
        },
        'text-primary': {
          DEFAULT: '#191A26',
          dark: '#FAF8F5',
        },
        'text-secondary': {
          DEFAULT: '#6E7085',
          dark: '#9EA1B8',
        },
        'text-muted': {
          DEFAULT: '#8C8E9E',
          dark: '#7A7C90',
        },
        border: {
          DEFAULT: '#191A26',
          dark: '#35384F',
        },
        danger: {
          DEFAULT: '#D9534F',
          light: '#E67370',
          muted: '#FDECEB',
        },
      },
      borderRadius: {
        card: '22px',
        bento: '26px',
        button: '9999px',
        pill: '9999px',
      },
    },
  },
  plugins: [],
};
