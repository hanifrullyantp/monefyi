import React from 'react';

interface AppInputPercentProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
}

export function AppInputPercent({ label, value, onChange, min = 0, max = 100 }: AppInputPercentProps) {
  return (
    <div className="space-y-1.5 w-full">
      <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{label}</label>
      <div className="relative">
        <input
          type="number"
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          min={min}
          max={max}
          className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-green-500 transition-colors"
        />
        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 font-medium">%</span>
      </div>
    </div>
  );
}
