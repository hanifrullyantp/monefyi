'use client'

import React, { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { formatCurrencyCompact } from '@/lib/formatters'
import type { JadwalAngsuran } from '@/types'

interface CicilanChartProps {
  jadwal: JadwalAngsuran[]
}

export function CicilanChart({ jadwal }: CicilanChartProps) {
  const [isAnimated, setIsAnimated] = useState(false)

  useEffect(() => {
    setIsAnimated(true)
  }, [jadwal])

  if (jadwal.length === 0) return null

  const width = 800
  const height = 280
  const padding = { top: 20, right: 40, bottom: 40, left: 60 }
  const chartWidth = width - padding.left - padding.right
  const chartHeight = height - padding.top - padding.bottom

  // Get initial loan amount
  const initialAmount = jadwal[0] ? jadwal[0].sisaPokok + jadwal[0].pokok : 0
  const maxValue = initialAmount * 1.1

  // Sample data points (show max 24 points for readability)
  const sampleRate = Math.max(1, Math.floor(jadwal.length / 24))
  const sampledData = jadwal.filter((_, index) => index % sampleRate === 0 || index === jadwal.length - 1)

  // Create path for remaining principal
  const principalPath = sampledData
    .map((item, index) => {
      const x = padding.left + (index / (sampledData.length - 1)) * chartWidth
      const y = padding.top + chartHeight - (item.sisaPokok / maxValue) * chartHeight
      return index === 0 ? `M ${x} ${y}` : `L ${x} ${y}`
    })
    .join(' ')

  // Create path for total paid
  const paidPath = sampledData
    .map((item, index) => {
      const totalPaid = initialAmount - item.sisaPokok
      const x = padding.left + (index / (sampledData.length - 1)) * chartWidth
      const y = padding.top + chartHeight - (totalPaid / maxValue) * chartHeight
      return index === 0 ? `M ${x} ${y}` : `L ${x} ${y}`
    })
    .join(' ')

  // Create area path for paid
  const paidAreaPath = `${paidPath} L ${padding.left + chartWidth} ${padding.top + chartHeight} L ${padding.left} ${padding.top + chartHeight} Z`

  // Y-axis labels
  const yLabels = [0, 0.25, 0.5, 0.75, 1].map((ratio) => ({
    value: maxValue * ratio,
    y: padding.top + chartHeight - ratio * chartHeight,
  }))

  // X-axis labels (show year markers)
  const yearMarkers = []
  for (let i = 0; i <= jadwal.length; i += 12) {
    if (i === 0) continue
    const year = Math.floor(i / 12)
    const xPos = padding.left + (i / jadwal.length) * chartWidth
    if (xPos <= padding.left + chartWidth) {
      yearMarkers.push({ year, x: xPos })
    }
  }

  const pathLength = 1000

  return (
    <div className="space-y-4">
      <h3 className="text-xl font-semibold text-white">Grafik Pelunasan</h3>
      
      <div className="p-6 bg-slate-800 rounded-2xl border-2 border-slate-700">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto"
          style={{ maxHeight: '280px' }}
        >
          {/* Y-axis grid lines */}
          {yLabels.map((label, index) => (
            <g key={index}>
              <line
                x1={padding.left}
                y1={label.y}
                x2={padding.left + chartWidth}
                y2={label.y}
                stroke="#334155"
                strokeWidth={1}
                strokeDasharray="4 4"
                opacity={0.3}
              />
              <text
                x={padding.left - 10}
                y={label.y + 4}
                textAnchor="end"
                fontSize="11"
                fill="#94a3b8"
              >
                {formatCurrencyCompact(label.value)}
              </text>
            </g>
          ))}

          {/* X-axis */}
          <line
            x1={padding.left}
            y1={padding.top + chartHeight}
            x2={padding.left + chartWidth}
            y2={padding.top + chartHeight}
            stroke="#334155"
            strokeWidth={2}
          />

          {/* X-axis labels */}
          {yearMarkers.map((marker, index) => (
            <g key={index}>
              <line
                x1={marker.x}
                y1={padding.top + chartHeight}
                x2={marker.x}
                y2={padding.top + chartHeight + 6}
                stroke="#94a3b8"
                strokeWidth={2}
              />
              <text
                x={marker.x}
                y={padding.top + chartHeight + 20}
                textAnchor="middle"
                fontSize="11"
                fill="#94a3b8"
              >
                Tahun {marker.year}
              </text>
            </g>
          ))}

          {/* Y-axis */}
          <line
            x1={padding.left}
            y1={padding.top}
            x2={padding.left}
            y2={padding.top + chartHeight}
            stroke="#334155"
            strokeWidth={2}
          />

          {/* Area fill for paid amount */}
          <motion.path
            d={paidAreaPath}
            fill="url(#paidGradient)"
            initial={{ opacity: 0 }}
            animate={{ opacity: isAnimated ? 0.3 : 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          />

          {/* Line for total paid */}
          <motion.path
            d={paidPath}
            fill="none"
            stroke="#10b981"
            strokeWidth={3}
            strokeLinecap="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: isAnimated ? 1 : 0 }}
            transition={{ duration: 1.2, ease: 'easeOut' }}
          />

          {/* Line for remaining principal */}
          <motion.path
            d={principalPath}
            fill="none"
            stroke="#3b82f6"
            strokeWidth={3}
            strokeLinecap="round"
            strokeDasharray="8 4"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: isAnimated ? 1 : 0 }}
            transition={{ duration: 1.2, ease: 'easeOut', delay: 0.2 }}
          />

          {/* Gradient definition */}
          <defs>
            <linearGradient id="paidGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity={0.4} />
              <stop offset="100%" stopColor="#10b981" stopOpacity={0.1} />
            </linearGradient>
          </defs>
        </svg>

        {/* Legend */}
        <div className="flex items-center justify-center gap-6 mt-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-0.5 bg-green-500 rounded" />
            <span className="text-sm text-slate-300">Total Dibayar</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-0.5 bg-blue-500 rounded" style={{ backgroundImage: 'repeating-linear-gradient(to right, #3b82f6 0, #3b82f6 8px, transparent 8px, transparent 12px)' }} />
            <span className="text-sm text-slate-300">Sisa Pokok</span>
          </div>
        </div>
      </div>
    </div>
  )
}
