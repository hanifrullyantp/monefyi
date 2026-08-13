// src/components/ui/SelectInput.tsx
"use client";

import { type SelectHTMLAttributes } from "react";
import { cn } from "@/lib/cn";
import { ChevronDown } from "lucide-react";

interface SelectOption {
  value: string;
  label: string;
  icon?: string;
}

interface SelectInputProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, "onChange"> {
  label?: string;
  helper?: string;
  error?: string;
  options: SelectOption[];
  onChange: (value: string) => void;
}

export function SelectInput({
  label,
  helper,
  error,
  options,
  onChange,
  className,
  value,
  ...props
}: SelectInputProps) {
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label className="text-sm font-medium text-slate-300">
          {label}
        </label>
      )}
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={cn(
            "w-full bg-slate-800/80 border rounded-xl px-4 py-2.5 pr-10 text-white text-sm transition-colors focus:outline-none focus:ring-2 appearance-none cursor-pointer",
            error
              ? "border-red-500/60 focus:ring-red-500/30 focus:border-red-500"
              : "border-slate-600/60 focus:ring-emerald-500/30 focus:border-emerald-500/60 hover:border-slate-500",
            className
          )}
          {...props}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value} className="bg-slate-800">
              {opt.label}
            </option>
          ))}
        </select>
        <ChevronDown
          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
          size={16}
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
