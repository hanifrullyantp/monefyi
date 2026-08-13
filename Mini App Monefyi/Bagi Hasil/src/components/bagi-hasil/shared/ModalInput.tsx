"use client";

import { useState, useCallback } from "react";
import { cn } from "@/lib/cn";

interface ModalInputProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  placeholder?: string;
  helperText?: string;
  disabled?: boolean;
  error?: string;
  id?: string;
  className?: string;
  required?: boolean;
}

function formatDisplayValue(val: number): string {
  if (val === 0) return "";
  return new Intl.NumberFormat("id-ID").format(val);
}

export default function ModalInput({
  label,
  value,
  onChange,
  placeholder = "0",
  helperText,
  disabled = false,
  error,
  id,
  className,
  required = false,
}: ModalInputProps) {
  const inputId = id ?? `modal-input-${label.replace(/\s+/g, "-").toLowerCase()}`;
  const [displayVal, setDisplayVal] = useState(formatDisplayValue(value));

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value.replace(/\./g, "").replace(/,/g, "");
      const num = parseInt(raw, 10);
      const finalNum = isNaN(num) ? 0 : num;
      setDisplayVal(finalNum === 0 ? "" : new Intl.NumberFormat("id-ID").format(finalNum));
      onChange(finalNum);
    },
    [onChange]
  );

  const handleFocus = useCallback(() => {
    if (value === 0) setDisplayVal("");
  }, [value]);

  const handleBlur = useCallback(() => {
    setDisplayVal(formatDisplayValue(value));
  }, [value]);

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label
        htmlFor={inputId}
        className="text-sm font-medium text-slate-400"
      >
        {label}
        {required && <span className="ml-1 text-red-400">*</span>}
      </label>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-slate-500 select-none">
          Rp
        </span>
        <input
          id={inputId}
          type="text"
          inputMode="numeric"
          value={displayVal}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={placeholder}
          disabled={disabled}
          aria-describedby={
            error ? `${inputId}-error` : helperText ? `${inputId}-helper` : undefined
          }
          className={cn(
            "w-full rounded-xl border bg-slate-900 pl-10 pr-4 py-3 text-sm font-tabular text-slate-100 transition-all outline-none",
            "placeholder:text-slate-600",
            "focus:ring-2 focus:ring-green-500/50 focus:border-green-500",
            disabled
              ? "cursor-not-allowed opacity-50 border-slate-700"
              : error
              ? "border-red-500"
              : "border-slate-700 hover:border-slate-600"
          )}
        />
      </div>
      {error && (
        <p id={`${inputId}-error`} className="text-xs text-red-400" role="alert">
          {error}
        </p>
      )}
      {helperText && !error && (
        <p id={`${inputId}-helper`} className="text-xs text-slate-500">
          {helperText}
        </p>
      )}
    </div>
  );
}
