import express from 'express';
import fs from 'fs';
import dns from 'dns/promises';
import net from 'net';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import * as cheerio from 'cheerio';
import JSZip from 'jszip';
import { GoogleGenAI, ThinkingLevel } from '@google/genai';
import type {
  DiscussionItem,
  FreshnessFilter,
  GroundingSource,
  InfoboxData,
  OwnIndexEntry,
  ProxyLinkItem,
  ProxyPageData,
  ProxySectionItem,
  RegionCode,
  SafeSearchLevel,
  SearchProviderId,
  SearchResponse,
  SearchResultItem,
  SearchTab,
} from './src/types/search.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = Number(process.env.PORT || 3000);
const DATA_DIR = path.resolve(__dirname, 'data');
const INDEX_FILE = path.join(DATA_DIR, 'custom-index.json');

const VALID_TABS = new Set<SearchTab>(['all', 'images', 'news', 'videos', 'discussions']);
const VALID_PROVIDERS = new Set<SearchProviderId>(['axiom', 'brave', 'bing', 'own', 'all_combined']);
const VALID_REGIONS = new Set<RegionCode>(['all', 'us', 'gb', 'my', 'sg', 'jp', 'de']);
const VALID_FRESHNESS = new Set<FreshnessFilter>(['any', 'day', 'week', 'month', 'year']);
const VALID_SAFE_SEARCH = new Set<SafeSearchLevel>(['strict', 'moderate', 'off']);

const REGION_LABELS: Record<RegionCode, string> = {
  all: 'Global (All Regions)',
  us: 'United States',
  gb: 'United Kingdom',
  my: 'Malaysia',
  sg: 'Singapore',
  jp: 'Japan',
  de: 'Germany',
};

const FRESHNESS_LABELS: Record<FreshnessFilter, string> = {
  any: 'Any time',
  day: 'Past 24 hours',
  week: 'Past week',
  month: 'Past month',
  year: 'Past year',
};

const AD_TRACKER_DOMAINS = [
  'doubleclick.net',
  'googlesyndication.com',
  'googleadservices.com',
  'google-analytics.com',
  'googletagmanager.com',
  'adservice.google.com',
  'taboola.com',
  'outbrain.com',
  'criteo.com',
  'pubmatic.com',
  'rubiconproject.com',
  'adnxs.com',
  'amazon-adsystem.com',
  'scorecardresearch.com',
  'hotjar.com',
  'mixpanel.com',
  'connect.facebook.net',
  'ads-twitter.com',
  'quantserve.com',
  'zedo.com',
];

function getAiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    throw new Error('GEMINI_API_KEY is not configured. Add it in Settings > Secrets.');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function parseGeminiError(error: unknown): { status: number; message: string } {
  const raw = error instanceof Error ? error.message : String(error ?? '');
  const lower = raw.toLowerCase();

  if (lower.includes('429') || lower.includes('resource_exhausted') || lower.includes('quota')) {
    return {
      status: 429,
      message:
        'Gemini API quota limit reached (429). Please check your plan/rate limits or select a billing-enabled API key in Settings > Secrets, or switch to Own Index / Brave / Bing.',
    };
  }
  if (lower.includes('403') || lower.includes('permission_denied') || lower.includes('api_key_invalid') || lower.includes('api key')) {
    return {
      status: 403,
      message:
        'Gemini API key is invalid or unauthorized. Please check GEMINI_API_KEY in Settings > Secrets.',
    };
  }
  if (lower.includes('404') || lower.includes('not_found')) {
    return {
      status: 404,
      message: 'Requested Gemini search model was not found.',
    };
  }
  return {
    status: 500,
    message: raw || 'Unable to complete AI search request.',
  };
}

function isSafeHttpUrl(rawUrl: unknown): rawUrl is string {
  if (typeof rawUrl !== 'string') return false;
  const trimmed = rawUrl.trim();
  if (!trimmed) return false;
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

function isPrivateOrBlockedIp(ip: string): boolean {
  if (net.isIPv4(ip)) {
    const parts = ip.split('.').map(Number);
    if (parts.length !== 4 || parts.some((n) => Number.isNaN(n))) return true;
    const [a, b] = parts;
    if (a === 0) return true; // 0.0.0.0/8
    if (a === 10) return true; // 10.0.0.0/8
    if (a === 127) return true; // 127.0.0.0/8 loopback
    if (a === 169 && b === 254) return true; // 169.254.0.0/16 link-local / metadata
    if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12
    if (a === 192 && b === 168) return true; // 192.168.0.0/16
    if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
    if (a >= 224) return true; // multicast/reserved
    return false;
  }

  if (net.isIPv6(ip)) {
    const norm = ip.toLowerCase();
    if (norm === '::' || norm === '::1') return true;
    if (norm.startsWith('fe80:') || norm.startsWith('fc') || norm.startsWith('fd')) return true;
    if (norm.startsWith('::ffff:')) {
      const v4 = norm.replace('::ffff:', '');
      return isPrivateOrBlockedIp(v4);
    }
    return false;
  }

  return true;
}

async function assertPublicExternalUrl(rawUrl: string): Promise<URL> {
  if (!isSafeHttpUrl(rawUrl)) {
    throw new Error('Only http:// and https:// URLs are allowed.');
  }
  const parsed = new URL(rawUrl.trim());
  const host = parsed.hostname.toLowerCase();

  if (
    host === 'localhost' ||
    host.endsWith('.localhost') ||
    host.endsWith('.local') ||
    host.endsWith('.internal')
  ) {
    throw new Error('Local and internal hostnames are blocked.');
  }

  if (net.isIP(host)) {
    if (isPrivateOrBlockedIp(host)) {
      throw new Error('Private or loopback IP addresses are blocked.');
    }
    return parsed;
  }

  const records = await dns.lookup(host, { all: true });
  if (!records || records.length === 0) {
    throw new Error('Unable to resolve target domain.');
  }
  for (const rec of records) {
    if (isPrivateOrBlockedIp(rec.address)) {
      throw new Error('Target domain resolves to a restricted private IP.');
    }
  }
  return parsed;
}

async function safeExternalFetch(rawUrl: string, maxRedirects = 3): Promise<{ finalUrl: string; html: string }> {
  let currentUrl = rawUrl;

  for (let hop = 0; hop <= maxRedirects; hop++) {
    const validatedUrl = await assertPublicExternalUrl(currentUrl);
    const response = await fetch(validatedUrl.toString(), {
      method: 'GET',
      redirect: 'manual',
      signal: AbortSignal.timeout(10000),
      headers: {
        'User-Agent':
          'Mozilla/5.0 (compatible; AxiomSearchReader/1.0; +https://github.com/axiom-search)',
        Accept: 'text/html,application/xhtml+xml,text/plain;q=0.9,*/*;q=0.8',
      },
    });

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location');
      if (!location) {
        throw new Error('Redirect response missing location header.');
      }
      currentUrl = new URL(location, validatedUrl).toString();
      continue;
    }

    if (!response.ok) {
      throw new Error(`Target site responded with HTTP ${response.status}.`);
    }

    const contentLength = Number(response.headers.get('content-length') || '0');
    if (contentLength > 2_500_000) {
      throw new Error('Target page exceeds the 2.5MB reader limit.');
    }

    const text = await response.text();
    if (text.length > 2_500_000) {
      return { finalUrl: validatedUrl.toString(), html: text.slice(0, 2_500_000) };
    }
    return { finalUrl: validatedUrl.toString(), html: text };
  }

  throw new Error('Too many redirects from target site.');
}

