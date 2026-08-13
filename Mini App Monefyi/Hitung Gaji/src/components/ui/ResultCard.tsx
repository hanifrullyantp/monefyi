'use client'

import React, { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/cn'

type ResultVariant = 'default' | 'highlight' | 'warning' | 'danger' | 'info'

interface ResultCardProps {
  label: string
  value: string | number
  sublabel?: string
  icon?: React.ReactNode
  variant?: ResultVariant
  animated?: boolean
  className?: string
}

export function ResultCard({
  label,
  value,
  sublabel,
  icon,
  variant = 'default',
  animated = true,
  className,
}: ResultCardProps) {
  const [displayValue, setDisplayValue] = useState<string | number>(0)

  useEffect(() => {
    if (!animated || typeof value !== 'number') {
      setDisplayValue(value)
      return
    }

    // Count-up animation
    const duration = 800
    const steps = 60
    const stepValue = value / steps
    const stepDuration = duration / steps

    let currentStep = 0
    const interval = setInterval(() => {
      currentStep++
      if (currentStep >= steps) {
        setDisplayValue(value)
        clearInterval(interval)
      } else {
        setDisplayValue(Math.floor(stepValue * currentStep))
      }
    }, stepDuration)

    return () => clearInterval(interval)
  }, [value, animated])

  const variants = {
    default: 'bg-slate-800 border-slate-700',
    highlight: 'bg-gradient-green border-green-500 shadow-green-glow',
    warning: 'bg-amber-950/30 border-amber-600',
    danger: 'bg-red-950/30 border-red-600',
    info: 'bg-blue-950/30 border-blue-600',
  }

  const textVariants = {
    default: 'text-white',
    highlight: 'text-white',
    warning: 'text-amber-400',
    danger: 'text-red-400',
    info: 'text-blue-400',
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={cn(
        'p-6 rounded-2xl border-2 transition-all',
        variants[variant],
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm text-slate-400 mb-2">{label}</p>
          <p className={cn('text-3xl font-bold tabular-nums', textVariants[variant])}>
            {displayValue}
          </p>
          {sublabel && (
            <p className="text-sm text-slate-500 mt-2">{sublabel}</p>
          )}
        </div>
        {icon && (
          <div className={cn('text-2xl', textVariants[variant])}>
            {icon}
          </div>
        )}
      </div>
    </motion.div>
  )
}
