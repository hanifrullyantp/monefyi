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
}

function displayValue(n: number): string {
  return n > 0 ? formatNumberId(n) : '';
}

export default function RupiahInput({
  value,
  onChange,
  onKeyDown,
  className = '',
  inputRef,
  title,
  min = 0,
}: Props) {
  const [focused, setFocused] = useState(false);
  const [text, setText] = useState('');

  useEffect(() => {
    if (!focused) setText(displayValue(value));
  }, [value, focused]);

  const commit = (raw: string) => {
    const parsed = Math.max(min, parseNumberId(raw));
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
  const charWidth = Math.max(12, shown.length + 1);

  return (
    <input
      ref={inputRef}
      type="text"
      inputMode="numeric"
      value={shown}
      title={title || (value > 0 ? displayValue(value) : undefined)}
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
      className={`${className} min-w-[11rem]`}
      style={{ width: `${charWidth}ch`, maxWidth: '100%' }}
      placeholder="0"
    />
  );
}
