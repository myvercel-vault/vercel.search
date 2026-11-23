import {
  AppWindow,
  ArrowUpRight,
  Bookmark,
  ExternalLink,
  Image as ImageIcon,
  MessageSquare,
  Pin,
  Play,
  Search,
} from 'lucide-react';
import type {
  BookmarkItem,
  DiscussionItem,
  PinnedSite,
  SearchResultItem,
  SearchTab,
} from '../types/search';
import { isSafeExternalUrl } from '../utils/instantTools';

interface ResultsListProps {
  tab: SearchTab;
  results: SearchResultItem[];
  discussions: DiscussionItem[];
  relatedQueries: string[];
  highlightedCitation: number | null;
  bookmarks: BookmarkItem[];
  pinnedSites: PinnedSite[];
  onToggleBookmark: (item: SearchResultItem) => void;
  onTogglePin: (title: string, url: string) => void;
  onOpenInApp: (url: string, title: string) => void;
  onSelectRelatedQuery: (q: string) => void;
}

function DomainMonogram({ domain }: { domain: string }) {
  const initial = (domain[0] || 'W').toUpperCase();
  return (
    <span
      aria-hidden="true"
      className="inline-flex h-6 w-6 items-center justify-center rounded-md border border-neutral-200 dark:border-white/15 bg-neutral-100 dark:bg-white/10 font-mono text-xs font-semibold text-neutral-800 dark:text-neutral-200 shrink-0"
    >
      {initial}
    </span>
  );
}

