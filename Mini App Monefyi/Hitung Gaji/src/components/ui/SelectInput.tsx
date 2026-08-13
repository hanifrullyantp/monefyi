import React from 'react'
import { cn } from '@/lib/cn'
import { ChevronDown } from 'lucide-react'

interface SelectOption {
  value: string
  label: string
}

interface SelectInputProps {
  label: string
  value: string
  onChange: (value: string) => void
  options: SelectOption[]
  error?: string
  helper?: string
  disabled?: boolean
  required?: boolean
}

export function SelectInput({
  label,
  value,
  onChange,
  options,
  error,
  helper,
  disabled = false,
  required = false,
}: SelectInputProps) {
  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-slate-300">
        {label}
        {required && <span className="text-red-400 ml-1">*</span>}
      </label>
      
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className={cn(
            'w-full px-4 pr-10 py-3 bg-slate-900 border-2 rounded-xl text-white',
            'focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all',
            'disabled:opacity-50 disabled:cursor-not-allowed appearance-none cursor-pointer',
            error ? 'border-red-500' : 'border-slate-700 hover:border-slate-600'
          )}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value} className="bg-slate-900 text-white">
              {option.label}
            </option>
          ))}
        </select>
        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 pointer-events-none" />
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
