// Format Rupiah
export function formatRupiah(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

// Format Rupiah without currency symbol
export function formatNumber(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

// Parse Rupiah input string to number
export function parseRupiahInput(input: string): number {
  const cleaned = input.replace(/[^0-9]/g, '');
  return parseInt(cleaned) || 0;
}

// Format Rupiah for display in input
export function formatRupiahDisplay(value: number): string {
  if (value === 0) return '';
  return formatNumber(value);
}

// Format gram
export function formatGram(value: number): string {
  return `${formatNumber(value)} gram`;
}

// Format kilogram
export function formatKilogram(value: number): string {
  return `${formatNumber(value)} kg`;
}

// Format percentage
export function formatPercent(value: number): string {
  return `${value}%`;
}
