// src/components/ui/InputText.tsx
"use client";

import { type InputHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

interface InputTextProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  helper?: string;
  error?: string;
}

export function InputText({
  label,
  helper,
  error,
  className,
  ...props
}: InputTextProps) {
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label className="text-sm font-medium text-slate-300">
          {label}
        </label>
      )}
      <input
        type="text"
        className={cn(
          "w-full bg-slate-800/80 border rounded-xl px-4 py-2.5 text-white text-sm transition-colors focus:outline-none focus:ring-2 placeholder:text-slate-600",
          error
            ? "border-red-500/60 focus:ring-red-500/30 focus:border-red-500"
            : "border-slate-600/60 focus:ring-emerald-500/30 focus:border-emerald-500/60 hover:border-slate-500",
          className
        )}
        {...props}
      />
      {helper && !error && (
        <p className="text-xs text-slate-500">{helper}</p>
      )}
      {error && (
        <p className="text-xs text-red-400">{error}</p>
      )}
    </div>
  );
}
