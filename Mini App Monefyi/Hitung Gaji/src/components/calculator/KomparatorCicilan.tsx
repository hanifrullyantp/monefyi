'use client'

import React, { useState } from 'react'
import { GitCompare, Trophy, AlertCircle } from 'lucide-react'
import { InputCurrency } from '@/components/ui/InputCurrency'
import { InputPercent } from '@/components/ui/InputPercent'
import { InputNumber } from '@/components/ui/InputNumber'
import { SelectInput } from '@/components/ui/SelectInput'
import { Button } from '@/components/ui/Button'
import { formatCurrency } from '@/lib/formatters'
import { hitungCicilan } from '@/lib/calculators'
import type { KomparatorItem, MetodeBunga } from '@/types'
import { motion, AnimatePresence } from 'framer-motion'

const defaultItem: KomparatorItem = {
  id: '',
  label: '',
  pokok: 0,
  bunga: 0,
  tenor: 12,
  metode: 'anuitas',
  biayaLain: 0,
}

export function KomparatorCicilan() {
  const [items, setItems] = useState<KomparatorItem[]>([
    { ...defaultItem, id: '1', label: 'Opsi A' },
    { ...defaultItem, id: '2', label: 'Opsi B' },
    { ...defaultItem, id: '3', label: 'Opsi C' },
  ])
  
  const [results, setResults] = useState<Array<ReturnType<typeof hitungCicilan> & { id: string }> | null>(null)

  const updateItem = (id: string, field: keyof KomparatorItem, value: any) => {
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, [field]: value } : item)))
  }

  const handleCompare = () => {
    const validItems = items.filter((item) => item.pokok > 0)
    
    if (validItems.length < 2) {
      alert('Minimal 2 opsi harus diisi')
      return
    }

    const calculated = validItems.map((item) => {
      const hasil = hitungCicilan(item.pokok, item.bunga, item.tenor, item.metode)
      return {
        ...hasil,
        id: item.id,
        totalBiaya: item.biayaLain,
        totalPembayaran: hasil.totalPembayaran + item.biayaLain,
      }
    })

    setResults(calculated)
  }

  const bestOption = results ? results.reduce((best, current) => 
    current.totalPembayaran < best.totalPembayaran ? current : best
  ) : null

  const worstOption = results ? results.reduce((worst, current) => 
    current.totalPembayaran > worst.totalPembayaran ? current : worst
  ) : null

  return (
    <div className="space-y-6">
      <div className="p-6 bg-gradient-hero rounded-2xl border-2 border-green-900">
        <h2 className="text-2xl font-bold text-white flex items-center gap-2 mb-2">
          <GitCompare className="h-6 w-6 text-green-400" />
          Komparator Cicilan
        </h2>
        <p className="text-slate-300 text-sm">
          Bandingkan hingga 3 opsi pinjaman sekaligus dan temukan yang paling hemat
        </p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {items.map((item, index) => (
          <div key={item.id} className="p-6 bg-slate-800 rounded-2xl border-2 border-slate-700 space-y-4">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-300">Nama Opsi</label>
              <input
                type="text"
                value={item.label}
                onChange={(e) => updateItem(item.id, 'label', e.target.value)}
                placeholder={`Opsi ${String.fromCharCode(65 + index)}`}
                className="w-full px-4 py-2 bg-slate-900 border-2 border-slate-700 rounded-xl text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>

            <InputCurrency
              label="Pokok Pinjaman"
              value={item.pokok}
              onChange={(v) => updateItem(item.id, 'pokok', v)}
            />

            <InputPercent
              label="Bunga per Tahun"
              value={item.bunga}
              onChange={(v) => updateItem(item.id, 'bunga', v)}
            />

            <InputNumber
              label="Tenor (Bulan)"
              value={item.tenor}
              onChange={(v) => updateItem(item.id, 'tenor', v)}
              min={1}
              max={360}
              suffix="bulan"
            />

            <SelectInput
              label="Metode"
              value={item.metode}
              onChange={(v) => updateItem(item.id, 'metode', v as MetodeBunga)}
              options={[
                { value: 'anuitas', label: 'Anuitas' },
                { value: 'flat', label: 'Flat' },
                { value: 'efektif', label: 'Efektif' },
              ]}
            />

            <InputCurrency
              label="Biaya Lain-lain"
              value={item.biayaLain}
              onChange={(v) => updateItem(item.id, 'biayaLain', v)}
              helper="Admin, provisi, asuransi, dll"
            />
          </div>
        ))}
      </div>

      <Button onClick={handleCompare} variant="primary" size="lg" className="w-full">
        <GitCompare className="h-5 w-5 mr-2" />
        Bandingkan Opsi
      </Button>

      <AnimatePresence mode="wait">
        {results && results.length >= 2 ? (
          <motion.div
            key="results"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="space-y-6"
          >
            <div className="overflow-x-auto border-2 border-slate-700 rounded-2xl">
              <table className="w-full min-w-[600px]">
                <thead className="bg-slate-800">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">Komponen</th>
                    {results.map((result, index) => {
                      const item = items.find((i) => i.id === result.id)
                      const isBest = bestOption?.id === result.id
                      const isWorst = worstOption?.id === result.id
                      
                      return (
                        <th
                          key={result.id}
                          className={`px-6 py-4 text-right text-sm font-semibold ${
                            isBest ? 'text-green-400' : isWorst ? 'text-red-400' : 'text-white'
                          }`}
                        >
                          <div className="flex items-center justify-end gap-2">
                            {isBest && <Trophy className="h-4 w-4" />}
                            <span>{item?.label || `Opsi ${index + 1}`}</span>
                          </div>
                        </th>
                      )
                    })}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700 bg-slate-900">
                  <tr>
                    <td className="px-6 py-3 text-sm text-slate-400">Cicilan/Bulan</td>
                    {results.map((result) => (
                      <td key={result.id} className="px-6 py-3 text-sm text-right font-semibold text-white tabular-nums">
                        {formatCurrency(result.cicilanPerBulan)}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="px-6 py-3 text-sm text-slate-400">Total Bunga</td>
                    {results.map((result) => (
                      <td key={result.id} className="px-6 py-3 text-sm text-right font-semibold text-red-400 tabular-nums">
                        {formatCurrency(result.totalBunga)}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="px-6 py-3 text-sm text-slate-400">Total Biaya Lain</td>
                    {results.map((result) => (
                      <td key={result.id} className="px-6 py-3 text-sm text-right font-semibold text-amber-400 tabular-nums">
                        {formatCurrency(result.totalBiaya)}
                      </td>
                    ))}
                  </tr>
                  <tr className="bg-slate-800/50">
                    <td className="px-6 py-4 text-sm font-semibold text-white">Total Pembayaran</td>
                    {results.map((result) => {
                      const isBest = bestOption?.id === result.id
                      const isWorst = worstOption?.id === result.id
                      
                      return (
                        <td
                          key={result.id}
                          className={`px-6 py-4 text-sm text-right font-bold text-lg tabular-nums ${
                            isBest ? 'text-green-400' : isWorst ? 'text-red-400' : 'text-white'
                          }`}
                        >
                          {formatCurrency(result.totalPembayaran)}
                        </td>
                      )
                    })}
                  </tr>
                  <tr>
                    <td className="px-6 py-3 text-sm text-slate-400">Bunga Efektif</td>
                    {results.map((result) => (
                      <td key={result.id} className="px-6 py-3 text-sm text-right font-semibold text-blue-400 tabular-nums">
                        {result.bungaEfektif.toFixed(2)}%
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>

            {bestOption && worstOption && bestOption.id !== worstOption.id && (
              <div className="p-6 bg-green-950/20 rounded-2xl border-2 border-green-700">
                <h3 className="text-lg font-semibold text-green-400 mb-3 flex items-center gap-2">
                  <Trophy className="h-5 w-5" />
                  Kesimpulan
                </h3>
                <p className="text-slate-300">
                  Opsi <span className="font-bold text-green-400">{items.find((i) => i.id === bestOption.id)?.label}</span> adalah pilihan paling hemat dengan total pembayaran{' '}
                  <span className="font-bold text-white tabular-nums">{formatCurrency(bestOption.totalPembayaran)}</span>, selisih{' '}
                  <span className="font-bold text-red-400 tabular-nums">
                    {formatCurrency(worstOption.totalPembayaran - bestOption.totalPembayaran)}
                  </span>{' '}
                  dari opsi termahal.
                </p>
              </div>
            )}
          </motion.div>
        ) : (
          results && results.length < 2 && (
            <motion.div
              key="error"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="p-6 bg-amber-950/20 rounded-2xl border-2 border-amber-700"
            >
              <div className="flex items-center gap-3">
                <AlertCircle className="h-5 w-5 text-amber-400 flex-shrink-0" />
                <p className="text-amber-400">
                  Minimal 2 opsi harus diisi dengan pokok pinjaman lebih dari 0
                </p>
              </div>
            </motion.div>
          )
        )}
      </AnimatePresence>
    </div>
  )
}
