import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, Clock, Command, Search, X } from 'lucide-react';
import type { HistoryEntry } from '../types/search';
import { BANG_DEFINITIONS, parseBangQuery } from '../utils/instantTools';

interface SearchBoxProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (queryOverride?: string) => void;
  history: HistoryEntry[];
  onRemoveHistoryItem: (id: string) => void;
  size?: 'hero' | 'compact';
  isLoading?: boolean;
  autoFocus?: boolean;
}

const QUICK_SUGGESTIONS = [
  'Next.js vs Vite benchmark 2026',
  'How Brave Search independent index works',
  'Latest AI research breakthroughs',
  'Tailwind CSS v4 dark mode custom variant',
  'Rust vs Go backend performance',
  'World solar energy capacity 2026',
];

export function SearchBox({
  value,
  onChange,
  onSubmit,
  history,
  onRemoveHistoryItem,
  size = 'hero',
  isLoading = false,
  autoFocus = false,
}: SearchBoxProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const { bang } = useMemo(() => parseBangQuery(value), [value]);

  const bangSuggestions = useMemo(() => {
    const trimmed = value.trim().toLowerCase();
    if (!trimmed.startsWith('!')) return [];
    const token = trimmed.split(/\s+/)[0];
    return BANG_DEFINITIONS.filter((b) => b.trigger.startsWith(token)).slice(0, 6);
  }, [value]);

  const historyMatches = useMemo(() => {
    const q = value.trim().toLowerCase();
    if (!q) return history.slice(0, 5);
    return history.filter((h) => h.query.toLowerCase().includes(q)).slice(0, 4);
  }, [history, value]);

  const queryMatches = useMemo(() => {
    const q = value.trim().toLowerCase();
    if (!q || q.startsWith('!')) return [];
    return QUICK_SUGGESTIONS.filter(
      (s) => s.toLowerCase().includes(q) && s.toLowerCase() !== q
    ).slice(0, 3);
  }, [value]);

  useEffect(() => {
    if (autoFocus) {
      inputRef.current?.focus();
    }
  }, [autoFocus]);

  // '/' keyboard shortcut focuses the search box when not typing in an input
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === '/' &&
        document.activeElement?.tagName !== 'INPUT' &&
        document.activeElement?.tagName !== 'TEXTAREA' &&
        document.activeElement?.tagName !== 'SELECT'
      ) {
        e.preventDefault();
        inputRef.current?.focus();
        setIsOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutside = (e: PointerEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('pointerdown', handleOutside);
    return () => document.removeEventListener('pointerdown', handleOutside);
  }, []);

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty('--mouse-x', `${e.clientX - rect.left}px`);
    e.currentTarget.style.setProperty('--mouse-y', `${e.clientY - rect.top}px`);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!value.trim()) return;
    setIsOpen(false);
    onSubmit();
  };

  const hasDropdownContent =
    isOpen &&
    (bangSuggestions.length > 0 || historyMatches.length > 0 || queryMatches.length > 0);

  const isHero = size === 'hero';

  return (
    <div ref={containerRef} className="relative w-full">
      <form onSubmit={handleFormSubmit} role="search" aria-label="Web search">
        <div
          onPointerMove={handlePointerMove}
          className={`spotlight-card group flex items-center gap-2.5 w-full rounded-xl border border-neutral-300 dark:border-white/15 bg-white/90 dark:bg-neutral-950/90 backdrop-blur-md transition-colors duration-150 focus-within:border-neutral-950 dark:focus-within:border-white/50 ${
            isHero ? 'h-14 px-4' : 'h-11 px-3.5'
          }`}
        >
          <Search
            className={`shrink-0 text-neutral-500 dark:text-neutral-400 ${
              isHero ? 'h-5 w-5' : 'h-4 w-4'
            }`}
          />

          {bang && (
            <span className="shrink-0 font-mono text-xs px-2 py-0.5 rounded border border-neutral-300 dark:border-white/20 bg-neutral-100 dark:bg-white/10 text-neutral-900 dark:text-white whitespace-nowrap">
              {bang.label}
            </span>
          )}

          <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={(e) => {
              onChange(e.target.value);
              setIsOpen(true);
            }}
            onFocus={() => setIsOpen(true)}
            placeholder="Search the web, or try !w, !gh, !yt, 48 * 12..."
            aria-label="Search query"
            className={`w-full min-w-0 bg-transparent text-neutral-950 dark:text-white placeholder:text-neutral-400 dark:placeholder:text-neutral-500 focus:outline-none ${
              isHero ? 'text-base' : 'text-sm'
            }`}
          />

          {value && (
            <button
              type="button"
              onClick={() => {
                onChange('');
                inputRef.current?.focus();
              }}
              aria-label="Clear search query"
              className="shrink-0 p-1.5 rounded-md text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          )}

          {!value && isHero && (
            <span
              aria-hidden="true"
              className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 text-xs font-mono text-neutral-400 dark:text-neutral-500 border border-neutral-200 dark:border-white/10 rounded shrink-0"
            >
              /
            </span>
          )}

          <button
            type="submit"
            disabled={isLoading || !value.trim()}
            aria-label="Submit search"
            className={`shrink-0 inline-flex items-center justify-center rounded-lg bg-neutral-950 text-white dark:bg-white dark:text-black hover:bg-neutral-800 dark:hover:bg-neutral-200 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-150 active:scale-[0.97] ${
              isHero ? 'h-9 px-4 text-sm font-medium' : 'h-8 px-3 text-xs font-medium'
            }`}
          >
            {isLoading ? (
              <span className="inline-block h-3.5 w-3.5 rounded-full border-2 border-current border-t-transparent animate-spin" />
            ) : (
              <ArrowRight className="h-4 w-4" />
            )}
          </button>
        </div>
      </form>

      {hasDropdownContent && (
        <div className="absolute left-0 right-0 top-full mt-2 z-40 rounded-xl border border-neutral-200 dark:border-white/15 bg-white dark:bg-neutral-950 shadow-2xl overflow-hidden">
          {bangSuggestions.length > 0 && (
            <div className="py-1.5 border-b border-neutral-200 dark:border-white/10">
              <div className="px-3.5 py-1 text-xs font-medium text-neutral-500 dark:text-neutral-400">
                Bang Shortcuts
              </div>
              {bangSuggestions.map((item) => (
                <button
                  key={item.trigger}
                  type="button"
                  onClick={() => {
                    onChange(`${item.trigger} `);
                    inputRef.current?.focus();
                  }}
                  className="w-full flex items-center justify-between gap-3 px-3.5 py-2 text-left text-sm hover:bg-neutral-100 dark:hover:bg-white/5 transition-colors"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Command className="h-3.5 w-3.5 shrink-0 text-neutral-400" />
                    <span className="font-mono text-xs font-semibold text-neutral-950 dark:text-white">
                      {item.trigger}
                    </span>
                    <span className="text-neutral-700 dark:text-neutral-300 truncate">
                      {item.label}
                    </span>
                  </div>
                  <span className="text-xs text-neutral-400 truncate hidden sm:inline">
                    {item.description}
                  </span>
                </button>
              ))}
            </div>
          )}

          {historyMatches.length > 0 && (
            <div className="py-1.5">
              <div className="px-3.5 py-1 text-xs font-medium text-neutral-500 dark:text-neutral-400">
                Recent Searches
              </div>
              {historyMatches.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between gap-2 px-3.5 py-2 hover:bg-neutral-100 dark:hover:bg-white/5 transition-colors"
                >
                  <button
                    type="button"
                    onClick={() => {
                      onChange(item.query);
                      setIsOpen(false);
                      onSubmit(item.query);
                    }}
                    className="flex-1 flex items-center gap-2.5 text-left text-sm text-neutral-900 dark:text-neutral-100 min-w-0"
                  >
                    <Clock className="h-3.5 w-3.5 shrink-0 text-neutral-400" />
                    <span className="truncate">{item.query}</span>
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemoveHistoryItem(item.id);
                    }}
                    aria-label={`Remove ${item.query} from history`}
                    className="p-1 text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {queryMatches.length > 0 && (
            <div className="py-1.5 border-t border-neutral-200 dark:border-white/10">
              <div className="px-3.5 py-1 text-xs font-medium text-neutral-500 dark:text-neutral-400">
                Suggestions
              </div>
              {queryMatches.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => {
                    onChange(suggestion);
                    setIsOpen(false);
                    onSubmit(suggestion);
                  }}
                  className="w-full flex items-center gap-2.5 px-3.5 py-2 text-left text-sm text-neutral-800 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-white/5 transition-colors"
                >
                  <Search className="h-3.5 w-3.5 shrink-0 text-neutral-400" />
                  <span className="truncate">{suggestion}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
