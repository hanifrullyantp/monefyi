import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { formatNumberId } from '../../lib/estimatorFormat';
import { isCompleteDimensionInput, parseDimensionInput } from '../../lib/estimatorDimension';

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
 * Quantity bisa diisi langsung (6) atau berapa kali berapa (2x3, 2 kali 3).
 * Hasil perkalian menjadi quantity. "2+2" tetap jumlah dinding siku.
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

    if (!isCompleteDimensionInput(trimmed)) return;

    const parsed = parseDimensionInput(trimmed);
    const finalVal = Math.max(min, parsed.total);
    onChange(finalVal, parsed.expr);
    setText(parsed.expr && parsed.isL ? parsed.expr : displayValue(finalVal));
  };

  const commitFromInput = (raw: string) => {
    if (raw.trim() === '' && value <= 0 && !dimensionExpr) return;
    commit(raw);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') e.currentTarget.blur();
    onKeyDown?.(e);
  };

  const isLMode = Boolean(dimensionExpr && dimensionExpr.includes('+'));
  const isProduct = Boolean(dimensionExpr && /[x*]/i.test(dimensionExpr) && !isLMode);
  const shown = focused ? text : isLMode && dimensionExpr ? dimensionExpr : displayValue(value);

  return (
    <div className="relative w-full">
      <input
        ref={assignRef}
        type="text"
        inputMode="text"
        value={shown}
        title={
          isProduct
            ? `${dimensionExpr} = ${displayValue(value)}`
            : isLMode
              ? `Bentuk L (${dimensionExpr}) = ${displayValue(value)} m`
              : title || (value > 0 ? `Quantity: ${displayValue(value)}` : undefined)
        }
        placeholder={placeholder || '6 atau 2x3'}
        onMouseUp={e => e.preventDefault()}
        onFocus={() => {
          setFocused(true);
          setText(dimensionExpr || displayValue(value));
        }}
        onBlur={e => {
          setFocused(false);
          commitFromInput(e.currentTarget.value);
        }}
        onChange={e => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        className={`${className} ${
          isLMode ? 'border-amber-400 bg-amber-50/40 font-bold text-amber-900' : 'text-slate-900'
        } placeholder:text-slate-400`}
      />

      {!focused && isLMode && (
        <span
          className="absolute -bottom-3.5 right-1 text-[9px] font-extrabold text-amber-700 bg-amber-100/90 px-1 rounded tracking-tight pointer-events-none"
          title={`Total dihitung otomatis: ${displayValue(value)}`}
        >
          Σ {displayValue(value)}m
        </span>
      )}
      {!focused && isProduct && dimensionExpr && (
        <span
          className="absolute -bottom-3.5 right-1 text-[9px] font-extrabold text-emerald-700 bg-emerald-100/90 px-1 rounded tracking-tight pointer-events-none"
          title={`${dimensionExpr} = ${displayValue(value)}`}
        >
          {dimensionExpr}
        </span>
      )}
    </div>
  );
}
