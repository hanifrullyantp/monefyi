/** src/components/admin/form/AdminTextarea.tsx */
import React from 'react';

interface AdminTextareaProps {
  label: string;
  value: string;
  onChange: (val: string) => void;
  rows?: number;
  helperText?: string;
  monospace?: boolean;
}

export function AdminTextarea({
  label,
  value,
  onChange,
  rows = 4,
  helperText,
  monospace
}: AdminTextareaProps) {
  return (
    <div className="space-y-1.5 w-full">
      <label className="text-sm font-medium text-slate-300 block">{label}</label>
      {helperText && <p className="text-xs text-slate-500 mb-1">{helperText}</p>}
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        className={`w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-green-500 transition-all ${monospace ? 'font-mono' : ''}`}
      />
    </div>
  );
}
