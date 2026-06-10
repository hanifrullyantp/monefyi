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
    if (!focused) {
      setText(value > 0 ? formatNumberId(value) : '');
    }
  }, [value, focused]);

  return (
    <input
      ref={inputRef}
      type="text"
      inputMode="numeric"
      value={focused ? text : value > 0 ? formatNumberId(value) : ''}
      title={title}
      onFocus={() => {
        setFocused(true);
        setText(value > 0 ? String(value) : '');
      }}
      onBlur={() => {
        setFocused(false);
        const parsed = Math.max(min, parseNumberId(text));
        onChange(parsed);
      }}
      onChange={e => {
        setText(e.target.value);
        if (focused) {
          const parsed = parseNumberId(e.target.value);
          if (parsed >= min) onChange(parsed);
        }
      }}
      onKeyDown={onKeyDown}
      className={className}
      placeholder="0"
    />
  );
}
