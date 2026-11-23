import { ArrowUpRight, Globe } from 'lucide-react';
import type { InfoboxData } from '../types/search';
import { isSafeExternalUrl } from '../utils/instantTools';

interface InfoboxPanelProps {
  infobox: InfoboxData;
}

export function InfoboxPanel({ infobox }: InfoboxPanelProps) {
  const hasOfficialUrl = isSafeExternalUrl(infobox.officialUrl);

  const handlePointerMove = (e: React.PointerEvent<HTMLElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty('--mouse-x', `${e.clientX - rect.left}px`);
    e.currentTarget.style.setProperty('--mouse-y', `${e.clientY - rect.top}px`);
  };

  return (
    <aside
      aria-label={`Knowledge panel for ${infobox.title}`}
      onPointerMove={handlePointerMove}
      className="spotlight-card rounded-xl border border-neutral-200 dark:border-white/15 bg-white/85 dark:bg-neutral-950/85 backdrop-blur-md p-5"
    >
      <div>
        <h2 className="font-display text-xl font-bold tracking-tight text-neutral-950 dark:text-white">
          {infobox.title}
        </h2>
        {infobox.subtitle && (
          <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
            {infobox.subtitle}
          </p>
        )}
      </div>

      {infobox.description && (
        <p className="mt-3.5 text-sm leading-relaxed text-neutral-700 dark:text-neutral-300">
          {infobox.description}
        </p>
      )}

      {hasOfficialUrl && (
        <div className="mt-4">
          <a
            href={infobox.officialUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-neutral-200 dark:border-white/15 bg-neutral-50 dark:bg-white/[0.04] hover:border-neutral-900 dark:hover:border-white/40 text-xs font-medium text-neutral-900 dark:text-white transition-colors"
          >
            <Globe className="h-3.5 w-3.5 shrink-0" />
            <span>Official Website</span>
            <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-neutral-400" />
          </a>
        </div>
      )}

      {infobox.facts.length > 0 && (
        <dl className="mt-4 pt-4 border-t border-neutral-200/80 dark:border-white/10 space-y-2.5">
          {infobox.facts.map((fact) => (
            <div
              key={`${fact.label}-${fact.value}`}
              className="flex items-baseline justify-between gap-4 text-xs"
            >
              <dt className="text-neutral-500 dark:text-neutral-400 shrink-0">{fact.label}</dt>
              <dd className="text-right font-medium text-neutral-900 dark:text-neutral-100 tabular-nums">
                {fact.value}
              </dd>
            </div>
          ))}
        </dl>
      )}
    </aside>
  );
}
