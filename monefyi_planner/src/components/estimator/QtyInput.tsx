import { useEffect, useState, type KeyboardEvent } from 'react';
import { formatNumberId, parseNumberId } from '../../lib/estimatorFormat';

interface Props {
  value: number;
  onChange: (value: number) => void;
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

/** Input qty dengan format Indonesia (koma desimal) — aman di keyboard mobile. */
export default function QtyInput({
  value,
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

  useEffect(() => {
    if (!focused) setText(displayValue(value));
  }, [value, focused]);

  const commit = (raw: string) => {
    const trimmed = raw.trim();
    const parsed = trimmed === '' ? 0 : Math.max(min, parseNumberId(raw));
    onChange(parsed);
    setText(displayValue(parsed));
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      commit(text);
      (e.target as HTMLInputElement).blur();
    }
    onKeyDown?.(e);
  };

  const shown = focused ? text : displayValue(value);

  return (
    <input
      ref={inputRef}
      type="text"
      inputMode="decimal"
      value={shown}
      title={title || (value > 0 ? displayValue(value) : undefined)}
      placeholder={placeholder}
      onFocus={() => {
        setFocused(true);
        setText(displayValue(value));
      }}
      onBlur={() => {
        setFocused(false);
        commit(text);
      }}
      onChange={e => setText(e.target.value)}
      onKeyDown={handleKeyDown}
      className={`${className} text-slate-900 placeholder:text-slate-600`}
    />
  );
}
