/** src/components/admin/form/AdminInput.tsx */
import React from 'react';

interface AdminInputProps {
  label: string;
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  helperText?: string;
  type?: "text" | "number" | "url" | "email" | "tel";
  required?: boolean;
  prefix?: string;
  icon?: any;
}

export function AdminInput({
  label,
  value,
  onChange,
  placeholder,
  helperText,
  type = "text",
  required,
  prefix,
  icon: Icon
}: AdminInputProps) {
  return (
    <div className="space-y-1.5 w-full">
      <label className="text-sm font-medium text-slate-300 block">{label}</label>
      {helperText && <p className="text-xs text-slate-500 mb-1">{helperText}</p>}
      <div className="relative">
        {prefix && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">{prefix}</span>
        )}
        {Icon && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
            <Icon size={16} />
          </span>
        )}
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          required={required}
          className={cn(
            "w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-green-500 transition-all",
            prefix && "pl-16",
            Icon && "pl-10"
          )}
        />
      </div>
    </div>
  );
}

import { cn } from '../../../lib/cn';

