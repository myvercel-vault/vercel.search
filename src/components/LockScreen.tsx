import React, { useState } from 'react';
import { Lock, LogOut, Eye, EyeOff, Loader2, AlertCircle } from 'lucide-react';
import { VercelTriangle } from './LandingPage';
import { deriveMasterKeys } from '../utils/crypto';
import type { UserProfile } from '../types/vault';

interface LockScreenProps {
  user: UserProfile;
  onUnlock: (vaultKey: CryptoKey, authKey: string) => Promise<void>;
  onLogout: () => void;
}

export const LockScreen: React.FC<LockScreenProps> = ({ user, onUnlock, onLogout }) => {
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [unlocking, setUnlocking] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) return;
    setUnlocking(true);
    setError('');
    try {
      const { vaultKey, authKey } = await deriveMasterKeys(
        password,
        user.email,
        user.kdfSalt,
        user.kdfIterations
      );
      // Verify against backend login so wrong password never unlocks garbage
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: user.email, authKey }),
      });
      if (!res.ok) {
        throw new Error('Master Password tidak sah.');
      }
      await onUnlock(vaultKey, authKey);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal membuka kunci vault.');
    } finally {
      setUnlocking(false);
    }
  };

  return (
    <div className="min-h-screen bg-white text-black dark:bg-black dark:text-white flex items-center justify-center p-4 vercel-grid">
      <div className="w-full max-w-md rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#050505] p-7 sm:p-8 shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2 font-semibold text-sm">
            <VercelTriangle className="w-4 h-4" />
            <span>VAULT DIKUNCI</span>
          </div>
          <span className="px-2 py-0.5 text-[10px] font-mono border border-neutral-300 dark:border-neutral-800 rounded-full">
            RAM CLEARED
          </span>
        </div>

        <div className="mb-6">
          <h1 className="text-xl font-bold tracking-tight">Buka Kunci Sesi Anda</h1>
          <p className="text-xs text-neutral-500 font-mono mt-1">{user.email}</p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg border border-black dark:border-white text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <Lock className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type={showPwd ? 'text' : 'password'}
              required
              autoFocus
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Masukkan Master Password..."
              className="w-full pl-9 pr-10 py-2.5 text-sm font-mono rounded-lg border border-neutral-300 dark:border-neutral-800 bg-white dark:bg-black focus:outline-none focus:border-black dark:focus:border-white"
            />
            <button
              type="button"
              onClick={() => setShowPwd(!showPwd)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-black dark:hover:text-white cursor-pointer"
            >
              {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          <button
            type="submit"
            disabled={unlocking}
            className="w-full py-2.5 rounded-lg bg-black text-white dark:bg-white dark:text-black font-medium text-sm hover:bg-neutral-800 dark:hover:bg-neutral-200 inline-flex items-center justify-center gap-2 cursor-pointer"
          >
            {unlocking && <Loader2 className="w-4 h-4 animate-spin" />}
            <span>Buka Kunci Vault</span>
          </button>
        </form>

        <button
          type="button"
          onClick={onLogout}
          className="mt-4 w-full py-2 text-xs text-neutral-500 hover:text-black dark:hover:text-white inline-flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Log Keluar Akaun</span>
        </button>
      </div>
    </div>
  );
};
