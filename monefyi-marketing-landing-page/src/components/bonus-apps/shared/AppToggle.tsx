import React from 'react';
import { cn } from '../../../lib/cn';

interface AppToggleProps {
  label: string;
  active: boolean;
  onChange: (active: boolean) => void;
  description?: string;
}

export function AppToggle({ label, active, onChange, description }: AppToggleProps) {
  return (
    <div className="flex items-center justify-between gap-4 w-full">
      <div>
        <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">{label}</label>
        {description && <p className="text-[10px] text-slate-500">{description}</p>}
      </div>
      <button
        onClick={() => onChange(!active)}
        className={cn(
          'w-12 h-6 rounded-full transition-colors relative',
          active ? 'bg-green-500' : 'bg-slate-700'
        )}
      >
        <div
          className={cn(
            'absolute top-1 w-4 h-4 rounded-full bg-white transition-all',
            active ? 'left-7' : 'left-1'
          )}
        />
      </button>
    </div>
  );
}
