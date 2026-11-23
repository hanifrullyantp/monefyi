export const neracaColors = {
  headerAktiva: {
    zone: '#F59E0B',
    subZone: '#FCD34D',
    colHeader: '#FDE68A',
    cellBg: '#FFFBEB',
    totalRow: '#FCD34D',
    text: '#78350F',
  },
  kewajiban: {
    zone: '#EA580C',
    colHeader: '#FB923C',
    cellBg: '#FFF7ED',
    totalRow: '#F97316',
    text: '#7C2D12',
  },
  modal: {
    zone: '#FCD34D',
    colHeader: '#FDE68A',
    cellBg: '#FFFBEB',
    totalRow: '#FCD34D',
    text: '#78350F',
  },
  grandTotal: {
    balanced: '#16A34A',
    unbalanced: '#DC2626',
    text: '#FFFFFF',
  },
} as const;

export type ColorZone = 'aktiva' | 'kewajiban' | 'modal';

export function zoneStyles(zone: ColorZone) {
  if (zone === 'kewajiban') return neracaColors.kewajiban;
  if (zone === 'modal') return neracaColors.modal;
  return neracaColors.headerAktiva;
}