function extractDomain(rawUrl: string): string {
  try {
    return new URL(rawUrl).hostname.replace(/^www\./, '');
  } catch {
    return 'web';
  }
}

function buildBreadcrumb(rawUrl: string): string {
  try {
    const parsed = new URL(rawUrl);
    const domain = parsed.hostname.replace(/^www\./, '');
    const parts = parsed.pathname
      .split('/')
      .filter(Boolean)
      .slice(0, 3)
      .map((part) => {
        try {
          return decodeURIComponent(part).slice(0, 28);
        } catch {
          return part.slice(0, 28);
        }
      });
    return parts.length > 0 ? `${domain} › ${parts.join(' › ')}` : domain;
  } catch {
    return rawUrl;
  }
}

function stripHtmlAndEntities(raw: string | undefined): string {
  if (!raw) return '';
  const $ = cheerio.load(raw, null, false);
  $('script, style').remove();
  return $.text().replace(/\s+/g, ' ').trim();
}

function ensureOwnIndexStore(): OwnIndexEntry[] {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(INDEX_FILE)) {
    const starter: OwnIndexEntry[] = [
      {
        id: 'idx-1',
        title: 'Brave Search Official Documentation & API',
        url: 'https://brave.com/search/api/',
        domain: 'brave.com',
        snippet: 'Independent web search index and REST API for developers building privacy-first search experiences.',
        tags: ['search', 'api', 'brave'],
        createdAt: new Date().toISOString(),
      },
      {
        id: 'idx-2',
        title: 'MDN Web Docs — Progressive Web Apps (PWAs)',
        url: 'https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps',
        domain: 'developer.mozilla.org',
        snippet: 'Comprehensive guide to service workers, web app manifests, offline storage, and installable web apps.',
        tags: ['pwa', 'web', 'mdn'],
        createdAt: new Date().toISOString(),
      },
      {
        id: 'idx-3',
        title: 'Chrome Extensions — Manifest V3 Search Provider',
        url: 'https://developer.chrome.com/docs/extensions/reference/manifest',
        domain: 'developer.chrome.com',
        snippet: 'Documentation for building Manifest V3 browser extensions with omnibox, popup, and search provider overrides.',
        tags: ['extension', 'chrome', 'manifest'],
        createdAt: new Date().toISOString(),
      },
    ];
    fs.writeFileSync(INDEX_FILE, JSON.stringify(starter, null, 2), 'utf-8');
    return starter;
  }

  try {
    const raw = fs.readFileSync(INDEX_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as OwnIndexEntry[]) : [];
  } catch {
    return [];
  }
}

function saveOwnIndexStore(entries: OwnIndexEntry[]): void {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(INDEX_FILE, JSON.stringify(entries, null, 2), 'utf-8');
}

