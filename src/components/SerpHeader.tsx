import { Globe, Image, MessageSquare, Newspaper, Play, Shield, Sparkles } from 'lucide-react';
import type {
  CustomSearchEngine,
  FreshnessFilter,
  HistoryEntry,
  RegionCode,
  SafeSearchLevel,
  SearchProviderId,
  SearchTab,
} from '../types/search';
import { SearchBox } from './SearchBox';

interface SerpHeaderProps {
  query: string;
  onQueryChange: (val: string) => void;
  onSearch: (queryOverride?: string) => void;
  history: HistoryEntry[];
  onRemoveHistoryItem: (id: string) => void;
  isLoading: boolean;
  activeTab: SearchTab;
  onTabChange: (tab: SearchTab) => void;
  provider: SearchProviderId;
  onProviderChange: (provider: SearchProviderId) => void;
  region: RegionCode;
  onRegionChange: (region: RegionCode) => void;
  freshness: FreshnessFilter;
  onFreshnessChange: (freshness: FreshnessFilter) => void;
  safeSearch: SafeSearchLevel;
  onSafeSearchChange: (level: SafeSearchLevel) => void;
  showAiAnswer: boolean;
  onToggleAiAnswer: () => void;
  customEngines: CustomSearchEngine[];
  onRunCustomEngine: (engine: CustomSearchEngine, query: string) => void;
  searchTimeMs?: number;
}

const TABS: Array<{ id: SearchTab; label: string; icon: typeof Globe }> = [
  { id: 'all', label: 'All', icon: Globe },
  { id: 'images', label: 'Images', icon: Image },
  { id: 'news', label: 'News', icon: Newspaper },
  { id: 'videos', label: 'Videos', icon: Play },
  { id: 'discussions', label: 'Discussions', icon: MessageSquare },
];

