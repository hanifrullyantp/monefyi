'use client'

import React, { useState, useEffect } from 'react'
import { Calculator, Copy, AlertCircle } from 'lucide-react'
import { InputCurrency } from '@/components/ui/InputCurrency'
import { InputNumber } from '@/components/ui/InputNumber'
import { InputPercent } from '@/components/ui/InputPercent'
import { SelectInput } from '@/components/ui/SelectInput'
import { Button } from '@/components/ui/Button'
import { ResultCard } from '@/components/ui/ResultCard'
import { AffordabilityGauge } from './AffordabilityGauge'
import { AmortisasiTable } from './AmortisasiTable'
import { CicilanChart } from './CicilanChart'
import { PelunasanDipercepat } from './PelunasanDipercepat'
import { RibaWarning } from '@/components/ui/RibaWarning'
import { MoneyLostBadge } from '@/components/ui/MoneyLostBadge'
import { useCalculator } from '@/hooks/useCalculator'
import { useLocalStorage } from '@/hooks/useLocalStorage'
import { formatCurrency } from '@/lib/formatters'
import { hitungCicilan, hitungDPRupiah, hitungAffordability } from '@/lib/calculators'
import type { KPRInput, MetodeBunga, InputDPMode } from '@/types'
import { motion, AnimatePresence } from 'framer-motion'

const defaultInput: KPRInput = {
  hargaProperti: 500000000,
  dp: 20,
  dpMode: 'persen',
  tenor: 15,
  satuanTenor: 'tahun',
  bunga: 8.5,
  metode: 'anuitas',
  provisi: 0.5,
  admin: 500000,
  asuransi: 0.1,
  penghasilan: 15000000,
}

