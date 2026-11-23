import { useCallback, useEffect, useState } from 'react';
import { AlertCircle, RotateCcw } from 'lucide-react';
import { AiAnswerCard } from './components/AiAnswerCard';
import { AiAssistantPanel } from './components/AiAssistantPanel';
import { BangsModal } from './components/BangsModal';
import { DownloadsModal } from './components/DownloadsModal';
import { ExtensionModal } from './components/ExtensionModal';
import { InfoboxPanel } from './components/InfoboxPanel';
import { InstantToolCard } from './components/InstantToolCard';
import { LiveMonochromeCanvas } from './components/LiveMonochromeCanvas';
import { OfflineIndicator } from './components/OfflineIndicator';
import { OwnIndexModal } from './components/OwnIndexModal';
import { PreferencesDrawer } from './components/PreferencesDrawer';
import { ProxyReaderView } from './components/ProxyReaderView';
import { ResultsList } from './components/ResultsList';
import { SearchLanding } from './components/SearchLanding';
import { SerpHeader } from './components/SerpHeader';
import { TopBar } from './components/TopBar';
import { VirtualMousePad } from './components/VirtualMousePad';
import { WorkspaceTabStrip } from './components/WorkspaceTabStrip';
import { usePWAInstall } from './hooks/usePWAInstall';
import type {
  BookmarkItem,
  BrowserTab,
  CustomSearchEngine,
  DownloadItem,
  FollowUpMessage,
  FreshnessFilter,
  HistoryEntry,
  InstantToolResult,
  PageNote,
  PinnedSite,
  ProxyPageData,
  RegionCode,
  SafeSearchLevel,
  SearchProviderId,
  SearchResponse,
  SearchResultItem,
  SearchTab,
  TabGroup,
  UserPreferences,
  WorkspaceId,
} from './types/search';
import {
  buildEngineSearchUrl,
  DEFAULT_CUSTOM_ENGINES,
  evaluateInstantTool,
  extractDomain,
  parseBangQuery,
} from './utils/instantTools';

const PREFS_STORAGE_KEY = 'axiom_search_preferences_v2';
const BOOKMARKS_STORAGE_KEY = 'axiom_search_bookmarks_v1';
const HISTORY_STORAGE_KEY = 'axiom_search_history_v1';
const TABS_STORAGE_KEY = 'axiom_browser_tabs_v1';
const GROUPS_STORAGE_KEY = 'axiom_tab_groups_v1';
const PINS_STORAGE_KEY = 'axiom_pinned_sites_v1';
const ENGINES_STORAGE_KEY = 'axiom_custom_engines_v1';
const NOTES_STORAGE_KEY = 'axiom_page_notes_v1';
const DOWNLOADS_STORAGE_KEY = 'axiom_downloads_v1';

const DEFAULT_PREFERENCES: UserPreferences = {
  theme: 'dark',
  motionMode: 'full',
  safeSearch: 'moderate',
  defaultRegion: 'all',
  defaultProvider: 'axiom',
  autoAiAnswer: true,
  saveHistory: true,
  adBlockerEnabled: true,
  virtualMousePad: false,
  textZoom: 100,
  viewportMode: 'desktop',
};

const INITIAL_TABS: BrowserTab[] = [
  { id: 'tab-work-1', workspaceId: 'work', groupId: null, kind: 'search', title: 'New Search' },
  { id: 'tab-personal-1', workspaceId: 'personal', groupId: null, kind: 'search', title: 'Personal Search' },
  { id: 'tab-study-1', workspaceId: 'study', groupId: null, kind: 'search', title: 'Study Search' },
];

const INITIAL_PINS: PinnedSite[] = [
  {
    id: 'pin-1',
    workspaceId: 'work',
    title: 'Brave Search API',
    url: 'https://brave.com/search/api/',
    domain: 'brave.com',
  },
  {
    id: 'pin-2',
    workspaceId: 'work',
    title: 'MDN Web Docs',
    url: 'https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps',
    domain: 'developer.mozilla.org',
  },
];

