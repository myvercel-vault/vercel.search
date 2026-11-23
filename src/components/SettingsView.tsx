import React, { useState } from 'react';
import {
  Shield,
  Download,
  Upload,
  Clock,
  Check,
  KeyRound,
  Activity,
  FileJson,
  Loader2,
} from 'lucide-react';
import type { AuditLogEntry, DecryptedVaultItem, UserProfile } from '../types/vault';

interface SettingsViewProps {
  user: UserProfile;
  items: DecryptedVaultItem[];
  auditLogs: AuditLogEntry[];
  onUpdateSettings: (patch: {
    name?: string;
    passwordHint?: string;
    autoLockMinutes?: number;
  }) => Promise<void>;
  onImportItems: (rawJson: string) => Promise<number>;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  user,
  items,
  auditLogs,
  onUpdateSettings,
  onImportItems,
}) => {
  const [name, setName] = useState(user.name);
  const [passwordHint, setPasswordHint] = useState(user.passwordHint || '');
  const [autoLockMinutes, setAutoLockMinutes] = useState(user.autoLockMinutes ?? 15);
  const [saving, setSaving] = useState(false);
  const [savedNotice, setSavedNotice] = useState(false);

  const [importing, setImporting] = useState(false);
  const [importStatus, setImportStatus] = useState('');

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSavedNotice(false);
    try {
      await onUpdateSettings({ name, passwordHint, autoLockMinutes });
      setSavedNotice(true);
      setTimeout(() => setSavedNotice(false), 2500);
    } finally {
      setSaving(false);
    }
  };

  const handleExportVaultJson = () => {
    const activeItems = items.filter((i) => !i.deletedAt);
    const payload = {
      format: 'vercel-vault-export-v1',
      exportedAt: new Date().toISOString(),
      account: user.email,
      count: activeItems.length,
      items: activeItems.map((i) => ({
        type: i.type,
        title: i.title,
        subtitle: i.subtitle,
        domain: i.domain,
        favorite: i.favorite,
        data: i.data,
      })),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vercel-vault-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    setImportStatus('');
    try {
      const text = await file.text();
      const count = await onImportItems(text);
      setImportStatus(`Berjaya menyulitkan & mengimport ${count} item ke dalam vault anda!`);
    } catch (err) {
      setImportStatus(err instanceof Error ? err.message : 'Gagal mengimport fail JSON.');
    } finally {
      setImporting(false);
      e.target.value = '';
    }
  };

  return (
    <div className="h-full overflow-y-auto p-6 sm:p-8 space-y-8 max-w-4xl">
      <div className="border-b border-neutral-200 dark:border-neutral-800 pb-5">
        <div className="text-[11px] font-mono uppercase tracking-widest text-neutral-500 mb-1">
          Vault Preferences &amp; Cryptography
        </div>
        <h1 className="text-2xl font-bold tracking-tight">Tetapan Akaun &amp; Keselamatan</h1>
      </div>

      {/* Profile & Auto-Lock */}
      <form
        onSubmit={handleSaveProfile}
        className="rounded-2xl border border-neutral-200 dark:border-neutral-800 p-6 space-y-5 bg-white dark:bg-[#050505]"
      >
        <div className="flex items-center gap-2 font-semibold text-sm">
          <Clock className="w-4 h-4" />
          <span>Profil &amp; Pemasa Kunci Automatik (Auto-Lock)</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-neutral-500 mb-1.5">
              Emel Berdaftar (KDF Identifier)
            </label>
            <input
              type="text"
              disabled
              value={user.email}
              className="w-full px-3 py-2 text-sm font-mono rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-100 dark:bg-neutral-900 text-neutral-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium mb-1.5">Nama Paparan</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-300 dark:border-neutral-800 bg-white dark:bg-black"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium mb-1.5">
              Pembayang Master Password (Hint)
            </label>
            <input
              type="text"
              value={passwordHint}
              onChange={(e) => setPasswordHint(e.target.value)}
              placeholder="Pembayang tanpa mendedahkan kata laluan..."
              className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-300 dark:border-neutral-800 bg-white dark:bg-black"
            />
          </div>

          <div>
            <label className="block text-xs font-medium mb-1.5">
              Kunci Vault Automatik Selepas Melahu
            </label>
            <select
              value={autoLockMinutes}
              onChange={(e) => setAutoLockMinutes(Number(e.target.value))}
              className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-300 dark:border-neutral-800 bg-white dark:bg-black"
            >
              <option value={1}>1 minit</option>
              <option value={5}>5 minit</option>
              <option value={15}>15 minit (Disyorkan)</option>
              <option value={30}>30 minit</option>
              <option value={60}>1 jam</option>
              <option value={0}>Jangan kunci automatik</option>
            </select>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2">
          <div className="text-xs font-mono text-neutral-500">
            KDF: PBKDF2-SHA256 ({user.kdfIterations.toLocaleString()} iterasi)
          </div>
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 rounded-lg bg-black text-white dark:bg-white dark:text-black text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
          >
            {saving ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : savedNotice ? (
              <Check className="w-3.5 h-3.5" />
            ) : null}
            <span>{savedNotice ? 'Tersimpan!' : 'Simpan Tetapan'}</span>
          </button>
        </div>
      </form>

      {/* Import / Export (Bitwarden & Vercel Vault JSON compatible) */}
      <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 p-6 space-y-4 bg-white dark:bg-[#050505]">
        <div className="flex items-center gap-2 font-semibold text-sm">
          <FileJson className="w-4 h-4" />
          <span>Mudah Alih Data — Import &amp; Eksport Vault</span>
        </div>
        <p className="text-xs text-neutral-500 leading-relaxed">
          Eksport salinan sandaran JSON atau import fail eksport daripada{' '}
          <strong>Bitwarden JSON</strong> atau <strong>Vercel Vault JSON</strong>. Semua item yang
          diimport akan disulitkan semula menggunakan kunci AES-256-GCM anda.
        </p>

        {importStatus && (
          <div className="p-3 rounded-lg border border-neutral-300 dark:border-neutral-700 text-xs font-mono">
            {importStatus}
          </div>
        )}

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={handleExportVaultJson}
            className="px-4 py-2.5 rounded-lg border border-neutral-300 dark:border-neutral-800 text-xs font-medium inline-flex items-center gap-2 hover:bg-neutral-100 dark:hover:bg-neutral-900 cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Eksport Vault (.json)</span>
          </button>

          <label className="px-4 py-2.5 rounded-lg bg-black text-white dark:bg-white dark:text-black text-xs font-medium inline-flex items-center gap-2 hover:bg-neutral-800 dark:hover:bg-neutral-200 cursor-pointer">
            {importing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Upload className="w-4 h-4" />
            )}
            <span>Import Bitwarden / Vault JSON</span>
            <input
              type="file"
              accept=".json,application/json"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>
        </div>
      </div>

      {/* Cryptographic Parameters Spec */}
      <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 p-6 space-y-3 bg-white dark:bg-[#050505]">
        <div className="flex items-center gap-2 font-semibold text-sm">
          <Shield className="w-4 h-4" />
          <span>Spesifikasi Kriptografi Akaun</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono">
          <div className="p-3 rounded-lg border border-neutral-200 dark:border-neutral-900 bg-neutral-50 dark:bg-neutral-950">
            <div className="text-neutral-500 text-[10px]">VAULT CIPHER</div>
            <div className="mt-1 font-semibold">AES-256-GCM (96-bit IV)</div>
          </div>
          <div className="p-3 rounded-lg border border-neutral-200 dark:border-neutral-900 bg-neutral-50 dark:bg-neutral-950">
            <div className="text-neutral-500 text-[10px]">KEY DERIVATION</div>
            <div className="mt-1 font-semibold">PBKDF2-HMAC-SHA256</div>
          </div>
          <div className="p-3 rounded-lg border border-neutral-200 dark:border-neutral-900 bg-neutral-50 dark:bg-neutral-950">
            <div className="text-neutral-500 text-[10px]">ACCOUNT SALT</div>
            <div className="mt-1 font-semibold truncate">{user.kdfSalt}</div>
          </div>
        </div>
      </div>

      {/* Security Audit Activity Log */}
      <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden bg-white dark:bg-[#050505]">
        <div className="px-6 py-4 border-b border-neutral-200 dark:border-neutral-800 flex items-center gap-2 font-semibold text-sm">
          <Activity className="w-4 h-4" />
          <span>Log Aktiviti Keselamatan Terkini</span>
        </div>
        <div className="divide-y divide-neutral-200 dark:divide-neutral-900 max-h-72 overflow-y-auto">
          {auditLogs.length === 0 ? (
            <div className="p-6 text-xs text-neutral-500 font-mono">Tiada rekod aktiviti.</div>
          ) : (
            auditLogs.map((log) => (
              <div
                key={log.id}
                className="px-6 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs"
              >
                <div className="flex items-center gap-2.5">
                  <KeyRound className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                  <span className="font-mono font-semibold">{log.action}</span>
                  <span className="text-neutral-600 dark:text-neutral-400">{log.detail}</span>
                </div>
                <div className="text-[11px] font-mono text-neutral-500 shrink-0">
                  {new Date(log.timestamp).toLocaleString()}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
