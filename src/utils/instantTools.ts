import type { BangDefinition, CustomSearchEngine, InstantToolResult } from '../types/search';

export const DEFAULT_CUSTOM_ENGINES: CustomSearchEngine[] = [
  {
    id: 'eng-brave',
    name: 'Brave Search',
    shortcut: '!brave',
    urlTemplate: 'https://search.brave.com/search?q=%s',
    openMode: 'proxy',
  },
  {
    id: 'eng-ddg',
    name: 'DuckDuckGo',
    shortcut: '!ddg',
    urlTemplate: 'https://duckduckgo.com/html/?q=%s',
    openMode: 'proxy',
  },
  {
    id: 'eng-wiki',
    name: 'Wikipedia',
    shortcut: '!wiki',
    urlTemplate: 'https://en.wikipedia.org/w/index.php?search=%s',
    openMode: 'proxy',
  },
  {
    id: 'eng-gh',
    name: 'GitHub Search',
    shortcut: '!github',
    urlTemplate: 'https://github.com/search?q=%s',
    openMode: 'external',
  },
];

export const BANG_DEFINITIONS: BangDefinition[] = [
  {
    trigger: '!w',
    label: 'Wikipedia',
    description: 'Search encyclopedia articles on Wikipedia',
    siteFilter: 'wikipedia.org',
  },
  {
    trigger: '!gh',
    label: 'GitHub',
    description: 'Search repositories, code, and issues on GitHub',
    siteFilter: 'github.com',
  },
  {
    trigger: '!yt',
    label: 'YouTube',
    description: 'Search videos and channels on YouTube',
    siteFilter: 'youtube.com',
    targetTab: 'videos',
  },
  {
    trigger: '!rd',
    label: 'Reddit',
    description: 'Search community discussions on Reddit',
    siteFilter: 'reddit.com',
    targetTab: 'discussions',
  },
  {
    trigger: '!so',
    label: 'Stack Overflow',
    description: 'Search programming Q&A on Stack Overflow',
    siteFilter: 'stackoverflow.com',
    targetTab: 'discussions',
  },
  {
    trigger: '!npm',
    label: 'npm Registry',
    description: 'Search JavaScript and TypeScript packages',
    siteFilter: 'npmjs.com',
  },
  {
    trigger: '!news',
    label: 'News Mode',
    description: 'Switch directly to latest news coverage',
    targetTab: 'news',
  },
  {
    trigger: '!img',
    label: 'Images Mode',
    description: 'Switch directly to visual media sources',
    targetTab: 'images',
  },
  {
    trigger: '!vid',
    label: 'Videos Mode',
    description: 'Switch directly to video results',
    targetTab: 'videos',
  },
  {
    trigger: '!disc',
    label: 'Discussions Mode',
    description: 'Switch directly to forum & community threads',
    targetTab: 'discussions',
  },
];

