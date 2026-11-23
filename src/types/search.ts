export type SearchTab = 'all' | 'images' | 'news' | 'videos' | 'discussions';

export type SearchProviderId = 'axiom' | 'brave' | 'bing' | 'own' | 'all_combined';

export type RegionCode = 'all' | 'us' | 'gb' | 'my' | 'sg' | 'jp' | 'de';

export type FreshnessFilter = 'any' | 'day' | 'week' | 'month' | 'year';

export type SafeSearchLevel = 'strict' | 'moderate' | 'off';

export type MotionMode = 'full' | 'subtle' | 'off';

export type ThemeMode = 'dark' | 'light';

export type WorkspaceId = 'work' | 'personal' | 'study';

export type ReaderViewportMode = 'desktop' | 'mobile';

export interface GroundingSource {
  index: number;
  title: string;
  url: string;
  domain: string;
}

export interface SearchResultItem {
  id: string;
  title: string;
  url: string;
  domain: string;
  breadcrumb: string;
  snippet: string;
  publishedAt?: string;
  sourceName?: string;
  kind: 'web' | 'news' | 'image' | 'video' | 'discussion';
  citationIndex?: number;
  metaLabel?: string;
  providerBadge?: string;
}

export interface InfoboxFact {
  label: string;
  value: string;
}

export interface InfoboxData {
  title: string;
  subtitle: string;
  description: string;
  officialUrl?: string;
  facts: InfoboxFact[];
}

export interface DiscussionItem {
  id: string;
  platform: string;
  title: string;
  url: string;
  domain: string;
  snippet: string;
  meta?: string;
}

export interface SearchResponse {
  query: string;
  effectiveQuery: string;
  tab: SearchTab;
  provider: SearchProviderId;
  providerStatusNote?: string;
  aiSummary: string;
  sources: GroundingSource[];
  results: SearchResultItem[];
  discussions: DiscussionItem[];
  infobox: InfoboxData | null;
  relatedQueries: string[];
  searchTimeMs: number;
  bangApplied?: {
    trigger: string;
    label: string;
    siteFilter?: string;
  } | null;
}

export interface FollowUpMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: GroundingSource[];
}

export interface BangDefinition {
  trigger: string;
  label: string;
  description: string;
  siteFilter?: string;
  targetTab?: SearchTab;
}

export interface CustomSearchEngine {
  id: string;
  name: string;
  shortcut: string;
  urlTemplate: string;
  openMode: 'proxy' | 'external';
  isDefault?: boolean;
}

export interface OwnIndexEntry {
  id: string;
  title: string;
  url: string;
  domain: string;
  snippet: string;
  tags: string[];
  createdAt: string;
}

export interface BookmarkItem {
  id: string;
  title: string;
  url: string;
  domain: string;
  snippet: string;
  savedAt: string;
}

export interface HistoryEntry {
  id: string;
  query: string;
  tab: SearchTab;
  timestamp: string;
}

export interface PinnedSite {
  id: string;
  workspaceId: WorkspaceId;
  title: string;
  url: string;
  domain: string;
}

export interface TabGroup {
  id: string;
  workspaceId: WorkspaceId;
  name: string;
  collapsed: boolean;
}

export interface BrowserTab {
  id: string;
  workspaceId: WorkspaceId;
  groupId: string | null;
  kind: 'search' | 'reader' | 'assistant' | 'index';
  title: string;
  query?: string;
  url?: string;
}

export interface ProxyLinkItem {
  text: string;
  href: string;
}

export interface ProxySectionItem {
  tag: 'h1' | 'h2' | 'h3' | 'p' | 'li' | 'blockquote';
  text: string;
}

export interface ProxyPageData {
  url: string;
  domain: string;
  title: string;
  description: string;
  readingTimeMin: number;
  blockedAdsCount: number;
  blockedDomains: string[];
  sections: ProxySectionItem[];
  links: ProxyLinkItem[];
  fetchedAt: string;
}

export interface PageNote {
  id: string;
  url: string;
  pageTitle: string;
  highlightText?: string;
  noteText: string;
  createdAt: string;
}

export interface DownloadItem {
  id: string;
  filename: string;
  sourceUrl: string;
  format: 'markdown' | 'html' | 'zip' | 'json';
  sizeBytes: number;
  content?: string;
  createdAt: string;
}

export interface UserPreferences {
  theme: ThemeMode;
  motionMode: MotionMode;
  safeSearch: SafeSearchLevel;
  defaultRegion: RegionCode;
  defaultProvider: SearchProviderId;
  autoAiAnswer: boolean;
  saveHistory: boolean;
  adBlockerEnabled: boolean;
  virtualMousePad: boolean;
  textZoom: number;
  viewportMode: ReaderViewportMode;
}

export interface InstantToolResult {
  type: 'calculator' | 'converter' | 'color' | 'time';
  title: string;
  inputDisplay: string;
  outputDisplay: string;
  detail?: string;
  colorHex?: string;
}
