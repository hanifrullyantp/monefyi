'use client'

import React from 'react'
import { TrendingDown } from 'lucide-react'
import { formatCurrency } from '@/lib/formatters'
import { motion } from 'framer-motion'

interface MoneyLostBadgeProps {
  pokokPinjaman: number
  totalBunga: number
  compact?: boolean
}

export function MoneyLostBadge({ pokokPinjaman, totalBunga, compact = false }: MoneyLostBadgeProps) {
  const persenLost = (totalBunga / pokokPinjaman) * 100

  if (compact) {
    return (
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="inline-flex items-center gap-2 px-3 py-1.5 bg-red-950/40 border border-red-700 rounded-full"
      >
        <TrendingDown className="h-3 w-3 text-red-400" />
        <span className="text-xs font-semibold text-red-400 tabular-nums">
          -{formatCurrency(totalBunga)}
        </span>
        <span className="text-xs text-red-300">hilang</span>
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ scale: 0.95, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ delay: 0.2 }}
      className="p-4 bg-gradient-to-r from-red-950/60 to-red-900/40 rounded-xl border-2 border-red-700"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <TrendingDown className="h-5 w-5 text-red-400" />
            <p className="text-sm font-semibold text-red-300">Uang yang Hilang ke Bunga</p>
          </div>
          <p className="text-3xl font-bold text-red-400 tabular-nums">
            {formatCurrency(totalBunga)}
          </p>
          <p className="text-sm text-slate-400 mt-1">
            Kerugian <span className="font-semibold text-red-300">{persenLost.toFixed(1)}%</span> dari nilai barang
          </p>
        </div>
        
        <div className="text-right">
          <div className="px-3 py-1 bg-red-900/50 rounded-lg border border-red-700">
            <p className="text-xs text-red-300 mb-0.5">Jika Beli Cash</p>
            <p className="text-sm font-bold text-white tabular-nums">
              {formatCurrency(pokokPinjaman)}
            </p>
          </div>
          <div className="mt-2 px-3 py-1 bg-amber-900/50 rounded-lg border border-amber-700">
            <p className="text-xs text-amber-300 mb-0.5">Total Bayar Kredit</p>
            <p className="text-sm font-bold text-amber-400 tabular-nums">
              {formatCurrency(pokokPinjaman + totalBunga)}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-3 pt-3 border-t border-red-800/50">
        <p className="text-xs text-slate-400">
          💡 <span className="text-red-300">Bayangkan:</span> Uang bunga ini bisa Anda gunakan untuk hal yang lebih bermanfaat, 
          atau cukup <span className="font-semibold text-white">menabung {Math.ceil((pokokPinjaman / (pokokPinjaman + totalBunga)) * 100)}% dari cicilan</span> untuk beli cash.
        </p>
      </div>
    </motion.div>
  )
}
