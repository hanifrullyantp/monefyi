/**
 * Monefyi Mobile Design Tokens
 * Berdasarkan Panduan Sistem Desain Monefyi:
 * - Font: Inter (400, 500, 600, 700, 800)
 * - Background: #F4F7F5, Kartu putih border #E5EAE8
 * - Radius: kartu list 14–16px, ringkasan/dashboard 20px, tombol/input 12px, chip 999px
 * - Teks: utama #0F172A, sekunder #5B6B7A, muted/label #8A99A6
 */

export const DESIGN_TOKENS = {
  colors: {
    bgPage: '#F4F7F5',
    cardBg: '#FFFFFF',
    border: '#E5EAE8',
    textPrimary: '#0F172A',
    textSecondary: '#5B6B7A',
    textMuted: '#8A99A6',
    
    // Produk aksen
    planner: '#059669',
    estimator: '#157F5F',
    finance: '#1D4ED8',
    purple: '#7C3AED',
    amber: '#F59E0B',
    danger: '#EF4444',
  },
  
  gradients: {
    greenHero: 'linear-gradient(135deg, #064E3B 0%, #047857 55%, #059669 100%)',
    blueHero: 'linear-gradient(135deg, #1E3A8A 0%, #1D4ED8 60%, #2563EB 100%)',
    purpleHero: 'linear-gradient(135deg, #4C1D95 0%, #6D28D9 60%, #7C3AED 100%)',
    orangeHero: 'linear-gradient(135deg, #9A3412 0%, #C2410C 50%, #EA580C 100%)',
    tealHero: 'linear-gradient(135deg, #115E59 0%, #0F766E 50%, #14B8A6 100%)',
  },
  
  shadows: {
    green: '0 12px 24px -12px rgba(4, 120, 87, 0.75)',
    blue: '0 12px 24px -12px rgba(29, 78, 216, 0.75)',
    purple: '0 12px 24px -12px rgba(109, 40, 217, 0.75)',
    orange: '0 12px 24px -12px rgba(194, 65, 12, 0.75)',
    teal: '0 12px 24px -12px rgba(15, 118, 110, 0.75)',
  },

  health: {
    onTrack: {
      color: '#10B981',
      bg: '#ECFDF5',
      border: '#A7F3D0',
      text: '#065F46',
      label: 'On track',
    },
    atRisk: {
      color: '#F59E0B',
      bg: '#FFFBEB',
      border: '#FDE68A',
      text: '#92400E',
      label: 'At risk',
    },
    behind: {
      color: '#EF4444',
      bg: '#FEF2F2',
      border: '#FECACA',
      text: '#991B1B',
      label: 'Behind',
    },
  },

  radius: {
    listCard: '14px',
    dashboardCard: '20px',
    button: '12px',
    chip: '999px',
  },
} as const;

