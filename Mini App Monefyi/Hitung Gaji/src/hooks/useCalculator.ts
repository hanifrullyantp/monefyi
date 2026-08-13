import { useState, useCallback } from 'react'
import type { HasilCicilan, HistoryItem, TabId } from '@/types'

export function useCalculator() {
  const [result, setResult] = useState<HasilCicilan | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const calculate = useCallback(async (calculatorFn: () => HasilCicilan) => {
    setIsLoading(true)
    
    // Simulate calculation delay for better UX
    await new Promise((resolve) => setTimeout(resolve, 300))
    
    try {
      const hasil = calculatorFn()
      setResult(hasil)
    } catch (error) {
      console.error('Calculation error:', error)
      setResult(null)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const reset = useCallback(() => {
    setResult(null)
  }, [])

  const saveToHistory = useCallback(
    (jenis: TabId, label: string) => {
      if (!result) return

      try {
        const historyItem: HistoryItem = {
          id: `${Date.now()}-${Math.random()}`,
          tanggal: new Date().toISOString(),
          jenis,
          label,
          cicilanPerBulan: result.cicilanPerBulan,
          totalBayar: result.totalPembayaran,
        }

        const existingHistory = localStorage.getItem('cicilan_history')
        const history: HistoryItem[] = existingHistory
          ? JSON.parse(existingHistory)
          : []

        // Add new item and keep last 10
        const newHistory = [historyItem, ...history].slice(0, 10)
        localStorage.setItem('cicilan_history', JSON.stringify(newHistory))
      } catch (error) {
        console.error('Failed to save history:', error)
      }
    },
    [result]
  )

  const copyToClipboard = useCallback(
    (jenis: string, additionalInfo?: Record<string, string | number>) => {
      if (!result) return false

      try {
        const today = new Date().toLocaleDateString('id-ID', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        })

        let text = `══════════════════════════════\n`
        text += `KALKULATOR CICILAN\n`
        text += `Jenis       : ${jenis}\n`
        text += `Tanggal     : ${today}\n`
        text += `══════════════════════════════\n`

        if (additionalInfo) {
          Object.entries(additionalInfo).forEach(([key, value]) => {
            text += `${key.padEnd(12)}: ${value}\n`
          })
          text += `──────────────────────────────\n`
        }

        text += `Pokok       : Rp ${result.pokokPinjaman.toLocaleString('id-ID')}\n`
        text += `Tenor       : ${result.tenorBulan} bulan\n`
        text += `──────────────────────────────\n`
        text += `Cicilan/Bln : Rp ${result.cicilanPerBulan.toLocaleString('id-ID')}\n`
        text += `Total Bunga : Rp ${result.totalBunga.toLocaleString('id-ID')}\n`
        text += `Total Bayar : Rp ${result.totalPembayaran.toLocaleString('id-ID')}\n`
        text += `Bunga Eff.  : ${result.bungaEfektif.toFixed(2)}%\n`
        text += `══════════════════════════════\n`
        text += `Dibuat dengan Kalkulator Cicilan`

        navigator.clipboard.writeText(text)
        return true
      } catch (error) {
        console.error('Failed to copy:', error)
        return false
      }
    },
    [result]
  )

  return {
    result,
    isLoading,
    calculate,
    reset,
    saveToHistory,
    copyToClipboard,
  }
}
