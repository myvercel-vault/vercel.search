import { Download, Puzzle, Smartphone, X } from 'lucide-react';

interface ExtensionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDownloadExtensionZip: () => void;
  onInstallPwa: () => void;
  isInstallable: boolean;
  isInstalled: boolean;
}

export function ExtensionModal({
  isOpen,
  onClose,
  onDownloadExtensionZip,
  onInstallPwa,
  isInstallable,
  isInstalled,
}: ExtensionModalProps) {
  if (!isOpen) return null;

  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : '';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Browser Extension and PWA Install"
    >
      <div onClick={onClose} className="fixed inset-0 bg-black/65 backdrop-blur-xs" />

      <div className="relative z-10 w-full max-w-xl rounded-xl border border-neutral-200 dark:border-white/15 bg-white dark:bg-neutral-950 text-neutral-950 dark:text-white shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between gap-4 border-b border-neutral-200 dark:border-white/10 px-6 py-4">
          <div className="flex items-center gap-2">
            <Puzzle className="h-4 w-4 text-neutral-500" />
            <h2 className="font-display text-base font-semibold">
              Browser Extension & Installable App (PWA)
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

        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto text-sm">
          {/* Section 1: Manifest V3 Browser Extension */}
          <section className="rounded-xl border border-neutral-200 dark:border-white/12 p-4 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="font-display text-sm font-semibold">
                  1. Chrome / Brave / Edge / Firefox Extension (Manifest V3)
                </h3>
                <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
                  Adds Axiom Search popup, <code className="font-mono">ax</code> omnibox shortcut,
                  and default search provider pointing to <span className="font-mono">{currentOrigin}</span>.
                </p>
              </div>
              <button
                type="button"
                onClick={onDownloadExtensionZip}
                className="inline-flex items-center gap-1.5 rounded-md bg-neutral-950 text-white dark:bg-white dark:text-black px-3.5 py-2 text-xs font-medium shrink-0"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Download .zip</span>
              </button>
            </div>

            <ol className="list-decimal pl-5 space-y-1 text-xs text-neutral-600 dark:text-neutral-400">
              <li>Download and unzip <span className="font-mono">axiom-search-extension.zip</span>.</li>
              <li>
                Open <span className="font-mono">chrome://extensions</span> (or{' '}
                <span className="font-mono">brave://extensions</span> /{' '}
                <span className="font-mono">edge://extensions</span>) and enable{' '}
                <strong>Developer mode</strong>.
              </li>
              <li>
                Click <strong>Load unpacked</strong> and select the extracted folder.
              </li>
            </ol>
          </section>

          {/* Section 2: Installable PWA */}
          <section className="rounded-xl border border-neutral-200 dark:border-white/12 p-4 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="font-display text-sm font-semibold flex items-center gap-1.5">
                  <Smartphone className="h-4 w-4 text-neutral-500" />
                  <span>2. Install App on Phone or Desktop (No App Store Needed)</span>
                </h3>
                <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
                  Installs directly from any modern browser with a home-screen icon and standalone
                  app window.
                </p>
              </div>

              {!isInstalled && (
                <button
                  type="button"
                  onClick={onInstallPwa}
                  className="inline-flex items-center gap-1.5 rounded-md border border-neutral-300 dark:border-white/20 px-3.5 py-2 text-xs font-medium shrink-0 hover:border-neutral-950 dark:hover:border-white"
                >
                  <span>{isInstallable ? 'Install Now' : 'Install Guide'}</span>
                </button>
              )}
            </div>

            <ul className="list-disc pl-5 space-y-1 text-xs text-neutral-600 dark:text-neutral-400">
              <li>
                <strong>Android / Chrome / Edge:</strong> Click <strong>Install App</strong> in the
                top bar or open the browser menu and select <strong>Install app / Add to Home screen</strong>.
              </li>
              <li>
                <strong>iPhone / iPad (Safari):</strong> Tap the <strong>Share</strong> icon and
                choose <strong>Add to Home Screen</strong>.
              </li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
