import { useState } from 'react';
import { ArrowLeftRight, Calculator, Check, Clock, Copy, Palette } from 'lucide-react';
import type { InstantToolResult } from '../types/search';

interface InstantToolCardProps {
  tool: InstantToolResult;
}

export function InstantToolCard({ tool }: InstantToolCardProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(tool.outputDisplay);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      // Clipboard fallback ignored cleanly
    }
  };

  const Icon =
    tool.type === 'calculator'
      ? Calculator
      : tool.type === 'converter'
      ? ArrowLeftRight
      : tool.type === 'color'
      ? Palette
      : Clock;

  return (
    <div className="mb-6 rounded-xl border border-neutral-200 dark:border-white/15 bg-neutral-50/90 dark:bg-neutral-950/90 p-5">
      <div className="flex items-center justify-between gap-4 mb-3">
        <div className="flex items-center gap-2 text-xs font-medium text-neutral-500 dark:text-neutral-400">
          <Icon className="h-3.5 w-3.5" />
          <span>{tool.title}</span>
        </div>
        <button
          type="button"
          onClick={handleCopy}
          className="inline-flex items-center gap-1.5 text-xs text-neutral-500 hover:text-neutral-950 dark:text-neutral-400 dark:hover:text-white transition-colors"
        >
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          <span>{copied ? 'Copied' : 'Copy'}</span>
        </button>
      </div>

      <div className="flex items-center gap-4">
        {tool.colorHex && (
          <div
            className="h-12 w-12 rounded-lg border border-neutral-300 dark:border-white/20 shrink-0"
            style={{ backgroundColor: tool.colorHex }}
            aria-label={`Color preview ${tool.colorHex}`}
          />
        )}
        <div className="min-w-0">
          <div className="text-xs font-mono text-neutral-500 dark:text-neutral-400 truncate">
            {tool.inputDisplay} =
          </div>
          <div className="mt-0.5 text-2xl sm:text-3xl font-mono font-semibold tabular-nums text-neutral-950 dark:text-white truncate">
            {tool.outputDisplay}
          </div>
          {tool.detail && (
            <div className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">{tool.detail}</div>
          )}
        </div>
      </div>
    </div>
  );
}
