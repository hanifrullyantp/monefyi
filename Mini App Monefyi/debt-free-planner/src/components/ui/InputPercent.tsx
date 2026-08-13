// src/components/ui/InputPercent.tsx
"use client";

import { type InputHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

interface InputPercentProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "onChange" | "value"> {
  label?: string;
  helper?: string;
  error?: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
}

export function InputPercent({
  label,
  helper,
  error,
  value,
  onChange,
  min = 0,
  max = 100,
  step = 0.01,
  className,
  placeholder = "0",
  ...props
}: InputPercentProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    if (isNaN(val)) {
      onChange(0);
      return;
    }
    const clamped = Math.min(Math.max(val, min), max);
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
          step={step}
          className={cn(
            "w-full bg-slate-800/80 border rounded-xl pl-4 pr-10 py-2.5 text-white text-sm font-mono tabular-nums transition-colors focus:outline-none focus:ring-2",
            error
              ? "border-red-500/60 focus:ring-red-500/30 focus:border-red-500"
              : "border-slate-600/60 focus:ring-emerald-500/30 focus:border-emerald-500/60 hover:border-slate-500",
            "[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none",
            className
          )}
          {...props}
        />
        <span className="absolute right-3 text-sm font-semibold text-slate-400 select-none pointer-events-none">
          %
        </span>
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
