import { ArrowUpRight, Globe, Pin, Plus, X } from 'lucide-react';
import { useState } from 'react';
import type {
  CustomSearchEngine,
  HistoryEntry,
  PinnedSite,
  SearchProviderId,
} from '../types/search';
import { isSafeExternalUrl } from '../utils/instantTools';
import { SearchBox } from './SearchBox';

interface SearchLandingProps {
  query: string;
  onQueryChange: (val: string) => void;
  onSearch: (queryOverride?: string) => void;
  provider: SearchProviderId;
  onProviderChange: (p: SearchProviderId) => void;
  history: HistoryEntry[];
  onRemoveHistoryItem: (id: string) => void;
  pinnedSites: PinnedSite[];
  onOpenUrlInApp: (url: string, title?: string) => void;
  onAddPinnedSite: (title: string, url: string) => void;
  onRemovePinnedSite: (id: string) => void;
  customEngines: CustomSearchEngine[];
  onRunCustomEngine: (engine: CustomSearchEngine, q: string) => void;
  onOpenOwnIndex: () => void;
  isLoading: boolean;
}

const STARTER_QUERIES = [
  'Vercel next generation web infrastructure',
  'How Brave Search independent indexing works',
  'Latest quantum computing breakthroughs',
  '125 km to miles',
];

const QUICK_BANGS = [
  { trigger: '!w', label: 'Wikipedia' },
  { trigger: '!gh', label: 'GitHub' },
  { trigger: '!yt', label: 'YouTube' },
  { trigger: '!rd', label: 'Reddit' },
  { trigger: '!so', label: 'Stack Overflow' },
];

