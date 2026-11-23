import React, { useState, useMemo } from 'react';
import {
  X,
  RefreshCw,
  Copy,
  Check,
  Sparkles,
  Sliders,
} from 'lucide-react';
import {
  evaluatePasswordStrength,
  generateSecret,
  type GeneratorOptions,
} from '../utils/crypto';

interface PasswordGeneratorModalProps {
  open: boolean;
  onClose: () => void;
  onUsePassword?: (pwd: string) => void;
}

export const PasswordGeneratorModal: React.FC<PasswordGeneratorModalProps> = ({
  open,
  onClose,
  onUsePassword,
}) => {
  const [opts, setOpts] = useState<GeneratorOptions>({
    mode: 'password',
    length: 22,
    uppercase: true,
    lowercase: true,
    numbers: true,
    symbols: true,
    avoidAmbiguous: true,
    wordCount: 4,
    separator: '-',
    capitalizeWords: true,
    includeNumberInPhrase: true,
  });

  const [seedTick, setSeedTick] = useState(0);
  const [history, setHistory] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);

  const generated = useMemo(() => {
    void seedTick;
    return generateSecret(opts);
  }, [opts, seedTick]);

  const strength = evaluatePasswordStrength(generated);

  if (!open) return null;

  const handleRegenerate = () => {
    setHistory((prev) => [generated, ...prev.filter((p) => p !== generated)].slice(0, 6));
    setSeedTick((t) => t + 1);
    setCopied(false);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generated);
    setHistory((prev) => [generated, ...prev.filter((p) => p !== generated)].slice(0, 6));
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="w-full max-w-lg rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#070707] text-black dark:text-white shadow-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4" />
            <h2 className="font-semibold text-sm tracking-tight">Penjana Kata Laluan &amp; Passphrase</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-neutral-500 hover:text-black dark:hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Output Box */}
          <div className="p-4 rounded-xl border border-neutral-300 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950">
            <div className="font-mono text-base sm:text-lg font-semibold break-all tracking-wide leading-relaxed min-h-[3rem] flex items-center">
              {generated}
            </div>

            <div className="mt-3 pt-3 border-t border-neutral-200 dark:border-neutral-900 flex items-center justify-between text-[11px] font-mono text-neutral-500">
              <span>
                {strength.label} · {strength.entropyBits} bit
              </span>
              <span>Masa pecah: {strength.crackTime}</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleRegenerate}
              className="px-3.5 py-2 rounded-lg border border-neutral-300 dark:border-neutral-800 text-xs font-medium inline-flex items-center gap-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-900 transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Jana Baru</span>
            </button>

            <button
              type="button"
              onClick={handleCopy}
              className="flex-1 px-4 py-2 rounded-lg bg-black text-white dark:bg-white dark:text-black text-xs font-medium inline-flex items-center justify-center gap-1.5 hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-colors cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Disalin!' : 'Salin Kata Laluan'}</span>
            </button>

            {onUsePassword && (
              <button
                type="button"
                onClick={() => {
                  onUsePassword(generated);
                  onClose();
                }}
                className="px-4 py-2 rounded-lg border border-black dark:border-white text-xs font-semibold inline-flex items-center gap-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-900 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Guna Ini</span>
              </button>
            )}
          </div>

          {/* Mode Selector */}
          <div className="grid grid-cols-3 p-1 rounded-lg bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800">
            {[
              { id: 'password', label: 'Rawak (Password)' },
              { id: 'passphrase', label: 'Frasa (Passphrase)' },
              { id: 'pin', label: 'Kod PIN' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setOpts({ ...opts, mode: tab.id as GeneratorOptions['mode'] })}
                className={`py-1.5 text-xs font-medium rounded-md transition-all cursor-pointer ${
                  opts.mode === tab.id
                    ? 'bg-white dark:bg-black text-black dark:text-white shadow-xs'
                    : 'text-neutral-500 hover:text-black dark:hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Controls */}
          {opts.mode === 'password' && (
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-neutral-600 dark:text-neutral-400">Panjang Aksara</span>
                  <span className="font-mono font-semibold">{opts.length}</span>
                </div>
                <input
                  type="range"
                  min={8}
                  max={64}
                  value={opts.length}
                  onChange={(e) => setOpts({ ...opts, length: Number(e.target.value) })}
                  className="w-full accent-black dark:accent-white cursor-pointer"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5 text-xs">
                {[
                  { key: 'uppercase', label: 'Huruf Besar (A-Z)' },
                  { key: 'lowercase', label: 'Huruf Kecil (a-z)' },
                  { key: 'numbers', label: 'Nombor (0-9)' },
                  { key: 'symbols', label: 'Simbol (!@#$%^&*)' },
                  { key: 'avoidAmbiguous', label: 'Elak Aksara Keliru (0/O, 1/l)' },
                ].map((toggle) => (
                  <label
                    key={toggle.key}
                    className="flex items-center gap-2 p-2.5 rounded-lg border border-neutral-200 dark:border-neutral-800 cursor-pointer select-none"
                  >
                    <input
                      type="checkbox"
                      checked={Boolean(opts[toggle.key as keyof GeneratorOptions])}
                      onChange={(e) =>
                        setOpts({ ...opts, [toggle.key]: e.target.checked })
                      }
                      className="accent-black dark:accent-white"
                    />
                    <span>{toggle.label}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {opts.mode === 'passphrase' && (
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-neutral-600 dark:text-neutral-400">Bilangan Perkataan</span>
                  <span className="font-mono font-semibold">{opts.wordCount} perkataan</span>
                </div>
                <input
                  type="range"
                  min={3}
                  max={8}
                  value={opts.wordCount}
                  onChange={(e) => setOpts({ ...opts, wordCount: Number(e.target.value) })}
                  className="w-full accent-black dark:accent-white cursor-pointer"
                />
              </div>

              <div className="grid grid-cols-3 gap-2 text-xs">
                {['-', '.', '_'].map((sep) => (
                  <button
                    key={sep}
                    type="button"
                    onClick={() => setOpts({ ...opts, separator: sep })}
                    className={`py-2 rounded-lg border font-mono cursor-pointer ${
                      opts.separator === sep
                        ? 'border-black dark:border-white bg-neutral-100 dark:bg-neutral-900 font-bold'
                        : 'border-neutral-200 dark:border-neutral-800'
                    }`}
                  >
                    Pemisah &ldquo;{sep}&rdquo;
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-2.5 text-xs">
                <label className="flex items-center gap-2 p-2.5 rounded-lg border border-neutral-200 dark:border-neutral-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={opts.capitalizeWords}
                    onChange={(e) => setOpts({ ...opts, capitalizeWords: e.target.checked })}
                    className="accent-black dark:accent-white"
                  />
                  <span>Huruf Besar Awal</span>
                </label>
                <label className="flex items-center gap-2 p-2.5 rounded-lg border border-neutral-200 dark:border-neutral-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={opts.includeNumberInPhrase}
                    onChange={(e) => setOpts({ ...opts, includeNumberInPhrase: e.target.checked })}
                    className="accent-black dark:accent-white"
                  />
                  <span>Sertakan Nombor</span>
                </label>
              </div>
            </div>
          )}

          {opts.mode === 'pin' && (
            <div>
              <div className="flex justify-between text-xs mb-1.5">
                <span className="text-neutral-600 dark:text-neutral-400">Panjang Digit PIN</span>
                <span className="font-mono font-semibold">{Math.min(12, Math.max(4, opts.length))} digit</span>
              </div>
              <input
                type="range"
                min={4}
                max={12}
                value={Math.min(12, Math.max(4, opts.length))}
                onChange={(e) => setOpts({ ...opts, length: Number(e.target.value) })}
                className="w-full accent-black dark:accent-white cursor-pointer"
              />
            </div>
          )}

          {history.length > 0 && (
            <div className="pt-3 border-t border-neutral-200 dark:border-neutral-800">
              <div className="text-[10px] font-mono uppercase tracking-wider text-neutral-500 mb-2">
                Sejarah Dijana Baru-Baru Ini
              </div>
              <div className="space-y-1.5 max-h-28 overflow-y-auto">
                {history.map((h, i) => (
                  <div
                    key={`${h}-${i}`}
                    className="flex items-center justify-between text-xs font-mono px-2.5 py-1.5 rounded bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-900"
                  >
                    <span className="truncate pr-3">{h}</span>
                    <button
                      type="button"
                      onClick={() => navigator.clipboard.writeText(h)}
                      className="text-[10px] text-neutral-500 hover:text-black dark:hover:text-white shrink-0 cursor-pointer"
                    >
                      Salin
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
