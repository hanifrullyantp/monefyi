'use client'

import React from 'react'
import { Wallet, AlertTriangle } from 'lucide-react'
import { InputCurrency } from '@/components/ui/InputCurrency'
import { InputPercent } from '@/components/ui/InputPercent'
import { SelectInput } from '@/components/ui/SelectInput'
import { Button } from '@/components/ui/Button'
import { ResultCard } from '@/components/ui/ResultCard'
import { AffordabilityGauge } from './AffordabilityGauge'
import { AmortisasiTable } from './AmortisasiTable'
import { CicilanChart } from './CicilanChart'
import { RibaWarning } from '@/components/ui/RibaWarning'
import { MoneyLostBadge } from '@/components/ui/MoneyLostBadge'
import { useCalculator } from '@/hooks/useCalculator'
import { useLocalStorage } from '@/hooks/useLocalStorage'
import { formatCurrency } from '@/lib/formatters'
import { hitungCicilan, hitungAffordability } from '@/lib/calculators'
import type { KTAInput, MetodeBunga } from '@/types'
import { motion, AnimatePresence } from 'framer-motion'

const defaultInput: KTAInput = {
  jumlahPinjaman: 50000000,
  tenor: 24,
  bunga: 18,
  metode: 'anuitas',
  provisi: 2,
  admin: 250000,
  penghasilan: 8000000,
}

export function KTACalculator() {
  const [input, setInput] = useLocalStorage<KTAInput>('cicilan_kta_input', defaultInput)
  const { result, isLoading, calculate } = useCalculator()

  const handleCalculate = () => {
    calculate(() => {
      const hasil = hitungCicilan(input.jumlahPinjaman, input.bunga, input.tenor, input.metode)
      const biayaProvisi = (input.jumlahPinjaman * input.provisi) / 100
      const totalBiaya = biayaProvisi + input.admin
      
      return { ...hasil, totalBiaya, totalPembayaran: hasil.totalPembayaran + totalBiaya }
    })
  }

  const affordability = result && input.penghasilan > 0
    ? hitungAffordability(result.cicilanPerBulan, input.penghasilan)
    : null

  return (
    <div className="grid lg:grid-cols-5 gap-8">
      <div className="lg:col-span-2 space-y-6">
        <div className="p-6 bg-slate-800 rounded-2xl border-2 border-slate-700 space-y-4">
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Wallet className="h-6 w-6 text-green-400" />
            Kredit Tanpa Agunan (KTA)
          </h2>

          <div className="p-3 bg-red-950/20 rounded-lg border border-red-700">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-red-400 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-red-400">
                KTA memiliki bunga tertinggi di antara produk kredit. Gunakan hanya untuk kebutuhan mendesak yang produktif.
              </p>
            </div>
          </div>

          <InputCurrency
            label="Jumlah Pinjaman"
            value={input.jumlahPinjaman}
            onChange={(v) => setInput({ ...input, jumlahPinjaman: v })}
            required
          />

          <SelectInput
            label="Jangka Waktu"
            value={input.tenor.toString()}
            onChange={(v) => setInput({ ...input, tenor: parseInt(v) })}
            options={[
              { value: '6', label: '6 Bulan' },
              { value: '12', label: '12 Bulan' },
              { value: '24', label: '24 Bulan (2 Tahun)' },
              { value: '36', label: '36 Bulan (3 Tahun)' },
              { value: '48', label: '48 Bulan (4 Tahun)' },
              { value: '60', label: '60 Bulan (5 Tahun)' },
            ]}
          />

          <InputPercent
            label="Suku Bunga per Tahun"
            value={input.bunga}
            onChange={(v) => setInput({ ...input, bunga: v })}
            helper="KTA umumnya 15-30% per tahun"
          />

          <SelectInput
            label="Metode Perhitungan"
            value={input.metode}
            onChange={(v) => setInput({ ...input, metode: v as MetodeBunga })}
            options={[
              { value: 'anuitas', label: 'Anuitas (cicilan tetap)' },
              { value: 'flat', label: 'Flat' },
              { value: 'efektif', label: 'Efektif' },
            ]}
          />

          <InputPercent
            label="Biaya Provisi"
            value={input.provisi}
            onChange={(v) => setInput({ ...input, provisi: v })}
            helper="Biasanya 1-3% dari jumlah pinjaman"
          />

          <InputCurrency
            label="Biaya Admin"
            value={input.admin}
            onChange={(v) => setInput({ ...input, admin: v })}
          />

          <InputCurrency
            label="Penghasilan Bulanan"
            value={input.penghasilan}
            onChange={(v) => setInput({ ...input, penghasilan: v })}
            helper="Untuk cek affordability"
          />

          <Button onClick={handleCalculate} isLoading={isLoading} variant="primary" size="lg" className="w-full">
            Hitung Cicilan
          </Button>
        </div>
      </div>

      <div className="lg:col-span-3 space-y-6">
        <AnimatePresence mode="wait">
          {result ? (
            <motion.div key="results" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <ResultCard label="Cicilan per Bulan" value={formatCurrency(result.cicilanPerBulan)} variant="highlight" animated />
                <ResultCard label="Total Bunga" value={formatCurrency(result.totalBunga)} variant="danger" animated />
                <ResultCard label="Total Pembayaran" value={formatCurrency(result.totalPembayaran)} variant="warning" animated />
                <ResultCard label="Bunga Efektif" value={`${result.bungaEfektif.toFixed(2)}%`} variant="info" animated />
              </div>
              <MoneyLostBadge pokokPinjaman={result.pokokPinjaman} totalBunga={result.totalBunga} />
              <RibaWarning 
                pokokPinjaman={result.pokokPinjaman}
                totalBunga={result.totalBunga}
                totalPembayaran={result.totalPembayaran}
                tenorBulan={result.tenorBulan}
                penghasilan={input.penghasilan}
              />
              {affordability && <AffordabilityGauge result={affordability} />}
              <CicilanChart jadwal={result.jadwal} />
              <AmortisasiTable jadwal={result.jadwal} />
            </motion.div>
          ) : (
            <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center p-12 bg-slate-800/50 rounded-2xl border-2 border-dashed border-slate-700">
              <h3 className="text-lg font-semibold text-slate-400">Belum Ada Hasil</h3>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