export function isSafeExternalUrl(rawUrl: string | undefined | null): boolean {
  if (!rawUrl || typeof rawUrl !== 'string') return false;
  try {
    const parsed = new URL(rawUrl.trim());
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

export function isValidSearchTemplate(template: string): boolean {
  if (!template.includes('%s')) return false;
  const testUrl = template.replace(/%s/g, 'test');
  return isSafeExternalUrl(testUrl);
}

export function buildEngineSearchUrl(template: string, query: string): string | null {
  if (!isValidSearchTemplate(template)) return null;
  const encoded = encodeURIComponent(query.trim());
  const built = template.replace(/%s/g, encoded);
  return isSafeExternalUrl(built) ? built : null;
}

export function extractDomain(rawUrl: string): string {
  try {
    const parsed = new URL(rawUrl);
    return parsed.hostname.replace(/^www\./, '');
  } catch {
    return 'web';
  }
}

export function formatBreadcrumb(rawUrl: string): string {
  try {
    const parsed = new URL(rawUrl);
    const domain = parsed.hostname.replace(/^www\./, '');
    const segments = parsed.pathname
      .split('/')
      .filter(Boolean)
      .slice(0, 3)
      .map((seg) => {
        try {
          return decodeURIComponent(seg).slice(0, 28);
        } catch {
          return seg.slice(0, 28);
        }
      });
    return segments.length > 0 ? `${domain} › ${segments.join(' › ')}` : domain;
  } catch {
    return rawUrl;
  }
}

export function parseBangQuery(rawQuery: string): {
  cleanQuery: string;
  bang: BangDefinition | null;
} {
  const trimmed = rawQuery.trim();
  const tokens = trimmed.split(/\s+/);
  if (tokens.length === 0) return { cleanQuery: '', bang: null };

  const firstLower = tokens[0].toLowerCase();
  const lastLower = tokens[tokens.length - 1].toLowerCase();

  const matchedStart = BANG_DEFINITIONS.find((b) => b.trigger === firstLower);
  if (matchedStart) {
    return {
      cleanQuery: tokens.slice(1).join(' ').trim(),
      bang: matchedStart,
    };
  }

  if (tokens.length > 1) {
    const matchedEnd = BANG_DEFINITIONS.find((b) => b.trigger === lastLower);
    if (matchedEnd) {
      return {
        cleanQuery: tokens.slice(0, -1).join(' ').trim(),
        bang: matchedEnd,
      };
    }
  }

  return { cleanQuery: trimmed, bang: null };
}

function evaluateMathExpression(expr: string): number | null {
  const normalized = expr
    .toLowerCase()
    .replace(/\bpi\b/g, String(Math.PI))
    .replace(/\be\b/g, String(Math.E))
    .replace(/×/g, '*')
    .replace(/÷/g, '/')
    .replace(/\s+/g, '');

  if (!normalized || !/^[0-9+\-*/^%().a-z]+$/.test(normalized)) {
    return null;
  }

  let pos = 0;

  function peek(): string {
    return normalized[pos] || '';
  }

  function consume(char?: string): string {
    const ch = normalized[pos] || '';
    if (char && ch !== char) {
      throw new Error(`Expected ${char}`);
    }
    pos += 1;
    return ch;
  }

  function parseExpression(): number {
    let left = parseTerm();
    while (peek() === '+' || peek() === '-') {
      const op = consume();
      const right = parseTerm();
      left = op === '+' ? left + right : left - right;
    }
    return left;
  }

  function parseTerm(): number {
    let left = parsePower();
    while (peek() === '*' || peek() === '/' || peek() === '%') {
      const op = consume();
      const right = parsePower();
      if (op === '*') left *= right;
      else if (op === '/') {
        if (right === 0) throw new Error('Division by zero');
        left /= right;
      } else {
        if (right === 0) throw new Error('Modulo by zero');
        left %= right;
      }
    }
    return left;
  }

  function parsePower(): number {
    const base = parseUnary();
    if (peek() === '^') {
      consume();
      const exp = parsePower();
      return Math.pow(base, exp);
    }
    return base;
  }

  function parseUnary(): number {
    if (peek() === '-') {
      consume();
      return -parseUnary();
    }
    if (peek() === '+') {
      consume();
      return parseUnary();
    }
    return parsePrimary();
  }

  function parsePrimary(): number {
    if (peek() === '(') {
      consume('(');
      const val = parseExpression();
      consume(')');
      return val;
    }

    if (/[a-z]/.test(peek())) {
      let fn = '';
      while (/[a-z]/.test(peek())) {
        fn += consume();
      }
      consume('(');
      const arg = parseExpression();
      consume(')');
      switch (fn) {
        case 'sqrt':
          if (arg < 0) throw new Error('Negative sqrt');
          return Math.sqrt(arg);
        case 'abs':
          return Math.abs(arg);
        case 'sin':
          return Math.sin(arg);
        case 'cos':
          return Math.cos(arg);
        case 'tan':
          return Math.tan(arg);
        case 'log':
          return Math.log10(arg);
        case 'ln':
          return Math.log(arg);
        case 'round':
          return Math.round(arg);
        case 'floor':
          return Math.floor(arg);
        case 'ceil':
          return Math.ceil(arg);
        default:
          throw new Error('Unknown function');
      }
    }

    let numStr = '';
    while (/[0-9.]/.test(peek())) {
      numStr += consume();
    }
    if (!numStr || numStr === '.') {
      throw new Error('Invalid number');
    }
    const parsed = Number(numStr);
    if (!Number.isFinite(parsed)) throw new Error('Non-finite');
    return parsed;
  }

  try {
    const result = parseExpression();
    if (pos !== normalized.length || !Number.isFinite(result)) {
      return null;
    }
    return result;
  } catch {
    return null;
  }
}

const UNIT_CONVERSIONS: Record<string, { group: string; toBase: (v: number) => number; fromBase: (v: number) => number; label: string }> = {
  km: { group: 'length', toBase: (v) => v * 1000, fromBase: (v) => v / 1000, label: 'km' },
  kilometers: { group: 'length', toBase: (v) => v * 1000, fromBase: (v) => v / 1000, label: 'km' },
  m: { group: 'length', toBase: (v) => v, fromBase: (v) => v, label: 'm' },
  meters: { group: 'length', toBase: (v) => v, fromBase: (v) => v, label: 'm' },
  cm: { group: 'length', toBase: (v) => v / 100, fromBase: (v) => v * 100, label: 'cm' },
  mi: { group: 'length', toBase: (v) => v * 1609.344, fromBase: (v) => v / 1609.344, label: 'mi' },
  miles: { group: 'length', toBase: (v) => v * 1609.344, fromBase: (v) => v / 1609.344, label: 'mi' },
  ft: { group: 'length', toBase: (v) => v * 0.3048, fromBase: (v) => v / 0.3048, label: 'ft' },
  feet: { group: 'length', toBase: (v) => v * 0.3048, fromBase: (v) => v / 0.3048, label: 'ft' },
  in: { group: 'length', toBase: (v) => v * 0.0254, fromBase: (v) => v / 0.0254, label: 'in' },
  inches: { group: 'length', toBase: (v) => v * 0.0254, fromBase: (v) => v / 0.0254, label: 'in' },
  kg: { group: 'weight', toBase: (v) => v * 1000, fromBase: (v) => v / 1000, label: 'kg' },
  g: { group: 'weight', toBase: (v) => v, fromBase: (v) => v, label: 'g' },
  lb: { group: 'weight', toBase: (v) => v * 453.59237, fromBase: (v) => v / 453.59237, label: 'lb' },
  lbs: { group: 'weight', toBase: (v) => v * 453.59237, fromBase: (v) => v / 453.59237, label: 'lb' },
  oz: { group: 'weight', toBase: (v) => v * 28.34952, fromBase: (v) => v / 28.34952, label: 'oz' },
  c: { group: 'temp', toBase: (v) => v, fromBase: (v) => v, label: '°C' },
  celsius: { group: 'temp', toBase: (v) => v, fromBase: (v) => v, label: '°C' },
  f: { group: 'temp', toBase: (v) => (v - 32) * (5 / 9), fromBase: (v) => v * (9 / 5) + 32, label: '°F' },
  fahrenheit: { group: 'temp', toBase: (v) => (v - 32) * (5 / 9), fromBase: (v) => v * (9 / 5) + 32, label: '°F' },
  k: { group: 'temp', toBase: (v) => v - 273.15, fromBase: (v) => v + 273.15, label: 'K' },
  kelvin: { group: 'temp', toBase: (v) => v - 273.15, fromBase: (v) => v + 273.15, label: 'K' },
  kb: { group: 'data', toBase: (v) => v * 1024, fromBase: (v) => v / 1024, label: 'KB' },
  mb: { group: 'data', toBase: (v) => v * 1024 * 1024, fromBase: (v) => v / (1024 * 1024), label: 'MB' },
  gb: { group: 'data', toBase: (v) => v * 1024 ** 3, fromBase: (v) => v / 1024 ** 3, label: 'GB' },
  tb: { group: 'data', toBase: (v) => v * 1024 ** 4, fromBase: (v) => v / 1024 ** 4, label: 'TB' },
};

export function evaluateInstantTool(query: string): InstantToolResult | null {
  const trimmed = query.trim();
  if (!trimmed) return null;

  const hexMatch = trimmed.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (hexMatch) {
    let hex = hexMatch[1];
    if (hex.length === 3) {
      hex = hex
        .split('')
        .map((c) => c + c)
        .join('');
    }
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    return {
      type: 'color',
      title: 'Color Inspector',
      inputDisplay: `#${hex.toUpperCase()}`,
      outputDisplay: `rgb(${r}, ${g}, ${b})`,
      detail: `HEX #${hex.toUpperCase()} · RGB ${r}, ${g}, ${b}`,
      colorHex: `#${hex}`,
    };
  }

  const convMatch = trimmed.match(
    /^(-?\d+(?:\.\d+)?)\s*([a-zA-Z]+)\s+(?:to|in)\s+([a-zA-Z]+)$/i
  );
  if (convMatch) {
    const val = parseFloat(convMatch[1]);
    const fromDef = UNIT_CONVERSIONS[convMatch[2].toLowerCase()];
    const toDef = UNIT_CONVERSIONS[convMatch[3].toLowerCase()];
    if (fromDef && toDef && fromDef.group === toDef.group && Number.isFinite(val)) {
      const converted = toDef.fromBase(fromDef.toBase(val));
      const formatted = Number.isInteger(converted)
        ? String(converted)
        : converted.toFixed(4).replace(/\.?0+$/, '');
      return {
        type: 'converter',
        title: 'Unit Converter',
        inputDisplay: `${val} ${fromDef.label}`,
        outputDisplay: `${formatted} ${toDef.label}`,
        detail: `Instant deterministic ${fromDef.group} conversion`,
      };
    }
  }

  if (/^(what\s+time\s+is\s+it|current\s+time|time\s+now|today'?s?\s+date)$/i.test(trimmed)) {
    const now = new Date();
    return {
      type: 'time',
      title: 'Local Clock',
      inputDisplay: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Local Time',
      outputDisplay: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      detail: now.toLocaleDateString([], { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
    };
  }

  if (/[+\-*/^%()]/.test(trimmed) || /^(sqrt|abs|sin|cos|tan|log|ln)\(/i.test(trimmed)) {
    const cleanExpr = trimmed.replace(/^=\s*/, '');
    const result = evaluateMathExpression(cleanExpr);
    if (result !== null) {
      const formatted = Number.isInteger(result)
        ? String(result)
        : Number(result.toFixed(8)).toString();
      return {
        type: 'calculator',
        title: 'Instant Calculator',
        inputDisplay: cleanExpr,
        outputDisplay: formatted,
        detail: 'Evaluated locally in browser',
      };
    }
  }

  return null;
}
