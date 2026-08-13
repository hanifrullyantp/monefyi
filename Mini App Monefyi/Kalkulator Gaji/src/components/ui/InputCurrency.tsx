// src/components/ui/InputCurrency.tsx
"use client";

import { useRef, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

interface InputCurrencyProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "onChange" | "value"> {
  label?: string;
  helper?: string;
  error?: string;
  value: number;
  onChange: (value: number) => void;
}

function formatDisplay(value: number): string {
  if (!value || isNaN(value)) return "";
  return Math.round(value)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

function parseDisplay(str: string): number {
  const cleaned = str.replace(/\./g, "").replace(/[^\d]/g, "");
  return parseInt(cleaned, 10) || 0;
}

export function InputCurrency({
  label,
  helper,
  error,
  value,
  onChange,
  className,
  placeholder = "0",
  ...props
}: InputCurrencyProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\./g, "").replace(/[^\d]/g, "");
    const num = parseInt(raw, 10) || 0;
    onChange(num);

    // Keep cursor position
    requestAnimationFrame(() => {
      if (inputRef.current) {
        const formatted = formatDisplay(num);
        const diff = formatted.length - raw.length;
        const selStart = (e.target.selectionStart ?? 0) + diff;
        inputRef.current.setSelectionRange(selStart, selStart);
      }
    });
  };

  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label className="text-sm font-medium text-slate-300">
          {label}
        </label>
      )}
      <div className="relative flex items-center">
        <span className="absolute left-3 text-sm font-semibold text-slate-400 select-none pointer-events-none">
          Rp
        </span>
        <input
          ref={inputRef}
          type="text"
          inputMode="numeric"
          value={formatDisplay(value)}
          onChange={handleChange}
          placeholder={placeholder}
          className={cn(
            "w-full bg-slate-800/80 border rounded-xl pl-10 pr-4 py-2.5 text-white text-sm font-mono tabular-nums transition-colors focus:outline-none focus:ring-2",
            error
              ? "border-red-500/60 focus:ring-red-500/30 focus:border-red-500"
              : "border-slate-600/60 focus:ring-emerald-500/30 focus:border-emerald-500/60 hover:border-slate-500",
            className
          )}
          {...props}
        />
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
