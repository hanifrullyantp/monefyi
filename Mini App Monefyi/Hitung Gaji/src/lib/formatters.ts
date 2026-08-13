export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

export function formatCurrencyCompact(value: number): string {
  if (value >= 1000000000) {
    return `Rp ${(value / 1000000000).toFixed(1)}M`
  }
  if (value >= 1000000) {
    return `Rp ${(value / 1000000).toFixed(1)}jt`
  }
  if (value >= 1000) {
    return `Rp ${(value / 1000).toFixed(0)}rb`
  }
  return `Rp ${value}`
}

export function formatPercent(value: number, decimal: number = 2): string {
  return `${value.toFixed(decimal)}%`
}

export function parseInput(value: string): number {
  if (!value) return 0
  
  // Remove currency symbols, dots, commas, spaces
  const cleaned = value
    .replace(/Rp/g, '')
    .replace(/\./g, '')
    .replace(/,/g, '.')
    .replace(/\s/g, '')
    .trim()
  
  const parsed = parseFloat(cleaned)
  return isNaN(parsed) ? 0 : parsed
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat('id-ID').format(value)
}

export function formatMonthYear(bulanIndex: number, startDate?: Date): string {
  const monthNames = [
    'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
    'Jul', 'Ags', 'Sep', 'Okt', 'Nov', 'Des'
  ]
  
  const date = startDate || new Date()
  const targetMonth = (date.getMonth() + bulanIndex) % 12
  const yearOffset = Math.floor((date.getMonth() + bulanIndex) / 12)
  const targetYear = date.getFullYear() + yearOffset
  
  return `${monthNames[targetMonth]} ${targetYear}`
}