export function ResultsList({
  tab,
  results,
  discussions,
  relatedQueries,
  highlightedCitation,
  bookmarks,
  pinnedSites,
  onToggleBookmark,
  onTogglePin,
  onOpenInApp,
  onSelectRelatedQuery,
}: ResultsListProps) {
  const bookmarkedUrls = new Set(bookmarks.map((b) => b.url));
  const pinnedUrls = new Set(pinnedSites.map((p) => p.url));
  const safeResults = results.filter((r) => isSafeExternalUrl(r.url));
  const safeDiscussions = discussions.filter((d) => isSafeExternalUrl(d.url));

  const handlePointerMove = (e: React.PointerEvent<HTMLElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty('--mouse-x', `${e.clientX - rect.left}px`);
    e.currentTarget.style.setProperty('--mouse-y', `${e.clientY - rect.top}px`);
  };

  if (safeResults.length === 0 && safeDiscussions.length === 0) {
    return (
      <div className="rounded-xl border border-neutral-200 dark:border-white/15 bg-white/70 dark:bg-neutral-950/70 p-8 text-center">
        <p className="font-display text-base font-semibold text-neutral-950 dark:text-white">
          No web sources matched this filter combination
        </p>
        <p className="mt-1.5 text-sm text-neutral-500 dark:text-neutral-400">
          Try switching the search provider, widening Freshness or Region, or rephrasing your query.
        </p>
      </div>
    );
  }

  if (tab === 'images') {
    return (
      <div className="space-y-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {safeResults.map((item) => {
            const isBookmarked = bookmarkedUrls.has(item.url);
            return (
              <article
                key={item.id}
                onPointerMove={handlePointerMove}
                className="spotlight-card group flex flex-col justify-between rounded-xl border border-neutral-200 dark:border-white/12 bg-white/80 dark:bg-neutral-950/80 overflow-hidden transition-colors hover:border-neutral-400 dark:hover:border-white/30"
              >
                <button
                  type="button"
                  onClick={() => onOpenInApp(item.url, item.title)}
                  className="block w-full text-left p-4"
                >
                  <div className="aspect-[16/10] w-full rounded-lg border border-neutral-200/80 dark:border-white/10 bg-gradient-to-br from-neutral-100 via-neutral-50 to-neutral-200 dark:from-neutral-900 dark:via-black dark:to-neutral-900 flex flex-col items-center justify-center p-4 text-center">
                    <ImageIcon className="h-7 w-7 text-neutral-400 dark:text-neutral-500 mb-2" />
                    <span className="font-mono text-xs text-neutral-600 dark:text-neutral-300 truncate max-w-full">
                      {item.domain}
                    </span>
                    {item.metaLabel && (
                      <span className="mt-1 text-[11px] text-neutral-400 dark:text-neutral-500">
                        {item.metaLabel}
                      </span>
                    )}
                  </div>

                  <h3 className="mt-3 font-display text-sm font-semibold text-neutral-950 dark:text-white group-hover:underline underline-offset-2 line-clamp-2">
                    {item.title}
                  </h3>
                  <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400 line-clamp-2">
                    {item.snippet}
                  </p>
                </button>

                <div className="flex items-center justify-between gap-2 px-4 py-2.5 border-t border-neutral-200/70 dark:border-white/10 text-xs text-neutral-500 dark:text-neutral-400">
                  <span className="truncate font-mono">{item.domain}</span>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => onToggleBookmark(item)}
                      aria-label={isBookmarked ? 'Remove bookmark' : 'Save bookmark'}
                      className={`p-1 rounded transition-colors ${
                        isBookmarked
                          ? 'text-neutral-950 dark:text-white'
                          : 'text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
                      }`}
                    >
                      <Bookmark className={`h-3.5 w-3.5 ${isBookmarked ? 'fill-current' : ''}`} />
                    </button>
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`Open ${item.title}`}
                      className="p-1 text-neutral-400 hover:text-neutral-950 dark:hover:text-white"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    );
  }

  if (tab === 'discussions') {
    const items =
      safeDiscussions.length > 0
        ? safeDiscussions
        : safeResults.map((r) => ({
            id: r.id,
            platform: r.sourceName || r.domain,
            title: r.title,
            url: r.url,
            domain: r.domain,
            snippet: r.snippet,
            meta: r.publishedAt,
          }));

    return (
      <div className="space-y-4">
        {items.map((thread) => (
          <article
            key={thread.id}
            onPointerMove={handlePointerMove}
            className="spotlight-card rounded-xl border border-neutral-200 dark:border-white/12 bg-white/80 dark:bg-neutral-950/80 p-4 sm:p-5"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400 min-w-0">
                <MessageSquare className="h-3.5 w-3.5 shrink-0" />
                <span className="font-medium text-neutral-800 dark:text-neutral-200">
                  {thread.platform}
                </span>
                <span aria-hidden="true">·</span>
                <span className="font-mono truncate">{thread.domain}</span>
                {thread.meta && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span className="tabular-nums">{thread.meta}</span>
                  </>
                )}
              </div>

              <button
                type="button"
                onClick={() => onOpenInApp(thread.url, thread.title)}
                className="inline-flex items-center gap-1 rounded-md border border-neutral-200 dark:border-white/15 px-2.5 py-1 text-[11px] font-medium hover:border-neutral-900 dark:hover:border-white/40 shrink-0"
              >
                <AppWindow className="h-3 w-3" />
                <span>Open in App</span>
              </button>
            </div>
            <a
              href={thread.url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-flex items-center gap-1.5 font-display text-base sm:text-[17px] font-semibold text-neutral-950 dark:text-white hover:underline underline-offset-4"
            >
              <span>{thread.title}</span>
              <ArrowUpRight className="h-4 w-4 shrink-0 text-neutral-400" />
            </a>
            {thread.snippet && (
              <p className="mt-1.5 text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">
                {thread.snippet}
              </p>
            )}
          </article>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="divide-y divide-neutral-200/80 dark:divide-white/10">
        {safeResults.map((item) => {
          const isBookmarked = bookmarkedUrls.has(item.url);
          const isPinned = pinnedUrls.has(item.url);
          const isHighlighted =
            highlightedCitation !== null && item.citationIndex === highlightedCitation;

          return (
            <article
              key={item.id}
              id={item.citationIndex ? `source-${item.citationIndex}` : undefined}
              className={`py-5 first:pt-1 transition-colors duration-200 ${
                isHighlighted
                  ? 'px-4 -mx-4 rounded-xl bg-neutral-100/90 dark:bg-white/[0.06] ring-1 ring-neutral-900/30 dark:ring-white/40'
                  : ''
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <DomainMonogram domain={item.domain} />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400">
                      <span className="font-medium text-neutral-800 dark:text-neutral-200 truncate">
                        {item.sourceName || item.domain}
                      </span>
                      {item.providerBadge && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="font-mono">{item.providerBadge}</span>
                        </>
                      )}
                      {item.publishedAt && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="tabular-nums whitespace-nowrap">{item.publishedAt}</span>
                        </>
                      )}
                      {item.citationIndex && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="font-mono tabular-nums">[{item.citationIndex}]</span>
                        </>
                      )}
                    </div>
                    <div className="text-xs font-mono text-neutral-400 dark:text-neutral-500 truncate">
                      {item.breadcrumb}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => onOpenInApp(item.url, item.title)}
                    className="inline-flex items-center gap-1 rounded-md border border-neutral-200 dark:border-white/15 px-2.5 py-1 text-[11px] font-medium text-neutral-700 dark:text-neutral-300 hover:border-neutral-900 dark:hover:border-white/40 whitespace-nowrap"
                  >
                    <AppWindow className="h-3 w-3" />
                    <span>Open in App</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onTogglePin(item.title, item.url)}
                    aria-label={isPinned ? `Unpin ${item.title}` : `Pin ${item.title}`}
                    title={isPinned ? 'Pinned to workspace' : 'Pin site to workspace'}
                    className={`p-1.5 rounded-md transition-colors ${
                      isPinned
                        ? 'text-neutral-950 dark:text-white'
                        : 'text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
                    }`}
                  >
                    <Pin className={`h-3.5 w-3.5 ${isPinned ? 'fill-current' : ''}`} />
                  </button>

                  <button
                    type="button"
                    onClick={() => onToggleBookmark(item)}
                    aria-label={isBookmarked ? `Remove ${item.title} from bookmarks` : `Bookmark ${item.title}`}
                    className={`p-1.5 rounded-md transition-colors ${
                      isBookmarked
                        ? 'text-neutral-950 dark:text-white'
                        : 'text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
                    }`}
                  >
                    <Bookmark className={`h-4 w-4 ${isBookmarked ? 'fill-current' : ''}`} />
                  </button>
                </div>
              </div>

              <div className="mt-2">
                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group inline-flex items-center gap-1.5 font-display text-lg font-semibold text-neutral-950 dark:text-white hover:underline underline-offset-4"
                >
                  {tab === 'videos' && (
                    <Play className="h-4 w-4 shrink-0 text-neutral-500 dark:text-neutral-400" />
                  )}
                  <span>{item.title}</span>
                  <ArrowUpRight className="h-4 w-4 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-neutral-500" />
                </a>
              </div>

              <p className="mt-1.5 text-[15px] leading-relaxed text-neutral-600 dark:text-neutral-400 max-w-[68ch]">
                {item.snippet}
              </p>

              {item.metaLabel && (
                <div className="mt-1.5 text-xs font-mono text-neutral-400 dark:text-neutral-500">
                  {item.metaLabel}
                </div>
              )}
            </article>
          );
        })}
      </div>

      {tab === 'all' && safeDiscussions.length > 0 && (
        <section
          aria-label="Community discussions"
          className="pt-6 border-t border-neutral-200 dark:border-white/10"
        >
          <div className="flex items-center gap-2 mb-4">
            <MessageSquare className="h-4 w-4 text-neutral-700 dark:text-neutral-300" />
            <h3 className="font-display text-base font-semibold text-neutral-950 dark:text-white">
              Discussions & Forums
            </h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {safeDiscussions.slice(0, 4).map((thread) => (
              <div
                key={thread.id}
                className="rounded-xl border border-neutral-200 dark:border-white/12 bg-white/70 dark:bg-neutral-950/70 p-4 flex flex-col justify-between gap-2"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 text-xs text-neutral-500 dark:text-neutral-400">
                    <span>
                      {thread.platform} · <span className="font-mono">{thread.domain}</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => onOpenInApp(thread.url, thread.title)}
                      className="text-[11px] underline hover:text-neutral-950 dark:hover:text-white"
                    >
                      Open in App
                    </button>
                  </div>
                  <a
                    href={thread.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1.5 inline-flex items-center gap-1 font-display text-sm font-semibold text-neutral-950 dark:text-white hover:underline underline-offset-2 line-clamp-2"
                  >
                    <span>{thread.title}</span>
                    <ArrowUpRight className="h-3.5 w-3.5 shrink-0 opacity-60" />
                  </a>
                  {thread.snippet && (
                    <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400 line-clamp-2">
                      {thread.snippet}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {relatedQueries.length > 0 && (
        <section
          aria-label="Related searches"
          className="pt-6 border-t border-neutral-200 dark:border-white/10"
        >
          <h3 className="font-display text-sm font-semibold text-neutral-950 dark:text-white mb-3">
            Related Searches
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {relatedQueries.map((rq) => (
              <button
                key={rq}
                type="button"
                onClick={() => onSelectRelatedQuery(rq)}
                className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg border border-neutral-200 dark:border-white/10 bg-white/60 dark:bg-white/[0.02] hover:border-neutral-900 dark:hover:border-white/35 text-left text-sm text-neutral-800 dark:text-neutral-200 hover:text-neutral-950 dark:hover:text-white transition-colors"
              >
                <Search className="h-3.5 w-3.5 shrink-0 text-neutral-400" />
                <span className="truncate">{rq}</span>
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
