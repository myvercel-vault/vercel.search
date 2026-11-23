import React from 'react';
import {
  Shield,
  AlertTriangle,
  RefreshCw,
  KeyRound,
  Globe,
  CheckCircle2,
  ArrowUpRight,
} from 'lucide-react';
import type { DecryptedVaultItem } from '../types/vault';
import { analyzeVaultSecurity } from '../utils/watchtower';

interface WatchtowerViewProps {
  items: DecryptedVaultItem[];
  onInspectItem: (itemId: string) => void;
}

export const WatchtowerView: React.FC<WatchtowerViewProps> = ({ items, onInspectItem }) => {
  const report = analyzeVaultSecurity(items);

  return (
    <div className="h-full overflow-y-auto p-6 sm:p-8 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-200 dark:border-neutral-800 pb-6">
        <div>
          <div className="text-[11px] font-mono uppercase tracking-widest text-neutral-500 mb-1">
            Security Audit &amp; Breach Hygiene
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Watchtower Keselamatan Vault</h1>
          <p className="text-xs sm:text-sm text-neutral-500 mt-1">
            Semua analisis dijalankan secara tempatan di dalam memori pelayar anda tanpa mendedahkan
            kata laluan.
          </p>
        </div>

        <div className="px-5 py-4 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 flex items-center gap-4 shrink-0">
          <div>
            <div className="text-[10px] font-mono uppercase text-neutral-500">Skor Keselamatan</div>
            <div className="text-3xl font-extrabold font-mono tabular-nums">
              {report.overallScore}
              <span className="text-sm font-normal text-neutral-500">/100</span>
            </div>
          </div>
          <Shield className="w-8 h-8" />
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: 'Kata Laluan Lemah',
            count: report.weakCount,
            sub: 'Entropi rendah / pendek',
            icon: AlertTriangle,
          },
          {
            label: 'Diguna Semula',
            count: report.reusedCount,
            sub: 'Sama merentasi akaun',
            icon: RefreshCw,
          },
          {
            label: 'Tiada 2FA (TOTP)',
            count: report.missing2faCount,
            sub: 'Saranan pengesahan 2FA',
            icon: KeyRound,
          },
          {
            label: 'HTTP Tanpa TLS',
            count: report.unsecuredHttpCount,
            sub: 'Tukar ke HTTPS',
            icon: Globe,
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#050505]"
          >
            <div className="flex items-center justify-between text-neutral-500 mb-3">
              <span className="text-xs font-medium">{stat.label}</span>
              <stat.icon className="w-4 h-4" />
            </div>
            <div className="text-2xl font-bold font-mono tabular-nums">{stat.count}</div>
            <div className="text-[11px] text-neutral-500 mt-1">{stat.sub}</div>
          </div>
        ))}
      </div>

      {/* Actionable Issues List */}
      <div>
        <h2 className="text-sm font-semibold mb-3">
          Penemuan Audit ({report.issues.length} cadangan)
        </h2>

        {report.issues.length === 0 ? (
          <div className="p-8 rounded-2xl border border-neutral-200 dark:border-neutral-800 text-center">
            <CheckCircle2 className="w-8 h-8 mx-auto mb-3" />
            <div className="font-semibold text-sm">Tiada Isu Keselamatan Dikesan!</div>
            <p className="text-xs text-neutral-500 mt-1">
              Semua kata laluan anda unik, kukuh secara kriptografi dan dilengkapi 2FA.
            </p>
          </div>
        ) : (
          <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 divide-y divide-neutral-200 dark:divide-neutral-800 overflow-hidden">
            {report.issues.map((issue) => (
              <div
                key={issue.id}
                className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-[#050505] hover:bg-neutral-50 dark:hover:bg-neutral-950 transition-colors"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-0.5 text-[10px] font-mono uppercase rounded-full border ${
                        issue.severity === 'critical'
                          ? 'bg-black text-white dark:bg-white dark:text-black border-black dark:border-white font-bold'
                          : 'border-neutral-300 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300'
                      }`}
                    >
                      {issue.severity}
                    </span>
                    <span className="font-semibold text-sm">{issue.itemTitle}</span>
                    {issue.username && (
                      <span className="text-xs font-mono text-neutral-500">({issue.username})</span>
                    )}
                  </div>
                  <p className="text-xs text-neutral-600 dark:text-neutral-400">{issue.message}</p>
                </div>

                <button
                  type="button"
                  onClick={() => onInspectItem(issue.itemId)}
                  className="self-start sm:self-center px-3 py-1.5 rounded-lg border border-neutral-300 dark:border-neutral-800 text-xs font-medium inline-flex items-center gap-1 hover:bg-neutral-100 dark:hover:bg-neutral-900 shrink-0 cursor-pointer"
                >
                  <span>Perbaiki</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
