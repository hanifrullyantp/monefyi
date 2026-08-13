'use client'

import React from 'react'
import { AlertTriangle, TrendingDown, Clock, DollarSign } from 'lucide-react'
import { formatCurrency } from '@/lib/formatters'
import { motion } from 'framer-motion'

interface RibaWarningProps {
  pokokPinjaman: number
  totalBunga: number
  totalPembayaran: number
  tenorBulan: number
  penghasilan?: number
}

export function RibaWarning({ pokokPinjaman, totalBunga, totalPembayaran, tenorBulan, penghasilan }: RibaWarningProps) {
  const persenBunga = (totalBunga / pokokPinjaman) * 100
  const bulanKerjaUntukBunga = penghasilan ? Math.ceil(totalBunga / penghasilan) : 0
  
  // Simulasi alternatif: nabung dulu
  const cicilanPerBulan = totalPembayaran / tenorBulan
  const lamaMenungguJikaNabung = Math.ceil(pokokPinjaman / cicilanPerBulan)
  const selisihWaktu = tenorBulan - lamaMenungguJikaNabung
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      {/* Main Warning */}
      <div className="p-6 bg-gradient-to-br from-red-950/40 to-amber-950/40 rounded-2xl border-2 border-red-800/50">
        <div className="flex items-start gap-3 mb-4">
          <AlertTriangle className="h-6 w-6 text-amber-400 flex-shrink-0 mt-1" />
          <div>
            <h3 className="text-lg font-bold text-amber-400 mb-1">Peringatan: Biaya Tersembunyi yang Sesungguhnya</h3>
            <p className="text-sm text-slate-300">
              Aplikasi ini dibuat untuk membuka mata Anda tentang berapa banyak uang yang <span className="font-bold text-red-400">hilang</span> ketika berhutang.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Total Bunga */}
          <div className="p-4 bg-red-950/50 rounded-xl border border-red-800">
            <div className="flex items-center gap-2 mb-2">
              <TrendingDown className="h-5 w-5 text-red-400" />
              <p className="text-xs text-red-300 font-medium uppercase">Uang yang Hilang</p>
            </div>
            <p className="text-3xl font-bold text-red-400 tabular-nums mb-1">
              {formatCurrency(totalBunga)}
            </p>
            <p className="text-xs text-slate-400">
              {persenBunga.toFixed(1)}% dari nilai barang
            </p>
          </div>

          {/* Working Time Lost */}
          {penghasilan && penghasilan > 0 && (
            <div className="p-4 bg-amber-950/50 rounded-xl border border-amber-800">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="h-5 w-5 text-amber-400" />
                <p className="text-xs text-amber-300 font-medium uppercase">Waktu Kerja Terbuang</p>
              </div>
              <p className="text-3xl font-bold text-amber-400 tabular-nums mb-1">
                {bulanKerjaUntukBunga} Bulan
              </p>
              <p className="text-xs text-slate-400">
                Waktu kerja hanya untuk bayar bunga
              </p>
            </div>
          )}
        </div>

        {/* Eye Opening Facts */}
        <div className="mt-4 p-4 bg-slate-900/50 rounded-xl border border-slate-700">
          <p className="text-sm font-medium text-white mb-3">💸 Dengan uang bunga sebesar {formatCurrency(totalBunga)}, Anda bisa:</p>
          <ul className="space-y-2 text-sm text-slate-300">
            <li className="flex items-start gap-2">
              <span className="text-red-400 mt-0.5">→</span>
              <span>Membeli <strong className="text-white">{Math.floor(totalBunga / pokokPinjaman * 100)}%</strong> barang yang sama secara cash</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-red-400 mt-0.5">→</span>
              <span>Menabung untuk masa depan atau dana darurat</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-red-400 mt-0.5">→</span>
              <span>Berinvestasi dan berpotensi mendapat keuntungan, bukan kerugian</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-red-400 mt-0.5">→</span>
              <span>Sedekah atau membantu keluarga yang membutuhkan</span>
            </li>
          </ul>
        </div>
      </div>

      {/* Alternative Solution */}
      <div className="p-6 bg-gradient-to-br from-green-950/40 to-blue-950/40 rounded-2xl border-2 border-green-800/50">
        <div className="flex items-start gap-3 mb-4">
          <DollarSign className="h-6 w-6 text-green-400 flex-shrink-0 mt-1" />
          <div>
            <h3 className="text-lg font-bold text-green-400 mb-1">Alternatif: Nabung Dulu, Beli Cash</h3>
            <p className="text-sm text-slate-300">
              Strategi cerdas tanpa riba dan tanpa kehilangan uang
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div className="p-4 bg-slate-900/50 rounded-xl border border-slate-700">
            <p className="text-xs text-slate-400 mb-1">Nabung per Bulan</p>
            <p className="text-2xl font-bold text-green-400 tabular-nums">
              {formatCurrency(cicilanPerBulan)}
            </p>
            <p className="text-xs text-slate-500 mt-1">Sama seperti cicilan</p>
          </div>

          <div className="p-4 bg-slate-900/50 rounded-xl border border-slate-700">
            <p className="text-xs text-slate-400 mb-1">Bisa Beli Cash Dalam</p>
            <p className="text-2xl font-bold text-blue-400 tabular-nums">
              {lamaMenungguJikaNabung} Bulan
            </p>
            <p className="text-xs text-slate-500 mt-1">
              {selisihWaktu > 0 ? `${selisihWaktu} bulan lebih cepat lunas` : 'Lebih cepat dari kredit'}
            </p>
          </div>

          <div className="p-4 bg-green-950/50 rounded-xl border border-green-700">
            <p className="text-xs text-green-300 mb-1">Total Hemat</p>
            <p className="text-2xl font-bold text-green-400 tabular-nums">
              {formatCurrency(totalBunga)}
            </p>
            <p className="text-xs text-slate-500 mt-1">100% milik Anda</p>
          </div>
        </div>

        <div className="p-4 bg-green-950/20 rounded-xl border border-green-800">
          <p className="text-sm font-medium text-green-400 mb-2">✓ Keuntungan Strategi Nabung Dulu:</p>
          <ul className="space-y-1.5 text-sm text-slate-300">
            <li className="flex items-start gap-2">
              <span className="text-green-400 mt-0.5">✓</span>
              <span>Tidak ada uang yang hilang untuk bunga</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-400 mt-0.5">✓</span>
              <span>Bebas hutang, tenang tidur, berkah hidup</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-400 mt-0.5">✓</span>
              <span>Tabungan bisa dapat bunga/bagi hasil yang halal</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-400 mt-0.5">✓</span>
              <span>Fleksibel: bisa batal tanpa denda atau biaya admin</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-400 mt-0.5">✓</span>
              <span>Terhindar dari riba yang dosanya sangat besar</span>
            </li>
          </ul>
        </div>
      </div>

      {/* Islamic Perspective (Gentle) */}
      <div className="p-5 bg-slate-900/80 rounded-xl border border-slate-700">
        <p className="text-xs text-slate-400 leading-relaxed">
          <span className="font-semibold text-slate-300">Catatan:</span> Dalam Islam, riba (bunga) adalah dosa besar yang diharamkan. 
          Tidak ada perbedaan antara bunga 1% atau 100%, semuanya riba. 
          Bagi yang beragama lain pun, secara finansial murni, <span className="text-amber-400 font-medium">berhutang berbunga = kehilangan uang</span>. 
          Gunakan kalkulator ini untuk <span className="text-green-400 font-medium">menyadari</span> berapa banyak uang Anda yang hilang, 
          lalu pertimbangkan alternatif yang lebih bijak: <span className="text-white font-semibold">menabung terlebih dahulu</span>.
        </p>
        <div className="mt-3 pt-3 border-t border-slate-700">
          <p className="text-xs text-slate-500 text-center">
            Peringatan ini dipersembahkan oleh{' '}
            <a 
              href="https://monefyi.com" 
              target="_blank" 
              rel="noopener noreferrer"
              className="font-semibold text-green-400 hover:text-green-300 transition-colors"
            >
              Monefyi
            </a>
            {' '}- Platform edukasi keuangan berbasis syariah
          </p>
        </div>
      </div>
    </motion.div>
  )
}