export function SerpHeader({
  query,
  onQueryChange,
  onSearch,
  history,
  onRemoveHistoryItem,
  isLoading,
  activeTab,
  onTabChange,
  provider,
  onProviderChange,
  region,
  onRegionChange,
  freshness,
  onFreshnessChange,
  safeSearch,
  onSafeSearchChange,
  showAiAnswer,
  onToggleAiAnswer,
  customEngines,
  onRunCustomEngine,
  searchTimeMs,
}: SerpHeaderProps) {
  return (
    <section
      aria-label="Search controls and filters"
      className="relative z-20 w-full border-b border-neutral-200 dark:border-white/10 bg-white/80 dark:bg-black/80 backdrop-blur-md"
    >
      <div className="mx-auto max-w-[1200px] px-4 sm:px-6 pt-4">
        {/* Search Bar + Custom %s Quick Switcher */}
        <div className="flex flex-col md:flex-row md:items-center gap-3">
          <div className="flex-1 max-w-[720px]">
            <SearchBox
              value={query}
              onChange={onQueryChange}
              onSubmit={onSearch}
              history={history}
              onRemoveHistoryItem={onRemoveHistoryItem}
              size="compact"
              isLoading={isLoading}
            />
          </div>

          {customEngines.length > 0 && (
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
              <span className="text-[11px] text-neutral-400 whitespace-nowrap shrink-0">
                Try on:
              </span>
              {customEngines.slice(0, 3).map((eng) => (
                <button
                  key={eng.id}
                  type="button"
                  onClick={() => onRunCustomEngine(eng, query)}
                  className="px-2.5 py-1 rounded-md border border-neutral-200 dark:border-white/15 bg-white/70 dark:bg-black/60 text-xs font-medium text-neutral-700 dark:text-neutral-300 hover:border-neutral-900 dark:hover:border-white/40 whitespace-nowrap shrink-0 transition-colors"
                >
                  {eng.name}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Category Tabs + Provider & Filter Controls */}
        <div className="mt-3.5 flex flex-col xl:flex-row xl:items-center xl:justify-between gap-3">
          {/* Category Tabs */}
          <div
            role="tablist"
            aria-label="Search result categories"
            className="flex items-center gap-1 overflow-x-auto pb-1 xl:pb-0"
          >
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const isSelected = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={isSelected}
                  onClick={() => onTabChange(tab.id)}
                  className={`relative inline-flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm font-medium whitespace-nowrap shrink-0 transition-colors border-b-2 ${
                    isSelected
                      ? 'border-neutral-950 text-neutral-950 dark:border-white dark:text-white'
                      : 'border-transparent text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5 shrink-0" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Provider + Filters */}
          <div className="flex flex-wrap items-center gap-2 pb-2.5 xl:pb-1.5 text-xs">
            <select
              aria-label="Search provider"
              value={provider}
              onChange={(e) => onProviderChange(e.target.value as SearchProviderId)}
              className="rounded-md border border-neutral-200 dark:border-white/15 bg-white dark:bg-neutral-950 px-2.5 py-1 text-xs font-medium text-neutral-900 dark:text-neutral-100 focus:outline-none focus:border-neutral-900 dark:focus:border-white/40"
            >
              <option value="axiom">Engine: Axiom Live</option>
              <option value="all_combined">Engine: Combined (All + Own Index)</option>
              <option value="brave">Engine: Brave Search API</option>
              <option value="bing">Engine: Bing Search API</option>
              <option value="own">Engine: Own Index Only</option>
            </select>

            <select
              aria-label="Filter by region"
              value={region}
              onChange={(e) => onRegionChange(e.target.value as RegionCode)}
              className="rounded-md border border-neutral-200 dark:border-white/15 bg-white dark:bg-neutral-950 px-2.5 py-1 text-xs text-neutral-800 dark:text-neutral-200 focus:outline-none focus:border-neutral-900 dark:focus:border-white/40"
            >
              <option value="all">All Regions</option>
              <option value="us">United States</option>
              <option value="gb">United Kingdom</option>
              <option value="my">Malaysia</option>
              <option value="sg">Singapore</option>
              <option value="jp">Japan</option>
              <option value="de">Germany</option>
            </select>

            <select
              aria-label="Filter by freshness"
              value={freshness}
              onChange={(e) => onFreshnessChange(e.target.value as FreshnessFilter)}
              className="rounded-md border border-neutral-200 dark:border-white/15 bg-white dark:bg-neutral-950 px-2.5 py-1 text-xs text-neutral-800 dark:text-neutral-200 focus:outline-none focus:border-neutral-900 dark:focus:border-white/40"
            >
              <option value="any">Any time</option>
              <option value="day">Past 24 hours</option>
              <option value="week">Past week</option>
              <option value="month">Past month</option>
              <option value="year">Past year</option>
            </select>

            <label className="inline-flex items-center gap-1.5 text-neutral-500 dark:text-neutral-400">
              <Shield className="h-3.5 w-3.5 text-neutral-400 hidden sm:inline" />
              <select
                aria-label="SafeSearch level"
                value={safeSearch}
                onChange={(e) => onSafeSearchChange(e.target.value as SafeSearchLevel)}
                className="rounded-md border border-neutral-200 dark:border-white/15 bg-white dark:bg-neutral-950 px-2.5 py-1 text-xs text-neutral-800 dark:text-neutral-200 focus:outline-none focus:border-neutral-900 dark:focus:border-white/40"
              >
                <option value="strict">SafeSearch: Strict</option>
                <option value="moderate">SafeSearch: Moderate</option>
                <option value="off">SafeSearch: Off</option>
              </select>
            </label>

            <button
              type="button"
              onClick={onToggleAiAnswer}
              aria-pressed={showAiAnswer}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-xs font-medium whitespace-nowrap shrink-0 transition-colors ${
                showAiAnswer
                  ? 'border-neutral-950 bg-neutral-950 text-white dark:border-white dark:bg-white dark:text-black'
                  : 'border-neutral-200 dark:border-white/15 text-neutral-600 dark:text-neutral-400 hover:text-neutral-950 dark:hover:text-white'
              }`}
            >
              <Sparkles className="h-3 w-3 shrink-0" />
              <span>AI Answer</span>
            </button>

            {typeof searchTimeMs === 'number' && searchTimeMs > 0 && (
              <span className="hidden xl:inline font-mono tabular-nums text-xs text-neutral-400 dark:text-neutral-500 ml-1">
                {(searchTimeMs / 1000).toFixed(2)}s
              </span>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
