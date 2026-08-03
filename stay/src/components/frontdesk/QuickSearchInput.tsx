import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
} from 'react';
import { Clock, Search, X } from 'lucide-react';
import { cn } from '../../utils/cn';

const RECENT_KEY = 'stay-frontdesk-recent-searches';
const MAX_RECENT = 5;
const DEBOUNCE_MS = 300;

function readRecentSearches(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as string[];
    return Array.isArray(parsed) ? parsed.slice(0, MAX_RECENT) : [];
  } catch {
    return [];
  }
}

function persistRecentSearches(items: string[]): void {
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(items.slice(0, MAX_RECENT)));
  } catch {
    /* ignore */
  }
}

export interface QuickSearchInputProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

/**
 * Search input dengan debounce, shortcut keyboard, dan recent searches.
 */
export default function QuickSearchInput({
  value,
  onChange,
  className,
}: QuickSearchInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [localValue, setLocalValue] = useState(value);
  const [focused, setFocused] = useState(false);
  const [recent, setRecent] = useState<string[]>(readRecentSearches);
  const debounceRef = useRef<number | null>(null);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  useEffect(() => {
    const onKeyDown = (e: globalThis.KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().includes('MAC');
      const mod = isMac ? e.metaKey : e.ctrlKey;
      if (e.key === '/' && !mod) {
        e.preventDefault();
        inputRef.current?.focus();
      }
      if (mod && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const commitSearch = useCallback(
    (term: string) => {
      onChange(term);
      const trimmed = term.trim();
      if (!trimmed) return;
      setRecent((prev) => {
        const next = [trimmed, ...prev.filter((s) => s !== trimmed)].slice(0, MAX_RECENT);
        persistRecentSearches(next);
        return next;
      });
    },
    [onChange]
  );

  const handleChange = useCallback(
    (next: string) => {
      setLocalValue(next);
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
      debounceRef.current = window.setTimeout(() => {
        onChange(next);
      }, DEBOUNCE_MS);
    },
    [onChange]
  );

  const handleClear = useCallback(() => {
    setLocalValue('');
    onChange('');
    inputRef.current?.focus();
  }, [onChange]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        if (debounceRef.current) window.clearTimeout(debounceRef.current);
        commitSearch(localValue);
      }
      if (e.key === 'Escape') {
        handleClear();
        inputRef.current?.blur();
      }
    },
    [commitSearch, handleClear, localValue]
  );

  const showRecent = focused && !localValue.trim() && recent.length > 0;
  const isMac =
    typeof navigator !== 'undefined' &&
    navigator.platform.toUpperCase().includes('MAC');

  return (
    <div className={cn('relative w-full', className)}>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          ref={inputRef}
          type="search"
          value={localValue}
          onChange={(e) => handleChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => window.setTimeout(() => setFocused(false), 150)}
          onKeyDown={handleKeyDown}
          placeholder="Cari kamar, tamu, atau kode booking..."
          className="min-h-[44px] w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-10 pr-24 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
          data-testid="quick-search-input"
          aria-label="Cari kamar, tamu, atau kode booking"
        />
        <div className="pointer-events-none absolute right-3 top-1/2 flex -translate-y-1/2 items-center gap-2">
          {localValue && (
            <button
              type="button"
              onClick={handleClear}
              className="pointer-events-auto rounded-md p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-600 dark:hover:bg-slate-700"
              aria-label="Hapus pencarian"
              tabIndex={-1}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
          <kbd className="hidden rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] font-medium text-slate-400 sm:inline dark:border-slate-600 dark:bg-slate-900">
            {isMac ? '⌘K' : '/'}
          </kbd>
        </div>
      </div>

      {showRecent && (
        <div
          className="absolute left-0 right-0 top-full z-20 mt-1 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-900"
          data-testid="recent-searches"
        >
          <p className="border-b border-slate-100 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-slate-400 dark:border-slate-800">
            Pencarian Terakhir
          </p>
          <ul>
            {recent.map((term) => (
              <li key={term}>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    setLocalValue(term);
                    commitSearch(term);
                    inputRef.current?.blur();
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  <Clock className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                  {term}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
