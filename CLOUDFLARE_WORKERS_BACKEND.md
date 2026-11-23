# Panduan backend Cloudflare Workers untuk Axiom Search

Panduan ini menyediakan backend **tanpa Gemini** untuk repo ini. Backend menggunakan Cloudflare Worker, Brave Search API (pilihan), dan Cloudflare KV untuk Own Index. Ia mengekalkan endpoint utama yang digunakan UI: `/api/health`, `/api/providers/status`, `/api/index`, dan `/api/search`.

> **Penting:** Fail Markdown ini ialah panduan dan menyimpan semua kod untuk disalin ke fail sebenar. Workers tidak boleh terus menjalankan `server.ts` sedia ada kerana kod itu menggunakan Express, `fs`, `dns`, `net`, dan Node server. Endpoint Gemini/AI dan proxy pembaca tidak disediakan dalam versi ini; UI yang memanggil fungsi tersebut akan menerima HTTP 501 sehingga fungsi itu dibuang atau diganti.

## Apa yang diperlukan

- Akaun Cloudflare dengan Workers dan KV.
- GitHub Actions secrets: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`.
- Brave Search API key jika mahu carian web langsung. Worker masih boleh mencari dalam Own Index tanpa key.
- Node.js dan npm untuk setup awal.

## 1. Buat KV dan dapatkan ID

Di terminal dalam repo:

```bash
npx wrangler login
npx wrangler kv namespace create OWN_INDEX
```

Simpan ID namespace yang dipaparkan. Gantikan `REPLACE_WITH_KV_NAMESPACE_ID` dalam konfigurasi di bawah.

## 2. Cipta `wrangler.jsonc`

```jsonc
{
  "$schema": "node_modules/wrangler/config-schema.json",
  "name": "axiom-search-api",
  "main": "src/index.js",
  "compatibility_date": "2026-11-23",
  "workers_dev": true,
  "kv_namespaces": [
    {
      "binding": "OWN_INDEX",
      "id": "REPLACE_WITH_KV_NAMESPACE_ID"
    }
  ],
  "vars": {
    "ALLOWED_ORIGIN": "https://YOUR-FRONTEND-DOMAIN.example"
  }
}
```

`ALLOWED_ORIGIN` mesti sama dengan domain frontend (tanpa slash akhir). Untuk ujian sementara, boleh guna `*`, tetapi tetapkan domain sebenar sebelum pelancaran.

## 3. Cipta `src/index.js` — backend Worker

```javascript
const INDEX_KEY = 'entries';
const VALID_TABS = new Set(['all', 'images', 'news', 'videos', 'discussions']);
const VALID_PROVIDERS = new Set(['axiom', 'brave', 'bing', 'own', 'all_combined']);
const VALID_REGIONS = new Set(['all', 'us', 'gb', 'my', 'sg', 'jp', 'de']);
const VALID_FRESHNESS = new Set(['any', 'day', 'week', 'month', 'year']);
const VALID_SAFE_SEARCH = new Set(['strict', 'moderate', 'off']);

function json(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...extraHeaders },
  });
}

