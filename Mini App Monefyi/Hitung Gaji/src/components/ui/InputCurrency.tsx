import React, { useState, useEffect } from 'react'
import { cn } from '@/lib/cn'
import { formatNumber, parseInput } from '@/lib/formatters'

interface InputCurrencyProps {
  label: string
  value: number
  onChange: (value: number) => void
  error?: string
  helper?: string
  placeholder?: string
  disabled?: boolean
  required?: boolean
}

export function InputCurrency({
  label,
  value,
  onChange,
  error,
  helper,
  placeholder = '0',
  disabled = false,
  required = false,
}: InputCurrencyProps) {
  const [displayValue, setDisplayValue] = useState('')
  const [isFocused, setIsFocused] = useState(false)

  useEffect(() => {
    if (!isFocused) {
      setDisplayValue(value > 0 ? formatNumber(value) : '')
    }
  }, [value, isFocused])

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(true)
    setDisplayValue(value > 0 ? value.toString() : '')
    e.target.select()
  }

  const handleBlur = () => {
    setIsFocused(false)
    const parsed = parseInput(displayValue)
    onChange(parsed)
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value
    
    if (isFocused) {
      // Only allow numbers while typing
      const cleaned = rawValue.replace(/[^\d]/g, '')
      setDisplayValue(cleaned)
    }
  }

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-slate-300">
        {label}
        {required && <span className="text-red-400 ml-1">*</span>}
      </label>
      
      <div className="relative">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-medium pointer-events-none">
          Rp
        </span>
        <input
          type="text"
          inputMode="numeric"
          value={displayValue}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={placeholder}
          disabled={disabled}
          className={cn(
            'w-full pl-12 pr-4 py-3 bg-slate-900 border-2 rounded-xl text-white placeholder:text-slate-600',
            'focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all',
            'disabled:opacity-50 disabled:cursor-not-allowed tabular-nums',
            error ? 'border-red-500' : 'border-slate-700 hover:border-slate-600'
          )}
        />
      </div>
      
      {error && (
        <p className="text-sm text-red-400 flex items-center gap-1">
          <span>⚠</span> {error}
        </p>
      )}
      
      {helper && !error && (
        <p className="text-sm text-slate-500">{helper}</p>
      )}
    </div>
  )
}
