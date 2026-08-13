import React from 'react'
import { cn } from '@/lib/cn'

interface InputNumberProps {
  label: string
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  step?: number
  suffix?: string
  error?: string
  helper?: string
  placeholder?: string
  disabled?: boolean
  required?: boolean
}

export function InputNumber({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
  suffix,
  error,
  helper,
  placeholder = '0',
  disabled = false,
  required = false,
}: InputNumberProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseFloat(e.target.value)
    
    if (isNaN(newValue)) {
      onChange(0)
      return
    }
    
    if (min !== undefined && newValue < min) {
      onChange(min)
      return
    }
    
    if (max !== undefined && newValue > max) {
      onChange(max)
      return
    }
    
    onChange(newValue)
  }

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-slate-300">
        {label}
        {required && <span className="text-red-400 ml-1">*</span>}
      </label>
      
      <div className="relative">
        <input
          type="number"
          value={value || ''}
          onChange={handleChange}
          min={min}
          max={max}
          step={step}
          placeholder={placeholder}
          disabled={disabled}
          className={cn(
            'w-full px-4 py-3 bg-slate-900 border-2 rounded-xl text-white placeholder:text-slate-600',
            'focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all',
            'disabled:opacity-50 disabled:cursor-not-allowed tabular-nums',
            suffix ? 'pr-16' : '',
            error ? 'border-red-500' : 'border-slate-700 hover:border-slate-600'
          )}
        />
        {suffix && (
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-medium pointer-events-none">
            {suffix}
          </span>
        )}
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