function withCors(response, origin) {
  const headers = new Headers(response.headers);
  headers.set('Access-Control-Allow-Origin', origin || '*');
  headers.set('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  headers.set('Access-Control-Max-Age', '86400');
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

function isHttpUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
}

function domainOf(value) {
  try {
    return new URL(value).hostname.replace(/^www\./, '');
  } catch {
    return 'web';
  }
}

function breadcrumb(value) {
  try {
    const url = new URL(value);
    const parts = url.pathname.split('/').filter(Boolean).slice(0, 3);
    return [url.hostname.replace(/^www\./, ''), ...parts].join(' › ');
  } catch {
    return value;
  }
}

async function readEntries(env) {
  if (!env.OWN_INDEX) return [];
  try {
    const entries = await env.OWN_INDEX.get(INDEX_KEY, 'json');
    return Array.isArray(entries) ? entries : [];
  } catch {
    return [];
  }
}

async function writeEntries(env, entries) {
  await env.OWN_INDEX.put(INDEX_KEY, JSON.stringify(entries));
}

async function searchOwnIndex(env, query) {
  const entries = await readEntries(env);
  const tokens = query.toLowerCase().split(/\s+/).filter(Boolean);
  return entries
    .map((entry) => {
      const title = String(entry.title || '');
      const tags = Array.isArray(entry.tags) ? entry.tags : [];
      const haystack = `${title} ${entry.url || ''} ${entry.snippet || ''} ${tags.join(' ')}`.toLowerCase();
      let score = 0;
      for (const token of tokens) {
        if (title.toLowerCase().includes(token)) score += 4;
        if (tags.some((tag) => String(tag).toLowerCase().includes(token))) score += 3;
        if (haystack.includes(token)) score += 1;
      }
      return { entry, score };
    })
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 20)
    .map(({ entry }, index) => ({
      id: `own-${entry.id}-${index}`,
      title: entry.title,
      url: entry.url,
      domain: entry.domain || domainOf(entry.url),
      breadcrumb: breadcrumb(entry.url),
      snippet: entry.snippet || '',
      publishedAt: entry.createdAt ? String(entry.createdAt).slice(0, 10) : undefined,
      sourceName: 'Own Search Index',
      kind: 'web',
      providerBadge: 'Own Index',
    }));
}

