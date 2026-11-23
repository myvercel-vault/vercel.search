import { useState, type ReactNode } from 'react';
import {
  ArrowUpRight,
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  Send,
  Sparkles,
} from 'lucide-react';
import type { FollowUpMessage, GroundingSource } from '../types/search';
import { isSafeExternalUrl } from '../utils/instantTools';

interface AiAnswerCardProps {
  query: string;
  summary: string;
  sources: GroundingSource[];
  followUps: FollowUpMessage[];
  isFollowingUp: boolean;
  onFollowUp: (question: string) => void;
  onCiteClick: (index: number) => void;
}

function renderInlineFormatted(
  text: string,
  onCiteClick: (index: number) => void
): ReactNode[] {
  // Split on [number], **bold**, and `code` safely without HTML injection
  const tokenRegex = /(\[\d+\]|\*\*[^*]+\*\*|`[^`]+`)/g;
  const parts = text.split(tokenRegex);

  return parts.map((part, idx) => {
    const citeMatch = part.match(/^\[(\d+)\]$/);
    if (citeMatch) {
      const citeNum = Number(citeMatch[1]);
      return (
        <button
          key={`cite-${idx}`}
          type="button"
          onClick={() => onCiteClick(citeNum)}
          title={`Jump to source ${citeNum}`}
          className="inline-flex items-center justify-center mx-0.5 px-1.5 py-0.2 text-[11px] font-mono tabular-nums rounded border border-neutral-300 dark:border-white/20 bg-neutral-100 dark:bg-white/10 text-neutral-800 dark:text-neutral-200 hover:bg-neutral-950 hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors align-baseline"
        >
          {citeNum}
        </button>
      );
    }

    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
      return (
        <strong key={`b-${idx}`} className="font-semibold text-neutral-950 dark:text-white">
          {part.slice(2, -2)}
        </strong>
      );
    }

    if (part.startsWith('`') && part.endsWith('`') && part.length > 2) {
      return (
        <code
          key={`c-${idx}`}
          className="px-1.5 py-0.5 mx-0.5 rounded bg-neutral-100 dark:bg-white/10 font-mono text-[13px] text-neutral-900 dark:text-neutral-100"
        >
          {part.slice(1, -1)}
        </code>
      );
    }

    return <span key={`t-${idx}`}>{part}</span>;
  });
}

function RichSummaryBody({
  text,
  onCiteClick,
}: {
  text: string;
  onCiteClick: (index: number) => void;
}) {
  const lines = text.split('\n');
  const blocks: ReactNode[] = [];
  let listItems: string[] = [];

  const flushList = (keyPrefix: string) => {
    if (listItems.length === 0) return;
    blocks.push(
      <ul key={`${keyPrefix}-ul`} className="my-2.5 space-y-1.5 pl-5 list-disc marker:text-neutral-400">
        {listItems.map((item, i) => (
          <li key={`${keyPrefix}-li-${i}`} className="text-[15px] leading-relaxed text-neutral-700 dark:text-neutral-300">
            {renderInlineFormatted(item, onCiteClick)}
          </li>
        ))}
      </ul>
    );
    listItems = [];
  };

  lines.forEach((rawLine, index) => {
    const line = rawLine.trim();
    if (!line) {
      flushList(`b-${index}`);
      return;
    }

    const bulletMatch = line.match(/^[-*•]\s+(.+)$/);
    if (bulletMatch) {
      listItems.push(bulletMatch[1]);
      return;
    }

    flushList(`b-${index}`);

    const headingMatch = line.match(/^#{1,3}\s+(.+)$/);
    if (headingMatch) {
      blocks.push(
        <h3
          key={`h-${index}`}
          className="mt-3 mb-1.5 font-display text-sm font-semibold text-neutral-950 dark:text-white"
        >
          {renderInlineFormatted(headingMatch[1], onCiteClick)}
        </h3>
      );
      return;
    }

    blocks.push(
      <p key={`p-${index}`} className="mb-2.5 last:mb-0 text-[15px] leading-relaxed text-neutral-700 dark:text-neutral-300">
        {renderInlineFormatted(line, onCiteClick)}
      </p>
    );
  });

  flushList('end');
  return <div>{blocks}</div>;
}

export function AiAnswerCard({
  query,
  summary,
  sources,
  followUps,
  isFollowingUp,
  onFollowUp,
  onCiteClick,
}: AiAnswerCardProps) {
  const [expanded, setExpanded] = useState(true);
  const [copied, setCopied] = useState(false);
  const [followUpInput, setFollowUpInput] = useState('');

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(summary);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      // Ignore clipboard failures cleanly
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty('--mouse-x', `${e.clientX - rect.left}px`);
    e.currentTarget.style.setProperty('--mouse-y', `${e.clientY - rect.top}px`);
  };

  const submitFollowUp = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = followUpInput.trim();
    if (!trimmed || isFollowingUp) return;
    setFollowUpInput('');
    onFollowUp(trimmed);
  };

  const validSources = sources.filter((s) => isSafeExternalUrl(s.url));

  return (
    <section
      aria-label="Answer with AI"
      onPointerMove={handlePointerMove}
      className="spotlight-card mb-7 rounded-xl border border-neutral-200 dark:border-white/15 bg-white/85 dark:bg-neutral-950/85 backdrop-blur-md p-5"
    >
      {/* Header Row */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 min-w-0">
          <Sparkles className="h-4 w-4 shrink-0 text-neutral-950 dark:text-white" />
          <h2 className="font-display text-sm font-semibold text-neutral-950 dark:text-white truncate">
            Answer with AI
          </h2>
          <span className="text-xs text-neutral-400 dark:text-neutral-500 hidden sm:inline truncate">
            · Grounded on {validSources.length} web {validSources.length === 1 ? 'source' : 'sources'}
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs text-neutral-500 hover:text-neutral-950 dark:text-neutral-400 dark:hover:text-white transition-colors"
          >
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            <span className="hidden sm:inline">{copied ? 'Copied' : 'Copy'}</span>
          </button>

          <button
            type="button"
            onClick={() => setExpanded((prev) => !prev)}
            aria-expanded={expanded}
            className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs text-neutral-500 hover:text-neutral-950 dark:text-neutral-400 dark:hover:text-white transition-colors"
          >
            <span>{expanded ? 'Collapse' : 'Expand'}</span>
            {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="mt-4">
          <RichSummaryBody text={summary} onCiteClick={onCiteClick} />

          {/* Cited Sources Strip */}
          {validSources.length > 0 && (
            <div className="mt-4 pt-3.5 border-t border-neutral-200/80 dark:border-white/10">
              <div className="text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-2">
                Cited Sources
              </div>
              <div className="flex items-stretch gap-2 overflow-x-auto pb-1">
                {validSources.slice(0, 8).map((src) => (
                  <a
                    key={`${src.index}-${src.url}`}
                    href={src.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex flex-col justify-between min-w-[175px] max-w-[210px] rounded-lg border border-neutral-200 dark:border-white/10 bg-neutral-50/80 dark:bg-white/[0.03] px-3 py-2 hover:border-neutral-900 dark:hover:border-white/35 transition-colors shrink-0"
                  >
                    <div className="flex items-center justify-between gap-2 text-[11px] font-mono text-neutral-500 dark:text-neutral-400">
                      <span className="tabular-nums">[{src.index}] {src.domain}</span>
                      <ArrowUpRight className="h-3 w-3 shrink-0 opacity-60 group-hover:opacity-100" />
                    </div>
                    <div className="mt-1 text-xs font-medium text-neutral-900 dark:text-neutral-100 line-clamp-2">
                      {src.title}
                    </div>
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Follow-up Q&A Thread */}
          {followUps.length > 0 && (
            <div className="mt-4 pt-3.5 border-t border-neutral-200/80 dark:border-white/10 space-y-3">
              {followUps.map((msg) => (
                <div
                  key={msg.id}
                  className={
                    msg.role === 'user'
                      ? 'text-sm font-medium text-neutral-950 dark:text-white'
                      : 'pl-3 border-l border-neutral-300 dark:border-white/20'
                  }
                >
                  {msg.role === 'user' ? (
                    <span>Follow-up: {msg.content}</span>
                  ) : (
                    <div>
                      <RichSummaryBody text={msg.content} onCiteClick={onCiteClick} />
                      {msg.sources && msg.sources.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-3 text-xs text-neutral-500 dark:text-neutral-400">
                          {msg.sources
                            .filter((s) => isSafeExternalUrl(s.url))
                            .slice(0, 4)
                            .map((s) => (
                              <a
                                key={s.url}
                                href={s.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 hover:text-neutral-950 dark:hover:text-white underline underline-offset-2"
                              >
                                <span>{s.domain}</span>
                                <ArrowUpRight className="h-3 w-3" />
                              </a>
                            ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Ask a Follow-up Form */}
          <form onSubmit={submitFollowUp} className="mt-4 pt-3 border-t border-neutral-200/80 dark:border-white/10">
            <div className="flex items-center gap-2 rounded-lg border border-neutral-200 dark:border-white/15 bg-neutral-50/70 dark:bg-black/60 px-3 py-1.5 focus-within:border-neutral-900 dark:focus-within:border-white/40">
              <input
                type="text"
                value={followUpInput}
                onChange={(e) => setFollowUpInput(e.target.value)}
                placeholder={`Ask a follow-up about "${query}"...`}
                aria-label="Ask a follow-up question"
                className="w-full bg-transparent text-sm text-neutral-950 dark:text-white placeholder:text-neutral-400 dark:placeholder:text-neutral-500 focus:outline-none"
              />
              <button
                type="submit"
                disabled={isFollowingUp || !followUpInput.trim()}
                aria-label="Send follow-up question"
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-neutral-950 text-white dark:bg-white dark:text-black text-xs font-medium disabled:opacity-40 whitespace-nowrap shrink-0 transition-opacity"
              >
                {isFollowingUp ? (
                  <span className="inline-block h-3 w-3 rounded-full border-2 border-current border-t-transparent animate-spin" />
                ) : (
                  <>
                    <span>Ask</span>
                    <Send className="h-3 w-3" />
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}
    </section>
  );
}