export function SearchLanding({
  query,
  onQueryChange,
  onSearch,
  provider,
  onProviderChange,
  history,
  onRemoveHistoryItem,
  pinnedSites,
  onOpenUrlInApp,
  onAddPinnedSite,
  onRemovePinnedSite,
  customEngines,
  onRunCustomEngine,
  onOpenOwnIndex,
  isLoading,
}: SearchLandingProps) {
  const [addingPin, setAddingPin] = useState(false);
  const [pinTitle, setPinTitle] = useState('');
  const [pinUrl, setPinUrl] = useState('');

  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSafeExternalUrl(pinUrl)) return;
    onAddPinnedSite(pinTitle.trim() || pinUrl, pinUrl.trim());
    setPinTitle('');
    setPinUrl('');
    setAddingPin(false);
  };

  return (
    <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 sm:px-6 py-12 sm:py-16">
      <div className="w-full max-w-[720px] flex flex-col items-center text-center">
        <h1 className="font-display text-4xl sm:text-5xl md:text-[52px] font-bold tracking-tight text-neutral-950 dark:text-white leading-[1.08] text-balance">
          Search the open web, privately.
        </h1>

        <p className="mt-3.5 max-w-xl text-base text-neutral-600 dark:text-neutral-400 leading-relaxed">
          Multi-engine search, custom %s providers, own index, ad-blocked reader tabs, and offline
          PWA workspace.
        </p>

        {/* Provider Switcher Strip */}
        <div className="mt-7 flex flex-wrap items-center justify-center gap-1.5">
          {(
            [
              { id: 'axiom', label: 'Axiom Live' },
              { id: 'all_combined', label: 'Combined' },
              { id: 'brave', label: 'Brave API' },
              { id: 'bing', label: 'Bing API' },
              { id: 'own', label: 'Own Index' },
            ] as Array<{ id: SearchProviderId; label: string }>
          ).map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => onProviderChange(p.id)}
              className={`px-3 py-1 rounded-md border text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                provider === p.id
                  ? 'border-neutral-950 bg-neutral-950 text-white dark:border-white dark:bg-white dark:text-black'
                  : 'border-neutral-200 dark:border-white/12 bg-white/60 dark:bg-white/[0.03] text-neutral-600 dark:text-neutral-400 hover:text-neutral-950 dark:hover:text-white'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        <div className="mt-3.5 w-full">
          <SearchBox
            value={query}
            onChange={onQueryChange}
            onSubmit={onSearch}
            history={history}
            onRemoveHistoryItem={onRemoveHistoryItem}
            size="hero"
            isLoading={isLoading}
            autoFocus
          />
        </div>

        {/* Custom %s Engines + Bangs */}
        <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
          {QUICK_BANGS.map((item) => (
            <button
              key={item.trigger}
              type="button"
              onClick={() => onQueryChange(`${item.trigger} `)}
              className="px-2.5 py-1 text-xs rounded-md border border-neutral-200 dark:border-white/10 bg-white/60 dark:bg-white/[0.03] text-neutral-700 dark:text-neutral-300 hover:border-neutral-900 dark:hover:border-white/40 transition-colors whitespace-nowrap shrink-0"
            >
              <span className="font-mono font-semibold mr-1.5">{item.trigger}</span>
              <span>{item.label}</span>
            </button>
          ))}

          {customEngines.slice(0, 3).map((eng) => (
            <button
              key={eng.id}
              type="button"
              onClick={() => {
                if (query.trim()) onRunCustomEngine(eng, query);
                else onQueryChange(`${eng.shortcut} `);
              }}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs rounded-md border border-neutral-200 dark:border-white/10 bg-white/60 dark:bg-white/[0.03] text-neutral-700 dark:text-neutral-300 hover:border-neutral-900 dark:hover:border-white/40 transition-colors whitespace-nowrap shrink-0"
            >
              <Globe className="h-3 w-3 text-neutral-400" />
              <span>{eng.name}</span>
            </button>
          ))}

          <button
            type="button"
            onClick={onOpenOwnIndex}
            className="px-2.5 py-1 text-xs rounded-md border border-dashed border-neutral-300 dark:border-white/20 text-neutral-500 hover:text-neutral-950 dark:hover:text-white transition-colors whitespace-nowrap shrink-0"
          >
            + Add %s Engine
          </button>
        </div>

        {/* Pinned Favourite Sites */}
        <div className="mt-10 w-full border-t border-neutral-200/80 dark:border-white/10 pt-5 text-left">
          <div className="flex items-center justify-between mb-3">
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-neutral-500">
              <Pin className="h-3.5 w-3.5" />
              <span>Pinned Favourite Sites</span>
            </span>
            <button
              type="button"
              onClick={() => setAddingPin((v) => !v)}
              className="inline-flex items-center gap-1 text-xs text-neutral-500 hover:text-neutral-950 dark:hover:text-white"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Pin Site</span>
            </button>
          </div>

          {addingPin && (
            <form onSubmit={handlePinSubmit} className="mb-3 flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={pinTitle}
                onChange={(e) => setPinTitle(e.target.value)}
                placeholder="Site name"
                className="sm:w-40 rounded-md border border-neutral-200 dark:border-white/15 bg-white/80 dark:bg-black/60 px-2.5 py-1.5 text-xs focus:outline-none"
              />
              <input
                type="url"
                required
                value={pinUrl}
                onChange={(e) => setPinUrl(e.target.value)}
                placeholder="https://..."
                className="flex-1 rounded-md border border-neutral-200 dark:border-white/15 bg-white/80 dark:bg-black/60 px-2.5 py-1.5 text-xs font-mono focus:outline-none"
              />
              <button
                type="submit"
                className="rounded-md bg-neutral-950 text-white dark:bg-white dark:text-black px-3 py-1.5 text-xs font-medium"
              >
                Save Pin
              </button>
            </form>
          )}

          {pinnedSites.length === 0 ? (
            <p className="text-xs text-neutral-400">
              Pin favourite websites from search results or click Pin Site above.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {pinnedSites.map((pin) => (
                <div
                  key={pin.id}
                  className="inline-flex items-center gap-2 rounded-lg border border-neutral-200 dark:border-white/12 bg-white/60 dark:bg-white/[0.03] px-3 py-1.5 text-xs"
                >
                  <button
                    type="button"
                    onClick={() => onOpenUrlInApp(pin.url, pin.title)}
                    className="font-medium text-neutral-900 dark:text-neutral-100 hover:underline truncate max-w-[160px]"
                  >
                    {pin.title}
                  </button>
                  <button
                    type="button"
                    onClick={() => onRemovePinnedSite(pin.id)}
                    aria-label={`Unpin ${pin.title}`}
                    className="text-neutral-400 hover:text-neutral-950 dark:hover:text-white"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Starter Searches */}
        <div className="mt-8 w-full border-t border-neutral-200/80 dark:border-white/10 pt-5">
          <div className="text-xs font-medium text-neutral-500 mb-3">Try a live search</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-left">
            {STARTER_QUERIES.map((sample) => (
              <button
                key={sample}
                type="button"
                onClick={() => {
                  onQueryChange(sample);
                  onSearch(sample);
                }}
                className="group flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-lg border border-neutral-200/80 dark:border-white/10 bg-white/50 dark:bg-white/[0.02] hover:border-neutral-900 dark:hover:border-white/35 transition-colors text-sm text-neutral-700 dark:text-neutral-300 hover:text-neutral-950 dark:hover:text-white"
              >
                <span className="truncate">{sample}</span>
                <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-neutral-400 group-hover:text-neutral-950 dark:group-hover:text-white transition-colors" />
              </button>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