function searchOwnIndex(query: string): SearchResultItem[] {
  const entries = ensureOwnIndexStore();
  const tokens = query
    .toLowerCase()
    .split(/\s+/)
    .filter((t) => t.length > 0);
  if (tokens.length === 0) return [];

  const scored = entries
    .map((entry) => {
      const haystack = `${entry.title} ${entry.url} ${entry.snippet} ${entry.tags.join(' ')}`.toLowerCase();
      let score = 0;
      for (const tok of tokens) {
        if (entry.title.toLowerCase().includes(tok)) score += 4;
        if (entry.tags.some((tag) => tag.toLowerCase().includes(tok))) score += 3;
        if (haystack.includes(tok)) score += 1;
      }
      return { entry, score };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score);

  return scored.map(({ entry }, idx) => ({
    id: `own-${entry.id}-${idx}`,
    title: entry.title,
    url: entry.url,
    domain: entry.domain,
    breadcrumb: buildBreadcrumb(entry.url),
    snippet: entry.snippet,
    publishedAt: entry.createdAt.slice(0, 10),
    sourceName: 'Own Search Index',
    kind: 'web',
    providerBadge: 'Own Index',
    metaLabel: entry.tags.length > 0 ? `Tags: ${entry.tags.join(', ')}` : undefined,
  }));
}

async function fetchBraveSearchApi(
  query: string,
  region: RegionCode,
  freshness: FreshnessFilter,
  safeSearch: SafeSearchLevel,
  tab: SearchTab = 'all'
): Promise<{ results: SearchResultItem[]; note?: string }> {
  const apiKey = process.env.BRAVE_SEARCH_API_KEY?.trim();
  if (!apiKey) {
    return {
      results: [],
      note: 'BRAVE_SEARCH_API_KEY is not configured in Settings > Secrets. Using Axiom live web search.',
    };
  }

  const params = new URLSearchParams({ q: query, count: '10', safesearch: safeSearch });
  if (region !== 'all') params.set('country', region.toUpperCase());
  const freshnessMap: Record<FreshnessFilter, string> = {
    any: '',
    day: 'pd',
    week: 'pw',
    month: 'pm',
    year: 'py',
  };
  if (freshnessMap[freshness]) params.set('freshness', freshnessMap[freshness]);

  const res = await fetch(`https://api.search.brave.com/res/v1/web/search?${params.toString()}`, {
    headers: {
      Accept: 'application/json',
      'X-Subscription-Token': apiKey,
    },
    signal: AbortSignal.timeout(8000),
  });

  if (!res.ok) {
    return {
      results: [],
      note: `Brave Search API returned HTTP ${res.status}.`,
    };
  }

  const data = (await res.json()) as {
    web?: {
      results?: Array<{
        title?: string;
        url?: string;
        description?: string;
        age?: string;
      }>;
    };
  };

  const rawList = data?.web?.results ?? [];
  const results: SearchResultItem[] = rawList
    .filter((item) => isSafeHttpUrl(item.url) && stripHtmlAndEntities(item.title).length > 0)
    .map((item, idx) => {
      const cleanUrl = item.url!.trim();
      const domain = extractDomain(cleanUrl);
      return {
        id: `brave-${idx + 1}`,
        title: stripHtmlAndEntities(item.title),
        url: cleanUrl,
        domain,
        breadcrumb: buildBreadcrumb(cleanUrl),
        snippet: stripHtmlAndEntities(item.description),
        publishedAt: stripHtmlAndEntities(item.age) || undefined,
        sourceName: domain,
        kind: normalizeKind(undefined, tab),
        providerBadge: 'Brave API',
      };
    });

  return { results };
}

async function fetchBingSearchApi(
  query: string,
  region: RegionCode,
  freshness: FreshnessFilter,
  safeSearch: SafeSearchLevel,
  tab: SearchTab = 'all'
): Promise<{ results: SearchResultItem[]; note?: string }> {
  const apiKey = process.env.BING_SEARCH_API_KEY?.trim();
  if (!apiKey) {
    return {
      results: [],
      note: 'BING_SEARCH_API_KEY is not configured in Settings > Secrets. Using Axiom live web search.',
    };
  }

  const params = new URLSearchParams({ q: query, count: '10', safeSearch });
  if (region !== 'all') params.set('cc', region.toUpperCase());
  const freshnessMap: Record<FreshnessFilter, string> = {
    any: '',
    day: 'Day',
    week: 'Week',
    month: 'Month',
    year: '',
  };
  if (freshnessMap[freshness]) params.set('freshness', freshnessMap[freshness]);

  const res = await fetch(`https://api.bing.microsoft.com/v7.0/search?${params.toString()}`, {
    headers: {
      'Ocp-Apim-Subscription-Key': apiKey,
    },
    signal: AbortSignal.timeout(8000),
  });

  if (!res.ok) {
    return {
      results: [],
      note: `Bing Search API returned HTTP ${res.status}.`,
    };
  }

  const data = (await res.json()) as {
    webPages?: {
      value?: Array<{
        name?: string;
        url?: string;
        snippet?: string;
        dateLastCrawled?: string;
      }>;
    };
  };

  const rawList = data?.webPages?.value ?? [];
  const results: SearchResultItem[] = rawList
    .filter((item) => isSafeHttpUrl(item.url) && stripHtmlAndEntities(item.name).length > 0)
    .map((item, idx) => {
      const cleanUrl = item.url!.trim();
      const domain = extractDomain(cleanUrl);
      return {
        id: `bing-${idx + 1}`,
        title: stripHtmlAndEntities(item.name),
        url: cleanUrl,
        domain,
        breadcrumb: buildBreadcrumb(cleanUrl),
        snippet: stripHtmlAndEntities(item.snippet),
        publishedAt: item.dateLastCrawled?.slice(0, 10) || undefined,
        sourceName: domain,
        kind: normalizeKind(undefined, tab),
        providerBadge: 'Bing API',
      };
    });

  return { results };
}

interface ParsedModelPayload {
  aiSummary: string;
  structuredResults: Array<{
    title?: string;
    url?: string;
    snippet?: string;
    publishedAt?: string;
    sourceName?: string;
    kind?: string;
    metaLabel?: string;
  }>;
  infobox: InfoboxData | null;
  discussions: Array<{
    platform?: string;
    title?: string;
    url?: string;
    snippet?: string;
    meta?: string;
  }>;
  relatedQueries: string[];
}

function parseModelOutput(rawText: string): ParsedModelPayload {
  const markerStart = '---STRUCTURED_RESULTS---';
  const markerEnd = '---END_STRUCTURED_RESULTS---';
  const startIdx = rawText.indexOf(markerStart);
  const endIdx = rawText.indexOf(markerEnd);

  let aiSummary = rawText;
  let structuredJsonStr = '';

  if (startIdx !== -1) {
    aiSummary = rawText.slice(0, startIdx).trim();
    if (endIdx !== -1 && endIdx > startIdx) {
      structuredJsonStr = rawText.slice(startIdx + markerStart.length, endIdx).trim();
    } else {
      structuredJsonStr = rawText.slice(startIdx + markerStart.length).trim();
    }
  }

  structuredJsonStr = structuredJsonStr
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim();

  let parsedObj: Record<string, unknown> = {};
  if (structuredJsonStr) {
    try {
      const candidate = JSON.parse(structuredJsonStr);
      if (candidate && typeof candidate === 'object') {
        parsedObj = candidate as Record<string, unknown>;
      }
    } catch {
      // Fallback gracefully
    }
  }

  const structuredResults = Array.isArray(parsedObj.results)
    ? (parsedObj.results as ParsedModelPayload['structuredResults'])
    : [];

  let infobox: InfoboxData | null = null;
  if (parsedObj.infobox && typeof parsedObj.infobox === 'object') {
    const rawInfo = parsedObj.infobox as Record<string, unknown>;
    if (typeof rawInfo.title === 'string' && rawInfo.title.trim()) {
      const facts = Array.isArray(rawInfo.facts)
        ? rawInfo.facts
            .filter(
              (f): f is { label: string; value: string } =>
                Boolean(f) &&
                typeof (f as Record<string, unknown>).label === 'string' &&
                typeof (f as Record<string, unknown>).value === 'string'
            )
            .slice(0, 8)
        : [];
      infobox = {
        title: rawInfo.title.trim(),
        subtitle: typeof rawInfo.subtitle === 'string' ? rawInfo.subtitle.trim() : '',
        description: typeof rawInfo.description === 'string' ? rawInfo.description.trim() : '',
        officialUrl: isSafeHttpUrl(rawInfo.officialUrl) ? rawInfo.officialUrl.trim() : undefined,
        facts,
      };
    }
  }

  const discussions = Array.isArray(parsedObj.discussions)
    ? (parsedObj.discussions as ParsedModelPayload['discussions'])
    : [];

  const relatedQueries = Array.isArray(parsedObj.relatedQueries)
    ? parsedObj.relatedQueries
        .filter((q): q is string => typeof q === 'string' && q.trim().length > 0)
        .slice(0, 6)
    : [];

  return {
    aiSummary: aiSummary.trim(),
    structuredResults,
    infobox,
    discussions,
    relatedQueries,
  };
}

function normalizeKind(rawKind: string | undefined, tab: SearchTab): SearchResultItem['kind'] {
  if (tab === 'news') return 'news';
  if (tab === 'images') return 'image';
  if (tab === 'videos') return 'video';
  if (tab === 'discussions') return 'discussion';
  if (
    rawKind === 'news' ||
    rawKind === 'image' ||
    rawKind === 'video' ||
    rawKind === 'discussion'
  ) {
    return rawKind;
  }
  return 'web';
}

function parseProxiedHtml(html: string, finalUrl: string, adBlockerEnabled: boolean): ProxyPageData {
  const $ = cheerio.load(html);
  const blockedDomainsSet = new Set<string>();
  let blockedAdsCount = 0;

  const isTrackerUrl = (u: string | undefined): string | null => {
    if (!u) return null;
    const lower = u.toLowerCase();
    for (const dom of AD_TRACKER_DOMAINS) {
      if (lower.includes(dom)) return dom;
    }
    return null;
  };

  // Strip dangerous executable/embed elements unconditionally
  $('script, style, noscript, object, embed, link[rel="preload"]').each((_, el) => {
    const src = $(el).attr('src') || $(el).attr('href');
    const matched = isTrackerUrl(src);
    if (matched) {
      blockedAdsCount += 1;
      blockedDomainsSet.add(matched);
    }
    $(el).remove();
  });

  if (adBlockerEnabled) {
    $('iframe').each((_, el) => {
      const src = $(el).attr('src');
      const matched = isTrackerUrl(src);
      if (matched) blockedDomainsSet.add(matched);
      blockedAdsCount += 1;
      $(el).remove();
    });

    $('img').each((_, el) => {
      const src = $(el).attr('src');
      const w = $(el).attr('width');
      const h = $(el).attr('height');
      const matched = isTrackerUrl(src);
      if (matched || (w === '1' && h === '1')) {
        if (matched) blockedDomainsSet.add(matched);
        blockedAdsCount += 1;
        $(el).remove();
      }
    });

    $(
      '[class*="ad-banner"], [class*="ad-slot"], [class*="sponsored"], [id*="google_ads"], [data-ad], ins.adsbygoogle, .advertisement'
    ).each((_, el) => {
      blockedAdsCount += 1;
      $(el).remove();
    });
  } else {
    $('iframe').remove();
  }

  const title =
    $('meta[property="og:title"]').attr('content')?.trim() ||
    $('title').first().text().trim() ||
    extractDomain(finalUrl);

  const description =
    $('meta[name="description"]').attr('content')?.trim() ||
    $('meta[property="og:description"]').attr('content')?.trim() ||
    '';

  const contentRoot = $('article').length > 0 ? $('article').first() : $('main').length > 0 ? $('main').first() : $('body');

  const sections: ProxySectionItem[] = [];
  const seenText = new Set<string>();

  contentRoot.find('h1, h2, h3, p, li, blockquote').each((_, el) => {
    if (sections.length >= 90) return;
    const tagName = el.tagName.toLowerCase() as ProxySectionItem['tag'];
    const text = $(el).text().replace(/\s+/g, ' ').trim();
    if (!text || text.length < 18 || seenText.has(text)) return;
    seenText.add(text);
    sections.push({ tag: tagName, text });
  });

  // Fallback to entire body if article/main had minimal text
  if (sections.length < 3) {
    $('h1, h2, h3, p').each((_, el) => {
      if (sections.length >= 60) return;
      const tagName = el.tagName.toLowerCase() as ProxySectionItem['tag'];
      const text = $(el).text().replace(/\s+/g, ' ').trim();
      if (!text || text.length < 20 || seenText.has(text)) return;
      seenText.add(text);
      sections.push({ tag: tagName, text });
    });
  }

  const links: ProxyLinkItem[] = [];
  const seenHrefs = new Set<string>();
  contentRoot.find('a[href]').each((_, el) => {
    if (links.length >= 40) return;
    const rawHref = $(el).attr('href');
    const text = $(el).text().replace(/\s+/g, ' ').trim();
    if (!rawHref || !text || text.length < 3) return;
    try {
      const resolved = new URL(rawHref, finalUrl).toString();
      if (isSafeHttpUrl(resolved) && !seenHrefs.has(resolved)) {
        seenHrefs.add(resolved);
        links.push({ text: text.slice(0, 90), href: resolved });
      }
    } catch {
      // Ignore malformed relative href
    }
  });

  const wordCount = sections.reduce((acc, s) => acc + s.text.split(/\s+/).length, 0);
  const readingTimeMin = Math.max(1, Math.round(wordCount / 210));

  return {
    url: finalUrl,
    domain: extractDomain(finalUrl),
    title,
    description,
    readingTimeMin,
    blockedAdsCount,
    blockedDomains: Array.from(blockedDomainsSet),
    sections,
    links,
    fetchedAt: new Date().toISOString(),
  };
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '128kb' }));

  ensureOwnIndexStore();

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true });
  });

  app.get('/api/providers/status', (_req, res) => {
    const entries = ensureOwnIndexStore();
    res.json({
      axiom: Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY'),
      brave: Boolean(process.env.BRAVE_SEARCH_API_KEY?.trim()),
      bing: Boolean(process.env.BING_SEARCH_API_KEY?.trim()),
      ownIndexCount: entries.length,
    });
  });

  // Own Search Index CRUD
  app.get('/api/index', (_req, res) => {
    const entries = ensureOwnIndexStore();
    res.json({ entries });
  });

  app.post('/api/index', async (req, res) => {
    try {
      const body = req.body ?? {};
      const rawUrl = typeof body.url === 'string' ? body.url.trim() : '';
      if (!isSafeHttpUrl(rawUrl)) {
        res.status(400).json({ error: 'Valid https:// or http:// URL is required.' });
        return;
      }

      const autoCrawl = Boolean(body.autoCrawl);
      let title = typeof body.title === 'string' ? body.title.trim() : '';
      let snippet = typeof body.snippet === 'string' ? body.snippet.trim() : '';
      const rawTags = Array.isArray(body.tags)
        ? body.tags.filter((t: unknown): t is string => typeof t === 'string' && t.trim().length > 0)
        : typeof body.tags === 'string'
        ? body.tags
            .split(',')
            .map((t: string) => t.trim())
            .filter(Boolean)
        : [];

      let finalUrl = rawUrl;

      if (autoCrawl || !title || !snippet) {
        try {
          const fetched = await safeExternalFetch(rawUrl);
          finalUrl = fetched.finalUrl;
          const parsed = parseProxiedHtml(fetched.html, finalUrl, true);
          if (!title) title = parsed.title;
          if (!snippet) {
            snippet =
              parsed.description ||
              parsed.sections.find((s) => s.tag === 'p')?.text.slice(0, 220) ||
              `Indexed page from ${parsed.domain}`;
          }
        } catch (crawlErr) {
          if (autoCrawl && (!title || !snippet)) {
            res.status(400).json({
              error:
                crawlErr instanceof Error
                  ? `Auto-crawl failed: ${crawlErr.message}`
                  : 'Unable to fetch target URL.',
            });
            return;
          }
        }
      }

      if (!title) title = extractDomain(finalUrl);
      if (!snippet) snippet = `Indexed page at ${finalUrl}`;

      const entries = ensureOwnIndexStore();
      const newEntry: OwnIndexEntry = {
        id: `idx-${Date.now()}`,
        title: title.slice(0, 180),
        url: finalUrl,
        domain: extractDomain(finalUrl),
        snippet: snippet.slice(0, 400),
        tags: rawTags.slice(0, 8),
        createdAt: new Date().toISOString(),
      };

      const filtered = entries.filter((e) => e.url !== finalUrl);
      const updated = [newEntry, ...filtered];
      saveOwnIndexStore(updated);

      res.status(201).json({ entry: newEntry, entries: updated });
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to add entry to custom index.',
      });
    }
  });

  app.delete('/api/index/:id', (req, res) => {
    const id = req.params.id;
    const entries = ensureOwnIndexStore();
    const updated = entries.filter((e) => e.id !== id);
    saveOwnIndexStore(updated);
    res.json({ entries: updated });
  });

  // Hardened Proxy + Ad Blocker + Reading Mode
  app.get('/api/proxy', async (req, res) => {
    try {
      const rawUrl = typeof req.query.url === 'string' ? req.query.url.trim() : '';
      const adBlockerEnabled = req.query.adBlock !== 'false';
      if (!rawUrl) {
        res.status(400).json({ error: 'Query parameter ?url= is required.' });
        return;
      }

      const { finalUrl, html } = await safeExternalFetch(rawUrl);
      const pageData = parseProxiedHtml(html, finalUrl, adBlockerEnabled);
      res.json(pageData);
    } catch (error) {
      res.status(400).json({
        error: error instanceof Error ? error.message : 'Unable to load proxied page.',
      });
    }
  });

  // Multi-provider Live Search Endpoint
  app.post('/api/search', async (req, res) => {
    const startedAt = Date.now();
    try {
      const body = req.body ?? {};
      const rawQuery = typeof body.query === 'string' ? body.query.trim() : '';
      if (!rawQuery || rawQuery.length > 400) {
        res.status(400).json({ error: 'Search query must be between 1 and 400 characters.' });
        return;
      }

      const tab: SearchTab = VALID_TABS.has(body.tab) ? body.tab : 'all';
      const provider: SearchProviderId = VALID_PROVIDERS.has(body.provider)
        ? body.provider
        : 'axiom';
      const region: RegionCode = VALID_REGIONS.has(body.region) ? body.region : 'all';
      const freshness: FreshnessFilter = VALID_FRESHNESS.has(body.freshness)
        ? body.freshness
        : 'any';
      const safeSearch: SafeSearchLevel = VALID_SAFE_SEARCH.has(body.safeSearch)
        ? body.safeSearch
        : 'moderate';
      const siteFilter =
        typeof body.siteFilter === 'string' &&
        /^[a-z0-9.-]+\.[a-z]{2,}$/i.test(body.siteFilter.trim())
          ? body.siteFilter.trim()
          : undefined;
      const bangTrigger =
        typeof body.bangTrigger === 'string' ? body.bangTrigger.trim() : undefined;
      const bangLabel = typeof body.bangLabel === 'string' ? body.bangLabel.trim() : undefined;

      const effectiveQuery = siteFilter ? `site:${siteFilter} ${rawQuery}` : rawQuery;

      // Pure Own Index Mode
      if (provider === 'own') {
        const ownResults = searchOwnIndex(rawQuery);
        const payload: SearchResponse = {
          query: rawQuery,
          effectiveQuery,
          tab,
          provider,
          aiSummary:
            ownResults.length > 0
              ? `Found **${ownResults.length}** matching ${
                  ownResults.length === 1 ? 'page' : 'pages'
                } in your Own Search Index for "${rawQuery}".`
              : `No pages in your Own Search Index matched "${rawQuery}". Add URLs in the Own Index panel or switch provider to Axiom Live / Combined.`,
          sources: ownResults.map((r, i) => ({
            index: i + 1,
            title: r.title,
            url: r.url,
            domain: r.domain,
          })),
          results: ownResults,
          discussions: [],
          infobox: null,
          relatedQueries: [],
          searchTimeMs: Date.now() - startedAt,
          bangApplied: bangTrigger
            ? { trigger: bangTrigger, label: bangLabel || bangTrigger, siteFilter }
            : null,
        };
        res.json(payload);
        return;
      }

      const notes: string[] = [];
      let externalProviderResults: SearchResultItem[] = [];
      const ownMatches = provider === 'all_combined' ? searchOwnIndex(rawQuery) : [];

      if (provider === 'brave' || provider === 'all_combined') {
        const braveResp = await fetchBraveSearchApi(effectiveQuery, region, freshness, safeSearch, tab);
        externalProviderResults = externalProviderResults.concat(braveResp.results);
        if (braveResp.note && provider === 'brave') notes.push(braveResp.note);
      }

      if (provider === 'bing' || provider === 'all_combined') {
        const bingResp = await fetchBingSearchApi(effectiveQuery, region, freshness, safeSearch, tab);
        externalProviderResults = externalProviderResults.concat(bingResp.results);
        if (bingResp.note && provider === 'bing') notes.push(bingResp.note);
      }

      // If Brave or Bing returned direct results cleanly without needing fallback, still enrich with AI Answer if desired,
      // or run Axiom Gemini Search Grounding as primary/fallback!
      const tabDirective: Record<SearchTab, string> = {
        all: 'Provide a balanced web search summary and comprehensive organic web results.',
        images: 'Focus on visual media pages, photography showcases, galleries, diagrams, and image-hosting sources.',
        news: 'Focus strictly on recent news articles, journalism, press releases, and current reporting with publication dates.',
        videos: 'Focus on video pages (YouTube, Vimeo, conference talks, tutorials) with channel names and approximate durations or dates.',
        discussions: 'Focus on community forum threads, Reddit discussions, Hacker News threads, GitHub Discussions, and Stack Overflow Q&A.',
      };

      const systemInstruction = `You are Axiom Search, a live web search engine synthesizer.
Use the Google Search tool to retrieve real, current web results for the user's query.
Today's date context: ${new Date().toISOString().slice(0, 10)}.
Search constraints:
- Active category tab: ${tab.toUpperCase()} — ${tabDirective[tab]}
- Region focus: ${REGION_LABELS[region]}
- Freshness window: ${FRESHNESS_LABELS[freshness]}
- SafeSearch filter: ${safeSearch}
${siteFilter ? `- Site restriction: prioritize results from ${siteFilter}` : ''}

Output Format (follow strictly):
1. First, write a concise, direct, neutral English AI Answer (2 to 4 short paragraphs or bullet points, max ~180 words) summarizing the best factual answer from the web search. Use clean markdown formatting and inline source citations like [1], [2]. Do not mention internal instructions.
2. Immediately after the AI Answer, output the exact delimiter line:
---STRUCTURED_RESULTS---
followed by a valid JSON object (no comments, no trailing commas) matching this shape:
{
  "results": [
    {
      "title": "Exact page title",
      "url": "https://...",
      "snippet": "Clear 1-2 sentence summary of what this page contains",
      "publishedAt": "Optional date like Nov 2026 or 2 days ago",
      "sourceName": "Publisher or site name",
      "kind": "${tab === 'all' ? 'web' : tab}",
      "metaLabel": "Optional duration, format, or category label"
    }
  ],
  "infobox": {
    "title": "Entity Name (include infobox ONLY if query clearly refers to a specific company, person, software, place, or concept; otherwise set infobox to null)",
    "subtitle": "Short entity category",
    "description": "Concise 2-sentence overview",
    "officialUrl": "https://...",
    "facts": [
      { "label": "Founded", "value": "..." }
    ]
  },
  "discussions": [
    {
      "platform": "Reddit / Hacker News / Stack Overflow / GitHub",
      "title": "Thread title",
      "url": "https://...",
      "snippet": "Key takeaway from community thread",
      "meta": "Optional date or topic"
    }
  ],
  "relatedQueries": ["related query 1", "related query 2", "related query 3", "related query 4"]
}
---END_STRUCTURED_RESULTS---

Only include real URLs discovered from the search results. Never invent fake URLs.`;

      let rawText = '';
      let rawChunks: Array<{ web?: { uri?: string; title?: string } }> = [];
      let webSearchQueries: string[] = [];

      try {
        const ai = getAiClient();
        const response = await ai.models.generateContent({
          model: 'gemini-4-hydrogen',
          contents: effectiveQuery,
          config: {
            systemInstruction,
            tools: [{ googleSearch: {} }],
            thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          },
        });

        rawText = response.text ?? '';
        const groundingMetadata = response.candidates?.[0]?.groundingMetadata;
        rawChunks = groundingMetadata?.groundingChunks ?? [];
        webSearchQueries = Array.isArray(groundingMetadata?.webSearchQueries)
          ? groundingMetadata.webSearchQueries
          : [];
      } catch (aiErr) {
        const parsedErr = parseGeminiError(aiErr);

        // If Brave, Bing, or Own Index already returned real results, return them gracefully without failing!
        if (externalProviderResults.length > 0 || ownMatches.length > 0) {
          notes.push(`AI Answer skipped: ${parsedErr.message}`);
        } else {
          // Try Brave or Bing automatically if configured in env when primary Axiom call hits quota
          const fallbackBrave = await fetchBraveSearchApi(effectiveQuery, region, freshness, safeSearch, tab);
          const fallbackBing = await fetchBingSearchApi(effectiveQuery, region, freshness, safeSearch, tab);
          const combinedFallback = [...fallbackBrave.results, ...fallbackBing.results];

          if (combinedFallback.length > 0) {
            externalProviderResults = combinedFallback;
            notes.push(`Live results served via external search API (${parsedErr.message})`);
          } else {
            res.status(parsedErr.status).json({ error: parsedErr.message, code: parsedErr.status });
            return;
          }
        }
      }

      const parsed = rawText
        ? parseModelOutput(rawText)
        : {
            aiSummary: '',
            structuredResults: [],
            infobox: null,
            discussions: [],
            relatedQueries: [],
          };

      const sources: GroundingSource[] = [];
      const seenUrls = new Set<string>();

      for (const chunk of rawChunks) {
        const uri = chunk?.web?.uri;
        const title = chunk?.web?.title;
        if (isSafeHttpUrl(uri) && !seenUrls.has(uri)) {
          seenUrls.add(uri);
          sources.push({
            index: sources.length + 1,
            title: (typeof title === 'string' && title.trim()) || extractDomain(uri),
            url: uri,
            domain: extractDomain(uri),
          });
        }
      }

      const results: SearchResultItem[] = [];
      const addedResultUrls = new Set<string>();

      // Prepend Own Index matches in Combined mode
      for (const ownItem of ownMatches) {
        if (!addedResultUrls.has(ownItem.url)) {
          addedResultUrls.add(ownItem.url);
          results.push(ownItem);
        }
      }

      // Prepend Brave/Bing API results when configured
      for (const extItem of externalProviderResults) {
        if (!addedResultUrls.has(extItem.url)) {
          addedResultUrls.add(extItem.url);
          results.push(extItem);
        }
      }

      const structuredByUrl = new Map<string, (typeof parsed.structuredResults)[number]>();
      for (const item of parsed.structuredResults) {
        if (isSafeHttpUrl(item.url)) {
          structuredByUrl.set(item.url, item);
        }
      }

      for (const src of sources) {
        if (addedResultUrls.has(src.url)) continue;
        const match =
          structuredByUrl.get(src.url) ??
          parsed.structuredResults.find(
            (r) =>
              isSafeHttpUrl(r.url) &&
              extractDomain(r.url) === src.domain &&
              !addedResultUrls.has(r.url)
          );

        addedResultUrls.add(src.url);
        results.push({
          id: `res-${results.length + 1}`,
          title: (match?.title && match.title.trim()) || src.title,
          url: src.url,
          domain: src.domain,
          breadcrumb: buildBreadcrumb(src.url),
          snippet:
            (match?.snippet && match.snippet.trim()) ||
            `Verified web source from ${src.domain} matching "${rawQuery}".`,
          publishedAt: match?.publishedAt?.trim() || undefined,
          sourceName: match?.sourceName?.trim() || src.domain,
          kind: normalizeKind(match?.kind, tab),
          citationIndex: src.index,
          metaLabel: match?.metaLabel?.trim() || undefined,
          providerBadge: provider === 'all_combined' ? 'Live Web' : undefined,
        });
      }

      for (const item of parsed.structuredResults) {
        if (results.length >= 12) break;
        if (!isSafeHttpUrl(item.url) || addedResultUrls.has(item.url)) continue;
        addedResultUrls.add(item.url);
        const domain = extractDomain(item.url);
        const newIdx = sources.length + 1;
        sources.push({
          index: newIdx,
          title: (item.title && item.title.trim()) || domain,
          url: item.url,
          domain,
        });
        results.push({
          id: `res-${results.length + 1}`,
          title: (item.title && item.title.trim()) || domain,
          url: item.url,
          domain,
          breadcrumb: buildBreadcrumb(item.url),
          snippet: (item.snippet && item.snippet.trim()) || `Web page on ${domain}.`,
          publishedAt: item.publishedAt?.trim() || undefined,
          sourceName: item.sourceName?.trim() || domain,
          kind: normalizeKind(item.kind, tab),
          citationIndex: newIdx,
          metaLabel: item.metaLabel?.trim() || undefined,
        });
      }

      const parsedDiscussions: DiscussionItem[] = parsed.discussions
        .filter((d) => isSafeHttpUrl(d.url) && typeof d.title === 'string' && d.title.trim())
        .slice(0, 5)
        .map((d, idx) => ({
          id: `disc-${idx + 1}`,
          platform: d.platform?.trim() || extractDomain(d.url!),
          title: d.title!.trim(),
          url: d.url!.trim(),
          domain: extractDomain(d.url!),
          snippet: d.snippet?.trim() || '',
          meta: d.meta?.trim() || undefined,
        }));

      const fallbackDiscussions: DiscussionItem[] =
        parsedDiscussions.length > 0
          ? parsedDiscussions
          : externalProviderResults
              .filter((item) =>
                /(reddit\.com|news\.ycombinator\.com|stackoverflow\.com|stackexchange\.com|github\.com)/i.test(
                  item.domain
                )
              )
              .slice(0, 4)
              .map((item, idx) => ({
                id: `disc-ext-${idx + 1}`,
                platform: item.domain,
                title: item.title,
                url: item.url,
                domain: item.domain,
                snippet: item.snippet,
                meta: item.publishedAt,
              }));

      const finalSources: GroundingSource[] =
        sources.length > 0
          ? sources
          : results.slice(0, 8).map((r, idx) => ({
              index: idx + 1,
              title: r.title,
              url: r.url,
              domain: r.domain,
            }));

      const relatedFromGrounding = webSearchQueries.filter(
        (q) => q.toLowerCase() !== rawQuery.toLowerCase()
      );

      const relatedQueries =
        parsed.relatedQueries.length > 0
          ? parsed.relatedQueries
          : relatedFromGrounding.slice(0, 5);

      const payload: SearchResponse = {
        query: rawQuery,
        effectiveQuery,
        tab,
        provider,
        providerStatusNote: notes.length > 0 ? notes.join(' ') : undefined,
        aiSummary: parsed.aiSummary,
        sources: finalSources,
        results,
        discussions: fallbackDiscussions,
        infobox: parsed.infobox,
        relatedQueries,
        searchTimeMs: Date.now() - startedAt,
        bangApplied: bangTrigger
          ? {
              trigger: bangTrigger,
              label: bangLabel || bangTrigger,
              siteFilter,
            }
          : null,
      };

      res.json(payload);
    } catch (error) {
      const parsedErr = parseGeminiError(error);
      res.status(parsedErr.status).json({ error: parsedErr.message, code: parsedErr.status });
    }
  });

  app.post('/api/search/followup', async (req, res) => {
    try {
      const body = req.body ?? {};
      const originalQuery =
        typeof body.originalQuery === 'string' ? body.originalQuery.trim() : '';
      const answerContext =
        typeof body.answerContext === 'string' ? body.answerContext.trim().slice(0, 2000) : '';
      const followUpQuery =
        typeof body.followUpQuery === 'string' ? body.followUpQuery.trim() : '';

      if (!followUpQuery || followUpQuery.length > 400) {
        res.status(400).json({ error: 'Follow-up question must be between 1 and 400 characters.' });
        return;
      }

      const ai = getAiClient();
      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: `Original search query: "${originalQuery}"
Previous summary context: ${answerContext}
Follow-up question from user: "${followUpQuery}"`,
        config: {
          systemInstruction:
            'You are Axiom Search AI Answer assistant. Answer the follow-up question concisely and accurately in English using Google Search grounding. Keep it focused (under 150 words) with clear markdown and inline citations [1], [2].',
          tools: [{ googleSearch: {} }],
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        },
      });

      const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks ?? [];
      const sources: GroundingSource[] = [];
      const seen = new Set<string>();
      for (const chunk of groundingChunks) {
        const uri = chunk?.web?.uri;
        const title = chunk?.web?.title;
        if (isSafeHttpUrl(uri) && !seen.has(uri)) {
          seen.add(uri);
          sources.push({
            index: sources.length + 1,
            title: (typeof title === 'string' && title.trim()) || extractDomain(uri),
            url: uri,
            domain: extractDomain(uri),
          });
        }
      }

      res.json({
        answer: (response.text ?? '').trim() || 'No follow-up answer available.',
        sources,
      });
    } catch (error) {
      const parsedErr = parseGeminiError(error);
      res.status(parsedErr.status).json({ error: parsedErr.message, code: parsedErr.status });
    }
  });

  // In-App AI Assistant Endpoint (supports page summarization & general research)
  app.post('/api/assistant', async (req, res) => {
    try {
      const body = req.body ?? {};
      const prompt = typeof body.prompt === 'string' ? body.prompt.trim() : '';
      if (!prompt || prompt.length > 1500) {
        res.status(400).json({ error: 'Prompt must be between 1 and 1500 characters.' });
        return;
      }

      const pageContext =
        body.pageContext && typeof body.pageContext === 'object'
          ? (body.pageContext as { title?: string; url?: string; text?: string })
          : null;

      const contextBlock =
        pageContext?.title && pageContext?.text
          ? `\n\nActive Open Tab Context:\nTitle: ${String(pageContext.title).slice(0, 200)}\nURL: ${String(pageContext.url || '').slice(0, 300)}\nExcerpt:\n${String(pageContext.text).slice(0, 3500)}`
          : '';

      const ai = getAiClient();
      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: `${prompt}${contextBlock}`,
        config: {
          systemInstruction:
            'You are Axiom AI Assistant embedded inside a privacy-first browser and search workspace. Answer clearly in English using concise markdown. If an open tab context is provided and relevant, use it alongside live Google Search grounding.',
          tools: [{ googleSearch: {} }],
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        },
      });

      const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks ?? [];
      const sources: GroundingSource[] = [];
      const seen = new Set<string>();
      for (const chunk of groundingChunks) {
        const uri = chunk?.web?.uri;
        const title = chunk?.web?.title;
        if (isSafeHttpUrl(uri) && !seen.has(uri)) {
          seen.add(uri);
          sources.push({
            index: sources.length + 1,
            title: (typeof title === 'string' && title.trim()) || extractDomain(uri),
            url: uri,
            domain: extractDomain(uri),
          });
        }
      }

      res.json({
        reply: (response.text ?? '').trim() || 'No response generated.',
        sources,
      });
    } catch (error) {
      const parsedErr = parseGeminiError(error);
      res.status(parsedErr.status).json({ error: parsedErr.message, code: parsedErr.status });
    }
  });

  // Downloadable Manifest V3 Browser Extension ZIP
  app.get('/api/extension/download', async (req, res) => {
    try {
      const originQuery = typeof req.query.origin === 'string' ? req.query.origin.trim() : '';
      const fallbackOrigin = process.env.APP_URL && isSafeHttpUrl(process.env.APP_URL)
        ? process.env.APP_URL.replace(/\/$/, '')
        : `${req.protocol}://${req.get('host')}`;
      const appOrigin = isSafeHttpUrl(originQuery)
        ? originQuery.replace(/\/$/, '')
        : fallbackOrigin;

      const zip = new JSZip();

      const manifest = {
        manifest_version: 3,
        name: 'Axiom Search Extension',
        version: '1.0.0',
        description:
          'Privacy-first Axiom Search popup, omnibox shortcut (ax), and default search provider.',
        icons: {
          '192': 'icons/pwa-192x192.png',
          '512': 'icons/pwa-512x512.png',
        },
        action: {
          default_popup: 'popup.html',
          default_title: 'Axiom Search',
          default_icon: 'icons/pwa-192x192.png',
        },
        omnibox: {
          keyword: 'ax',
        },
        permissions: ['tabs', 'storage'],
        chrome_settings_overrides: {
          search_provider: {
            name: 'Axiom Search',
            keyword: 'axiom',
            search_url: `${appOrigin}/?q={searchTerms}`,
            favicon_url: `${appOrigin}/pwa-192x192.png`,
            encoding: 'UTF-8',
            is_default: true,
          },
        },
        background: {
          service_worker: 'background.js',
        },
      };

      const popupHtml = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>Axiom Search</title>
    <link rel="stylesheet" href="popup.css" />
  </head>
  <body>
    <div class="shell">
      <div class="brand">
        <span class="dot">▲</span>
        <span>Axiom Search</span>
      </div>
      <form id="search-form">
        <input id="query" type="text" placeholder="Search web, !gh, !w, 48*12..." autofocus />
        <button type="submit">Go</button>
      </form>
      <div class="quick-links">
        <button type="button" data-bang="!w ">!w Wiki</button>
        <button type="button" data-bang="!gh ">!gh GitHub</button>
        <button type="button" data-bang="!news ">!news News</button>
      </div>
      <button id="open-app" class="open-btn" type="button">Open Full Axiom Workspace</button>
    </div>
    <script src="popup.js"></script>
  </body>
</html>`;

      const popupCss = `* { box-sizing: border-box; font-family: system-ui, -apple-system, sans-serif; }
body { margin: 0; width: 320px; background: #000000; color: #ffffff; padding: 14px; }
.brand { display: flex; align-items: center; gap: 8px; font-weight: 700; font-size: 15px; margin-bottom: 12px; }
form { display: flex; gap: 6px; }
input { flex: 1; padding: 8px 10px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.2); background: #0a0a0a; color: #fff; font-size: 13px; }
input:focus { outline: none; border-color: #fff; }
button[type="submit"] { padding: 8px 12px; border-radius: 8px; border: none; background: #fff; color: #000; font-weight: 600; cursor: pointer; }
.quick-links { display: flex; gap: 6px; margin-top: 10px; }
.quick-links button { flex: 1; padding: 5px 6px; font-size: 11px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.14); background: #111; color: #d4d4d8; cursor: pointer; }
.open-btn { margin-top: 12px; width: 100%; padding: 8px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.18); background: transparent; color: #fff; font-size: 12px; cursor: pointer; }`;

      const popupJs = `const APP_ORIGIN = ${JSON.stringify(appOrigin)};
const form = document.getElementById('search-form');
const input = document.getElementById('query');
const openBtn = document.getElementById('open-app');

form.addEventListener('submit', (e) => {
  e.preventDefault();
  const q = input.value.trim();
  if (!q) return;
  chrome.tabs.create({ url: APP_ORIGIN + '/?q=' + encodeURIComponent(q) });
});

document.querySelectorAll('[data-bang]').forEach((btn) => {
  btn.addEventListener('click', () => {
    input.value = btn.getAttribute('data-bang') + input.value;
    input.focus();
  });
});

openBtn.addEventListener('click', () => {
  chrome.tabs.create({ url: APP_ORIGIN + '/' });
});`;

      const backgroundJs = `const APP_ORIGIN = ${JSON.stringify(appOrigin)};
chrome.omnibox.onInputEntered.addListener((text) => {
  const url = APP_ORIGIN + '/?q=' + encodeURIComponent(text.trim());
  chrome.tabs.update({ url });
});`;

      zip.file('manifest.json', JSON.stringify(manifest, null, 2));
      zip.file('popup.html', popupHtml);
      zip.file('popup.css', popupCss);
      zip.file('popup.js', popupJs);
      zip.file('background.js', backgroundJs);

      const icon192Path = path.resolve(__dirname, 'public', 'pwa-192x192.png');
      const icon512Path = path.resolve(__dirname, 'public', 'pwa-512x512.png');
      if (fs.existsSync(icon192Path)) {
        zip.file('icons/pwa-192x192.png', fs.readFileSync(icon192Path));
      }
      if (fs.existsSync(icon512Path)) {
        zip.file('icons/pwa-512x512.png', fs.readFileSync(icon512Path));
      }

      const buffer = await zip.generateAsync({ type: 'nodebuffer' });
      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', 'attachment; filename="axiom-search-extension.zip"');
      res.send(buffer);
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to build extension archive.',
      });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Axiom Search server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start Axiom Search server:', err);
  process.exit(1);
});
