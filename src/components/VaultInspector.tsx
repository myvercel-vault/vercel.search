import React, { useState, useEffect, useMemo } from 'react';
import {
  KeyRound,
  CreditCard,
  FileText,
  UserCheck,
  Terminal,
  Copy,
  Check,
  Eye,
  EyeOff,
  ExternalLink,
  Star,
  Edit3,
  Trash2,
  RotateCcw,
  ShieldAlert,
  Lock,
  Clock,
  Folder,
  History,
} from 'lucide-react';
import type { DecryptedVaultItem, VaultFolder } from '../types/vault';
import {
  deriveMasterKeys,
  evaluatePasswordStrength,
  generateTotpCode,
} from '../utils/crypto';

interface VaultInspectorProps {
  item: DecryptedVaultItem | null;
  folders: VaultFolder[];
  userEmail: string;
  userSalt: string;
  userIterations: number;
  expectedAuthKey: string;
  onEdit: (item: DecryptedVaultItem) => void;
  onToggleFavorite: (item: DecryptedVaultItem) => void;
  onMoveToTrash: (item: DecryptedVaultItem) => void;
  onRestoreFromTrash: (item: DecryptedVaultItem) => void;
  onPermanentDelete: (item: DecryptedVaultItem) => void;
}

export const VaultInspector: React.FC<VaultInspectorProps> = ({
  item,
  folders,
  userEmail,
  userSalt,
  userIterations,
  expectedAuthKey,
  onEdit,
  onToggleFavorite,
  onMoveToTrash,
  onRestoreFromTrash,
  onPermanentDelete,
}) => {
  const [revealedSecrets, setRevealedSecrets] = useState<Record<string, boolean>>({});
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [totpState, setTotpState] = useState<{ code: string; remainingSeconds: number } | null>(
    null
  );
  const [showHistory, setShowHistory] = useState(false);

  // Master password reprompt gate for high-security items
  const [unlockedRepromptIds, setUnlockedRepromptIds] = useState<Record<string, boolean>>({});
  const [repromptInput, setRepromptInput] = useState('');
  const [repromptErr, setRepromptErr] = useState('');
  const [verifyingReprompt, setVerifyingReprompt] = useState(false);

  useEffect(() => {
    setRevealedSecrets({});
    setShowHistory(false);
    setRepromptInput('');
    setRepromptErr('');
  }, [item?.id]);

  // Live TOTP 30-second ticker
  useEffect(() => {
    const secret = item?.data.login?.totpSecret;
    if (!secret) {
      setTotpState(null);
      return;
    }
    let mounted = true;
    const updateTotp = async () => {
      const res = await generateTotpCode(secret, Date.now());
      if (mounted) setTotpState(res);
    };
    updateTotp();
    const timer = setInterval(updateTotp, 1000);
    return () => {
      mounted = false;
      clearInterval(timer);
    };
  }, [item?.id, item?.data.login?.totpSecret]);

  const folderName = useMemo(() => {
    if (!item?.folderId) return null;
    return folders.find((f) => f.id === item.folderId)?.name || null;
  }, [item?.folderId, folders]);

  if (!item) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 text-center text-neutral-500">
        <div className="w-12 h-12 rounded-2xl border border-neutral-200 dark:border-neutral-800 flex items-center justify-center mb-4">
          <Lock className="w-5 h-5" />
        </div>
        <div className="text-sm font-medium text-black dark:text-white">
          Pilih Item Untuk Dinyahsulit
        </div>
        <p className="text-xs text-neutral-500 mt-1 max-w-xs">
          Pilih mana-mana log masuk, kad kredit, nota selamat atau kunci SSH daripada senarai untuk
          melihat butiran penuh.
        </p>
      </div>
    );
  }

  const copyField = (key: string, val: string) => {
    if (!val) return;
    navigator.clipboard.writeText(val);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1800);
  };

  const toggleReveal = (key: string) => {
    setRevealedSecrets((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const isRepromptLocked =
    Boolean(item.repromptMasterPassword) && !unlockedRepromptIds[item.id];

  const handleUnlockReprompt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!repromptInput) return;
    setVerifyingReprompt(true);
    setRepromptErr('');
    try {
      const { authKey } = await deriveMasterKeys(
        repromptInput,
        userEmail,
        userSalt,
        userIterations
      );
      if (authKey !== expectedAuthKey) {
        setRepromptErr('Master Password tidak sepadan.');
      } else {
        setUnlockedRepromptIds((prev) => ({ ...prev, [item.id]: true }));
        setRepromptInput('');
      }
    } catch {
      setRepromptErr('Gagal mengesahkan Master Password.');
    } finally {
      setVerifyingReprompt(false);
    }
  };

  const TypeIcon =
    item.type === 'login'
      ? KeyRound
      : item.type === 'card'
        ? CreditCard
        : item.type === 'note'
          ? FileText
          : item.type === 'identity'
            ? UserCheck
            : Terminal;

  const loginPwdStrength = item.data.login?.password
    ? evaluatePasswordStrength(item.data.login.password)
    : null;

  return (
    <div className="h-full overflow-y-auto p-5 sm:p-7 space-y-6">
      {/* Top Item Header */}
      <div className="flex items-start justify-between gap-4 pb-5 border-b border-neutral-200 dark:border-neutral-800">
        <div className="flex items-start gap-3.5 min-w-0">
          <div className="w-11 h-11 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 flex items-center justify-center shrink-0">
            <TypeIcon className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg sm:text-xl font-bold tracking-tight truncate">{item.title}</h2>
              {item.repromptMasterPassword && (
                <span className="px-2 py-0.5 text-[10px] font-mono uppercase border border-neutral-300 dark:border-neutral-700 rounded-full">
                  Protected
                </span>
              )}
              {item.deletedAt && (
                <span className="px-2 py-0.5 text-[10px] font-mono uppercase bg-black text-white dark:bg-white dark:text-black rounded-full">
                  Dalam Trash
                </span>
              )}
            </div>
            <div className="mt-1 flex items-center gap-3 text-xs text-neutral-500 flex-wrap">
              <span className="font-mono">{item.subtitle}</span>
              {folderName && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-neutral-100 dark:bg-neutral-900 text-[11px]">
                  <Folder className="w-3 h-3" />
                  <span>{folderName}</span>
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Action Toolbar */}
        <div className="flex items-center gap-1.5 shrink-0">
          {!item.deletedAt ? (
            <>
              <button
                type="button"
                onClick={() => onToggleFavorite(item)}
                title="Tandakan Kegemaran"
                className={`p-2 rounded-lg border transition-colors cursor-pointer ${
                  item.favorite
                    ? 'border-black dark:border-white bg-black text-white dark:bg-white dark:text-black'
                    : 'border-neutral-200 dark:border-neutral-800 text-neutral-500 hover:text-black dark:hover:text-white'
                }`}
              >
                <Star className="w-4 h-4" fill={item.favorite ? 'currentColor' : 'none'} />
              </button>
              <button
                type="button"
                onClick={() => onEdit(item)}
                className="px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-800 text-xs font-medium inline-flex items-center gap-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-900 cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Edit</span>
              </button>
              <button
                type="button"
                onClick={() => onMoveToTrash(item)}
                title="Alih ke Trash"
                className="p-2 rounded-lg border border-neutral-200 dark:border-neutral-800 text-neutral-500 hover:text-black dark:hover:text-white hover:border-neutral-400 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => onRestoreFromTrash(item)}
                className="px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-700 text-xs font-medium inline-flex items-center gap-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-900 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Pulihkan</span>
              </button>
              <button
                type="button"
                onClick={() => onPermanentDelete(item)}
                className="px-3 py-2 rounded-lg bg-black text-white dark:bg-white dark:text-black text-xs font-medium inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Padam Kekal</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Master Password Reprompt Gate */}
      {isRepromptLocked ? (
        <div className="p-6 rounded-2xl border border-neutral-300 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 max-w-md">
          <div className="flex items-center gap-2.5 font-semibold text-sm mb-2">
            <ShieldAlert className="w-4 h-4" />
            <span>Pengesahan Semula Master Password Diperlukan</span>
          </div>
          <p className="text-xs text-neutral-500 mb-4 leading-relaxed">
            Item sensitif ini dilindungi dengan tetapan Master Password Reprompt. Masukkan Master
            Password anda untuk mendedahkan butiran.
          </p>
          {repromptErr && (
            <div className="mb-3 text-xs font-mono p-2 rounded border border-black dark:border-white">
              {repromptErr}
            </div>
          )}
          <form onSubmit={handleUnlockReprompt} className="flex gap-2">
            <input
              type="password"
              required
              value={repromptInput}
              onChange={(e) => setRepromptInput(e.target.value)}
              placeholder="Master Password..."
              className="flex-1 px-3 py-2 text-xs font-mono rounded-lg border border-neutral-300 dark:border-neutral-800 bg-white dark:bg-black focus:outline-none focus:border-black dark:focus:border-white"
            />
            <button
              type="submit"
              disabled={verifyingReprompt}
              className="px-4 py-2 rounded-lg bg-black text-white dark:bg-white dark:text-black text-xs font-semibold cursor-pointer"
            >
              {verifyingReprompt ? 'Sahkan...' : 'Buka'}
            </button>
          </form>
        </div>
      ) : (
        <>
          {/* LOGIN DETAILS */}
          {item.type === 'login' && item.data.login && (
            <div className="space-y-4">
              <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 divide-y divide-neutral-200 dark:divide-neutral-800 overflow-hidden">
                {/* Username */}
                <div className="p-4 flex items-center justify-between gap-3 bg-white dark:bg-[#050505]">
                  <div className="min-w-0">
                    <div className="text-[10px] font-mono uppercase tracking-wider text-neutral-500">
                      Emel / Username
                    </div>
                    <div className="text-sm font-mono mt-1 break-all">
                      {item.data.login.username || '—'}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => copyField('username', item.data.login!.username)}
                    className="px-2.5 py-1.5 rounded-md border border-neutral-200 dark:border-neutral-800 text-xs font-mono inline-flex items-center gap-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-900 shrink-0 cursor-pointer"
                  >
                    {copiedKey === 'username' ? (
                      <Check className="w-3.5 h-3.5" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                    <span>{copiedKey === 'username' ? 'Disalin' : 'Salin'}</span>
                  </button>
                </div>

                {/* Password */}
                <div className="p-4 bg-white dark:bg-[#050505]">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-[10px] font-mono uppercase tracking-wider text-neutral-500">
                        Kata Laluan
                      </div>
                      <div className="text-sm font-mono mt-1 break-all">
                        {revealedSecrets.password
                          ? item.data.login.password
                          : '••••••••••••••••••••'}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => toggleReveal('password')}
                        className="p-1.5 rounded-md border border-neutral-200 dark:border-neutral-800 text-neutral-500 hover:text-black dark:hover:text-white cursor-pointer"
                      >
                        {revealedSecrets.password ? (
                          <EyeOff className="w-3.5 h-3.5" />
                        ) : (
                          <Eye className="w-3.5 h-3.5" />
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => copyField('password', item.data.login!.password)}
                        className="px-2.5 py-1.5 rounded-md border border-neutral-200 dark:border-neutral-800 text-xs font-mono inline-flex items-center gap-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-900 cursor-pointer"
                      >
                        {copiedKey === 'password' ? (
                          <Check className="w-3.5 h-3.5" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                        <span>{copiedKey === 'password' ? 'Disalin' : 'Salin'}</span>
                      </button>
                    </div>
                  </div>

                  {loginPwdStrength && (
                    <div className="mt-3 pt-2.5 border-t border-neutral-100 dark:border-neutral-900 flex items-center justify-between text-[11px] font-mono text-neutral-500">
                      <span>
                        Kekuatan: <strong className="text-black dark:text-white">{loginPwdStrength.label}</strong>
                      </span>
                      <span>
                        {loginPwdStrength.entropyBits} bit · {loginPwdStrength.crackTime}
                      </span>
                    </div>
                  )}
                </div>

                {/* Live TOTP 2FA */}
                {totpState && (
                  <div className="p-4 flex items-center justify-between gap-3 bg-neutral-50 dark:bg-neutral-950">
                    <div>
                      <div className="text-[10px] font-mono uppercase tracking-wider text-neutral-500 flex items-center gap-1.5">
                        <Clock className="w-3 h-3" />
                        <span>Kod Pengesahan 2FA (TOTP Live)</span>
                      </div>
                      <div className="text-xl font-mono font-bold tracking-widest mt-1 tabular-nums">
                        {totpState.code.slice(0, 3)} {totpState.code.slice(3)}
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <div className="text-xs font-mono font-semibold tabular-nums">
                          {totpState.remainingSeconds}s
                        </div>
                        <div className="w-14 h-1.5 rounded-full bg-neutral-200 dark:bg-neutral-800 overflow-hidden mt-1">
                          <div
                            className="h-full bg-black dark:bg-white transition-all duration-700"
                            style={{ width: `${(totpState.remainingSeconds / 30) * 100}%` }}
                          />
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => copyField('totp', totpState.code)}
                        className="px-2.5 py-1.5 rounded-md bg-black text-white dark:bg-white dark:text-black text-xs font-mono inline-flex items-center gap-1.5 cursor-pointer"
                      >
                        {copiedKey === 'totp' ? (
                          <Check className="w-3.5 h-3.5" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                        <span>{copiedKey === 'totp' ? 'Disalin' : 'Salin OTP'}</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* URLs */}
              {item.data.login.urls.length > 0 && (
                <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 p-4 space-y-2.5">
                  <div className="text-[10px] font-mono uppercase tracking-wider text-neutral-500">
                    Laman Web &amp; Autofill URI
                  </div>
                  {item.data.login.urls.map((u, idx) => {
                    const href = /^https?:\/\//i.test(u) ? u : `https://${u}`;
                    return (
                      <div
                        key={`${u}-${idx}`}
                        className="flex items-center justify-between gap-2 text-xs font-mono"
                      >
                        <span className="truncate">{u}</span>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => copyField(`url_${idx}`, u)}
                            className="px-2 py-1 rounded border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-900 cursor-pointer"
                          >
                            {copiedKey === `url_${idx}` ? 'Disalin' : 'Salin'}
                          </button>
                          <a
                            href={href}
                            target="_blank"
                            rel="noreferrer"
                            className="p-1.5 rounded border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-900"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Password History */}
              {item.data.login.passwordHistory && item.data.login.passwordHistory.length > 0 && (
                <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 p-4">
                  <button
                    type="button"
                    onClick={() => setShowHistory(!showHistory)}
                    className="w-full flex items-center justify-between text-xs font-medium cursor-pointer"
                  >
                    <span className="inline-flex items-center gap-1.5">
                      <History className="w-3.5 h-3.5" />
                      <span>
                        Sejarah Kata Laluan Sebelumnya ({item.data.login.passwordHistory.length})
                      </span>
                    </span>
                    <span className="font-mono text-neutral-500">
                      {showHistory ? 'Sembunyi' : 'Papar'}
                    </span>
                  </button>
                  {showHistory && (
                    <div className="mt-3 space-y-2 pt-3 border-t border-neutral-200 dark:border-neutral-800">
                      {item.data.login.passwordHistory.map((ph, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between text-xs font-mono"
                        >
                          <span className="truncate pr-2">{ph.password}</span>
                          <span className="text-[10px] text-neutral-500 shrink-0">
                            {ph.changedAt.slice(0, 10)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* CREDIT CARD DETAILS */}
          {item.type === 'card' && item.data.card && (
            <div className="space-y-4">
              {/* Monochrome Metal Card Visual */}
              <div className="p-6 rounded-2xl bg-black text-white dark:bg-neutral-950 border border-neutral-800 shadow-lg relative overflow-hidden">
                <div className="flex items-center justify-between mb-8">
                  <span className="text-xs font-mono uppercase tracking-widest text-neutral-400">
                    VERCEL VAULT CARD
                  </span>
                  <span className="text-sm font-bold tracking-wider">{item.data.card.brand}</span>
                </div>
                <div className="font-mono text-lg sm:text-xl tracking-[0.2em] mb-6">
                  {revealedSecrets.cardNumber
                    ? item.data.card.number.replace(/(.{4})/g, '$1 ').trim()
                    : `•••• •••• •••• ${item.data.card.number.slice(-4)}`}
                </div>
                <div className="flex items-end justify-between text-xs font-mono">
                  <div>
                    <div className="text-[10px] text-neutral-400 uppercase">Pemegang Kad</div>
                    <div className="mt-0.5 font-semibold">{item.data.card.cardholderName}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-neutral-400 uppercase">Sah Sehingga</div>
                    <div className="mt-0.5 font-semibold">
                      {item.data.card.expMonth}/{item.data.card.expYear.slice(-2)}
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 divide-y divide-neutral-200 dark:divide-neutral-800">
                <div className="p-4 flex items-center justify-between">
                  <div>
                    <div className="text-[10px] font-mono uppercase text-neutral-500">
                      Nombor Kad Penuh
                    </div>
                    <div className="text-sm font-mono mt-0.5">
                      {revealedSecrets.cardNumber
                        ? item.data.card.number
                        : `••••••••••••${item.data.card.number.slice(-4)}`}
                    </div>
                  </div>
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      onClick={() => toggleReveal('cardNumber')}
                      className="p-1.5 rounded border border-neutral-200 dark:border-neutral-800 cursor-pointer"
                    >
                      {revealedSecrets.cardNumber ? (
                        <EyeOff className="w-3.5 h-3.5" />
                      ) : (
                        <Eye className="w-3.5 h-3.5" />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => copyField('cardNumber', item.data.card!.number)}
                      className="px-2.5 py-1 rounded border border-neutral-200 dark:border-neutral-800 text-xs font-mono cursor-pointer"
                    >
                      {copiedKey === 'cardNumber' ? 'Disalin' : 'Salin'}
                    </button>
                  </div>
                </div>

                <div className="p-4 grid grid-cols-2 gap-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-[10px] font-mono uppercase text-neutral-500">CVV</div>
                      <div className="text-sm font-mono mt-0.5">
                        {revealedSecrets.cvv ? item.data.card.cvv : '•••'}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={() => toggleReveal('cvv')}
                        className="p-1.5 rounded border border-neutral-200 dark:border-neutral-800 cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => copyField('cvv', item.data.card!.cvv)}
                        className="px-2 py-1 rounded border border-neutral-200 dark:border-neutral-800 text-xs font-mono cursor-pointer"
                      >
                        {copiedKey === 'cvv' ? '✓' : 'Salin'}
                      </button>
                    </div>
                  </div>

                  {item.data.card.pin && (
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-[10px] font-mono uppercase text-neutral-500">PIN</div>
                        <div className="text-sm font-mono mt-0.5">
                          {revealedSecrets.pin ? item.data.card.pin : '••••'}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => toggleReveal('pin')}
                        className="p-1.5 rounded border border-neutral-200 dark:border-neutral-800 cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* SECURE NOTE DETAILS */}
          {item.type === 'note' && item.data.note && (
            <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 p-5 bg-neutral-50/50 dark:bg-neutral-950">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-500">
                  Kandungan Tersulit AES-256
                </span>
                <button
                  type="button"
                  onClick={() => copyField('noteContent', item.data.note!.content)}
                  className="px-2.5 py-1 rounded border border-neutral-200 dark:border-neutral-800 text-xs font-mono cursor-pointer"
                >
                  {copiedKey === 'noteContent' ? 'Disalin!' : 'Salin Semua'}
                </button>
              </div>
              <pre className="text-xs sm:text-sm font-mono whitespace-pre-wrap break-words leading-relaxed">
                {item.data.note.content}
              </pre>
            </div>
          )}

          {/* IDENTITY DETAILS */}
          {item.type === 'identity' && item.data.identity && (
            <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 divide-y divide-neutral-200 dark:divide-neutral-800">
              {[
                {
                  label: 'Nama Penuh',
                  val: `${item.data.identity.title} ${item.data.identity.firstName} ${item.data.identity.lastName}`.trim(),
                },
                { label: 'Emel', val: item.data.identity.email },
                { label: 'Telefon', val: item.data.identity.phone },
                { label: 'Syarikat', val: item.data.identity.company },
                { label: 'No. Pasport', val: item.data.identity.passportNumber },
                { label: 'No. ID / Lesen', val: item.data.identity.licenseNumber },
                {
                  label: 'Alamat Penuh',
                  val: [
                    item.data.identity.addressLine1,
                    item.data.identity.city,
                    item.data.identity.state,
                    item.data.identity.postalCode,
                    item.data.identity.country,
                  ]
                    .filter(Boolean)
                    .join(', '),
                },
              ]
                .filter((r) => r.val)
                .map((row) => (
                  <div key={row.label} className="p-3.5 flex items-center justify-between gap-3">
                    <div>
                      <div className="text-[10px] font-mono uppercase text-neutral-500">
                        {row.label}
                      </div>
                      <div className="text-sm mt-0.5">{row.val}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => copyField(row.label, row.val!)}
                      className="px-2.5 py-1 rounded border border-neutral-200 dark:border-neutral-800 text-xs font-mono shrink-0 cursor-pointer"
                    >
                      {copiedKey === row.label ? 'Disalin' : 'Salin'}
                    </button>
                  </div>
                ))}
            </div>
          )}

          {/* SSH / API KEY DETAILS */}
          {item.type === 'ssh_key' && item.data.sshKey && (
            <div className="space-y-4">
              <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 divide-y divide-neutral-200 dark:divide-neutral-800">
                <div className="p-4 flex items-center justify-between">
                  <div>
                    <div className="text-[10px] font-mono uppercase text-neutral-500">
                      Jenis &amp; Persekitaran
                    </div>
                    <div className="text-sm font-mono mt-0.5">
                      {item.data.sshKey.keyType} · {item.data.sshKey.environment}
                    </div>
                  </div>
                  {item.data.sshKey.fingerprint && (
                    <span className="text-xs font-mono text-neutral-500">
                      {item.data.sshKey.fingerprint}
                    </span>
                  )}
                </div>

                {item.data.sshKey.publicKey && (
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10px] font-mono uppercase text-neutral-500">
                        Public Key / Identifier
                      </span>
                      <button
                        type="button"
                        onClick={() => copyField('pubKey', item.data.sshKey!.publicKey)}
                        className="px-2 py-0.5 rounded border border-neutral-200 dark:border-neutral-800 text-xs font-mono cursor-pointer"
                      >
                        {copiedKey === 'pubKey' ? 'Disalin' : 'Salin'}
                      </button>
                    </div>
                    <div className="text-xs font-mono break-all text-neutral-700 dark:text-neutral-300">
                      {item.data.sshKey.publicKey}
                    </div>
                  </div>
                )}

                <div className="p-4">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-mono uppercase text-neutral-500">
                      Private Key / Secret Token
                    </span>
                    <div className="flex gap-1.5">
                      <button
                        type="button"
                        onClick={() => toggleReveal('privKey')}
                        className="px-2 py-0.5 rounded border border-neutral-200 dark:border-neutral-800 text-xs font-mono cursor-pointer"
                      >
                        {revealedSecrets.privKey ? 'Sembunyi' : 'Papar'}
                      </button>
                      <button
                        type="button"
                        onClick={() => copyField('privKey', item.data.sshKey!.privateKey)}
                        className="px-2 py-0.5 rounded border border-neutral-200 dark:border-neutral-800 text-xs font-mono cursor-pointer"
                      >
                        {copiedKey === 'privKey' ? 'Disalin' : 'Salin'}
                      </button>
                    </div>
                  </div>
                  <pre className="text-xs font-mono whitespace-pre-wrap break-all bg-neutral-50 dark:bg-neutral-950 p-3 rounded-lg border border-neutral-200 dark:border-neutral-900">
                    {revealedSecrets.privKey
                      ? item.data.sshKey.privateKey
                      : '••••••••••••••••••••••••••••••••••••••••••••'}
                  </pre>
                </div>
              </div>
            </div>
          )}

          {/* Custom Fields */}
          {item.data.customFields && item.data.customFields.length > 0 && (
            <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 divide-y divide-neutral-200 dark:divide-neutral-800">
              <div className="px-4 py-2.5 text-[10px] font-mono uppercase tracking-wider text-neutral-500 bg-neutral-50 dark:bg-neutral-950">
                Medan Tersuai
              </div>
              {item.data.customFields.map((cf) => {
                const isShown = !cf.hidden || revealedSecrets[`cf_${cf.id}`];
                return (
                  <div key={cf.id} className="p-3.5 flex items-center justify-between gap-3">
                    <div>
                      <div className="text-[10px] font-mono uppercase text-neutral-500">
                        {cf.label}
                      </div>
                      <div className="text-xs font-mono mt-0.5">
                        {isShown ? cf.value : '••••••••••••'}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {cf.hidden && (
                        <button
                          type="button"
                          onClick={() => toggleReveal(`cf_${cf.id}`)}
                          className="p-1.5 rounded border border-neutral-200 dark:border-neutral-800 cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => copyField(`cf_${cf.id}`, cf.value)}
                        className="px-2.5 py-1 rounded border border-neutral-200 dark:border-neutral-800 text-xs font-mono cursor-pointer"
                      >
                        {copiedKey === `cf_${cf.id}` ? 'Disalin' : 'Salin'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Extra Notes */}
          {item.data.notes && (
            <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 p-4">
              <div className="text-[10px] font-mono uppercase tracking-wider text-neutral-500 mb-1.5">
                Nota
              </div>
              <p className="text-xs sm:text-sm text-neutral-700 dark:text-neutral-300 whitespace-pre-wrap leading-relaxed">
                {item.data.notes}
              </p>
            </div>
          )}

          {/* Metadata Footer */}
          <div className="pt-4 border-t border-neutral-200 dark:border-neutral-900 flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono text-neutral-500">
            <span>Dicipta: {new Date(item.createdAt).toLocaleString()}</span>
            <span>Dikemaskini: {new Date(item.updatedAt).toLocaleString()}</span>
          </div>
        </>
      )}
    </div>
  );
};