function loadJsonStorage<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export default function App() {
  const { isInstallable, isInstalled, install } = usePWAInstall();

  const [preferences, setPreferences] = useState<UserPreferences>(() => ({
    ...DEFAULT_PREFERENCES,
    ...loadJsonStorage<Partial<UserPreferences>>(PREFS_STORAGE_KEY, {}),
  }));
  const [bookmarks, setBookmarks] = useState<BookmarkItem[]>(() =>
    loadJsonStorage<BookmarkItem[]>(BOOKMARKS_STORAGE_KEY, [])
  );
  const [history, setHistory] = useState<HistoryEntry[]>(() =>
    loadJsonStorage<HistoryEntry[]>(HISTORY_STORAGE_KEY, [])
  );
  const [workspace, setWorkspace] = useState<WorkspaceId>('work');
  const [tabs, setTabs] = useState<BrowserTab[]>(() =>
    loadJsonStorage<BrowserTab[]>(TABS_STORAGE_KEY, INITIAL_TABS)
  );
  const [activeTabId, setActiveTabId] = useState<string>('tab-work-1');
  const [splitTabId, setSplitTabId] = useState<string | null>(null);
  const [tabGroups, setTabGroups] = useState<TabGroup[]>(() =>
    loadJsonStorage<TabGroup[]>(GROUPS_STORAGE_KEY, [])
  );
  const [pinnedSites, setPinnedSites] = useState<PinnedSite[]>(() =>
    loadJsonStorage<PinnedSite[]>(PINS_STORAGE_KEY, INITIAL_PINS)
  );
  const [customEngines, setCustomEngines] = useState<CustomSearchEngine[]>(() =>
    loadJsonStorage<CustomSearchEngine[]>(ENGINES_STORAGE_KEY, DEFAULT_CUSTOM_ENGINES)
  );
  const [notes, setNotes] = useState<PageNote[]>(() =>
    loadJsonStorage<PageNote[]>(NOTES_STORAGE_KEY, [])
  );
  const [downloads, setDownloads] = useState<DownloadItem[]>(() =>
    loadJsonStorage<DownloadItem[]>(DOWNLOADS_STORAGE_KEY, [])
  );

  // Active search state
  const [queryInput, setQueryInput] = useState('');
  const [activeQuery, setActiveQuery] = useState('');
  const [activeSearchTab, setActiveSearchTab] = useState<SearchTab>('all');
  const [provider, setProvider] = useState<SearchProviderId>(() => preferences.defaultProvider);
  const [region, setRegion] = useState<RegionCode>(() => preferences.defaultRegion);
  const [freshness, setFreshness] = useState<FreshnessFilter>('any');
  const [safeSearch, setSafeSearch] = useState<SafeSearchLevel>(() => preferences.safeSearch);
  const [showAiAnswer, setShowAiAnswer] = useState<boolean>(() => preferences.autoAiAnswer);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [searchResult, setSearchResult] = useState<SearchResponse | null>(null);
  const [instantTool, setInstantTool] = useState<InstantToolResult | null>(null);
  const [followUps, setFollowUps] = useState<FollowUpMessage[]>([]);
  const [isFollowingUp, setIsFollowingUp] = useState(false);
  const [highlightedCitation, setHighlightedCitation] = useState<number | null>(null);

  // Modals & Drawers
  const [isPrefsOpen, setIsPrefsOpen] = useState(false);
  const [isBangsOpen, setIsBangsOpen] = useState(false);
  const [isOwnIndexOpen, setIsOwnIndexOpen] = useState(false);
  const [isAssistantOpen, setIsAssistantOpen] = useState(false);
  const [isDownloadsOpen, setIsDownloadsOpen] = useState(false);
  const [isExtensionOpen, setIsExtensionOpen] = useState(false);
  const [assistantPageContext, setAssistantPageContext] = useState<ProxyPageData | null>(null);

  // Persist local state
  useEffect(() => {
    document.documentElement.classList.toggle('dark', preferences.theme === 'dark');
    try {
      window.localStorage.setItem(PREFS_STORAGE_KEY, JSON.stringify(preferences));
    } catch {
      // Ignore quota errors
    }
  }, [preferences]);

  useEffect(() => {
    try {
      window.localStorage.setItem(BOOKMARKS_STORAGE_KEY, JSON.stringify(bookmarks));
      window.localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(history));
      window.localStorage.setItem(TABS_STORAGE_KEY, JSON.stringify(tabs));
      window.localStorage.setItem(GROUPS_STORAGE_KEY, JSON.stringify(tabGroups));
      window.localStorage.setItem(PINS_STORAGE_KEY, JSON.stringify(pinnedSites));
      window.localStorage.setItem(ENGINES_STORAGE_KEY, JSON.stringify(customEngines));
      window.localStorage.setItem(NOTES_STORAGE_KEY, JSON.stringify(notes));
      window.localStorage.setItem(DOWNLOADS_STORAGE_KEY, JSON.stringify(downloads));
    } catch {
      // Ignore quota errors
    }
  }, [bookmarks, history, tabs, tabGroups, pinnedSites, customEngines, notes, downloads]);

  const activeBrowserTab =
    tabs.find((t) => t.id === activeTabId) ||
    tabs.find((t) => t.workspaceId === workspace) ||
    tabs[0];

  const splitBrowserTab = splitTabId ? tabs.find((t) => t.id === splitTabId) || null : null;

  const openUrlInApp = useCallback(
    (url: string, title?: string) => {
      const newTab: BrowserTab = {
        id: `tab-${Date.now()}`,
        workspaceId: workspace,
        groupId: null,
        kind: 'reader',
        title: title?.slice(0, 36) || extractDomain(url),
        url,
      };
      setTabs((prev) => [...prev, newTab]);
      setActiveTabId(newTab.id);
    },
    [workspace]
  );

  const runCustomEngine = useCallback(
    (engine: CustomSearchEngine, query: string) => {
      const targetUrl = buildEngineSearchUrl(engine.urlTemplate, query || 'search');
      if (!targetUrl) return;
      if (engine.openMode === 'proxy') {
        openUrlInApp(targetUrl, `${engine.name}: ${query}`);
      } else {
        // Safe link navigation in new tab via anchor element (avoid window.open issues)
        const a = document.createElement('a');
        a.href = targetUrl;
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        a.click();
      }
    },
    [openUrlInApp]
  );

  const executeSearch = useCallback(
    async (
      rawQuery: string,
      options?: {
        tab?: SearchTab;
        provider?: SearchProviderId;
        region?: RegionCode;
        freshness?: FreshnessFilter;
        safeSearch?: SafeSearchLevel;
        skipUrlPush?: boolean;
      }
    ) => {
      const trimmedRaw = rawQuery.trim();
      if (!trimmedRaw) return;

      // Check if user triggered a custom %s engine shortcut (e.g. "!brave react")
      const firstToken = trimmedRaw.split(/\s+/)[0].toLowerCase();
      const matchedCustomEngine = customEngines.find(
        (e) => e.shortcut.toLowerCase() === firstToken
      );
      if (matchedCustomEngine) {
        const subQuery = trimmedRaw.slice(firstToken.length).trim() || 'search';
        runCustomEngine(matchedCustomEngine, subQuery);
        return;
      }

      const { cleanQuery, bang } = parseBangQuery(trimmedRaw);
      const effectiveText = cleanQuery || trimmedRaw;
      const targetTab: SearchTab = options?.tab ?? bang?.targetTab ?? activeSearchTab;
      const targetProvider = options?.provider ?? provider;
      const targetRegion = options?.region ?? region;
      const targetFreshness = options?.freshness ?? freshness;
      const targetSafeSearch = options?.safeSearch ?? safeSearch;

      if (!cleanQuery && bang && !bang.siteFilter) {
        setActiveSearchTab(targetTab);
        return;
      }

      // Ensure active tab is a search tab
      if (activeBrowserTab && activeBrowserTab.kind !== 'search') {
        const existingSearchTab = tabs.find(
          (t) => t.workspaceId === workspace && t.kind === 'search'
        );
        if (existingSearchTab) {
          setActiveTabId(existingSearchTab.id);
          setTabs((prev) =>
            prev.map((t) =>
              t.id === existingSearchTab.id ? { ...t, title: effectiveText, query: trimmedRaw } : t
            )
          );
        } else {
          const created: BrowserTab = {
            id: `tab-${Date.now()}`,
            workspaceId: workspace,
            groupId: null,
            kind: 'search',
            title: effectiveText,
            query: trimmedRaw,
          };
          setTabs((prev) => [...prev, created]);
          setActiveTabId(created.id);
        }
      } else if (activeBrowserTab) {
        setTabs((prev) =>
          prev.map((t) =>
            t.id === activeBrowserTab.id ? { ...t, title: effectiveText, query: trimmedRaw } : t
          )
        );
      }

      setQueryInput(trimmedRaw);
      setActiveQuery(effectiveText);
      setActiveSearchTab(targetTab);
      setErrorMessage(null);
      setFollowUps([]);
      setHighlightedCitation(null);

      const localTool = evaluateInstantTool(effectiveText);
      setInstantTool(localTool);

      if (!options?.skipUrlPush && typeof window !== 'undefined') {
        const params = new URLSearchParams();
        params.set('q', trimmedRaw);
        if (targetTab !== 'all') params.set('tab', targetTab);
        const nextUrl = `${window.location.pathname}?${params.toString()}`;
        window.history.pushState({ q: trimmedRaw, tab: targetTab }, '', nextUrl);
      }

      if (preferences.saveHistory) {
        setHistory((prev) => {
          const filtered = prev.filter(
            (h) => h.query.toLowerCase() !== trimmedRaw.toLowerCase()
          );
          return [
            {
              id: `hist-${Date.now()}`,
              query: trimmedRaw,
              tab: targetTab,
              timestamp: new Date().toISOString(),
            },
            ...filtered,
          ].slice(0, 30);
        });
      }

      setIsLoading(true);
      try {
        const res = await fetch('/api/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: effectiveText,
            tab: targetTab,
            provider: targetProvider,
            region: targetRegion,
            freshness: targetFreshness,
            safeSearch: targetSafeSearch,
            siteFilter: bang?.siteFilter,
            bangTrigger: bang?.trigger,
            bangLabel: bang?.label,
          }),
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Search request failed.');
        }
        setSearchResult(data as SearchResponse);
      } catch (err) {
        setErrorMessage(
          err instanceof Error ? err.message : 'Unable to reach live search backend.'
        );
      } finally {
        setIsLoading(false);
      }
    },
    [
      activeBrowserTab,
      activeSearchTab,
      customEngines,
      freshness,
      preferences.saveHistory,
      provider,
      region,
      runCustomEngine,
      safeSearch,
      tabs,
      workspace,
    ]
  );

  // Sync URL query params on mount & back/forward
  useEffect(() => {
    const syncFromUrl = () => {
      const params = new URLSearchParams(window.location.search);
      const q = params.get('q');
      const tabParam = params.get('tab') as SearchTab | null;
      const validTab: SearchTab =
        tabParam && ['all', 'images', 'news', 'videos', 'discussions'].includes(tabParam)
          ? tabParam
          : 'all';

      if (q && q.trim()) {
        void executeSearch(q, { tab: validTab, skipUrlPush: true });
      }
    };

    syncFromUrl();
    window.addEventListener('popstate', syncFromUrl);
    return () => window.removeEventListener('popstate', syncFromUrl);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleGoHome = () => {
    setActiveQuery('');
    setQueryInput('');
    setSearchResult(null);
    setInstantTool(null);
    setErrorMessage(null);
    setFollowUps([]);
    setActiveSearchTab('all');

    const wsSearchTab = tabs.find((t) => t.workspaceId === workspace && t.kind === 'search');
    if (wsSearchTab) {
      setActiveTabId(wsSearchTab.id);
    }

    if (typeof window !== 'undefined') {
      window.history.pushState({}, '', window.location.pathname);
    }
  };

  const handleChangeWorkspace = (ws: WorkspaceId) => {
    setWorkspace(ws);
    const wsTabs = tabs.filter((t) => t.workspaceId === ws);
    if (wsTabs.length > 0) {
      setActiveTabId(wsTabs[0].id);
    } else {
      const fresh: BrowserTab = {
        id: `tab-${Date.now()}`,
        workspaceId: ws,
        groupId: null,
        kind: 'search',
        title: 'New Search',
      };
      setTabs((prev) => [...prev, fresh]);
      setActiveTabId(fresh.id);
    }
    setSplitTabId(null);
  };

  const handleAddTab = (groupId: string | null = null) => {
    const newTab: BrowserTab = {
      id: `tab-${Date.now()}`,
      workspaceId: workspace,
      groupId,
      kind: 'search',
      title: 'New Tab',
    };
    setTabs((prev) => [...prev, newTab]);
    setActiveTabId(newTab.id);
    setActiveQuery('');
    setQueryInput('');
    setSearchResult(null);
  };

  const handleDeleteTab = (tabId: string) => {
    const wsTabs = tabs.filter((t) => t.workspaceId === workspace);
    const remainingAll = tabs.filter((t) => t.id !== tabId);
    const remainingWs = wsTabs.filter((t) => t.id !== tabId);

    if (remainingWs.length === 0) {
      const fallback: BrowserTab = {
        id: `tab-${Date.now()}`,
        workspaceId: workspace,
        groupId: null,
        kind: 'search',
        title: 'New Search',
      };
      setTabs([...remainingAll, fallback]);
      setActiveTabId(fallback.id);
      setActiveQuery('');
      setSearchResult(null);
    } else {
      setTabs(remainingAll);
      if (activeTabId === tabId) {
        setActiveTabId(remainingWs[0].id);
      }
    }
    if (splitTabId === tabId) {
      setSplitTabId(null);
    }
  };

  const handleToggleSplitView = () => {
    if (splitTabId) {
      setSplitTabId(null);
      return;
    }
    const wsTabs = tabs.filter((t) => t.workspaceId === workspace && t.id !== activeTabId);
    if (wsTabs.length > 0) {
      setSplitTabId(wsTabs[0].id);
    } else {
      const partner: BrowserTab = {
        id: `tab-split-${Date.now()}`,
        workspaceId: workspace,
        groupId: null,
        kind: 'reader',
        title: 'MDN PWA Guide',
        url: 'https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps',
      };
      setTabs((prev) => [...prev, partner]);
      setSplitTabId(partner.id);
    }
  };

  const handleFollowUp = async (question: string) => {
    if (!searchResult || isFollowingUp) return;
    setFollowUps((prev) => [
      ...prev,
      { id: `fu-u-${Date.now()}`, role: 'user', content: question },
    ]);
    setIsFollowingUp(true);
    try {
      const res = await fetch('/api/search/followup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          originalQuery: searchResult.query,
          answerContext: searchResult.aiSummary,
          followUpQuery: question,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Follow-up failed.');
      setFollowUps((prev) => [
        ...prev,
        {
          id: `fu-a-${Date.now()}`,
          role: 'assistant',
          content: data.answer,
          sources: data.sources,
        },
      ]);
    } catch (err) {
      setFollowUps((prev) => [
        ...prev,
        {
          id: `fu-e-${Date.now()}`,
          role: 'assistant',
          content: err instanceof Error ? err.message : 'Unable to answer follow-up.',
        },
      ]);
    } finally {
      setIsFollowingUp(false);
    }
  };

  const handleCiteClick = (index: number) => {
    setHighlightedCitation(index);
    const el = document.getElementById(`source-${index}`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const handleToggleBookmark = (item: SearchResultItem) => {
    setBookmarks((prev) => {
      const exists = prev.some((b) => b.url === item.url);
      if (exists) return prev.filter((b) => b.url !== item.url);
      return [
        {
          id: item.id,
          title: item.title,
          url: item.url,
          domain: item.domain,
          snippet: item.snippet,
          savedAt: new Date().toISOString(),
        },
        ...prev,
      ];
    });
  };

  const handleTogglePin = (title: string, url: string) => {
    setPinnedSites((prev) => {
      const exists = prev.some((p) => p.workspaceId === workspace && p.url === url);
      if (exists) {
        return prev.filter((p) => !(p.workspaceId === workspace && p.url === url));
      }
      return [
        {
          id: `pin-${Date.now()}`,
          workspaceId: workspace,
          title,
          url,
          domain: extractDomain(url),
        },
        ...prev,
      ];
    });
  };

  const handleDownloadPage = (page: ProxyPageData) => {
    const md = `# ${page.title}\n\nSource: ${page.url}\n\n${page.sections
      .map((s) => (s.tag.startsWith('h') ? `## ${s.text}` : s.text))
      .join('\n\n')}`;
    const filename = `${page.domain.replace(/[^a-z0-9.-]/gi, '_')}-snapshot.md`;
    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    const dlUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = dlUrl;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(dlUrl);

    const record: DownloadItem = {
      id: `dl-${Date.now()}`,
      filename,
      sourceUrl: page.url,
      format: 'markdown',
      sizeBytes: blob.size,
      content: md,
      createdAt: new Date().toISOString(),
    };
    setDownloads((prev) => [record, ...prev]);
  };

  const handleDownloadExtensionZip = () => {
    const origin = window.location.origin;
    const downloadUrl = `/api/extension/download?origin=${encodeURIComponent(origin)}`;
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = 'axiom-search-extension.zip';
    a.click();

    setDownloads((prev) => [
      {
        id: `dl-ext-${Date.now()}`,
        filename: 'axiom-search-extension.zip',
        sourceUrl: origin,
        format: 'zip',
        sizeBytes: 18400,
        createdAt: new Date().toISOString(),
      },
      ...prev,
    ]);
  };

  const handleRedownload = (item: DownloadItem) => {
    if (item.format === 'zip') {
      handleDownloadExtensionZip();
      return;
    }
    if (!item.content) return;
    const blob = new Blob([item.content], { type: 'text/markdown;charset=utf-8' });
    const dlUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = dlUrl;
    a.download = item.filename;
    a.click();
    URL.revokeObjectURL(dlUrl);
  };

  const handleUpdatePreferences = (patch: Partial<UserPreferences>) => {
    setPreferences((prev) => {
      const next = { ...prev, ...patch };
      if (patch.safeSearch) setSafeSearch(patch.safeSearch);
      if (patch.defaultRegion) setRegion(patch.defaultRegion);
      if (patch.defaultProvider) setProvider(patch.defaultProvider);
      if (typeof patch.autoAiAnswer === 'boolean') setShowAiAnswer(patch.autoAiAnswer);
      return next;
    });
  };

  const handleInstallAppClick = async () => {
    if (isInstallable) {
      await install();
    } else {
      setIsExtensionOpen(true);
    }
  };

  const workspacePins = pinnedSites.filter((p) => p.workspaceId === workspace);

  const renderTabContent = (tabItem: BrowserTab | undefined) => {
    if (!tabItem) return null;

    if (tabItem.kind === 'reader' && tabItem.url) {
      const isPinned = workspacePins.some((p) => p.url === tabItem.url);
      return (
        <div className="mx-auto max-w-[1200px] px-4 sm:px-6 py-5 flex-1 w-full">
          <ProxyReaderView
            url={tabItem.url}
            adBlockerEnabled={preferences.adBlockerEnabled}
            onToggleAdBlocker={() =>
              handleUpdatePreferences({ adBlockerEnabled: !preferences.adBlockerEnabled })
            }
            viewportMode={preferences.viewportMode}
            onChangeViewportMode={(mode) => handleUpdatePreferences({ viewportMode: mode })}
            textZoom={preferences.textZoom}
            onChangeTextZoom={(zoom) => handleUpdatePreferences({ textZoom: zoom })}
            isPinned={isPinned}
            onTogglePin={handleTogglePin}
            notes={notes}
            onAddNote={(url, pageTitle, noteText, highlightText) =>
              setNotes((prev) => [
                {
                  id: `note-${Date.now()}`,
                  url,
                  pageTitle,
                  noteText,
                  highlightText,
                  createdAt: new Date().toISOString(),
                },
                ...prev,
              ])
            }
            onDeleteNote={(id) => setNotes((prev) => prev.filter((n) => n.id !== id))}
            onDownloadPage={handleDownloadPage}
            onOpenUrlInApp={openUrlInApp}
            onAskAssistant={(page) => {
              setAssistantPageContext(page);
              setIsAssistantOpen(true);
            }}
          />
        </div>
      );
    }

    // Search Tab Content
    const hasActiveSearch = Boolean(activeQuery);
    if (!hasActiveSearch) {
      return (
        <SearchLanding
          query={queryInput}
          onQueryChange={setQueryInput}
          onSearch={(override) => void executeSearch(override ?? queryInput)}
          provider={provider}
          onProviderChange={setProvider}
          history={history}
          onRemoveHistoryItem={(id) =>
            setHistory((prev) => prev.filter((h) => h.id !== id))
          }
          pinnedSites={workspacePins}
          onOpenUrlInApp={openUrlInApp}
          onAddPinnedSite={(title, url) => handleTogglePin(title, url)}
          onRemovePinnedSite={(id) =>
            setPinnedSites((prev) => prev.filter((p) => p.id !== id))
          }
          customEngines={customEngines}
          onRunCustomEngine={runCustomEngine}
          onOpenOwnIndex={() => setIsOwnIndexOpen(true)}
          isLoading={isLoading}
        />
      );
    }

    return (
      <>
        <SerpHeader
          query={queryInput}
          onQueryChange={setQueryInput}
          onSearch={(override) => void executeSearch(override ?? queryInput)}
          history={history}
          onRemoveHistoryItem={(id) =>
            setHistory((prev) => prev.filter((h) => h.id !== id))
          }
          isLoading={isLoading}
          activeTab={activeSearchTab}
          onTabChange={(nextTab) => {
            setActiveSearchTab(nextTab);
            if (activeQuery) void executeSearch(queryInput || activeQuery, { tab: nextTab });
          }}
          provider={provider}
          onProviderChange={(nextProvider) => {
            setProvider(nextProvider);
            if (activeQuery)
              void executeSearch(queryInput || activeQuery, { provider: nextProvider });
          }}
          region={region}
          onRegionChange={(nextRegion) => {
            setRegion(nextRegion);
            if (activeQuery) void executeSearch(queryInput || activeQuery, { region: nextRegion });
          }}
          freshness={freshness}
          onFreshnessChange={(nextFreshness) => {
            setFreshness(nextFreshness);
            if (activeQuery)
              void executeSearch(queryInput || activeQuery, { freshness: nextFreshness });
          }}
          safeSearch={safeSearch}
          onSafeSearchChange={(nextSafe) => {
            setSafeSearch(nextSafe);
            if (activeQuery)
              void executeSearch(queryInput || activeQuery, { safeSearch: nextSafe });
          }}
          showAiAnswer={showAiAnswer}
          onToggleAiAnswer={() => setShowAiAnswer((v) => !v)}
          customEngines={customEngines}
          onRunCustomEngine={runCustomEngine}
          searchTimeMs={searchResult?.searchTimeMs}
        />

        <main className="relative z-10 flex-1 w-full">
          <div className="mx-auto max-w-[1200px] px-4 sm:px-6 py-7">
            {searchResult?.providerStatusNote && !isLoading && (
              <div className="mb-4 rounded-lg border border-neutral-200 dark:border-white/15 bg-neutral-50/80 dark:bg-white/[0.04] px-4 py-2 text-xs text-neutral-600 dark:text-neutral-300">
                {searchResult.providerStatusNote}
              </div>
            )}

            {searchResult?.bangApplied && !isLoading && (
              <div className="mb-5 flex items-center justify-between gap-4 rounded-lg border border-neutral-200 dark:border-white/12 bg-neutral-50/80 dark:bg-white/[0.03] px-4 py-2 text-xs text-neutral-600 dark:text-neutral-300">
                <span>
                  Scoped with{' '}
                  <span className="font-mono font-semibold text-neutral-950 dark:text-white">
                    {searchResult.bangApplied.trigger}
                  </span>{' '}
                  ({searchResult.bangApplied.label}
                  {searchResult.bangApplied.siteFilter
                    ? ` · ${searchResult.bangApplied.siteFilter}`
                    : ''}
                  )
                </span>
                <button
                  type="button"
                  onClick={() => void executeSearch(searchResult.query)}
                  className="underline underline-offset-2 hover:text-neutral-950 dark:hover:text-white"
                >
                  Search entire web
                </button>
              </div>
            )}

            {errorMessage && (
              <div
                role="alert"
                className="mb-6 flex flex-col gap-3 rounded-xl border border-neutral-300 dark:border-white/20 bg-neutral-100/90 dark:bg-neutral-950/90 p-4 text-sm text-neutral-900 dark:text-neutral-100"
              >
                <div className="flex items-start gap-2.5">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-neutral-700 dark:text-neutral-300" />
                  <span>{errorMessage}</span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => void executeSearch(queryInput || activeQuery)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-neutral-950 text-white dark:bg-white dark:text-black text-xs font-medium shrink-0"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    <span>Retry</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setProvider('own');
                      void executeSearch(queryInput || activeQuery, { provider: 'own' });
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-neutral-300 dark:border-white/20 text-xs font-medium hover:border-neutral-950 dark:hover:border-white"
                  >
                    <span>Search Own Index</span>
                  </button>

                  {customEngines[0] && (
                    <button
                      type="button"
                      onClick={() => runCustomEngine(customEngines[0], queryInput || activeQuery)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-neutral-300 dark:border-white/20 text-xs font-medium hover:border-neutral-950 dark:hover:border-white"
                    >
                      <span>Open in {customEngines[0].name}</span>
                    </button>
                  )}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              <div className="lg:col-span-8 min-w-0">
                {instantTool && <InstantToolCard tool={instantTool} />}

                {isLoading ? (
                  <div className="space-y-6" aria-label="Loading search results">
                    {showAiAnswer && activeSearchTab === 'all' && (
                      <div className="rounded-xl border border-neutral-200 dark:border-white/10 bg-white/70 dark:bg-neutral-950/70 p-5 space-y-3 animate-pulse">
                        <div className="h-4 w-32 rounded bg-neutral-200 dark:bg-white/10" />
                        <div className="h-3.5 w-full rounded bg-neutral-200 dark:bg-white/10" />
                        <div className="h-3.5 w-11/12 rounded bg-neutral-200 dark:bg-white/10" />
                      </div>
                    )}
                    {Array.from({ length: 5 }).map((_, idx) => (
                      <div key={idx} className="space-y-2 py-2 animate-pulse">
                        <div className="h-3 w-48 rounded bg-neutral-200 dark:bg-white/10" />
                        <div className="h-5 w-3/4 rounded bg-neutral-200 dark:bg-white/10" />
                        <div className="h-3.5 w-full rounded bg-neutral-200 dark:bg-white/10" />
                      </div>
                    ))}
                  </div>
                ) : (
                  searchResult && (
                    <>
                      {showAiAnswer && activeSearchTab === 'all' && searchResult.aiSummary && (
                        <AiAnswerCard
                          query={searchResult.query}
                          summary={searchResult.aiSummary}
                          sources={searchResult.sources}
                          followUps={followUps}
                          isFollowingUp={isFollowingUp}
                          onFollowUp={(q) => void handleFollowUp(q)}
                          onCiteClick={handleCiteClick}
                        />
                      )}

                      <ResultsList
                        tab={activeSearchTab}
                        results={searchResult.results}
                        discussions={searchResult.discussions}
                        relatedQueries={searchResult.relatedQueries}
                        highlightedCitation={highlightedCitation}
                        bookmarks={bookmarks}
                        pinnedSites={workspacePins}
                        onToggleBookmark={handleToggleBookmark}
                        onTogglePin={handleTogglePin}
                        onOpenInApp={openUrlInApp}
                        onSelectRelatedQuery={(rq) => void executeSearch(rq)}
                      />
                    </>
                  )
                )}
              </div>

              <div className="lg:col-span-4 space-y-6">
                {isLoading ? (
                  <div className="rounded-xl border border-neutral-200 dark:border-white/10 bg-white/70 dark:bg-neutral-950/70 p-5 space-y-3 animate-pulse">
                    <div className="h-6 w-2/3 rounded bg-neutral-200 dark:bg-white/10" />
                    <div className="h-3 w-1/3 rounded bg-neutral-200 dark:bg-white/10" />
                    <div className="h-16 w-full rounded bg-neutral-200 dark:bg-white/10" />
                  </div>
                ) : (
                  searchResult?.infobox && <InfoboxPanel infobox={searchResult.infobox} />
                )}
              </div>
            </div>
          </div>
        </main>
      </>
    );
  };

  return (
    <div className="relative min-h-screen flex flex-col bg-white text-neutral-950 dark:bg-black dark:text-neutral-50 transition-colors duration-200">
      <LiveMonochromeCanvas theme={preferences.theme} motionMode={preferences.motionMode} />

      <TopBar
        onGoHome={handleGoHome}
        onOpenOwnIndex={() => setIsOwnIndexOpen(true)}
        onOpenBangs={() => setIsBangsOpen(true)}
        onOpenExtension={() => setIsExtensionOpen(true)}
        onOpenPreferences={() => setIsPrefsOpen(true)}
        onInstallApp={() => void handleInstallAppClick()}
        isInstalled={isInstalled}
      />

      <WorkspaceTabStrip
        workspace={workspace}
        onChangeWorkspace={handleChangeWorkspace}
        tabs={tabs}
        activeTabId={activeBrowserTab?.id || ''}
        splitTabId={splitTabId}
        groups={tabGroups}
        onSelectTab={(tabId) => {
          setActiveTabId(tabId);
          const found = tabs.find((t) => t.id === tabId);
          if (found?.kind === 'search' && found.query) {
            void executeSearch(found.query, { skipUrlPush: true });
          }
        }}
        onAddTab={handleAddTab}
        onDeleteTab={handleDeleteTab}
        onAssignTabGroup={(tabId, gid) =>
          setTabs((prev) => prev.map((t) => (t.id === tabId ? { ...t, groupId: gid } : t)))
        }
        onAddGroup={(name) =>
          setTabGroups((prev) => [
            ...prev,
            { id: `grp-${Date.now()}`, workspaceId: workspace, name, collapsed: false },
          ])
        }
        onToggleGroupCollapse={(gid) =>
          setTabGroups((prev) =>
            prev.map((g) => (g.id === gid ? { ...g, collapsed: !g.collapsed } : g))
          )
        }
        onDeleteGroup={(gid) => {
          setTabGroups((prev) => prev.filter((g) => g.id !== gid));
          setTabs((prev) => prev.map((t) => (t.groupId === gid ? { ...t, groupId: null } : t)));
        }}
        onToggleSplitView={handleToggleSplitView}
        onOpenDownloads={() => setIsDownloadsOpen(true)}
        downloadsCount={downloads.length}
        onOpenAssistant={() => {
          setAssistantPageContext(null);
          setIsAssistantOpen(true);
        }}
        virtualMousePad={preferences.virtualMousePad}
        onToggleVirtualMousePad={() =>
          handleUpdatePreferences({ virtualMousePad: !preferences.virtualMousePad })
        }
        onOpenSettings={() => setIsPrefsOpen(true)}
      />

      {/* Split View or Single Active Tab */}
      {splitBrowserTab ? (
        <div className="relative z-10 flex-1 grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-neutral-200 dark:divide-white/10">
          <div className="flex flex-col min-w-0 overflow-hidden">
            {renderTabContent(activeBrowserTab)}
          </div>
          <div className="flex flex-col min-w-0 overflow-hidden">
            {renderTabContent(splitBrowserTab)}
          </div>
        </div>
      ) : (
        <div className="relative z-10 flex-1 flex flex-col">
          {renderTabContent(activeBrowserTab)}
        </div>
      )}

      <footer className="relative z-10 border-t border-neutral-200/80 dark:border-white/10 bg-white/70 dark:bg-black/70 backdrop-blur-md">
        <div className="mx-auto max-w-[1200px] px-4 sm:px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-neutral-500">
          <span>Axiom Search · Installable PWA & Browser Workspace</span>
          <div className="flex flex-wrap items-center gap-4">
            <button
              type="button"
              onClick={() => setIsOwnIndexOpen(true)}
              className="hover:text-neutral-950 dark:hover:text-white transition-colors"
            >
              Own Index & %s Engines
            </button>
            <button
              type="button"
              onClick={() => setIsExtensionOpen(true)}
              className="hover:text-neutral-950 dark:hover:text-white transition-colors"
            >
              Browser Extension
            </button>
            <button
              type="button"
              onClick={() => setIsPrefsOpen(true)}
              className="hover:text-neutral-950 dark:hover:text-white transition-colors"
            >
              Settings
            </button>
          </div>
        </div>
      </footer>

      <PreferencesDrawer
        isOpen={isPrefsOpen}
        onClose={() => setIsPrefsOpen(false)}
        preferences={preferences}
        onUpdatePreferences={handleUpdatePreferences}
        bookmarks={bookmarks}
        onRemoveBookmark={(url) =>
          setBookmarks((prev) => prev.filter((b) => b.url !== url))
        }
        onOpenUrlInApp={openUrlInApp}
        history={history}
        onSelectHistoryQuery={(q) => void executeSearch(q)}
        onClearHistory={() => setHistory([])}
      />

      <BangsModal
        isOpen={isBangsOpen}
        onClose={() => setIsBangsOpen(false)}
        onTryBang={(example) => void executeSearch(example)}
      />

      <OwnIndexModal
        isOpen={isOwnIndexOpen}
        onClose={() => setIsOwnIndexOpen(false)}
        customEngines={customEngines}
        onAddCustomEngine={(eng) =>
          setCustomEngines((prev) => [...prev, { ...eng, id: `eng-${Date.now()}` }])
        }
        onDeleteCustomEngine={(id) =>
          setCustomEngines((prev) => prev.filter((e) => e.id !== id))
        }
        onSearchOwnIndex={(q) => {
          setProvider('own');
          void executeSearch(q, { provider: 'own' });
        }}
        onRunCustomEngine={runCustomEngine}
      />

      <AiAssistantPanel
        isOpen={isAssistantOpen}
        onClose={() => setIsAssistantOpen(false)}
        activePageContext={assistantPageContext}
      />

      <DownloadsModal
        isOpen={isDownloadsOpen}
        onClose={() => setIsDownloadsOpen(false)}
        downloads={downloads}
        onRedownload={handleRedownload}
        onDeleteDownload={(id) => setDownloads((prev) => prev.filter((d) => d.id !== id))}
        onClearDownloads={() => setDownloads([])}
      />

      <ExtensionModal
        isOpen={isExtensionOpen}
        onClose={() => setIsExtensionOpen(false)}
        onDownloadExtensionZip={handleDownloadExtensionZip}
        onInstallPwa={() => void install()}
        isInstallable={isInstallable}
        isInstalled={isInstalled}
      />

      <VirtualMousePad
        enabled={preferences.virtualMousePad}
        onClose={() => handleUpdatePreferences({ virtualMousePad: false })}
      />

      <OfflineIndicator />
    </div>
  );
}