async function searchBrave(env, query, options) {
  if (!env.BRAVE_SEARCH_API_KEY) return { results: [], note: 'BRAVE_SEARCH_API_KEY belum ditetapkan.' };

  const params = new URLSearchParams({
    q: query,
    count: '10',
    safesearch: options.safeSearch,
  });
  if (options.region !== 'all') params.set('country', options.region.toUpperCase());
  const freshness = { day: 'pd', week: 'pw', month: 'pm', year: 'py' }[options.freshness];
  if (freshness) params.set('freshness', freshness);

  const response = await fetch(`https://api.search.brave.com/res/v1/web/search?${params}`, {
    headers: {
      Accept: 'application/json',
      'X-Subscription-Token': env.BRAVE_SEARCH_API_KEY,
    },
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) {
    return { results: [], note: `Brave Search API mengembalikan HTTP ${response.status}.` };
  }

  const data = await response.json();
  const results = (data.web?.results || [])
    .filter((item) => typeof item.url === 'string' && isHttpUrl(item.url) && item.title)
    .slice(0, 10)
    .map((item, index) => {
      const domain = domainOf(item.url);
      return {
        id: `brave-${index + 1}`,
        title: String(item.title),
        url: item.url,
        domain,
        breadcrumb: breadcrumb(item.url),
        snippet: String(item.description || ''),
        publishedAt: item.age || undefined,
        sourceName: domain,
        kind: 'web',
        providerBadge: 'Brave API',
      };
    });
  return { results };
}

async function handle(request, env) {
  const url = new URL(request.url);
  const path = url.pathname;

  if (request.method === 'OPTIONS') return new Response(null, { status: 204 });
  if (path === '/api/health' && request.method === 'GET') return json({ ok: true });

  if (path === '/api/providers/status' && request.method === 'GET') {
    const entries = await readEntries(env);
    return json({ axiom: false, brave: Boolean(env.BRAVE_SEARCH_API_KEY), bing: false, ownIndexCount: entries.length });
  }

  if (path === '/api/index' && request.method === 'GET') {
    return json({ entries: await readEntries(env) });
  }

  if (path === '/api/index' && request.method === 'POST') {
    let body;
    try {
      body = await request.json();
    } catch {
      return json({ error: 'Body JSON tidak sah.' }, 400);
    }
    const rawUrl = typeof body.url === 'string' ? body.url.trim() : '';
    if (!isHttpUrl(rawUrl)) return json({ error: 'URL http:// atau https:// yang sah diperlukan.' }, 400);

    const title = typeof body.title === 'string' ? body.title.trim().slice(0, 180) : '';
    const snippet = typeof body.snippet === 'string' ? body.snippet.trim().slice(0, 400) : '';
    const tags = Array.isArray(body.tags)
      ? body.tags.filter((tag) => typeof tag === 'string' && tag.trim()).map((tag) => tag.trim()).slice(0, 8)
      : typeof body.tags === 'string'
        ? body.tags.split(',').map((tag) => tag.trim()).filter(Boolean).slice(0, 8)
        : [];
    const entry = {
      id: `idx-${crypto.randomUUID()}`,
      title: title || domainOf(rawUrl),
      url: rawUrl,
      domain: domainOf(rawUrl),
      snippet: snippet || `Indexed page at ${rawUrl}`,
      tags,
      createdAt: new Date().toISOString(),
    };
    const entries = [entry, ...(await readEntries(env)).filter((item) => item.url !== rawUrl)];
    await writeEntries(env, entries);
    return json({ entry, entries }, 201);
  }

  const deleteMatch = path.match(/^\/api\/index\/([^/]+)$/);
  if (deleteMatch && request.method === 'DELETE') {
    const id = decodeURIComponent(deleteMatch[1]);
    const entries = (await readEntries(env)).filter((entry) => entry.id !== id);
    await writeEntries(env, entries);
    return json({ entries });
  }

  if (path === '/api/search' && request.method === 'POST') {
    let body;
    try {
      body = await request.json();
    } catch {
      return json({ error: 'Body JSON tidak sah.' }, 400);
    }

    const startedAt = Date.now();
    const query = typeof body.query === 'string' ? body.query.trim() : '';
    if (!query || query.length > 400) return json({ error: 'Query mesti antara 1 hingga 400 aksara.' }, 400);

    const tab = VALID_TABS.has(body.tab) ? body.tab : 'all';
    const provider = VALID_PROVIDERS.has(body.provider) ? body.provider : 'axiom';
    const region = VALID_REGIONS.has(body.region) ? body.region : 'all';
    const freshness = VALID_FRESHNESS.has(body.freshness) ? body.freshness : 'any';
    const safeSearch = VALID_SAFE_SEARCH.has(body.safeSearch) ? body.safeSearch : 'moderate';
    const siteFilter = typeof body.siteFilter === 'string' && /^[a-z0-9.-]+\.[a-z]{2,}$/i.test(body.siteFilter.trim())
      ? body.siteFilter.trim()
      : '';
    const effectiveQuery = siteFilter ? `site:${siteFilter} ${query}` : query;

    let results = [];
    const notes = [];
    if (provider === 'own') {
      results = await searchOwnIndex(env, query);
    } else {
      const ownResults = provider === 'all_combined' ? await searchOwnIndex(env, query) : [];
      const brave = await searchBrave(env, effectiveQuery, { region, freshness, safeSearch });
      if (brave.note) notes.push(brave.note);
      results = [...ownResults, ...brave.results];
      if (!brave.results.length && provider !== 'all_combined') {
        results = await searchOwnIndex(env, query);
        if (!results.length) notes.push('Tiada hasil web. Tetapkan Brave API key atau tambah halaman ke Own Index.');
      }
      if (provider === 'bing') notes.push('Bing provider belum dilaksanakan dalam Worker ini.');
    }

    const seen = new Set();
    results = results.filter((item) => {
      if (seen.has(item.url)) return false;
      seen.add(item.url);
      return true;
    });
    const sources = results.slice(0, 12).map((item, index) => ({
      index: index + 1,
      title: item.title,
      url: item.url,
      domain: item.domain,
    }));

    return json({
      query,
      effectiveQuery,
      tab,
      provider,
      providerStatusNote: notes.join(' ') || 'Gemini/AI answers tidak digunakan dalam backend ini.',
      aiSummary: '',
      sources,
      results,
      discussions: [],
      infobox: null,
      relatedQueries: [],
      searchTimeMs: Date.now() - startedAt,
      bangApplied: body.bangTrigger
        ? { trigger: String(body.bangTrigger), label: String(body.bangLabel || body.bangTrigger), siteFilter: siteFilter || undefined }
        : null,
    });
  }

  if (path === '/api/search/followup' || path === '/api/assistant' || path === '/api/proxy' || path === '/api/extension/download') {
    return json({ error: 'Endpoint ini tidak tersedia dalam backend Workers tanpa Gemini. Gunakan Node backend atau buang/ganti ciri berkaitan dalam UI.' }, 501);
  }

  return json({ error: 'Endpoint tidak dijumpai.' }, 404);
}

export default {
  async fetch(request, env) {
    const origin = env.ALLOWED_ORIGIN || '*';
    const response = await handle(request, env).catch((error) => {
      console.error('Worker request failed:', error);
      return json({ error: 'Ralat dalaman backend.' }, 500);
    });
    return withCors(response, origin);
  },
};
```

## 4. Simpan Brave API key (pilihan)

```bash
npx wrangler secret put BRAVE_SEARCH_API_KEY
```

Masukkan key pada prompt. Jangan commit API key ke repo atau masukkan dalam frontend.

## 5. Uji dan deploy secara manual

```bash
npx wrangler dev
```

Uji `http://localhost:8787/api/health`, kemudian deploy:

```bash
npx wrangler deploy
```

URL Worker biasanya berbentuk `https://axiom-search-api.<subdomain>.workers.dev`.

## 6. Tambah GitHub Actions workflow

Tambah GitHub Actions secrets di **Settings → Secrets and variables → Actions**:

- `CLOUDFLARE_API_TOKEN` — token dengan kebenaran Workers Scripts: Edit dan Workers KV Storage: Edit.
- `CLOUDFLARE_ACCOUNT_ID` — Account ID Cloudflare.

Kemudian cipta `.github/workflows/deploy-worker.yml`:

```yaml
name: Deploy Cloudflare Worker

on:
  push:
    branches: [main]
    paths:
      - 'src/index.js'
      - 'wrangler.jsonc'
      - '.github/workflows/deploy-worker.yml'
  workflow_dispatch:

jobs:
  deploy:
    runs-on: ubuntu-latest
    permissions:
      contents: read
    steps:
      - name: Checkout
        uses: actions/checkout@v4
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 22
      - name: Deploy Worker
        run: npx --yes wrangler@4 deploy --config wrangler.jsonc
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          CLOUDFLARE_ACCOUNT_ID: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
```

Selepas menambah fail workflow, push perubahan ke `main` atau jalankan workflow manual daripada tab **Actions**.

## 7. Sambungkan frontend sedia ada

Frontend dalam repo memanggil URL relatif seperti `fetch('/api/search')`. Worker mempunyai domain berasingan. Untuk sambungkannya, dalam semua panggilan API frontend, bina URL penuh daripada satu tetapan, contohnya:

```typescript
const API_BASE = import.meta.env.VITE_API_BASE_URL || '';
fetch(`${API_BASE}/api/search`, { /* pilihan request sedia ada */ });
```

Gunakan corak yang sama untuk `/api/index`, `/api/providers/status`, `/api/search/followup`, `/api/assistant`, dan `/api/proxy`. Untuk frontend Vite, set `VITE_API_BASE_URL` kepada URL Worker semasa build/deploy, tanpa slash di hujung. Selepas mengubah frontend, pastikan domain tersebut sepadan dengan `ALLOWED_ORIGIN` dalam konfigurasi Worker.

## Had penting dan keselamatan

- Versi ini tidak menggunakan Gemini, Bing, AI follow-up, AI Assistant, reader proxy, atau extension ZIP. AI answers dan pembaca halaman perlu dibuang/dimatikan di UI atau dilaksanakan semula secara berasingan.
- Endpoint Own Index `POST` dan `DELETE` terbuka kepada sesiapa yang boleh mencapai Worker. Untuk laman awam, jangan biarkan API tulis terbuka: lindungi dengan Cloudflare Access atau tambah pengesahan yang sesuai dan kemas kini frontend untuk menghantar token. Jangan letak token rahsia dalam kod frontend.
- Tambah Cloudflare rate limiting pada endpoint carian untuk mengurangkan penyalahgunaan kuota Brave.
- KV mempunyai consistency dan had operasi tersendiri; ia sesuai untuk contoh/MVP, bukan pangkalan data transaksi tinggi. Untuk indeks yang kerap ditulis, pertimbangkan D1.
- Deploy Worker sahaja tidak deploy frontend. Frontend boleh terus dihoskan di Vercel/Pages, dengan `VITE_API_BASE_URL` menunjuk ke Worker.
