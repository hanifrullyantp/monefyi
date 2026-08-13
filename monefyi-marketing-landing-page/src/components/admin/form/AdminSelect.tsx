/** src/components/admin/form/AdminSelect.tsx */
import React from 'react';

interface AdminSelectProps {
  label: string;
  value: string;
  onChange: (val: string) => void;
  options: { value: string; label: string }[];
  helperText?: string;
}

export function AdminSelect({
  label,
  value,
  onChange,
  options,
  helperText
}: AdminSelectProps) {
  return (
    <div className="space-y-1.5 w-full">
      <label className="text-sm font-medium text-slate-300 block">{label}</label>
      {helperText && <p className="text-xs text-slate-500 mb-1">{helperText}</p>}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-green-500 transition-all appearance-none cursor-pointer"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value} className="bg-slate-900">
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}
