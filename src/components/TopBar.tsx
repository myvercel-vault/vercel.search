import { Download } from 'lucide-react';

interface TopBarProps {
  onGoHome: () => void;
  onOpenOwnIndex: () => void;
  onOpenBangs: () => void;
  onOpenExtension: () => void;
  onOpenPreferences: () => void;
  onInstallApp: () => void;
  isInstalled: boolean;
}

export function TopBar({
  onGoHome,
  onOpenOwnIndex,
  onOpenBangs,
  onOpenExtension,
  onOpenPreferences,
  onInstallApp,
  isInstalled,
}: TopBarProps) {
  const navItems: Array<{ label: string; onClick: () => void }> = [
    { label: 'Search', onClick: onGoHome },
    { label: 'Own Index', onClick: onOpenOwnIndex },
    { label: 'Bangs', onClick: onOpenBangs },
    { label: 'Extension', onClick: onOpenExtension },
    { label: 'Settings', onClick: onOpenPreferences },
  ];

  return (
    <header className="relative z-20 w-full border-b border-neutral-200/80 dark:border-white/10 bg-white/75 dark:bg-black/75 backdrop-blur-md">
      <div className="mx-auto flex max-w-[1200px] items-center justify-between gap-8 px-4 sm:px-6 h-14">
        {/* Zone 1: Single-line Brand Wordmark */}
        <button
          type="button"
          onClick={onGoHome}
          className="flex items-center gap-2.5 text-neutral-950 dark:text-white whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 dark:focus-visible:ring-white rounded-sm"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
            className="shrink-0"
          >
            <path d="M12 2L22 20H2L12 2Z" fill="currentColor" />
          </svg>
          <span className="font-display text-[17px] font-bold tracking-tight">Axiom</span>
        </button>

        {/* Zone 2: 5 concise single-line navigation links */}
        <nav aria-label="Workspace Navigation" className="hidden md:flex items-center gap-6">
          {navItems.map((item) => (
            <button
              key={item.label}
              type="button"
              onClick={item.onClick}
              className="text-sm font-medium whitespace-nowrap shrink-0 text-neutral-600 dark:text-neutral-400 hover:text-neutral-950 dark:hover:text-white transition-colors duration-150 hover:underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 dark:focus-visible:ring-white rounded-sm"
            >
              {item.label}
            </button>
          ))}
        </nav>

        {/* Zone 3: 1 primary action */}
        <div className="flex items-center shrink-0">
          {!isInstalled ? (
            <button
              type="button"
              onClick={onInstallApp}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium rounded-md bg-neutral-950 text-white dark:bg-white dark:text-black hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-colors duration-150 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-neutral-900 dark:focus-visible:ring-white dark:focus-visible:ring-offset-black"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Install App</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onOpenPreferences}
              className="px-4 py-1.5 text-xs font-medium rounded-md bg-neutral-950 text-white dark:bg-white dark:text-black hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-colors duration-150 whitespace-nowrap shrink-0"
            >
              Settings
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
