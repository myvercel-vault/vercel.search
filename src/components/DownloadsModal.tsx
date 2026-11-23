import { Download, FileText, Trash2, X } from 'lucide-react';
import type { DownloadItem } from '../types/search';

interface DownloadsModalProps {
  isOpen: boolean;
  onClose: () => void;
  downloads: DownloadItem[];
  onRedownload: (item: DownloadItem) => void;
  onDeleteDownload: (id: string) => void;
  onClearDownloads: () => void;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function DownloadsModal({
  isOpen,
  onClose,
  downloads,
  onRedownload,
  onDeleteDownload,
  onClearDownloads,
}: DownloadsModalProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Download Manager"
    >
      <div onClick={onClose} className="fixed inset-0 bg-black/65 backdrop-blur-xs" />

      <div className="relative z-10 w-full max-w-lg rounded-xl border border-neutral-200 dark:border-white/15 bg-white dark:bg-neutral-950 text-neutral-950 dark:text-white shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between gap-4 border-b border-neutral-200 dark:border-white/10 px-6 py-4">
          <div className="flex items-center gap-2">
            <Download className="h-4 w-4 text-neutral-500" />
            <h2 className="font-display text-base font-semibold">
              Download Manager ({downloads.length})
            </h2>
          </div>
          <div className="flex items-center gap-3">
            {downloads.length > 0 && (
              <button
                type="button"
                onClick={onClearDownloads}
                className="text-xs text-neutral-500 hover:text-neutral-950 dark:hover:text-white underline"
              >
                Clear all
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close download manager"
              className="p-1.5 rounded-md text-neutral-500 hover:text-neutral-950 dark:hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="p-6 max-h-[65vh] overflow-y-auto space-y-2.5">
          {downloads.length === 0 ? (
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              No downloads yet. Save any proxied web page as Markdown or download the Browser
              Extension bundle to track files here.
            </p>
          ) : (
            downloads.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-neutral-200 dark:border-white/10 p-3"
              >
                <div className="flex items-start gap-2.5 min-w-0">
                  <FileText className="h-4 w-4 text-neutral-400 mt-0.5 shrink-0" />
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">{item.filename}</div>
                    <div className="text-[11px] font-mono text-neutral-500 tabular-nums">
                      {item.format.toUpperCase()} · {formatBytes(item.sizeBytes)} ·{' '}
                      {new Date(item.createdAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => onRedownload(item)}
                    aria-label={`Download ${item.filename}`}
                    className="p-1.5 rounded-md border border-neutral-200 dark:border-white/15 text-neutral-700 dark:text-neutral-300 hover:border-neutral-900 dark:hover:border-white/40"
                  >
                    <Download className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onDeleteDownload(item.id)}
                    aria-label={`Remove ${item.filename}`}
                    className="p-1.5 text-neutral-400 hover:text-neutral-950 dark:hover:text-white"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
