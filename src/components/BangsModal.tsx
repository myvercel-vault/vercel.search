import { useEffect } from 'react';
import { ArrowRight, Command, X } from 'lucide-react';
import { BANG_DEFINITIONS } from '../utils/instantTools';

interface BangsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTryBang: (exampleQuery: string) => void;
}

const BANG_EXAMPLES: Record<string, string> = {
  '!w': '!w Alan Turing',
  '!gh': '!gh vercel next.js',
  '!yt': '!yt React Server Components',
  '!rd': '!rd mechanical keyboards',
  '!so': '!so typescript generic constraints',
  '!npm': '!npm lucide-react',
  '!news': '!news semiconductor manufacturing',
  '!img': '!img brutalist architecture',
  '!vid': '!vid WebGPU shader tutorial',
  '!disc': '!disc local-first software',
};

export function BangsModal({ isOpen, onClose, onTryBang }: BangsModalProps) {
  useEffect(() => {
    if (!isOpen) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Search Bangs Reference"
    >
      <div onClick={onClose} className="fixed inset-0 bg-black/65 backdrop-blur-xs" />

      <div className="relative z-10 w-full max-w-xl rounded-xl border border-neutral-200 dark:border-white/15 bg-white dark:bg-neutral-950 text-neutral-950 dark:text-white shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between gap-4 border-b border-neutral-200 dark:border-white/10 px-6 py-4">
          <div className="flex items-center gap-2">
            <Command className="h-4 w-4 text-neutral-500 dark:text-neutral-400" />
            <h2 className="font-display text-base font-semibold">Search Bangs</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close bangs reference"
            className="rounded-md p-1.5 text-neutral-500 hover:text-neutral-950 dark:text-neutral-400 dark:hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-6 py-4 max-h-[70vh] overflow-y-auto">
          <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-4">
            Prefix or suffix any search query with a Bang command to scope results to a specific
            platform or switch search tabs immediately.
          </p>

          <div className="divide-y divide-neutral-200 dark:divide-white/10">
            {BANG_DEFINITIONS.map((bang) => {
              const example = BANG_EXAMPLES[bang.trigger] || `${bang.trigger} search`;
              return (
                <div
                  key={bang.trigger}
                  className="py-3 flex items-center justify-between gap-4"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2.5">
                      <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded border border-neutral-300 dark:border-white/20 bg-neutral-100 dark:bg-white/10">
                        {bang.trigger}
                      </span>
                      <span className="text-sm font-medium">{bang.label}</span>
                    </div>
                    <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                      {bang.description}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      onTryBang(example);
                      onClose();
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-neutral-200 dark:border-white/15 text-xs font-medium hover:border-neutral-900 dark:hover:border-white/40 whitespace-nowrap shrink-0 transition-colors"
                  >
                    <span>Try</span>
                    <ArrowRight className="h-3 w-3" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