export function KPRCalculator() {
  const [input, setInput] = useLocalStorage<KPRInput>('cicilan_kpr_input', defaultInput)
  const [dpMode, setDpMode] = useState<InputDPMode>('persen')
  const [dpRupiah, setDpRupiah] = useState(0)
  const [dpPersen, setDpPersen] = useState(20)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const { result, isLoading, calculate, copyToClipboard } = useCalculator()

  useEffect(() => {
    if (dpMode === 'persen') {
      setDpRupiah(hitungDPRupiah(input.hargaProperti, dpPersen, 'persen'))
    } else {
      setDpPersen((dpRupiah / input.hargaProperti) * 100)
    }
  }, [dpMode, dpPersen, dpRupiah, input.hargaProperti])

  const validateInput = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (input.hargaProperti <= 0) {
      newErrors.hargaProperti = 'Harga properti harus lebih dari 0'
    }

    const dpFinal = dpMode === 'persen' ? dpPersen : (dpRupiah / input.hargaProperti) * 100
    if (dpFinal <= 0) {
      newErrors.dp = 'DP harus lebih dari 0'
    } else if (dpFinal >= 100) {
      newErrors.dp = 'DP tidak boleh >= harga properti'
    } else if (dpFinal < 10) {
      newErrors.dp = '⚠️ DP dibawah 10% (minimum ideal)'
    }

    const tenorBulan = input.satuanTenor === 'tahun' ? input.tenor * 12 : input.tenor
    if (tenorBulan < 1 || tenorBulan > 360) {
      newErrors.tenor = 'Tenor harus antara 1-360 bulan'
    }

    if (input.bunga < 0 || input.bunga > 50) {
      newErrors.bunga = 'Bunga harus antara 0-50%'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleCalculate = () => {
    if (!validateInput()) return

    calculate(() => {
      const dpRupiahFinal = dpMode === 'persen' 
        ? hitungDPRupiah(input.hargaProperti, dpPersen, 'persen')
        : dpRupiah
      
      const pokokPinjaman = input.hargaProperti - dpRupiahFinal
      const tenorBulan = input.satuanTenor === 'tahun' ? input.tenor * 12 : input.tenor
      
      const hasil = hitungCicilan(pokokPinjaman, input.bunga, tenorBulan, input.metode)
      
      // Add fees
      const biayaProvisi = (pokokPinjaman * input.provisi) / 100
      const biayaAsuransiTahun = (pokokPinjaman * input.asuransi) / 100
      const totalBiaya = biayaProvisi + input.admin + (biayaAsuransiTahun * (tenorBulan / 12))
      
      return {
        ...hasil,
        totalBiaya,
        totalPembayaran: hasil.totalPembayaran + totalBiaya,
      }
    })
  }

  const handleCopy = () => {
    const dpRupiahFinal = dpMode === 'persen' 
      ? hitungDPRupiah(input.hargaProperti, dpPersen, 'persen')
      : dpRupiah
    
    copyToClipboard('KPR', {
      'Harga': formatCurrency(input.hargaProperti),
      'DP': formatCurrency(dpRupiahFinal),
      'Bunga/Tahun': `${input.bunga}%`,
      'Metode': input.metode,
    })
  }

  const affordability = result && input.penghasilan > 0
    ? hitungAffordability(result.cicilanPerBulan, input.penghasilan)
    : null

  return (
    <div className="grid lg:grid-cols-5 gap-8">
      {/* Form - Left Side */}
      <div className="lg:col-span-2 space-y-6">
        <div className="p-6 bg-slate-800 rounded-2xl border-2 border-slate-700 space-y-4">
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Calculator className="h-6 w-6 text-green-400" />
            Kalkulator KPR
          </h2>

          <InputCurrency
            label="Harga Properti"
            value={input.hargaProperti}
            onChange={(v) => setInput({ ...input, hargaProperti: v })}
            error={errors.hargaProperti}
            required
          />

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-sm font-medium text-slate-300">
                Uang Muka (DP) <span className="text-red-400">*</span>
              </label>
              <div className="flex gap-1 bg-slate-900 p-1 rounded-lg">
                <button
                  onClick={() => setDpMode('persen')}
                  className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                    dpMode === 'persen' 
                      ? 'bg-green-600 text-white' 
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  %
                </button>
                <button
                  onClick={() => setDpMode('rupiah')}
                  className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                    dpMode === 'rupiah' 
                      ? 'bg-green-600 text-white' 
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Rp
                </button>
              </div>
            </div>

            {dpMode === 'persen' ? (
              <InputPercent
                label=""
                value={dpPersen}
                onChange={setDpPersen}
                min={0}
                max={99}
                error={errors.dp}
              />
            ) : (
              <InputCurrency
                label=""
                value={dpRupiah}
                onChange={setDpRupiah}
                error={errors.dp}
              />
            )}
            <p className="text-xs text-slate-500">
              {dpMode === 'persen' 
                ? `≈ ${formatCurrency(dpRupiah)}`
                : `≈ ${dpPersen.toFixed(1)}%`
              }
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-sm font-medium text-slate-300">
                Jangka Waktu <span className="text-red-400">*</span>
              </label>
              <div className="flex gap-1 bg-slate-900 p-1 rounded-lg">
                <button
                  onClick={() => setInput({ ...input, satuanTenor: 'tahun' })}
                  className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                    input.satuanTenor === 'tahun' 
                      ? 'bg-green-600 text-white' 
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Tahun
                </button>
                <button
                  onClick={() => setInput({ ...input, satuanTenor: 'bulan' })}
                  className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                    input.satuanTenor === 'bulan' 
                      ? 'bg-green-600 text-white' 
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Bulan
                </button>
              </div>
            </div>

            <InputNumber
              label=""
              value={input.tenor}
              onChange={(v) => setInput({ ...input, tenor: v })}
              min={1}
              max={input.satuanTenor === 'tahun' ? 30 : 360}
              suffix={input.satuanTenor}
              error={errors.tenor}
            />
          </div>

          <InputPercent
            label="Suku Bunga per Tahun"
            value={input.bunga}
            onChange={(v) => setInput({ ...input, bunga: v })}
            min={0}
            max={50}
            error={errors.bunga}
            required
          />

          <SelectInput
            label="Metode Perhitungan Bunga"
            value={input.metode}
            onChange={(v) => setInput({ ...input, metode: v as MetodeBunga })}
            options={[
              { value: 'anuitas', label: 'Anuitas (cicilan tetap)' },
              { value: 'flat', label: 'Flat (bunga dari pokok awal)' },
              { value: 'efektif', label: 'Efektif (bunga dari sisa pokok)' },
            ]}
            required
          />

          <InputPercent
            label="Biaya Provisi"
            value={input.provisi}
            onChange={(v) => setInput({ ...input, provisi: v })}
            min={0}
            max={10}
            helper="Biaya administrasi bank, biasanya 0.5-1%"
          />

          <InputCurrency
            label="Biaya Admin"
            value={input.admin}
            onChange={(v) => setInput({ ...input, admin: v })}
            helper="Biaya administrasi satu kali"
          />

          <InputPercent
            label="Asuransi per Tahun"
            value={input.asuransi}
            onChange={(v) => setInput({ ...input, asuransi: v })}
            min={0}
            max={5}
            helper="Premi asuransi jiwa dan kebakaran per tahun"
          />

          <InputCurrency
            label="Penghasilan Bulanan (Opsional)"
            value={input.penghasilan}
            onChange={(v) => setInput({ ...input, penghasilan: v })}
            helper="Untuk cek affordability dan debt service ratio"
          />

          <Button
            onClick={handleCalculate}
            isLoading={isLoading}
            variant="primary"
            size="lg"
            className="w-full"
          >
            <Calculator className="h-5 w-5 mr-2" />
            Hitung Cicilan
          </Button>
        </div>
      </div>

      {/* Results - Right Side */}
      <div className="lg:col-span-3 space-y-6">
        <AnimatePresence mode="wait">
          {result ? (
            <motion.div
              key="results"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <ResultCard
                  label="Cicilan per Bulan"
                  value={formatCurrency(result.cicilanPerBulan)}
                  variant="highlight"
                  animated
                />
                <ResultCard
                  label="Total Bunga"
                  value={formatCurrency(result.totalBunga)}
                  variant="danger"
                  animated
                />
                <ResultCard
                  label="Total Pembayaran"
                  value={formatCurrency(result.totalPembayaran)}
                  variant="warning"
                  animated
                />
                <ResultCard
                  label="Bunga Efektif"
                  value={`${result.bungaEfektif.toFixed(2)}%`}
                  variant="info"
                  animated
                />
              </div>

              <Button
                onClick={handleCopy}
                variant="secondary"
                className="w-full"
              >
                <Copy className="h-4 w-4 mr-2" />
                Salin Ringkasan
              </Button>

              <MoneyLostBadge pokokPinjaman={result.pokokPinjaman} totalBunga={result.totalBunga} />

              <RibaWarning 
                pokokPinjaman={result.pokokPinjaman}
                totalBunga={result.totalBunga}
                totalPembayaran={result.totalPembayaran}
                tenorBulan={result.tenorBulan}
                penghasilan={input.penghasilan}
              />

              {affordability && (
                <AffordabilityGauge result={affordability} />
              )}

              <CicilanChart jadwal={result.jadwal} />

              <PelunasanDipercepat jadwal={result.jadwal} />

              <AmortisasiTable jadwal={result.jadwal} />
            </motion.div>
          ) : (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center p-12 bg-slate-800/50 rounded-2xl border-2 border-dashed border-slate-700 text-center"
            >
              <AlertCircle className="h-12 w-12 text-slate-600 mb-4" />
              <h3 className="text-lg font-semibold text-slate-400 mb-2">
                Belum Ada Hasil
              </h3>
              <p className="text-sm text-slate-500">
                Isi form di sebelah kiri dan klik "Hitung Cicilan" untuk melihat hasil
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
