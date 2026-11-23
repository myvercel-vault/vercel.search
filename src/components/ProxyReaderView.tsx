import { useEffect, useState } from 'react';
import {
  ArrowUpRight,
  BookOpen,
  Download,
  Highlighter,
  Monitor,
  Pin,
  RotateCw,
  ShieldCheck,
  Smartphone,
  Sparkles,
  StickyNote,
  Trash2,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import type {
  PageNote,
  ProxyPageData,
  ReaderViewportMode,
} from '../types/search';
import { isSafeExternalUrl } from '../utils/instantTools';

interface ProxyReaderViewProps {
  url: string;
  adBlockerEnabled: boolean;
  onToggleAdBlocker: () => void;
  viewportMode: ReaderViewportMode;
  onChangeViewportMode: (mode: ReaderViewportMode) => void;
  textZoom: number;
  onChangeTextZoom: (zoom: number) => void;
  isPinned: boolean;
  onTogglePin: (title: string, url: string) => void;
  notes: PageNote[];
  onAddNote: (url: string, pageTitle: string, noteText: string, highlightText?: string) => void;
  onDeleteNote: (id: string) => void;
  onDownloadPage: (page: ProxyPageData) => void;
  onOpenUrlInApp: (url: string, title?: string) => void;
  onAskAssistant: (page: ProxyPageData) => void;
}

export function ProxyReaderView({
  url,
  adBlockerEnabled,
  onToggleAdBlocker,
  viewportMode,
  onChangeViewportMode,
  textZoom,
  onChangeTextZoom,
  isPinned,
  onTogglePin,
  notes,
  onAddNote,
  onDeleteNote,
  onDownloadPage,
  onOpenUrlInApp,
  onAskAssistant,
}: ProxyReaderViewProps) {
  const [pageData, setPageData] = useState<ProxyPageData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [readingMode, setReadingMode] = useState(true);
  const [showNotes, setShowNotes] = useState(false);
  const [showBlockedList, setShowBlockedList] = useState(false);
  const [selectedHighlight, setSelectedHighlight] = useState<string>('');
  const [noteInput, setNoteInput] = useState('');

  const loadPage = async () => {
    if (!isSafeExternalUrl(url)) {
      setError('Invalid URL protocol.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/proxy?url=${encodeURIComponent(url)}&adBlock=${adBlockerEnabled ? 'true' : 'false'}`
      );
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to load page via proxy.');
      }
      setPageData(data as ProxyPageData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to fetch webpage.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadPage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, adBlockerEnabled]);

  const pageNotes = notes.filter((n) => n.url === url);
  const highlightedTexts = new Set(
    pageNotes.map((n) => n.highlightText).filter((h): h is string => Boolean(h))
  );

  const handleSaveNote = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = noteInput.trim();
    if (!trimmed && !selectedHighlight) return;
    onAddNote(
      url,
      pageData?.title || url,
      trimmed || 'Highlighted passage',
      selectedHighlight || undefined
    );
    setNoteInput('');
    setSelectedHighlight('');
  };

  return (
    <div className="flex flex-col h-full rounded-xl border border-neutral-200 dark:border-white/15 bg-white/90 dark:bg-neutral-950/90 overflow-hidden">
      {/* Reader Browser Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-neutral-200 dark:border-white/10 px-3.5 py-2.5 bg-neutral-50/90 dark:bg-black/70">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <button
            type="button"
            onClick={() => void loadPage()}
            title="Reload page"
            className="p-1.5 rounded-md border border-neutral-200 dark:border-white/15 text-neutral-600 dark:text-neutral-300 hover:text-neutral-950 dark:hover:text-white shrink-0"
          >
            <RotateCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <div className="min-w-0 flex-1 rounded-md border border-neutral-200 dark:border-white/15 bg-white dark:bg-neutral-950 px-2.5 py-1 text-xs font-mono text-neutral-600 dark:text-neutral-300 truncate">
            {url}
          </div>

          {isSafeExternalUrl(url) && (
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              title="Open original page in browser"
              className="p-1.5 rounded-md border border-neutral-200 dark:border-white/15 text-neutral-600 dark:text-neutral-300 hover:text-neutral-950 dark:hover:text-white shrink-0"
            >
              <ArrowUpRight className="h-3.5 w-3.5" />
            </a>
          )}
        </div>

        {/* Controls: Desktop/Mobile, Reading Mode, Zoom, Ad Blocker, Pin, Notes, Download, AI */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          {/* Desktop / Mobile View Switch */}
          <div className="inline-flex rounded-md border border-neutral-200 dark:border-white/15 bg-white dark:bg-black p-0.5">
            <button
              type="button"
              onClick={() => onChangeViewportMode('desktop')}
              title="Desktop View"
              className={`inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium ${
                viewportMode === 'desktop'
                  ? 'bg-neutral-950 text-white dark:bg-white dark:text-black'
                  : 'text-neutral-500 dark:text-neutral-400'
              }`}
            >
              <Monitor className="h-3 w-3" />
              <span className="hidden sm:inline">Desktop</span>
            </button>
            <button
              type="button"
              onClick={() => onChangeViewportMode('mobile')}
              title="Mobile View"
              className={`inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium ${
                viewportMode === 'mobile'
                  ? 'bg-neutral-950 text-white dark:bg-white dark:text-black'
                  : 'text-neutral-500 dark:text-neutral-400'
              }`}
            >
              <Smartphone className="h-3 w-3" />
              <span className="hidden sm:inline">Mobile</span>
            </button>
          </div>

          {/* Reading Mode */}
          <button
            type="button"
            onClick={() => setReadingMode((v) => !v)}
            aria-pressed={readingMode}
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md border text-[11px] font-medium ${
              readingMode
                ? 'border-neutral-950 bg-neutral-950 text-white dark:border-white dark:bg-white dark:text-black'
                : 'border-neutral-200 dark:border-white/15 text-neutral-700 dark:text-neutral-300'
            }`}
          >
            <BookOpen className="h-3 w-3" />
            <span>Reading</span>
          </button>

          {/* Text Zoom In/Out */}
          <div className="inline-flex items-center rounded-md border border-neutral-200 dark:border-white/15 bg-white dark:bg-black">
            <button
              type="button"
              onClick={() => onChangeTextZoom(Math.max(80, textZoom - 10))}
              aria-label="Zoom out text"
              className="p-1.5 text-neutral-600 dark:text-neutral-300 hover:text-neutral-950 dark:hover:text-white"
            >
              <ZoomOut className="h-3 w-3" />
            </button>
            <span className="px-1.5 font-mono text-[11px] tabular-nums text-neutral-700 dark:text-neutral-300">
              {textZoom}%
            </span>
            <button
              type="button"
              onClick={() => onChangeTextZoom(Math.min(160, textZoom + 10))}
              aria-label="Zoom in text"
              className="p-1.5 text-neutral-600 dark:text-neutral-300 hover:text-neutral-950 dark:hover:text-white"
            >
              <ZoomIn className="h-3 w-3" />
            </button>
          </div>

          {/* Ad Blocker */}
          <button
            type="button"
            onClick={onToggleAdBlocker}
            onContextMenu={(e) => {
              e.preventDefault();
              setShowBlockedList((v) => !v);
            }}
            title="Toggle Ad Blocker"
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md border text-[11px] font-medium ${
              adBlockerEnabled
                ? 'border-neutral-950 bg-neutral-950 text-white dark:border-white dark:bg-white dark:text-black'
                : 'border-neutral-200 dark:border-white/15 text-neutral-500'
            }`}
          >
            <ShieldCheck className="h-3 w-3" />
            <span className="tabular-nums">
              {adBlockerEnabled
                ? `AdBlock (${pageData?.blockedAdsCount ?? 0})`
                : 'AdBlock Off'}
            </span>
          </button>

          {pageData && pageData.blockedDomains.length > 0 && (
            <button
              type="button"
              onClick={() => setShowBlockedList((v) => !v)}
              className="text-[11px] underline text-neutral-500 hover:text-neutral-950 dark:hover:text-white"
            >
              Trackers
            </button>
          )}

          {/* Pin Site */}
          <button
            type="button"
            onClick={() => onTogglePin(pageData?.title || url, url)}
            aria-pressed={isPinned}
            title={isPinned ? 'Unpin site' : 'Pin favourite site'}
            className={`inline-flex items-center gap-1 px-2 py-1 rounded-md border text-[11px] font-medium ${
              isPinned
                ? 'border-neutral-950 bg-neutral-950 text-white dark:border-white dark:bg-white dark:text-black'
                : 'border-neutral-200 dark:border-white/15 text-neutral-700 dark:text-neutral-300'
            }`}
          >
            <Pin className="h-3 w-3" />
            <span>{isPinned ? 'Pinned' : 'Pin'}</span>
          </button>

          {/* Notes & Highlights */}
          <button
            type="button"
            onClick={() => setShowNotes((v) => !v)}
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md border text-[11px] font-medium ${
              showNotes
                ? 'border-neutral-950 bg-neutral-950 text-white dark:border-white dark:bg-white dark:text-black'
                : 'border-neutral-200 dark:border-white/15 text-neutral-700 dark:text-neutral-300'
            }`}
          >
            <StickyNote className="h-3 w-3" />
            <span className="tabular-nums">Notes ({pageNotes.length})</span>
          </button>

          {pageData && (
            <>
              <button
                type="button"
                onClick={() => onDownloadPage(pageData)}
                title="Save clean Markdown snapshot to Download Manager"
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-neutral-200 dark:border-white/15 text-[11px] font-medium text-neutral-700 dark:text-neutral-300 hover:border-neutral-900 dark:hover:border-white/40"
              >
                <Download className="h-3 w-3" />
                <span>Save</span>
              </button>

              <button
                type="button"
                onClick={() => onAskAssistant(pageData)}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-neutral-200 dark:border-white/15 text-[11px] font-medium text-neutral-700 dark:text-neutral-300 hover:border-neutral-900 dark:hover:border-white/40"
              >
                <Sparkles className="h-3 w-3" />
                <span>Summarize</span>
              </button>
            </>
          )}
        </div>
      </div>

      {showBlockedList && pageData && (
        <div className="border-b border-neutral-200 dark:border-white/10 bg-neutral-100/80 dark:bg-white/[0.04] px-4 py-2 text-xs text-neutral-600 dark:text-neutral-300">
          <span className="font-semibold">Ad Blocker Report:</span> Stripped{' '}
          <span className="font-mono tabular-nums">{pageData.blockedAdsCount}</span> tracker/ad
          elements
          {pageData.blockedDomains.length > 0
            ? ` (${pageData.blockedDomains.join(', ')})`
            : '.'}
        </div>
      )}

      {/* Main Reader Content + Optional Notes Drawer */}
      <div className="flex-1 flex flex-col lg:flex-row min-h-[480px]">
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 flex justify-center bg-neutral-50/40 dark:bg-black/40">
          <div
            className={`w-full transition-all duration-200 ${
              viewportMode === 'mobile'
                ? 'max-w-[390px] rounded-2xl border border-neutral-300 dark:border-white/20 bg-white dark:bg-neutral-950 p-5 shadow-lg'
                : 'max-w-[780px]'
            }`}
            style={{ fontSize: `${textZoom}%` }}
          >
            {loading ? (
              <div className="space-y-3 animate-pulse">
                <div className="h-7 w-3/4 rounded bg-neutral-200 dark:bg-white/10" />
                <div className="h-4 w-1/3 rounded bg-neutral-200 dark:bg-white/10" />
                <div className="h-4 w-full rounded bg-neutral-200 dark:bg-white/10 mt-6" />
                <div className="h-4 w-11/12 rounded bg-neutral-200 dark:bg-white/10" />
                <div className="h-4 w-5/6 rounded bg-neutral-200 dark:bg-white/10" />
              </div>
            ) : error ? (
              <div className="rounded-xl border border-neutral-200 dark:border-white/15 p-6 text-center">
                <p className="font-display text-base font-semibold text-neutral-950 dark:text-white">
                  Unable to load page inside proxy reader
                </p>
                <p className="mt-1.5 text-sm text-neutral-500 dark:text-neutral-400">{error}</p>
                {isSafeExternalUrl(url) && (
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-4 inline-flex items-center gap-1.5 rounded-md bg-neutral-950 text-white dark:bg-white dark:text-black px-4 py-2 text-xs font-medium"
                  >
                    <span>Open Directly in Browser</span>
                    <ArrowUpRight className="h-3.5 w-3.5" />
                  </a>
                )}
              </div>
            ) : pageData ? (
              <article>
                <div className="text-xs font-mono text-neutral-500 dark:text-neutral-400 mb-2">
                  {pageData.domain} · {pageData.readingTimeMin} min read
                </div>
                <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-neutral-950 dark:text-white leading-tight">
                  {pageData.title}
                </h1>
                {pageData.description && (
                  <p className="mt-3 text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
                    {pageData.description}
                  </p>
                )}

                <p className="mt-3 text-[11px] text-neutral-400 dark:text-neutral-500">
                  Tip: Click any paragraph below to highlight and attach a note.
                </p>

                <div className="mt-6 space-y-4">
                  {pageData.sections.map((sec, i) => {
                    const isHighlighted = highlightedTexts.has(sec.text);
                    const isSelected = selectedHighlight === sec.text;

                    if (sec.tag === 'h1' || sec.tag === 'h2' || sec.tag === 'h3') {
                      return (
                        <h2
                          key={i}
                          className="font-display text-lg font-semibold text-neutral-950 dark:text-white pt-2"
                        >
                          {sec.text}
                        </h2>
                      );
                    }

                    return (
                      <div
                        key={i}
                        onClick={() => {
                          setSelectedHighlight(sec.text);
                          setShowNotes(true);
                        }}
                        className={`group relative cursor-pointer rounded-lg px-2.5 py-1.5 -mx-2.5 transition-colors ${
                          isHighlighted
                            ? 'bg-neutral-200/80 dark:bg-white/15 text-neutral-950 dark:text-white'
                            : isSelected
                            ? 'ring-1 ring-neutral-900 dark:ring-white/50 bg-neutral-100/70 dark:bg-white/[0.06]'
                            : 'hover:bg-neutral-100/60 dark:hover:bg-white/[0.03]'
                        }`}
                      >
                        <p className="text-[1em] leading-relaxed text-neutral-800 dark:text-neutral-200">
                          {sec.text}
                        </p>
                        <span className="hidden group-hover:inline-flex items-center gap-1 mt-1 text-[10px] font-mono text-neutral-400">
                          <Highlighter className="h-2.5 w-2.5" />
                          <span>Click to highlight & note</span>
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Extracted Navigation Links when Reading Mode is Off */}
                {!readingMode && pageData.links.length > 0 && (
                  <div className="mt-8 pt-6 border-t border-neutral-200 dark:border-white/10">
                    <h3 className="font-display text-sm font-semibold text-neutral-950 dark:text-white mb-3">
                      Page Links ({pageData.links.length})
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {pageData.links.map((lnk) => (
                        <button
                          key={lnk.href}
                          type="button"
                          onClick={() => onOpenUrlInApp(lnk.href, lnk.text)}
                          className="flex items-center justify-between gap-2 rounded-lg border border-neutral-200 dark:border-white/10 px-3 py-2 text-left text-xs hover:border-neutral-900 dark:hover:border-white/35 transition-colors"
                        >
                          <span className="truncate text-neutral-800 dark:text-neutral-200">
                            {lnk.text}
                          </span>
                          <ArrowUpRight className="h-3 w-3 shrink-0 text-neutral-400" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </article>
            ) : null}
          </div>
        </div>

        {/* Notes & Highlights Side Panel */}
        {showNotes && (
          <aside className="w-full lg:w-80 border-t lg:border-t-0 lg:border-l border-neutral-200 dark:border-white/10 bg-white dark:bg-neutral-950 p-4 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-sm font-semibold">Notes & Highlights</h3>
              <span className="font-mono text-xs text-neutral-400 tabular-nums">
                {pageNotes.length}
              </span>
            </div>

            <form onSubmit={handleSaveNote} className="space-y-2.5">
              {selectedHighlight && (
                <div className="rounded-lg border border-neutral-200 dark:border-white/15 bg-neutral-100 dark:bg-white/5 p-2.5 text-xs text-neutral-700 dark:text-neutral-300">
                  <div className="font-mono text-[10px] text-neutral-400 mb-1">
                    Highlighted quote:
                  </div>
                  <p className="line-clamp-3 italic">"{selectedHighlight}"</p>
                </div>
              )}

              <textarea
                value={noteInput}
                onChange={(e) => setNoteInput(e.target.value)}
                rows={3}
                placeholder="Write a note for this page..."
                className="w-full rounded-lg border border-neutral-200 dark:border-white/15 bg-transparent px-3 py-2 text-xs focus:outline-none focus:border-neutral-900 dark:focus:border-white"
              />

              <div className="flex items-center gap-2">
                <button
                  type="submit"
                  className="flex-1 rounded-md bg-neutral-950 text-white dark:bg-white dark:text-black py-1.5 text-xs font-medium"
                >
                  Save Note
                </button>
                {selectedHighlight && (
                  <button
                    type="button"
                    onClick={() => setSelectedHighlight('')}
                    className="px-2.5 py-1.5 text-xs text-neutral-500"
                  >
                    Clear Quote
                  </button>
                )}
              </div>
            </form>

            <div className="flex-1 overflow-y-auto space-y-2.5">
              {pageNotes.length === 0 ? (
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  Click any paragraph in the reader to highlight it, or add a note above.
                </p>
              ) : (
                pageNotes.map((note) => (
                  <div
                    key={note.id}
                    className="rounded-lg border border-neutral-200 dark:border-white/10 p-3 text-xs space-y-1.5"
                  >
                    {note.highlightText && (
                      <p className="text-neutral-500 dark:text-neutral-400 italic line-clamp-3">
                        "{note.highlightText}"
                      </p>
                    )}
                    <p className="text-neutral-900 dark:text-neutral-100">{note.noteText}</p>
                    <div className="flex items-center justify-between text-[10px] text-neutral-400 pt-1">
                      <span>{new Date(note.createdAt).toLocaleDateString()}</span>
                      <button
                        type="button"
                        onClick={() => onDeleteNote(note.id)}
                        aria-label="Delete note"
                        className="hover:text-neutral-950 dark:hover:text-white"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}
