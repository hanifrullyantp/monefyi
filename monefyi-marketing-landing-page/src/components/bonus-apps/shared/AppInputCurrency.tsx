import React from 'react';
import { formatRupiah, parseRupiah } from '../../../lib/formatters';

interface AppInputCurrencyProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  error?: string;
  placeholder?: string;
}

export function AppInputCurrency({ label, value, onChange, error, placeholder }: AppInputCurrencyProps) {
  const [displayValue, setDisplayValue] = React.useState(value > 0 ? formatRupiah(value) : '');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value;
    const numericValue = parseRupiah(rawValue);
    setDisplayValue(rawValue);
    onChange(numericValue);
  };

  const handleBlur = () => {
    setDisplayValue(value > 0 ? formatRupiah(value) : '');
  };

  const handleFocus = () => {
    setDisplayValue(value > 0 ? value.toString() : '');
  };

  return (
    <div className="space-y-1.5 w-full">
      <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{label}</label>
      <div className="relative">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-medium">Rp</span>
        <input
          type="text"
          value={displayValue.replace('Rp', '').trim()}
          onChange={handleChange}
          onBlur={handleBlur}
          onFocus={handleFocus}
          placeholder={placeholder || '0'}
          className={`w-full bg-slate-800 border ${error ? 'border-red-500' : 'border-slate-700'} rounded-xl pl-10 pr-4 py-3 text-white focus:outline-none focus:border-green-500 transition-colors`}
        />
      </div>
      {error && <p className="text-[10px] text-red-500">{error}</p>}
    </div>
  );
}
