import { useState } from 'react';
import { ArrowUpRight, Send, Sparkles, X } from 'lucide-react';
import type { GroundingSource, ProxyPageData } from '../types/search';
import { isSafeExternalUrl } from '../utils/instantTools';

interface AssistantMsg {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  sources?: GroundingSource[];
}

interface AiAssistantPanelProps {
  isOpen: boolean;
  onClose: () => void;
  activePageContext?: ProxyPageData | null;
}

export function AiAssistantPanel({
  isOpen,
  onClose,
  activePageContext,
}: AiAssistantPanelProps) {
  const [messages, setMessages] = useState<AssistantMsg[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const sendPrompt = async (promptText: string) => {
    const trimmed = promptText.trim();
    if (!trimmed || loading) return;

    const userMsg: AssistantMsg = {
      id: `asst-u-${Date.now()}`,
      role: 'user',
      text: trimmed,
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: trimmed,
          pageContext: activePageContext
            ? {
                title: activePageContext.title,
                url: activePageContext.url,
                text: activePageContext.sections.map((s) => s.text).join('\n').slice(0, 3500),
              }
            : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Assistant request failed.');

      setMessages((prev) => [
        ...prev,
        {
          id: `asst-a-${Date.now()}`,
          role: 'assistant',
          text: data.reply,
          sources: data.sources,
        },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: `asst-e-${Date.now()}`,
          role: 'assistant',
          text: err instanceof Error ? err.message : 'Unable to reach AI Assistant.',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end"
      role="dialog"
      aria-modal="true"
      aria-label="Axiom AI Assistant"
    >
      <div onClick={onClose} className="fixed inset-0 bg-black/60 backdrop-blur-xs" />

      <div className="relative z-10 flex h-full w-full max-w-md flex-col border-l border-neutral-200 dark:border-white/15 bg-white dark:bg-neutral-950 text-neutral-950 dark:text-white shadow-2xl">
        <div className="flex items-center justify-between gap-4 border-b border-neutral-200 dark:border-white/10 px-5 py-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            <h2 className="font-display text-base font-semibold">AI Assistant</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close AI Assistant"
            className="p-1.5 rounded-md text-neutral-500 hover:text-neutral-950 dark:hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {activePageContext && (
          <div className="border-b border-neutral-200 dark:border-white/10 bg-neutral-50 dark:bg-white/[0.03] px-5 py-2.5 flex items-center justify-between gap-2 text-xs">
            <span className="truncate text-neutral-600 dark:text-neutral-300">
              Reading: <strong className="text-neutral-950 dark:text-white">{activePageContext.title}</strong>
            </span>
            <button
              type="button"
              onClick={() => void sendPrompt('Summarize the active open tab in 5 concise bullet points.')}
              className="rounded border border-neutral-300 dark:border-white/20 px-2 py-0.5 text-[11px] font-medium shrink-0 hover:border-neutral-900 dark:hover:border-white"
            >
              Summarize Tab
            </button>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {messages.length === 0 ? (
            <div className="space-y-3 text-sm text-neutral-500 dark:text-neutral-400">
              <p>
                Ask anything, compare topics, or summarize the web page currently open in your
                browser tab.
              </p>
              <div className="space-y-2">
                {[
                  'Compare Brave Search API vs Bing Web Search API',
                  'Explain how PWA standalone installation works on mobile',
                  'Give me 3 productivity tips for workspace tab groups',
                ].map((starter) => (
                  <button
                    key={starter}
                    type="button"
                    onClick={() => void sendPrompt(starter)}
                    className="w-full text-left rounded-lg border border-neutral-200 dark:border-white/10 px-3 py-2 text-xs text-neutral-800 dark:text-neutral-200 hover:border-neutral-900 dark:hover:border-white/40 transition-colors"
                  >
                    {starter}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                className={
                  msg.role === 'user'
                    ? 'ml-8 rounded-xl bg-neutral-950 text-white dark:bg-white dark:text-black px-3.5 py-2.5 text-sm'
                    : 'rounded-xl border border-neutral-200 dark:border-white/12 bg-neutral-50/70 dark:bg-white/[0.03] p-3.5 text-sm leading-relaxed whitespace-pre-wrap'
                }
              >
                <div>{msg.text}</div>
                {msg.sources && msg.sources.length > 0 && (
                  <div className="mt-2.5 pt-2 border-t border-neutral-200 dark:border-white/10 flex flex-wrap gap-2.5 text-xs">
                    {msg.sources
                      .filter((s) => isSafeExternalUrl(s.url))
                      .slice(0, 4)
                      .map((s) => (
                        <a
                          key={s.url}
                          href={s.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-neutral-500 hover:text-neutral-950 dark:hover:text-white underline"
                        >
                          <span>{s.domain}</span>
                          <ArrowUpRight className="h-3 w-3" />
                        </a>
                      ))}
                  </div>
                )}
              </div>
            ))
          )}
          {loading && (
            <div className="text-xs text-neutral-400 animate-pulse">Thinking with live search...</div>
          )}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            void sendPrompt(input);
          }}
          className="border-t border-neutral-200 dark:border-white/10 p-4"
        >
          <div className="flex items-center gap-2 rounded-lg border border-neutral-200 dark:border-white/15 px-3 py-2 focus-within:border-neutral-900 dark:focus-within:border-white">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask AI Assistant..."
              className="w-full bg-transparent text-sm focus:outline-none"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              aria-label="Send message"
              className="rounded-md bg-neutral-950 text-white dark:bg-white dark:text-black p-1.5 disabled:opacity-40"
            >
              <Send className="h-3.5 w-3.5" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
