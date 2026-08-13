'use client'

import React, { useState } from 'react'
import { ShoppingBag, Info } from 'lucide-react'
import { InputCurrency } from '@/components/ui/InputCurrency'
import { InputPercent } from '@/components/ui/InputPercent'
import { SelectInput } from '@/components/ui/SelectInput'
import { Button } from '@/components/ui/Button'
import { ResultCard } from '@/components/ui/ResultCard'
import { AmortisasiTable } from './AmortisasiTable'
import { RibaWarning } from '@/components/ui/RibaWarning'
import { MoneyLostBadge } from '@/components/ui/MoneyLostBadge'
import { useCalculator } from '@/hooks/useCalculator'
import { useLocalStorage } from '@/hooks/useLocalStorage'
import { formatCurrency } from '@/lib/formatters'
import { hitungCicilan, hitungDPRupiah } from '@/lib/calculators'
import type { BarangInput, MetodeBunga } from '@/types'
import { motion, AnimatePresence } from 'framer-motion'

const defaultInput: BarangInput = {
  namaBarang: 'Laptop',
  harga: 15000000,
  dp: 0,
  dpMode: 'persen',
  tenor: 12,
  bunga: 0,
  admin: 0,
}

export function KreditBarangCalculator() {
  const [input, setInput] = useLocalStorage<BarangInput>('cicilan_barang_input', defaultInput)
  const [dpMode, setDpMode] = useState<'rupiah' | 'persen'>('persen')
  const [dpRupiah, setDpRupiah] = useState(0)
  const [dpPersen, setDpPersen] = useState(0)
  const { result, isLoading, calculate } = useCalculator()

  React.useEffect(() => {
    if (dpMode === 'persen') {
      setDpRupiah(hitungDPRupiah(input.harga, dpPersen, 'persen'))
    } else {
      setDpPersen((dpRupiah / input.harga) * 100)
    }
  }, [dpMode, dpPersen, dpRupiah, input.harga])

  const handleCalculate = () => {
    calculate(() => {
      const dpRupiahFinal = dpMode === 'persen' 
        ? hitungDPRupiah(input.harga, dpPersen, 'persen')
        : dpRupiah
      
      const pokokPinjaman = input.harga - dpRupiahFinal
      const hasil = hitungCicilan(pokokPinjaman, input.bunga, input.tenor, 'flat')
      
      return { ...hasil, totalBiaya: input.admin, totalPembayaran: hasil.totalPembayaran + input.admin }
    })
  }

  const hargaCash = input.harga
  const totalKredit = result ? result.totalPembayaran : 0
  const biayaKemudahan = totalKredit - hargaCash

  return (
    <div className="grid lg:grid-cols-5 gap-8">
      <div className="lg:col-span-2 space-y-6">
        <div className="p-6 bg-slate-800 rounded-2xl border-2 border-slate-700 space-y-4">
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <ShoppingBag className="h-6 w-6 text-green-400" />
            Kredit Barang
          </h2>

          <div className="p-3 bg-blue-950/20 rounded-lg border border-blue-700">
            <div className="flex items-start gap-2">
              <Info className="h-4 w-4 text-blue-400 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-blue-400">
                Hati-hati promo "0% bunga". Sering ada biaya admin atau harga barang dinaikkan terlebih dahulu.
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-300">Nama Barang (Opsional)</label>
            <input
              type="text"
              value={input.namaBarang}
              onChange={(e) => setInput({ ...input, namaBarang: e.target.value })}
              placeholder="Contoh: Laptop, Smartphone, TV"
              className="w-full px-4 py-3 bg-slate-900 border-2 border-slate-700 rounded-xl text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>

          <InputCurrency
            label="Harga Barang"
            value={input.harga}
            onChange={(v) => setInput({ ...input, harga: v })}
            required
          />

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-sm font-medium text-slate-300">Uang Muka</label>
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
          </div>

          <SelectInput
            label="Jangka Waktu"
            value={input.tenor.toString()}
            onChange={(v) => setInput({ ...input, tenor: parseInt(v) })}
            options={[
              { value: '3', label: '3 Bulan' },
              { value: '6', label: '6 Bulan' },
              { value: '12', label: '12 Bulan' },
              { value: '18', label: '18 Bulan' },
              { value: '24', label: '24 Bulan' },
              { value: '36', label: '36 Bulan' },
            ]}
          />

          <InputPercent
            label="Suku Bunga per Tahun"
            value={input.bunga}
            onChange={(v) => setInput({ ...input, bunga: v })}
            helper="Masukkan 0 untuk promo 0% bunga"
          />

          <InputCurrency
            label="Biaya Admin"
            value={input.admin}
            onChange={(v) => setInput({ ...input, admin: v })}
            helper="Cek biaya admin jika ada promo 0%"
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
                <ResultCard label="Total Biaya Admin" value={formatCurrency(result.totalBiaya)} variant="info" animated />
              </div>

              <div className="p-6 bg-gradient-to-br from-red-950/40 to-slate-800 rounded-2xl border-2 border-red-700">
                <h3 className="text-lg font-semibold text-red-400 mb-4 flex items-center gap-2">
                  <ShoppingBag className="h-5 w-5" />
                  Perbandingan Cash vs Kredit
                </h3>
                <div className="space-y-3">
                  <div className="p-4 bg-green-950/30 rounded-xl border border-green-700">
                    <div className="flex justify-between items-center">
                      <span className="text-green-300 text-sm">✓ Harga Cash:</span>
                      <span className="text-2xl font-bold text-green-400 tabular-nums">{formatCurrency(hargaCash)}</span>
                    </div>
                    <p className="text-xs text-green-300 mt-1">Bayar sekali, barang langsung milik Anda 100%</p>
                  </div>

                  <div className="p-4 bg-amber-950/30 rounded-xl border border-amber-700">
                    <div className="flex justify-between items-center">
                      <span className="text-amber-300 text-sm">⚠ Total Bayar Kredit:</span>
                      <span className="text-2xl font-bold text-amber-400 tabular-nums">{formatCurrency(totalKredit)}</span>
                    </div>
                    <p className="text-xs text-amber-300 mt-1">Bayar bertahap, tapi lebih mahal</p>
                  </div>

                  <div className="p-4 bg-red-950/40 rounded-xl border-2 border-red-600">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-red-300 font-bold">💸 Uang yang Hilang:</span>
                      <span className="text-3xl font-bold text-red-400 tabular-nums">
                        {biayaKemudahan > 0 ? formatCurrency(biayaKemudahan) : formatCurrency(0)}
                      </span>
                    </div>
                    {biayaKemudahan > 0 && (
                      <>
                        <p className="text-sm text-red-300 font-medium">
                          Anda bayar <span className="text-white text-lg">{((biayaKemudahan / hargaCash) * 100).toFixed(1)}%</span> lebih mahal
                        </p>
                        <div className="mt-3 p-3 bg-slate-900/50 rounded-lg border border-red-800">
                          <p className="text-xs text-slate-300 mb-2 font-medium">Dengan uang {formatCurrency(biayaKemudahan)} yang hilang, Anda bisa:</p>
                          <ul className="space-y-1 text-xs text-slate-400">
                            <li>• Beli {Math.floor((biayaKemudahan / hargaCash) * 100)}% barang yang sama lagi</li>
                            <li>• Upgrade ke model/tipe yang lebih bagus</li>
                            <li>• Belanja kebutuhan lain untuk keluarga</li>
                            <li>• Investasi atau sedekah yang lebih bermanfaat</li>
                          </ul>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {biayaKemudahan > 0 && (
                  <div className="mt-4 p-4 bg-blue-950/20 rounded-xl border border-blue-700">
                    <p className="text-xs text-blue-400 font-medium mb-2">💡 Solusi Cerdas:</p>
                    <p className="text-sm text-slate-300">
                      Daripada kredit {result.tenorBulan} bulan dengan total {formatCurrency(totalKredit)}, 
                      lebih baik <span className="font-bold text-green-400">nabung dulu {Math.ceil(hargaCash / (totalKredit / result.tenorBulan))} bulan</span>, 
                      lalu beli cash. Hemat <span className="font-bold text-white">{formatCurrency(biayaKemudahan)}</span> tanpa riba!
                    </p>
                  </div>
                )}
              </div>

              {result.totalBunga > 0 && (
                <>
                  <MoneyLostBadge pokokPinjaman={result.pokokPinjaman} totalBunga={result.totalBunga} />
                  <RibaWarning 
                    pokokPinjaman={result.pokokPinjaman}
                    totalBunga={result.totalBunga}
                    totalPembayaran={result.totalPembayaran}
                    tenorBulan={result.tenorBulan}
                  />
                </>
              )}

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
