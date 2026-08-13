/** src/components/admin/form/AdminMultilineInput.tsx */
import React from 'react';

interface AdminMultilineInputProps {
  label: string;
  value: string;
  onChange: (val: string) => void;
  helperText?: string;
  format?: string;
}

export function AdminMultilineInput({
  label,
  value,
  onChange,
  helperText,
  format
}: AdminMultilineInputProps) {
  return (
    <div className="space-y-1.5 w-full">
      <label className="text-sm font-medium text-slate-300 block">{label}</label>
      <div className="bg-slate-950/50 border border-slate-800 rounded-lg p-3 mb-2">
        <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest mb-1">Format: {format}</p>
        {helperText && <p className="text-[10px] text-slate-600 italic">{helperText}</p>}
      </div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={6}
        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-white text-xs font-mono focus:outline-none focus:ring-2 focus:ring-green-500 transition-all"
        placeholder="Item 1|Value 1&#10;Item 2|Value 2"
      />
    </div>
  );
}
