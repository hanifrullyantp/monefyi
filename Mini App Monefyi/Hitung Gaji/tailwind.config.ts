import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        slate: {
          950: '#020617',
          900: '#0f172a',
          800: '#1e293b',
          700: '#334155',
          500: '#64748b',
          400: '#94a3b8',
        },
        green: {
          950: '#022c22',
          900: '#064e3b',
          600: '#059669',
          500: '#10b981',
          400: '#34d399',
        },
      },
      backgroundImage: {
        'gradient-hero': 'linear-gradient(180deg, #022c22 0%, #064e3b 100%)',
        'gradient-green': 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
        'gradient-red': 'linear-gradient(135deg, #7f1d1d 0%, #450a0a 100%)',
        'gradient-transition': 'linear-gradient(135deg, #dc2626, #f59e0b, #10b981)',
      },
      boxShadow: {
        'green-glow': '0 20px 60px -10px rgba(16,185,129,0.4)',
        'card': '0 4px 24px rgba(0,0,0,0.3)',
      },
      fontFamily: {
        sans: ['system-ui', '-apple-system', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

export default config
