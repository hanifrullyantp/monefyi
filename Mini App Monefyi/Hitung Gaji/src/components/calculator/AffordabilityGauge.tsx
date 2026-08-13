'use client'

import React from 'react'
import { motion } from 'framer-motion'
import type { AffordabilityResult } from '@/types'

interface AffordabilityGaugeProps {
  result: AffordabilityResult
}

export function AffordabilityGauge({ result }: AffordabilityGaugeProps) {
  const { rasio, status, pesanStatus } = result

  // Gauge configuration
  const size = 200
  const strokeWidth = 20
  const radius = (size - strokeWidth) / 2
  const circumference = radius * Math.PI // Half circle

  // Calculate pointer angle (0-180 degrees)
  const angle = Math.min((rasio / 50) * 180, 180)

  // Zone colors
  const getZoneColor = (r: number) => {
    if (r <= 20) return '#10b981' // green-500
    if (r <= 30) return '#34d399' // green-400
    if (r <= 40) return '#f59e0b' // amber-500
    return '#ef4444' // red-500
  }

  const getStatusColor = () => {
    switch (status) {
      case 'sangat_aman':
        return 'text-green-400'
      case 'aman':
        return 'text-green-500'
      case 'perhatian':
        return 'text-amber-500'
      case 'berbahaya':
        return 'text-red-500'
      case 'kritis':
        return 'text-red-600'
      default:
        return 'text-slate-400'
    }
  }

  return (
    <div className="flex flex-col items-center p-6 bg-slate-800 rounded-2xl border-2 border-slate-700">
      <h3 className="text-lg font-semibold text-white mb-4">Affordability Check</h3>
      
      <div className="relative" style={{ width: size, height: size / 2 + 40 }}>
        {/* Background arc zones */}
        <svg
          width={size}
          height={size / 2 + 20}
          className="absolute top-0 left-0"
        >
          {/* Green zone 0-30% */}
          <path
            d={`M ${strokeWidth / 2} ${size / 2} A ${radius} ${radius} 0 0 1 ${size * 0.6} ${size / 2}`}
            fill="none"
            stroke="#10b981"
            strokeWidth={strokeWidth}
            opacity={0.3}
          />
          {/* Amber zone 30-40% */}
          <path
            d={`M ${size * 0.6} ${size / 2} A ${radius} ${radius} 0 0 1 ${size * 0.8} ${size / 2}`}
            fill="none"
            stroke="#f59e0b"
            strokeWidth={strokeWidth}
            opacity={0.3}
          />
          {/* Red zone 40-50%+ */}
          <path
            d={`M ${size * 0.8} ${size / 2} A ${radius} ${radius} 0 0 1 ${size - strokeWidth / 2} ${size / 2}`}
            fill="none"
            stroke="#ef4444"
            strokeWidth={strokeWidth}
            opacity={0.3}
          />
          
          {/* Active arc */}
          <motion.path
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: circumference - (circumference * (Math.min(rasio, 50) / 50)) }}
            transition={{ duration: 1, ease: 'easeOut' }}
            d={`M ${strokeWidth / 2} ${size / 2} A ${radius} ${radius} 0 0 1 ${size - strokeWidth / 2} ${size / 2}`}
            fill="none"
            stroke={getZoneColor(rasio)}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeLinecap="round"
          />
          
          {/* Pointer */}
          <motion.line
            initial={{ rotate: 0 }}
            animate={{ rotate: angle }}
            transition={{
              type: 'spring',
              stiffness: 100,
              damping: 20,
            }}
            x1={size / 2}
            y1={size / 2}
            x2={size / 2}
            y2={strokeWidth + 10}
            stroke="#fff"
            strokeWidth={3}
            strokeLinecap="round"
            style={{
              transformOrigin: `${size / 2}px ${size / 2}px`,
            }}
          />
          
          {/* Center dot */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={6}
            fill="#fff"
          />
        </svg>
        
        {/* Labels */}
        <div className="absolute bottom-0 left-0 right-0 text-center">
          <div className="text-3xl font-bold tabular-nums text-white mb-1">
            {rasio.toFixed(1)}%
          </div>
          <div className={`text-sm font-medium ${getStatusColor()}`}>
            {pesanStatus}
          </div>
        </div>
      </div>
      
      <div className="mt-6 w-full space-y-2">
        <div className="flex justify-between text-xs text-slate-400">
          <span>0% (Aman)</span>
          <span>30%</span>
          <span>50%+ (Bahaya)</span>
        </div>
        
        <div className="p-3 bg-slate-900 rounded-lg border border-slate-700">
          <p className="text-xs text-slate-400">Rekomendasi:</p>
          <p className="text-sm text-white mt-1">
            Cicilan ideal maksimal <span className="font-semibold text-green-400">30%</span> dari penghasilan
          </p>
        </div>
      </div>
    </div>
  )
}
