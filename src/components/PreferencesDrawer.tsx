import { useEffect } from 'react';
import {
  ArrowUpRight,
  Bookmark,
  Clock,
  Monitor,
  Moon,
  Smartphone,
  Sun,
  Trash2,
  X,
} from 'lucide-react';
import type {
  BookmarkItem,
  HistoryEntry,
  MotionMode,
  ReaderViewportMode,
  RegionCode,
  SafeSearchLevel,
  SearchProviderId,
  UserPreferences,
} from '../types/search';
import { isSafeExternalUrl } from '../utils/instantTools';

interface PreferencesDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  preferences: UserPreferences;
  onUpdatePreferences: (patch: Partial<UserPreferences>) => void;
  bookmarks: BookmarkItem[];
  onRemoveBookmark: (url: string) => void;
  onOpenUrlInApp: (url: string, title?: string) => void;
  history: HistoryEntry[];
  onSelectHistoryQuery: (query: string) => void;
  onClearHistory: () => void;
}

export function PreferencesDrawer({
  isOpen,
  onClose,
  preferences,
  onUpdatePreferences,
  bookmarks,
  onRemoveBookmark,
  onOpenUrlInApp,
  history,
  onSelectHistoryQuery,
  onClearHistory,
}: PreferencesDrawerProps) {
  useEffect(() => {
    if (!isOpen) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end"
      role="dialog"
      aria-modal="true"
      aria-label="Settings, Bookmarks and History"
    >
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
      />

      <div className="relative z-10 flex h-full w-full max-w-md flex-col border-l border-neutral-200 dark:border-white/15 bg-white dark:bg-neutral-950 text-neutral-950 dark:text-white shadow-2xl">
        <div className="flex items-center justify-between gap-4 border-b border-neutral-200 dark:border-white/10 px-6 py-4">
          <div>
            <h2 className="font-display text-base font-semibold">Settings & Library</h2>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              Stored locally in your browser. Zero server tracking.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close settings"
            className="rounded-md p-1.5 text-neutral-500 hover:text-neutral-950 dark:text-neutral-400 dark:hover:text-white transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-7">
          {/* Appearance & Motion */}
          <section className="space-y-4">
            <h3 className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">
              Appearance & Controls
            </h3>

            <div>
              <div className="text-sm font-medium mb-2">Theme</div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => onUpdatePreferences({ theme: 'dark' })}
                  className={`flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${
                    preferences.theme === 'dark'
                      ? 'border-neutral-950 bg-neutral-950 text-white dark:border-white dark:bg-white dark:text-black'
                      : 'border-neutral-200 dark:border-white/15 text-neutral-700 dark:text-neutral-300'
                  }`}
                >
                  <Moon className="h-3.5 w-3.5" />
                  <span>Dark Mode</span>
                </button>
                <button
                  type="button"
                  onClick={() => onUpdatePreferences({ theme: 'light' })}
                  className={`flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${
                    preferences.theme === 'light'
                      ? 'border-neutral-950 bg-neutral-950 text-white dark:border-white dark:bg-white dark:text-black'
                      : 'border-neutral-200 dark:border-white/15 text-neutral-700 dark:text-neutral-300'
                  }`}
                >
                  <Sun className="h-3.5 w-3.5" />
                  <span>Light Mode</span>
                </button>
              </div>
            </div>

            <div>
              <div className="text-sm font-medium mb-2">Live Wallpaper & Touch Ripples</div>
              <div className="grid grid-cols-3 gap-2">
                {(
                  [
                    { id: 'full', label: 'Full Motion' },
                    { id: 'subtle', label: 'Subtle' },
                    { id: 'off', label: 'Off' },
                  ] as Array<{ id: MotionMode; label: string }>
                ).map((mode) => (
                  <button
                    key={mode.id}
                    type="button"
                    onClick={() => onUpdatePreferences({ motionMode: mode.id })}
                    className={`rounded-lg border px-2.5 py-2 text-xs font-medium transition-colors ${
                      preferences.motionMode === mode.id
                        ? 'border-neutral-950 bg-neutral-950 text-white dark:border-white dark:bg-white dark:text-black'
                        : 'border-neutral-200 dark:border-white/15 text-neutral-700 dark:text-neutral-300'
                    }`}
                  >
                    {mode.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="text-sm font-medium mb-2">In-App Reader Viewport</div>
              <div className="grid grid-cols-2 gap-2">
                {(
                  [
                    { id: 'desktop', label: 'Desktop View', icon: Monitor },
                    { id: 'mobile', label: 'Mobile View', icon: Smartphone },
                  ] as Array<{ id: ReaderViewportMode; label: string; icon: typeof Monitor }>
                ).map((vp) => {
                  const Icon = vp.icon;
                  return (
                    <button
                      key={vp.id}
                      type="button"
                      onClick={() => onUpdatePreferences({ viewportMode: vp.id })}
                      className={`flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${
                        preferences.viewportMode === vp.id
                          ? 'border-neutral-950 bg-neutral-950 text-white dark:border-white dark:bg-white dark:text-black'
                          : 'border-neutral-200 dark:border-white/15 text-neutral-700 dark:text-neutral-300'
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      <span>{vp.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center justify-between gap-4">
              <span className="text-sm font-medium">Reader Text Zoom</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    onUpdatePreferences({ textZoom: Math.max(80, preferences.textZoom - 10) })
                  }
                  className="rounded border border-neutral-200 dark:border-white/15 px-2.5 py-1 text-xs"
                >
                  -
                </button>
                <span className="font-mono text-xs tabular-nums w-10 text-center">
                  {preferences.textZoom}%
                </span>
                <button
                  type="button"
                  onClick={() =>
                    onUpdatePreferences({ textZoom: Math.min(160, preferences.textZoom + 10) })
                  }
                  className="rounded border border-neutral-200 dark:border-white/15 px-2.5 py-1 text-xs"
                >
                  +
                </button>
              </div>
            </div>
          </section>

          {/* Search & Browser Features */}
          <section className="pt-5 border-t border-neutral-200 dark:border-white/10 space-y-4">
            <h3 className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">
              Search & Proxy Controls
            </h3>

            <div className="flex items-center justify-between gap-4">
              <label htmlFor="pref-provider" className="text-sm font-medium">
                Default Engine
              </label>
              <select
                id="pref-provider"
                value={preferences.defaultProvider}
                onChange={(e) =>
                  onUpdatePreferences({ defaultProvider: e.target.value as SearchProviderId })
                }
                className="rounded-md border border-neutral-200 dark:border-white/15 bg-white dark:bg-black px-2.5 py-1.5 text-xs focus:outline-none"
              >
                <option value="axiom">Axiom Live</option>
                <option value="all_combined">Combined (All + Own Index)</option>
                <option value="brave">Brave Search API</option>
                <option value="bing">Bing Search API</option>
                <option value="own">Own Index Only</option>
              </select>
            </div>

            <div className="flex items-center justify-between gap-4">
              <label htmlFor="pref-safesearch" className="text-sm font-medium">
                SafeSearch
              </label>
              <select
                id="pref-safesearch"
                value={preferences.safeSearch}
                onChange={(e) =>
                  onUpdatePreferences({ safeSearch: e.target.value as SafeSearchLevel })
                }
                className="rounded-md border border-neutral-200 dark:border-white/15 bg-white dark:bg-black px-2.5 py-1.5 text-xs focus:outline-none"
              >
                <option value="strict">Strict</option>
                <option value="moderate">Moderate</option>
                <option value="off">Off</option>
              </select>
            </div>

            <div className="flex items-center justify-between gap-4">
              <label htmlFor="pref-region" className="text-sm font-medium">
                Default Region
              </label>
              <select
                id="pref-region"
                value={preferences.defaultRegion}
                onChange={(e) =>
                  onUpdatePreferences({ defaultRegion: e.target.value as RegionCode })
                }
                className="rounded-md border border-neutral-200 dark:border-white/15 bg-white dark:bg-black px-2.5 py-1.5 text-xs focus:outline-none"
              >
                <option value="all">All Regions</option>
                <option value="us">United States</option>
                <option value="gb">United Kingdom</option>
                <option value="my">Malaysia</option>
                <option value="sg">Singapore</option>
                <option value="jp">Japan</option>
                <option value="de">Germany</option>
              </select>
            </div>

            <label className="flex items-center justify-between gap-4 cursor-pointer">
              <div>
                <div className="text-sm font-medium">Proxy Ad Blocker</div>
                <div className="text-xs text-neutral-500 dark:text-neutral-400">
                  Strip trackers & ad containers in app tabs
                </div>
              </div>
              <input
                type="checkbox"
                checked={preferences.adBlockerEnabled}
                onChange={(e) => onUpdatePreferences({ adBlockerEnabled: e.target.checked })}
                className="h-4 w-4 accent-neutral-950 dark:accent-white"
              />
            </label>

            <label className="flex items-center justify-between gap-4 cursor-pointer">
              <div>
                <div className="text-sm font-medium">Virtual Mouse Pad</div>
                <div className="text-xs text-neutral-500 dark:text-neutral-400">
                  Show on-screen cursor trackpad overlay
                </div>
              </div>
              <input
                type="checkbox"
                checked={preferences.virtualMousePad}
                onChange={(e) => onUpdatePreferences({ virtualMousePad: e.target.checked })}
                className="h-4 w-4 accent-neutral-950 dark:accent-white"
              />
            </label>

            <label className="flex items-center justify-between gap-4 cursor-pointer">
              <div>
                <div className="text-sm font-medium">Auto-expand AI Answer</div>
                <div className="text-xs text-neutral-500 dark:text-neutral-400">
                  Show cited summaries on All results
                </div>
              </div>
              <input
                type="checkbox"
                checked={preferences.autoAiAnswer}
                onChange={(e) => onUpdatePreferences({ autoAiAnswer: e.target.checked })}
                className="h-4 w-4 accent-neutral-950 dark:accent-white"
              />
            </label>

            <label className="flex items-center justify-between gap-4 cursor-pointer">
              <div>
                <div className="text-sm font-medium">Save Local Search History</div>
                <div className="text-xs text-neutral-500 dark:text-neutral-400">
                  Suggest recent queries in search bar
                </div>
              </div>
              <input
                type="checkbox"
                checked={preferences.saveHistory}
                onChange={(e) => onUpdatePreferences({ saveHistory: e.target.checked })}
                className="h-4 w-4 accent-neutral-950 dark:accent-white"
              />
            </label>
          </section>

          {/* Saved Bookmarks */}
          <section className="pt-5 border-t border-neutral-200 dark:border-white/10">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-neutral-500 dark:text-neutral-400 mb-3">
              <Bookmark className="h-3.5 w-3.5" />
              <span>Saved Bookmarks ({bookmarks.length})</span>
            </div>

            {bookmarks.length === 0 ? (
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Click the bookmark icon on any search result to save it here.
              </p>
            ) : (
              <div className="space-y-2.5">
                {bookmarks.map((bm) => (
                  <div
                    key={bm.url}
                    className="flex items-start justify-between gap-3 rounded-lg border border-neutral-200 dark:border-white/10 p-3"
                  >
                    <div className="min-w-0">
                      <button
                        type="button"
                        onClick={() => {
                          onOpenUrlInApp(bm.url, bm.title);
                          onClose();
                        }}
                        className="text-left text-sm font-medium text-neutral-950 dark:text-white hover:underline line-clamp-1"
                      >
                        {bm.title}
                      </button>
                      <div className="flex items-center gap-2 text-[11px] font-mono text-neutral-500">
                        <span className="truncate">{bm.domain}</span>
                        {isSafeExternalUrl(bm.url) && (
                          <a
                            href={bm.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label={`Open ${bm.title} externally`}
                            className="hover:text-neutral-950 dark:hover:text-white"
                          >
                            <ArrowUpRight className="h-3 w-3" />
                          </a>
                        )}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => onRemoveBookmark(bm.url)}
                      aria-label={`Remove ${bm.title}`}
                      className="p-1 text-neutral-400 hover:text-neutral-950 dark:hover:text-white shrink-0"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Recent History */}
          <section className="pt-5 border-t border-neutral-200 dark:border-white/10">
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-neutral-500 dark:text-neutral-400">
                <Clock className="h-3.5 w-3.5" />
                <span>Recent History ({history.length})</span>
              </div>
              {history.length > 0 && (
                <button
                  type="button"
                  onClick={onClearHistory}
                  className="text-xs text-neutral-500 hover:text-neutral-950 dark:text-neutral-400 dark:hover:text-white underline underline-offset-2"
                >
                  Clear all
                </button>
              )}
            </div>

            {history.length === 0 ? (
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                No recent searches saved yet.
              </p>
            ) : (
              <div className="space-y-1">
                {history.slice(0, 12).map((entry) => (
                  <button
                    key={entry.id}
                    type="button"
                    onClick={() => {
                      onSelectHistoryQuery(entry.query);
                      onClose();
                    }}
                    className="w-full flex items-center justify-between gap-3 rounded-md px-2.5 py-2 text-left text-sm hover:bg-neutral-100 dark:hover:bg-white/5 transition-colors"
                  >
                    <span className="truncate text-neutral-800 dark:text-neutral-200">
                      {entry.query}
                    </span>
                    <span className="font-mono text-[11px] text-neutral-400 shrink-0">
                      {entry.tab}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
