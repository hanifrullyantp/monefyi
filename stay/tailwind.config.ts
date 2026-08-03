import type { Config } from 'tailwindcss';

/**
 * Design system tokens untuk redesign Front Desk STAY.
 * Tailwind v4: aktifkan dengan menambahkan di index.css:
 *   @config "../tailwind.config.ts";
 */
const config = {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        sage: {
          50: '#f6f8f6',
          100: '#e8ede8',
          200: '#d1dbd1',
          300: '#adb9ad',
          400: '#849684',
          500: '#647664',
          600: '#4f5e4f',
          700: '#414d41',
          800: '#363f36',
          900: '#2e352e',
        },
        dirty: {
          50: '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',
          700: '#b45309',
          800: '#92400e',
          900: '#78350f',
        },
        coral: {
          50: '#fff5f3',
          100: '#ffe8e3',
          200: '#ffd4cc',
          300: '#ffb4a6',
          400: '#ff8a75',
          500: '#ff6347',
          600: '#ed4629',
          700: '#c7361f',
          800: '#a4301c',
          900: '#872d1d',
        },
        'indigo-mist': {
          50: '#f0f2f8',
          100: '#e4e8f2',
          200: '#cdd5e8',
          300: '#aab6d6',
          400: '#8391c0',
          500: '#6470a8',
          600: '#505a91',
          700: '#434a76',
          800: '#3a405f',
          900: '#343851',
        },
      },
      animation: {
        'pulse-urgent': 'pulse-urgent 2s ease-in-out infinite',
        ripple: 'ripple 0.6s ease-out forwards',
        shimmer: 'shimmer 1.8s ease-in-out infinite',
      },
      keyframes: {
        'pulse-urgent': {
          '0%, 100%': {
            boxShadow: '0 0 0 0 rgba(255, 99, 71, 0.45)',
            transform: 'scale(1)',
          },
          '50%': {
            boxShadow: '0 0 0 8px rgba(255, 99, 71, 0)',
            transform: 'scale(1.01)',
          },
        },
        ripple: {
          '0%': { transform: 'scale(0)', opacity: '0.5' },
          '100%': { transform: 'scale(2.5)', opacity: '0' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
      backgroundImage: {
        shimmer:
          'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.6) 50%, transparent 100%)',
      },
      backgroundSize: {
        shimmer: '200% 100%',
      },
    },
  },
} satisfies Config;

export default config;
