import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { formatNumberId } from '../../lib/estimatorFormat';
import { parseDimensionInput } from '../../lib/estimatorDimension';

interface Props {
  value: number;
  dimensionExpr?: string;
  onChange: (value: number, expr?: string) => void;
  onKeyDown?: (e: KeyboardEvent<HTMLInputElement>) => void;
  className?: string;
  inputRef?: (el: HTMLInputElement | null) => void;
  title?: string;
  min?: number;
  placeholder?: string;
}

function displayValue(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return '';
  return formatNumberId(n);
}

/**
 * Input ukuran cerdas:
 * 1. Bisa diisi total panjang biasa (misal: "4")
 * 2. Bisa diisi format segmen siku L (misal: "2+2", "2.4+1.8", "2x2")
 *    - Jika diisi L, total bertambah otomatis
 *    - Jika diisi total manual, ukuran L terhapus otomatis
 */
export default function QtyInput({
  value,
  dimensionExpr = '',
  onChange,
  onKeyDown,
  className = '',
  inputRef,
  title,
  min = 0,
  placeholder = '',
}: Props) {
  const [focused, setFocused] = useState(false);
  const [text, setText] = useState('');
  const localRef = useRef<HTMLInputElement | null>(null);

  const assignRef = (el: HTMLInputElement | null) => {
    localRef.current = el;
    inputRef?.(el);
  };

  useEffect(() => {
    if (focused) localRef.current?.select();
  }, [focused]);

  useEffect(() => {
    if (!focused) {
      if (dimensionExpr && dimensionExpr.trim()) {
        setText(dimensionExpr);
      } else {
        setText(displayValue(value));
      }
    }
  }, [value, dimensionExpr, focused]);

  const commit = (raw: string) => {
    const trimmed = raw.trim();
    if (trimmed === '') {
      onChange(0, '');
      setText('');
      return;
    }

    const parsed = parseDimensionInput(trimmed);
    const finalVal = Math.max(min, parsed.total);
    onChange(finalVal, parsed.expr);

    if (parsed.expr) {
      setText(parsed.expr);
    } else {
      setText(displayValue(finalVal));
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      commit(text);
      (e.target as HTMLInputElement).blur();
    }
    onKeyDown?.(e);
  };

  const shown = focused ? text : dimensionExpr ? dimensionExpr : displayValue(value);
  const isLMode = Boolean(dimensionExpr && dimensionExpr.includes('+'));

  return (
    <div className="relative w-full">
      <input
        ref={assignRef}
        type="text"
        inputMode="text"
        value={shown}
        title={
          title ||
          (isLMode
            ? `Bentuk L (${dimensionExpr}) = Total ${displayValue(value)} m`
            : value > 0
            ? `Total: ${displayValue(value)}`
            : undefined)
        }
        placeholder={placeholder || '0 atau 2+2'}
        onMouseUp={e => e.preventDefault()}
        onFocus={() => {
          setFocused(true);
          setText(dimensionExpr || displayValue(value));
        }}
        onBlur={() => {
          setFocused(false);
          commit(text);
        }}
        onChange={e => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        className={`${className} ${
          isLMode ? 'border-amber-400 bg-amber-50/40 font-bold text-amber-900' : 'text-slate-900'
        } placeholder:text-slate-400`}
      />

      {/* Indikator kecil jika terisi segmen L saat tidak fokus */}
      {!focused && isLMode && (
        <span
          className="absolute -bottom-3.5 right-1 text-[9px] font-extrabold text-amber-700 bg-amber-100/90 px-1 rounded tracking-tight pointer-events-none"
          title={`Total dihitung otomatis: ${displayValue(value)}`}
        >
          Σ {displayValue(value)}m
        </span>
      )}
    </div>
  );
}
