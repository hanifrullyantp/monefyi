'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/cn'

interface ProgressBarProps {
  value: number
  max?: number
  height?: string
  color?: 'green' | 'amber' | 'red' | 'blue'
  showLabel?: boolean
  label?: string
  className?: string
}

export function ProgressBar({
  value,
  max = 100,
  height = 'h-3',
  color = 'green',
  showLabel = false,
  label,
  className,
}: ProgressBarProps) {
  const percentage = Math.min((value / max) * 100, 100)

  const colorClasses = {
    green: 'bg-green-500',
    amber: 'bg-amber-500',
    red: 'bg-red-500',
    blue: 'bg-blue-500',
  }

  return (
    <div className={cn('space-y-2', className)}>
      {(showLabel || label) && (
        <div className="flex justify-between items-center">
          {label && <span className="text-sm text-slate-400">{label}</span>}
          {showLabel && (
            <span className="text-sm font-medium text-white tabular-nums">
              {percentage.toFixed(1)}%
            </span>
          )}
        </div>
      )}
      
      <div className={cn('w-full bg-slate-800 rounded-full overflow-hidden', height)}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className={cn('h-full rounded-full', colorClasses[color])}
        />
      </div>
    </div>
  )
}
