// src/components/ui/InputNumber.tsx
"use client";

import { type InputHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

interface InputNumberProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "onChange" | "value"> {
  label?: string;
  helper?: string;
  error?: string;
  value: number;
  onChange: (value: number) => void;
  suffix?: string;
  min?: number;
  max?: number;
}

export function InputNumber({
  label,
  helper,
  error,
  value,
  onChange,
  suffix,
  min = 0,
  max,
  className,
  placeholder = "0",
  ...props
}: InputNumberProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10);
    if (isNaN(val)) {
      onChange(0);
      return;
    }
    const clamped = max !== undefined ? Math.min(Math.max(val, min), max) : Math.max(val, min);
    onChange(clamped);
  };

  const displayValue = value === 0 ? "" : value.toString();

  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label className="text-sm font-medium text-slate-300">
          {label}
        </label>
      )}
      <div className="relative flex items-center">
        <input
          type="number"
          value={displayValue}
          onChange={handleChange}
          placeholder={placeholder}
          min={min}
          max={max}
          className={cn(
            "w-full bg-slate-800/80 border rounded-xl py-2.5 text-white text-sm font-mono tabular-nums transition-colors focus:outline-none focus:ring-2",
            suffix ? "pl-4 pr-14" : "px-4",
            error
              ? "border-red-500/60 focus:ring-red-500/30 focus:border-red-500"
              : "border-slate-600/60 focus:ring-emerald-500/30 focus:border-emerald-500/60 hover:border-slate-500",
            "[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none",
            className
          )}
          {...props}
        />
        {suffix && (
          <span className="absolute right-3 text-sm text-slate-400 select-none pointer-events-none">
            {suffix}
          </span>
        )}
      </div>
      {helper && !error && (
        <p className="text-xs text-slate-500">{helper}</p>
      )}
      {error && (
        <p className="text-xs text-red-400">{error}</p>
      )}
    </div>
  );
}
