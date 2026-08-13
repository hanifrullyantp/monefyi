/** src/components/admin/form/AdminToggle.tsx */
import React from 'react';
import { cn } from '../../../lib/cn';

interface AdminToggleProps {
  label: string;
  checked: boolean;
  onChange: (val: boolean) => void;
  description?: string;
}

export function AdminToggle({
  label,
  checked,
  onChange,
  description
}: AdminToggleProps) {
  return (
    <div className="flex items-center justify-between gap-4 py-2">
      <div className="flex-1">
        <label className="text-sm font-medium text-slate-200 block">{label}</label>
        {description && <p className="text-xs text-slate-500 mt-0.5">{description}</p>}
      </div>
      <button
        onClick={() => onChange(!checked)}
        className={cn(
          "w-12 h-6 rounded-full transition-colors relative flex items-center px-1",
          checked ? "bg-green-500" : "bg-slate-700"
        )}
      >
        <div className={cn(
          "w-4 h-4 rounded-full bg-white transition-transform duration-200",
          checked ? "translate-x-6" : "translate-x-0"
        )} />
      </button>
    </div>
  );
}
