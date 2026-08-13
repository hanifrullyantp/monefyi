'use client'

import React, { useState } from 'react'
import { TrendingUp } from 'lucide-react'
import { InputCurrency } from '@/components/ui/InputCurrency'
import { Button } from '@/components/ui/Button'
import { formatCurrency } from '@/lib/formatters'
import { hitungPelunasanDipercepat } from '@/lib/calculators'
import type { JadwalAngsuran } from '@/types'

interface PelunasanDipercepatProps {
  jadwal: JadwalAngsuran[]
}

export function PelunasanDipercepat({ jadwal }: PelunasanDipercepatProps) {
  const [ekstraPerBulan, setEkstraPerBulan] = useState(0)
  const [result, setResult] = useState<ReturnType<typeof hitungPelunasanDipercepat> | null>(null)

  const handleCalculate = () => {
    if (ekstraPerBulan <= 0) return
    const hasil = hitungPelunasanDipercepat(jadwal, ekstraPerBulan)
    setResult(hasil)
  }

  if (jadwal.length === 0) return null

  return (
    <div className="space-y-4">
      <h3 className="text-xl font-semibold text-white flex items-center gap-2">
        <TrendingUp className="h-5 w-5 text-green-400" />
        Pelunasan Dipercepat
      </h3>
      
      <div className="p-6 bg-slate-800 rounded-2xl border-2 border-slate-700 space-y-4">
        <p className="text-sm text-slate-300">
          Simulasikan dampak pembayaran ekstra untuk mempercepat pelunasan dan menghemat bunga
        </p>

        <InputCurrency
          label="Tambah Cicilan Ekstra per Bulan"
          value={ekstraPerBulan}
          onChange={setEkstraPerBulan}
          placeholder="500000"
          helper="Masukkan jumlah tambahan yang ingin dibayar setiap bulan"
        />

        <Button
          onClick={handleCalculate}
          disabled={ekstraPerBulan <= 0}
          variant="primary"
          className="w-full"
        >
          Hitung Dampaknya
        </Button>

        {result && result.bulanHemat > 0 && (
          <div className="space-y-3 pt-4 border-t-2 border-slate-700">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-slate-900 rounded-xl border border-slate-700">
                <p className="text-xs text-slate-400 mb-1">Tenor Asli</p>
                <p className="text-2xl font-bold text-white tabular-nums">
                  {result.bulanLunasAsli} <span className="text-sm text-slate-400">bulan</span>
                </p>
              </div>
              
              <div className="p-4 bg-green-950/30 rounded-xl border border-green-600">
                <p className="text-xs text-green-400 mb-1">Tenor Baru</p>
                <p className="text-2xl font-bold text-green-400 tabular-nums">
                  {result.bulanLunasBaru} <span className="text-sm text-green-300">bulan</span>
                </p>
              </div>
            </div>

            <div className="p-4 bg-green-950/20 rounded-xl border border-green-700">
              <p className="text-sm text-green-400 mb-2 font-medium">✓ Manfaat Pelunasan Dipercepat</p>
              <ul className="space-y-2 text-sm">
                <li className="flex justify-between">
                  <span className="text-slate-300">Lunas lebih cepat:</span>
                  <span className="font-semibold text-white tabular-nums">
                    {result.bulanHemat} bulan
                  </span>
                </li>
                <li className="flex justify-between">
                  <span className="text-slate-300">Hemat bunga:</span>
                  <span className="font-semibold text-green-400 tabular-nums">
                    {formatCurrency(result.bungaHemat)}
                  </span>
                </li>
              </ul>
            </div>

            <div className="p-3 bg-blue-950/20 rounded-lg border border-blue-700">
              <p className="text-xs text-blue-400">
                💡 Tip: Pembayaran ekstra di tahun-tahun awal memberikan penghematan bunga terbesar
              </p>
            </div>
          </div>
        )}

        {result && result.bulanHemat === 0 && (
          <div className="p-4 bg-amber-950/20 rounded-xl border border-amber-700">
            <p className="text-sm text-amber-400">
              Jumlah ekstra terlalu kecil untuk memberikan dampak signifikan. Coba tambah jumlahnya.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
