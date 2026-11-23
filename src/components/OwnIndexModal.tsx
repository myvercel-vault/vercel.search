import { useEffect, useState } from 'react';
import { ArrowUpRight, Database, Globe, Plus, Search, Trash2, X } from 'lucide-react';
import type { CustomSearchEngine, OwnIndexEntry } from '../types/search';
import { isSafeExternalUrl, isValidSearchTemplate } from '../utils/instantTools';

interface OwnIndexModalProps {
  isOpen: boolean;
  onClose: () => void;
  customEngines: CustomSearchEngine[];
  onAddCustomEngine: (engine: Omit<CustomSearchEngine, 'id'>) => void;
  onDeleteCustomEngine: (id: string) => void;
  onSearchOwnIndex: (query: string) => void;
  onRunCustomEngine: (engine: CustomSearchEngine, query: string) => void;
  onIndexChanged?: () => void;
}

export function OwnIndexModal({
  isOpen,
  onClose,
  customEngines,
  onAddCustomEngine,
  onDeleteCustomEngine,
  onSearchOwnIndex,
  onRunCustomEngine,
  onIndexChanged,
}: OwnIndexModalProps) {
  const [activeSection, setActiveSection] = useState<'index' | 'engines'>('index');
  const [entries, setEntries] = useState<OwnIndexEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [indexError, setIndexError] = useState<string | null>(null);

  // Add to Own Index form
  const [urlInput, setUrlInput] = useState('');
  const [titleInput, setTitleInput] = useState('');
  const [snippetInput, setSnippetInput] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [autoCrawl, setAutoCrawl] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Add Custom %s Engine form
  const [engName, setEngName] = useState('');
  const [engShortcut, setEngShortcut] = useState('');
  const [engTemplate, setEngTemplate] = useState('https://search.brave.com/search?q=%s');
  const [engOpenMode, setEngOpenMode] = useState<'proxy' | 'external'>('proxy');
  const [engError, setEngError] = useState<string | null>(null);
  const [testQuery, setTestQuery] = useState('privacy search engine');

  const fetchIndex = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/index');
      const data = await res.json();
      if (Array.isArray(data.entries)) {
        setEntries(data.entries);
      }
    } catch {
      // Ignore network hiccup
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      void fetchIndex();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleAddIndexEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    setIndexError(null);
    if (!isSafeExternalUrl(urlInput)) {
      setIndexError('Please enter a valid https:// or http:// URL.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/index', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: urlInput.trim(),
          title: titleInput.trim(),
          snippet: snippetInput.trim(),
          tags: tagsInput,
          autoCrawl,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to index URL.');
      }
      setEntries(data.entries);
      setUrlInput('');
      setTitleInput('');
      setSnippetInput('');
      setTagsInput('');
      onIndexChanged?.();
    } catch (err) {
      setIndexError(err instanceof Error ? err.message : 'Unable to add entry.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteEntry = async (id: string) => {
    try {
      const res = await fetch(`/api/index/${encodeURIComponent(id)}`, { method: 'DELETE' });
      const data = await res.json();
      if (Array.isArray(data.entries)) {
        setEntries(data.entries);
        onIndexChanged?.();
      }
    } catch {
      // Ignore
    }
  };

  const handleCreateEngine = (e: React.FormEvent) => {
    e.preventDefault();
    setEngError(null);
    if (!engName.trim()) {
      setEngError('Engine name is required.');
      return;
    }
    if (!isValidSearchTemplate(engTemplate.trim())) {
      setEngError('URL template must start with https:// or http:// and include %s.');
      return;
    }
    onAddCustomEngine({
      name: engName.trim(),
      shortcut: engShortcut.trim() || `!${engName.trim().toLowerCase().slice(0, 6)}`,
      urlTemplate: engTemplate.trim(),
      openMode: engOpenMode,
    });
    setEngName('');
    setEngShortcut('');
    setEngTemplate('');
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Own Search Index and Custom Engines"
    >
      <div onClick={onClose} className="fixed inset-0 bg-black/65 backdrop-blur-xs" />

      <div className="relative z-10 w-full max-w-2xl rounded-xl border border-neutral-200 dark:border-white/15 bg-white dark:bg-neutral-950 text-neutral-950 dark:text-white shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        <div className="flex items-center justify-between gap-4 border-b border-neutral-200 dark:border-white/10 px-6 py-4">
          <div className="flex items-center gap-3">
            <Database className="h-4 w-4 text-neutral-500" />
            <h2 className="font-display text-base font-semibold">
              Own Index & Custom Search Engines
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="p-1.5 rounded-md text-neutral-500 hover:text-neutral-950 dark:hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Section Switcher */}
        <div className="flex items-center gap-2 border-b border-neutral-200 dark:border-white/10 px-6 py-2.5 bg-neutral-50/70 dark:bg-black/40">
          <button
            type="button"
            onClick={() => setActiveSection('index')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              activeSection === 'index'
                ? 'bg-neutral-950 text-white dark:bg-white dark:text-black'
                : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-950 dark:hover:text-white'
            }`}
          >
            Own Search Index ({entries.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveSection('engines')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              activeSection === 'engines'
                ? 'bg-neutral-950 text-white dark:bg-white dark:text-black'
                : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-950 dark:hover:text-white'
            }`}
          >
            Custom %s Search Engines ({customEngines.length})
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {activeSection === 'index' ? (
            <>
              <form
                onSubmit={handleAddIndexEntry}
                className="rounded-xl border border-neutral-200 dark:border-white/12 p-4 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">
                    Index a New Webpage
                  </h3>
                  <label className="inline-flex items-center gap-1.5 text-xs cursor-pointer">
                    <input
                      type="checkbox"
                      checked={autoCrawl}
                      onChange={(e) => setAutoCrawl(e.target.checked)}
                      className="accent-neutral-950 dark:accent-white"
                    />
                    <span>Auto-fetch title & description</span>
                  </label>
                </div>

                <input
                  type="url"
                  required
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  placeholder="https://example.com/article"
                  className="w-full rounded-lg border border-neutral-200 dark:border-white/15 bg-transparent px-3 py-2 text-xs font-mono focus:outline-none focus:border-neutral-900 dark:focus:border-white"
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <input
                    type="text"
                    value={titleInput}
                    onChange={(e) => setTitleInput(e.target.value)}
                    placeholder="Title (optional if auto-fetch)"
                    className="rounded-lg border border-neutral-200 dark:border-white/15 bg-transparent px-3 py-2 text-xs focus:outline-none focus:border-neutral-900 dark:focus:border-white"
                  />
                  <input
                    type="text"
                    value={tagsInput}
                    onChange={(e) => setTagsInput(e.target.value)}
                    placeholder="Tags (comma separated: docs, ai)"
                    className="rounded-lg border border-neutral-200 dark:border-white/15 bg-transparent px-3 py-2 text-xs focus:outline-none focus:border-neutral-900 dark:focus:border-white"
                  />
                </div>

                <input
                  type="text"
                  value={snippetInput}
                  onChange={(e) => setSnippetInput(e.target.value)}
                  placeholder="Summary snippet (optional if auto-fetch)"
                  className="w-full rounded-lg border border-neutral-200 dark:border-white/15 bg-transparent px-3 py-2 text-xs focus:outline-none focus:border-neutral-900 dark:focus:border-white"
                />

                {indexError && <p className="text-xs text-red-500">{indexError}</p>}

                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-1.5 rounded-md bg-neutral-950 text-white dark:bg-white dark:text-black px-4 py-2 text-xs font-medium disabled:opacity-50"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>{submitting ? 'Indexing...' : 'Add to Own Index'}</span>
                </button>
              </form>

              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">
                    Indexed Pages
                  </h3>
                  <button
                    type="button"
                    onClick={() => {
                      onSearchOwnIndex('api');
                      onClose();
                    }}
                    className="inline-flex items-center gap-1 text-xs underline text-neutral-600 dark:text-neutral-300"
                  >
                    <Search className="h-3 w-3" />
                    <span>Search Own Index</span>
                  </button>
                </div>

                {loading ? (
                  <p className="text-xs text-neutral-500">Loading index...</p>
                ) : entries.length === 0 ? (
                  <p className="text-xs text-neutral-500">No pages indexed yet.</p>
                ) : (
                  entries.map((entry) => (
                    <div
                      key={entry.id}
                      className="flex items-start justify-between gap-3 rounded-lg border border-neutral-200 dark:border-white/10 p-3.5"
                    >
                      <div className="min-w-0">
                        <a
                          href={entry.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-sm font-semibold hover:underline"
                        >
                          <span className="truncate">{entry.title}</span>
                          <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-neutral-400" />
                        </a>
                        <div className="text-[11px] font-mono text-neutral-400 truncate">
                          {entry.url}
                        </div>
                        <p className="mt-1 text-xs text-neutral-600 dark:text-neutral-400 line-clamp-2">
                          {entry.snippet}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => void handleDeleteEntry(entry.id)}
                        aria-label={`Remove ${entry.title}`}
                        className="p-1 text-neutral-400 hover:text-neutral-950 dark:hover:text-white shrink-0"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </>
          ) : (
            <>
              <form
                onSubmit={handleCreateEngine}
                className="rounded-xl border border-neutral-200 dark:border-white/12 p-4 space-y-3"
              >
                <h3 className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">
                  Add Custom Search Engine (supports %s placeholder)
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <input
                    type="text"
                    required
                    value={engName}
                    onChange={(e) => setEngName(e.target.value)}
                    placeholder="Name (e.g. Brave Web)"
                    className="rounded-lg border border-neutral-200 dark:border-white/15 bg-transparent px-3 py-2 text-xs focus:outline-none focus:border-neutral-900 dark:focus:border-white"
                  />
                  <input
                    type="text"
                    value={engShortcut}
                    onChange={(e) => setEngShortcut(e.target.value)}
                    placeholder="Shortcut (e.g. !brave)"
                    className="rounded-lg border border-neutral-200 dark:border-white/15 bg-transparent px-3 py-2 text-xs font-mono focus:outline-none focus:border-neutral-900 dark:focus:border-white"
                  />
                </div>

                <input
                  type="url"
                  required
                  value={engTemplate}
                  onChange={(e) => setEngTemplate(e.target.value)}
                  placeholder="https://search.brave.com/search?q=%s"
                  className="w-full rounded-lg border border-neutral-200 dark:border-white/15 bg-transparent px-3 py-2 text-xs font-mono focus:outline-none focus:border-neutral-900 dark:focus:border-white"
                />

                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3 text-xs">
                    <span className="text-neutral-500">Launch mode:</span>
                    <label className="inline-flex items-center gap-1 cursor-pointer">
                      <input
                        type="radio"
                        checked={engOpenMode === 'proxy'}
                        onChange={() => setEngOpenMode('proxy')}
                      />
                      <span>Open in App (Proxy)</span>
                    </label>
                    <label className="inline-flex items-center gap-1 cursor-pointer">
                      <input
                        type="radio"
                        checked={engOpenMode === 'external'}
                        onChange={() => setEngOpenMode('external')}
                      />
                      <span>External Tab</span>
                    </label>
                  </div>

                  <button
                    type="submit"
                    className="inline-flex items-center gap-1.5 rounded-md bg-neutral-950 text-white dark:bg-white dark:text-black px-4 py-1.5 text-xs font-medium"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Add Engine</span>
                  </button>
                </div>
                {engError && <p className="text-xs text-red-500">{engError}</p>}
              </form>

              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">
                    Configured %s Engines
                  </h3>
                  <input
                    type="text"
                    value={testQuery}
                    onChange={(e) => setTestQuery(e.target.value)}
                    placeholder="Test query..."
                    className="w-48 rounded-md border border-neutral-200 dark:border-white/15 bg-transparent px-2.5 py-1 text-xs focus:outline-none"
                  />
                </div>

                {customEngines.map((eng) => (
                  <div
                    key={eng.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border border-neutral-200 dark:border-white/10 p-3.5"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <Globe className="h-3.5 w-3.5 text-neutral-400 shrink-0" />
                        <span className="text-sm font-semibold">{eng.name}</span>
                        <span className="font-mono text-xs text-neutral-500">{eng.shortcut}</span>
                      </div>
                      <div className="mt-1 text-[11px] font-mono text-neutral-400 truncate">
                        {eng.urlTemplate}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          onRunCustomEngine(eng, testQuery || 'search');
                          onClose();
                        }}
                        className="rounded-md border border-neutral-200 dark:border-white/15 px-3 py-1 text-xs font-medium hover:border-neutral-900 dark:hover:border-white/40"
                      >
                        Run Query
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteCustomEngine(eng.id)}
                        aria-label={`Delete ${eng.name}`}
                        className="p-1 text-neutral-400 hover:text-neutral-950 dark:hover:text-white"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
