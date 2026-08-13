'use client'

import React, { useState } from 'react'
import { Copy } from 'lucide-react'
import { formatCurrency, formatMonthYear } from '@/lib/formatters'
import type { JadwalAngsuran } from '@/types'
import { cn } from '@/lib/cn'

interface AmortisasiTableProps {
  jadwal: JadwalAngsuran[]
  onCopy?: () => void
}

export function AmortisasiTable({ jadwal, onCopy }: AmortisasiTableProps) {
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 12

  if (jadwal.length === 0) return null

  const totalPages = Math.ceil(jadwal.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const currentData = jadwal.slice(startIndex, endIndex)

  const handleCopyTable = () => {
    let text = 'JADWAL ANGSURAN\n\n'
    text += 'Bulan\tCicilan\t\tPokok\t\tBunga\t\tSisa Pokok\n'
    text += '─'.repeat(80) + '\n'
    
    jadwal.forEach((item) => {
      text += `${item.bulan}\t${formatCurrency(item.cicilan)}\t${formatCurrency(item.pokok)}\t${formatCurrency(item.bunga)}\t${formatCurrency(item.sisaPokok)}\n`
    })
    
    navigator.clipboard.writeText(text)
    onCopy?.()
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-semibold text-white">Jadwal Angsuran</h3>
        <button
          onClick={handleCopyTable}
          className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-lg transition-colors text-sm text-slate-300"
        >
          <Copy className="h-4 w-4" />
          Salin Tabel
        </button>
      </div>

      <div className="overflow-x-auto border border-slate-700 rounded-xl">
        <table className="w-full min-w-[600px]">
          <thead className="bg-slate-800 sticky top-0">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-300 uppercase">Bulan</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-300 uppercase">Periode</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-slate-300 uppercase">Cicilan</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-slate-300 uppercase">Pokok</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-slate-300 uppercase">Bunga</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-slate-300 uppercase">Sisa Pokok</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-slate-300 uppercase">Progress</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700">
            {currentData.map((item) => {
              const isLastPayment = item.sisaPokok === 0
              
              return (
                <tr
                  key={item.bulan}
                  className={cn(
                    'transition-colors',
                    isLastPayment
                      ? 'bg-green-950/30 hover:bg-green-950/40'
                      : 'hover:bg-slate-800/50'
                  )}
                >
                  <td className="px-4 py-3 text-sm text-white font-medium">{item.bulan}</td>
                  <td className="px-4 py-3 text-sm text-slate-400">
                    {formatMonthYear(item.bulan - 1)}
                  </td>
                  <td className="px-4 py-3 text-sm text-white text-right tabular-nums">
                    {formatCurrency(item.cicilan)}
                  </td>
                  <td className="px-4 py-3 text-sm text-green-400 text-right tabular-nums">
                    {formatCurrency(item.pokok)}
                  </td>
                  <td className="px-4 py-3 text-sm text-red-400 text-right tabular-nums">
                    {formatCurrency(item.bunga)}
                  </td>
                  <td className="px-4 py-3 text-sm text-white text-right tabular-nums">
                    {isLastPayment ? (
                      <span className="text-green-400 font-semibold">LUNAS</span>
                    ) : (
                      formatCurrency(item.sisaPokok)
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-400 text-right tabular-nums">
                    {item.persenLunas.toFixed(1)}%
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-400">
            Menampilkan {startIndex + 1}-{Math.min(endIndex, jadwal.length)} dari {jadwal.length} bulan
          </p>
          
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed border border-slate-600 rounded-lg transition-colors text-sm text-white"
            >
              Sebelumnya
            </button>
            <span className="px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white tabular-nums">
              {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed border border-slate-600 rounded-lg transition-colors text-sm text-white"
            >
              Selanjutnya
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
