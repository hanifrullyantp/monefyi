/** src/components/admin/form/AdminColorPicker.tsx */
import React from 'react';

interface AdminColorPickerProps {
  label: string;
  value: string;
  onChange: (val: string) => void;
}

export function AdminColorPicker({
  label,
  value,
  onChange
}: AdminColorPickerProps) {
  return (
    <div className="space-y-1.5 w-full">
      <label className="text-sm font-medium text-slate-300 block">{label}</label>
      <div className="flex items-center gap-3">
        <div 
          className="w-12 h-10 rounded-lg border border-slate-700 overflow-hidden cursor-pointer relative"
          style={{ backgroundColor: value }}
        >
          <input
            type="color"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
          />
        </div>
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm font-mono w-28 uppercase"
        />
      </div>
    </div>
  );
}
