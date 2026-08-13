'use client'

import React, { useState } from 'react'
import { Car, Copy } from 'lucide-react'
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
import { hitungCicilan, hitungDPRupiah, hitungAffordability } from '@/lib/calculators'
import type { KKBInput, MetodeBunga } from '@/types'
import { motion, AnimatePresence } from 'framer-motion'

const defaultInput: KKBInput = {
  hargaOTR: 250000000,
  tipe: 'baru',
  dp: 25,
  dpMode: 'persen',
  tenor: 5,
  bunga: 3,
  metode: 'flat',
  admin: 300000,
  asuransi: 'all_risk',
  penghasilan: 10000000,
}

export function KKBCalculator() {
  const [input, setInput] = useLocalStorage<KKBInput>('cicilan_kkb_input', defaultInput)
  const [dpMode, setDpMode] = useState<'rupiah' | 'persen'>('persen')
  const [dpRupiah, setDpRupiah] = useState(0)
  const [dpPersen, setDpPersen] = useState(25)
  const { result, isLoading, calculate, copyToClipboard } = useCalculator()

  React.useEffect(() => {
    if (dpMode === 'persen') {
      setDpRupiah(hitungDPRupiah(input.hargaOTR, dpPersen, 'persen'))
    } else {
      setDpPersen((dpRupiah / input.hargaOTR) * 100)
    }
  }, [dpMode, dpPersen, dpRupiah, input.hargaOTR])

  const handleCalculate = () => {
    calculate(() => {
      const dpRupiahFinal = dpMode === 'persen' 
        ? hitungDPRupiah(input.hargaOTR, dpPersen, 'persen')
        : dpRupiah
      
      const pokokPinjaman = input.hargaOTR - dpRupiahFinal
      const tenorBulan = input.tenor * 12
      
      const hasil = hitungCicilan(pokokPinjaman, input.bunga, tenorBulan, input.metode)
      
      return { ...hasil, totalBiaya: input.admin, totalPembayaran: hasil.totalPembayaran + input.admin }
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
            <Car className="h-6 w-6 text-green-400" />
            Kredit Kendaraan
          </h2>

          <div className="p-3 bg-amber-950/20 rounded-lg border border-amber-700">
            <p className="text-xs text-amber-400">
              ⚠️ Kredit kendaraan umumnya menggunakan metode FLAT. Bunga flat 3% ≈ bunga efektif 5.5–6%. Selalu tanyakan bunga efektif ke leasing.
            </p>
          </div>

          <SelectInput
            label="Tipe Kendaraan"
            value={input.tipe}
            onChange={(v) => setInput({ ...input, tipe: v as 'baru' | 'bekas' })}
            options={[
              { value: 'baru', label: 'Baru' },
              { value: 'bekas', label: 'Bekas' },
            ]}
          />

          <InputCurrency
            label="Harga OTR"
            value={input.hargaOTR}
            onChange={(v) => setInput({ ...input, hargaOTR: v })}
            required
          />

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-sm font-medium text-slate-300">Uang Muka (DP)</label>
              <div className="flex gap-1 bg-slate-900 p-1 rounded-lg">
                <button onClick={() => setDpMode('persen')} className={`px-3 py-1 rounded text-xs font-medium ${dpMode === 'persen' ? 'bg-green-600 text-white' : 'text-slate-400'}`}>%</button>
                <button onClick={() => setDpMode('rupiah')} className={`px-3 py-1 rounded text-xs font-medium ${dpMode === 'rupiah' ? 'bg-green-600 text-white' : 'text-slate-400'}`}>Rp</button>
              </div>
            </div>
            {dpMode === 'persen' ? (
              <InputPercent label="" value={dpPersen} onChange={setDpPersen} min={0} max={99} />
            ) : (
              <InputCurrency label="" value={dpRupiah} onChange={setDpRupiah} />
            )}
            <p className="text-xs text-slate-500">{dpMode === 'persen' ? `≈ ${formatCurrency(dpRupiah)}` : `≈ ${dpPersen.toFixed(1)}%`}</p>
          </div>

          <SelectInput
            label="Jangka Waktu"
            value={input.tenor.toString()}
            onChange={(v) => setInput({ ...input, tenor: parseInt(v) })}
            options={[
              { value: '1', label: '1 Tahun' },
              { value: '2', label: '2 Tahun' },
              { value: '3', label: '3 Tahun' },
              { value: '4', label: '4 Tahun' },
              { value: '5', label: '5 Tahun' },
              { value: '6', label: '6 Tahun' },
              { value: '7', label: '7 Tahun' },
            ]}
          />

          <InputPercent
            label="Suku Bunga per Tahun"
            value={input.bunga}
            onChange={(v) => setInput({ ...input, bunga: v })}
            helper={input.tipe === 'baru' ? 'Default: 3% untuk kendaraan baru' : 'Default: 6% untuk kendaraan bekas'}
          />

          <SelectInput
            label="Metode Perhitungan"
            value={input.metode}
            onChange={(v) => setInput({ ...input, metode: v as MetodeBunga })}
            options={[
              { value: 'flat', label: 'Flat (paling umum)' },
              { value: 'anuitas', label: 'Anuitas' },
              { value: 'efektif', label: 'Efektif' },
            ]}
          />

          <InputCurrency
            label="Biaya Admin"
            value={input.admin}
            onChange={(v) => setInput({ ...input, admin: v })}
          />

          <SelectInput
            label="Asuransi"
            value={input.asuransi}
            onChange={(v) => setInput({ ...input, asuransi: v as KKBInput['asuransi'] })}
            options={[
              { value: 'all_risk', label: 'All Risk (Comprehensive)' },
              { value: 'tlo', label: 'TLO (Total Loss Only)' },
              { value: 'tidak_ada', label: 'Tidak Ada' },
            ]}
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
              <p className="text-sm text-slate-500 mt-2">Klik "Hitung Cicilan" untuk melihat hasil</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
