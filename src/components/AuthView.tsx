import React, { useEffect, useState } from 'react';
import { SignIn, SignUp, useAuth, useUser } from '@clerk/react';
import {
  Eye,
  EyeOff,
  Lock,
  Mail,
  User,
  ArrowLeft,
  ShieldCheck,
  Sparkles,
  Copy,
  Check,
  HelpCircle,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { VercelTriangle } from './LandingPage';
import {
  deriveMasterKeys,
  evaluatePasswordStrength,
  generateSaltHex,
  generateSecret,
} from '../utils/crypto';
import { buildStarterVaultItems } from '../utils/starterVault';
import type { UserProfile } from '../types/vault';

interface AuthViewProps {
  initialMode: 'signin' | 'signup';
  onBackToLanding: () => void;
  onAuthSuccess: (session: {
    token: string;
    user: UserProfile;
    vaultKey: CryptoKey;
    masterPasswordVerifyHash: string;
    recoveryKey?: string;
  }) => void;
}

interface ClerkIdentity {
  email: string;
  name: string;
}

interface LegacyAuthViewProps extends AuthViewProps {
  clerkIdentity?: ClerkIdentity;
  getClerkToken?: () => Promise<string | null>;
}

const clerkConfigured = Boolean(import.meta.env.VITE_CLERK_PUBLISHABLE_KEY);

export const AuthView: React.FC<AuthViewProps> = (props) =>
  clerkConfigured ? <ClerkAuthView {...props} /> : <LegacyAuthView {...props} />;

const ClerkAuthView: React.FC<AuthViewProps> = (props) => {
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const { user } = useUser();

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white text-black dark:bg-black dark:text-white">
        <Loader2 className="w-5 h-5 animate-spin" />
      </div>
    );
  }

  if (!isSignedIn || !user) {
    const identityCard = (
      <div className="min-h-screen bg-white text-black dark:bg-black dark:text-white flex flex-col items-center justify-center px-4 py-10">
        <div className="w-full max-w-md mb-4 flex justify-between text-sm">
          <button type="button" onClick={props.onBackToLanding} className="text-neutral-500 hover:text-black dark:hover:text-white">
            Kembali
          </button>
          <span className="font-semibold">VERCEL VAULT</span>
        </div>
        {props.initialMode === 'signup' ? (
          <SignUp routing="hash" signInUrl="/?auth=signin" />
        ) : (
          <SignIn routing="hash" signUpUrl="/?auth=signup" />
        )}
      </div>
    );
    return identityCard;
  }

  const email = user.primaryEmailAddress?.emailAddress || '';
  const name = user.fullName || user.firstName || email.split('@')[0];

  return (
    <LegacyAuthView
      {...props}
      clerkIdentity={{ email, name }}
      getClerkToken={getToken}
    />
  );
};

const LegacyAuthView: React.FC<LegacyAuthViewProps> = ({
  initialMode,
  onBackToLanding,
  onAuthSuccess,
  clerkIdentity,
  getClerkToken,
}) => {
  const [mode, setMode] = useState<'signin' | 'signup'>(initialMode);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordHint, setPasswordHint] = useState('');
  const [seedSampleVault, setSeedSampleVault] = useState(true);
  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [statusStep, setStatusStep] = useState('');
  const [error, setError] = useState('');
  const [hintMessage, setHintMessage] = useState('');
  const [pendingRecovery, setPendingRecovery] = useState<{
    token: string;
    user: UserProfile;
    vaultKey: CryptoKey;
    masterPasswordVerifyHash: string;
    recoveryKey: string;
  } | null>(null);
  const [copiedRecovery, setCopiedRecovery] = useState(false);

  const strength = evaluatePasswordStrength(password);

  useEffect(() => {
    if (!clerkIdentity) return;
    const identityEmail = clerkIdentity.email;
    setEmail(identityEmail);
    setName(clerkIdentity.name);
    let cancelled = false;
    async function checkVault() {
      try {
        const token = await getClerkToken?.();
        if (!token) return;
        const res = await fetch('/api/auth/prelogin', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ email: identityEmail }),
        });
        if (!res.ok) throw new Error('Gagal menyemak akaun vault.');
        const data = await res.json();
        if (!cancelled) {
          setMode(data.exists ? 'signin' : 'signup');
          if (data.exists && typeof data.email === 'string') setEmail(data.email);
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Gagal menyemak akaun vault.');
      }
    }
    checkVault();
    return () => {
      cancelled = true;
    };
  }, [clerkIdentity?.email, clerkIdentity?.name, getClerkToken]);

  const clerkHeaders = async (): Promise<Record<string, string>> => {
    const token = await getClerkToken?.();
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const handleSuggestMasterPassword = () => {
    const phrase = generateSecret({
      mode: 'passphrase',
      length: 20,
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
    setPassword(phrase);
    setConfirmPassword(phrase);
    setShowPassword(true);
  };

  const handleFetchHint = async () => {
    if (!email.trim() || !email.includes('@')) {
      setError('Masukkan alamat emel anda dahulu untuk melihat pembayang Master Password.');
      return;
    }
    setError('');
    try {
      const res = await fetch('/api/auth/hint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(await clerkHeaders()) },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      const data = await res.json();
      setHintMessage(`Pembayang Master Password: ${data.hint}`);
    } catch {
      setError('Gagal mendapatkan pembayang kata laluan.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setHintMessage('');

    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      setError('Sila masukkan format emel yang sah.');
      return;
    }

    if (mode === 'signup') {
      if (password.length < 8) {
        setError('Master Password mestilah sekurang-kurangnya 8 aksara.');
        return;
      }
      if (password !== confirmPassword) {
        setError('Pengesahan Master Password tidak sepadan.');
        return;
      }
      if (passwordHint && passwordHint.trim().toLowerCase() === password.trim().toLowerCase()) {
        setError('Pembayang (Hint) tidak boleh sama dengan Master Password anda!');
        return;
      }
    } else if (!password) {
      setError('Sila masukkan Master Password anda.');
      return;
    }

    setLoading(true);
    try {
      if (mode === 'signup') {
        const kdfSalt = generateSaltHex(16);
        const kdfIterations = 310000;
        setStatusStep('Menjana kunci PBKDF2-SHA256 (310,000 iterasi)...');
        const { vaultKey, authKey } = await deriveMasterKeys(
          password,
          normalizedEmail,
          kdfSalt,
          kdfIterations
        );

        let initialItems: Awaited<ReturnType<typeof buildStarterVaultItems>> = [];
        if (seedSampleVault) {
          setStatusStep('Menyulitkan item permulaan dengan AES-256-GCM...');
          initialItems = await buildStarterVaultItems(
            vaultKey,
            normalizedEmail,
            name.trim() || normalizedEmail.split('@')[0]
          );
        }

        setStatusStep('Mendaftarkan Zero-Knowledge Vault...');
        const res = await fetch('/api/auth/signup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...(await clerkHeaders()) },
          body: JSON.stringify({
            email: normalizedEmail,
            name: name.trim() || normalizedEmail.split('@')[0],
            authKey,
            kdfSalt,
            kdfIterations,
            passwordHint: passwordHint.trim(),
            initialFolders: ['Engineering & Cloud', 'Personal', 'Finance & Billing', 'Work'],
            initialItems,
          }),
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Pendaftaran gagal.');
        }

        if (data.recoveryKey) {
          setPendingRecovery({
            token: data.token,
            user: data.user,
            vaultKey,
            masterPasswordVerifyHash: authKey,
            recoveryKey: data.recoveryKey,
          });
        } else {
          onAuthSuccess({
            token: data.token,
            user: data.user,
            vaultKey,
            masterPasswordVerifyHash: authKey,
          });
        }
      } else {
        setStatusStep('Mendapatkan parameter KDF akaun...');
        const preRes = await fetch('/api/auth/prelogin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...(await clerkHeaders()) },
          body: JSON.stringify({ email: normalizedEmail }),
        });
        const preData = await preRes.json();
        if (!preRes.ok) {
          throw new Error(preData.error || 'Ralat pra-log masuk.');
        }
        if (!preData.exists && clerkIdentity) {
          setMode('signup');
          throw new Error('Akaun vault belum disediakan. Cipta Master Password dahulu.');
        }

        setStatusStep('Menyahkunci kunci kriptografi tempatan...');
        const derivationEmail =
          clerkIdentity && typeof preData.email === 'string' ? preData.email : normalizedEmail;
        const { vaultKey, authKey } = await deriveMasterKeys(
          password,
          derivationEmail,
          preData.kdfSalt,
          preData.kdfIterations
        );

        setStatusStep('Mengesahkan sesi dengan pelayan...');
        const loginRes = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...(await clerkHeaders()) },
          body: JSON.stringify({
            email: normalizedEmail,
            authKey,
          }),
        });

        const loginData = await loginRes.json();
        if (!loginRes.ok) {
          throw new Error(loginData.error || 'Emel atau Master Password tidak sah.');
        }

        onAuthSuccess({
          token: loginData.token,
          user: loginData.user,
          vaultKey,
          masterPasswordVerifyHash: authKey,
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ralat tidak dijangka.');
    } finally {
      setLoading(false);
      setStatusStep('');
    }
  };

  // Recovery Key Modal screen right after Sign Up (1Password Secret Key / Emergency Kit style)
  if (pendingRecovery) {
    return (
      <div className="min-h-screen bg-white text-black dark:bg-black dark:text-white flex flex-col justify-center items-center px-4 py-12 vercel-grid">
        <div className="w-full max-w-lg rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#060606] p-7 sm:p-8 shadow-2xl">
          <div className="w-10 h-10 rounded-lg bg-black text-white dark:bg-white dark:text-black flex items-center justify-center mb-5">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Simpan Emergency Recovery Key Anda</h1>
          <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
            Kerana Vercel Vault menggunakan seni bina <strong>Zero-Knowledge</strong>, kami tidak
            menyimpan Master Password anda. Simpan kunci pemulihan rahsia ini di tempat selamat.
          </p>

          <div className="mt-6 p-4 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-950">
            <div className="text-[10px] font-mono uppercase tracking-widest text-neutral-500 mb-1.5">
              SECRET RECOVERY KEY — {pendingRecovery.user.email}
            </div>
            <div className="font-mono text-sm sm:text-base font-semibold tracking-wider break-all select-all">
              {pendingRecovery.recoveryKey}
            </div>
          </div>

          <div className="mt-4 flex gap-2.5">
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(pendingRecovery.recoveryKey);
                setCopiedRecovery(true);
                setTimeout(() => setCopiedRecovery(false), 2000);
              }}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-neutral-300 dark:border-neutral-800 text-xs font-medium hover:bg-neutral-100 dark:hover:bg-neutral-900 transition-colors cursor-pointer"
            >
              {copiedRecovery ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              <span>{copiedRecovery ? 'Disalin ke Papan Keratan' : 'Salin Recovery Key'}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                const blob = new Blob(
                  [
                    `VERCEL VAULT — EMERGENCY KIT\n============================\nEmail: ${pendingRecovery.user.email}\nRecovery Key: ${pendingRecovery.recoveryKey}\nCreated: ${new Date().toISOString()}\n\nKeep this file offline in a secure place.\n`,
                  ],
                  { type: 'text/plain;charset=utf-8' }
                );
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `vercel-vault-emergency-kit-${pendingRecovery.user.email}.txt`;
                a.click();
                URL.revokeObjectURL(url);
              }}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-neutral-300 dark:border-neutral-800 text-xs font-medium hover:bg-neutral-100 dark:hover:bg-neutral-900 transition-colors cursor-pointer"
            >
              <span>Muat Turun Kit (.txt)</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => onAuthSuccess(pendingRecovery)}
            className="mt-6 w-full py-3 rounded-lg bg-black text-white dark:bg-white dark:text-black font-medium text-sm hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-colors cursor-pointer"
          >
            Saya Telah Menyimpannya — Buka Vault Saya
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-black dark:bg-black dark:text-white flex flex-col vercel-grid">
      {/* Top Bar */}
      <div className="h-16 px-4 sm:px-8 flex items-center justify-between border-b border-neutral-200 dark:border-neutral-900 bg-white/80 dark:bg-black/80 backdrop-blur-md">
        <button
          type="button"
          onClick={onBackToLanding}
          className="inline-flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-400 hover:text-black dark:hover:text-white transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Kembali</span>
        </button>

        <div className="flex items-center gap-2 font-semibold text-sm">
          <VercelTriangle className="w-3.5 h-3.5" />
          <span>VERCEL VAULT</span>
        </div>

        {clerkIdentity ? (
          <span className="text-xs text-neutral-500">{clerkIdentity.email}</span>
        ) : (
          <button
            type="button"
            onClick={() => {
              setMode(mode === 'signin' ? 'signup' : 'signin');
              setError('');
              setHintMessage('');
            }}
            className="text-sm font-medium text-neutral-700 dark:text-neutral-300 hover:underline cursor-pointer"
          >
            {mode === 'signin' ? 'Daftar Akaun' : 'Log Masuk'}
          </button>
        )}
      </div>

      {/* Centered Vercel Auth Card */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-md rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#050505] p-6 sm:p-8 shadow-2xl">
          <div className="text-center mb-7">
            <div className="w-10 h-10 rounded-full border border-neutral-200 dark:border-neutral-800 mx-auto flex items-center justify-center mb-4 bg-neutral-50 dark:bg-neutral-950">
              <VercelTriangle className="w-4 h-4" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">
              {mode === 'signin' ? 'Log Masuk ke Vercel Vault' : 'Cipta Zero-Knowledge Vault'}
            </h1>
            <p className="mt-1.5 text-xs sm:text-sm text-neutral-500">
              {mode === 'signin'
                ? 'Masukkan emel dan Master Password untuk menyahkunci vault anda.'
                : 'Semua kata laluan disulitkan dengan AES-256-GCM di pelayar anda.'}
            </p>
          </div>

          {/* Mode Switch Tabs */}
          {!clerkIdentity && (
            <div className="grid grid-cols-2 p-1 rounded-lg bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 mb-6">
            <button
              type="button"
              onClick={() => {
                setMode('signin');
                setError('');
              }}
              className={`py-1.5 text-xs font-medium rounded-md transition-all cursor-pointer ${
                mode === 'signin'
                  ? 'bg-white dark:bg-black text-black dark:text-white shadow-xs'
                  : 'text-neutral-500 hover:text-black dark:hover:text-white'
              }`}
            >
              Log Masuk (Sign In)
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('signup');
                setError('');
              }}
              className={`py-1.5 text-xs font-medium rounded-md transition-all cursor-pointer ${
                mode === 'signup'
                  ? 'bg-white dark:bg-black text-black dark:text-white shadow-xs'
                  : 'text-neutral-500 hover:text-black dark:hover:text-white'
              }`}
            >
              Daftar Baru (Sign Up)
            </button>
            </div>
          )}

          {error && (
            <div className="mb-4 p-3 rounded-lg border border-neutral-900 dark:border-neutral-200 bg-neutral-100 dark:bg-neutral-900 flex items-start gap-2.5 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {hintMessage && (
            <div className="mb-4 p-3 rounded-lg border border-neutral-300 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 text-xs font-mono">
              {hintMessage}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'signup' && (
              <div>
                <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
                  Nama Penuh / Nama Paparan
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Alex Rahman"
                    className="w-full pl-9 pr-3 py-2.5 text-sm rounded-lg border border-neutral-300 dark:border-neutral-800 bg-white dark:bg-black focus:outline-none focus:border-black dark:focus:border-white transition-colors"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
                Alamat Emel
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  readOnly={Boolean(clerkIdentity)}
                  placeholder="nama@syarikat.com"
                  className="w-full pl-9 pr-3 py-2.5 text-sm rounded-lg border border-neutral-300 dark:border-neutral-800 bg-white dark:bg-black focus:outline-none focus:border-black dark:focus:border-white transition-colors"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300">
                  Master Password
                </label>
                {mode === 'signup' ? (
                  <button
                    type="button"
                    onClick={handleSuggestMasterPassword}
                    className="inline-flex items-center gap-1 text-[11px] font-mono text-neutral-500 hover:text-black dark:hover:text-white cursor-pointer"
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>Jana Kuat</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleFetchHint}
                    className="inline-flex items-center gap-1 text-[11px] text-neutral-500 hover:text-black dark:hover:text-white cursor-pointer"
                  >
                    <HelpCircle className="w-3 h-3" />
                    <span>Lihat Hint</span>
                  </button>
                )}
              </div>

              <div className="relative">
                <Lock className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={mode === 'signup' ? 'Minimum 8+ aksara kukuh' : '••••••••••••'}
                  className="w-full pl-9 pr-10 py-2.5 text-sm font-mono rounded-lg border border-neutral-300 dark:border-neutral-800 bg-white dark:bg-black focus:outline-none focus:border-black dark:focus:border-white transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-black dark:hover:text-white cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {/* Monochrome Master Password Strength Meter */}
              {mode === 'signup' && password.length > 0 && (
                <div className="mt-2.5 space-y-1.5">
                  <div className="grid grid-cols-4 gap-1.5">
                    {[1, 2, 3, 4].map((bar) => (
                      <div
                        key={bar}
                        className={`h-1 rounded-full transition-all ${
                          strength.score >= bar
                            ? 'bg-black dark:bg-white'
                            : 'bg-neutral-200 dark:bg-neutral-800'
                        }`}
                      />
                    ))}
                  </div>
                  <div className="flex items-center justify-between text-[11px] font-mono text-neutral-500">
                    <span>
                      Tahap: <strong className="text-black dark:text-white">{strength.label}</strong>
                    </span>
                    <span>
                      {strength.entropyBits} bit · {strength.crackTime}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {mode === 'signup' && (
              <>
                <div>
                  <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
                    Sahkan Master Password
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      autoComplete="new-password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Ulang Master Password"
                      className="w-full pl-9 pr-3 py-2.5 text-sm font-mono rounded-lg border border-neutral-300 dark:border-neutral-800 bg-white dark:bg-black focus:outline-none focus:border-black dark:focus:border-white transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
                    Pembayang Master Password (Pilihan)
                  </label>
                  <input
                    type="text"
                    value={passwordHint}
                    onChange={(e) => setPasswordHint(e.target.value)}
                    placeholder="Contoh: Frasa buku kegemaran + tahun graduasi"
                    className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-300 dark:border-neutral-800 bg-white dark:bg-black focus:outline-none focus:border-black dark:focus:border-white transition-colors"
                  />
                </div>

                <label className="flex items-start gap-2.5 pt-1 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={seedSampleVault}
                    onChange={(e) => setSeedSampleVault(e.target.checked)}
                    className="mt-0.5 accent-black dark:accent-white rounded"
                  />
                  <span className="text-xs text-neutral-600 dark:text-neutral-400 leading-snug">
                    Sertakan contoh item tersulit (Log masuk dengan 2FA live, Kad Korporat, Kunci
                    SSH &amp; Nota Rahsia) supaya saya boleh terus meneroka ciri vault.
                  </span>
                </label>
              </>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 rounded-lg bg-black text-white dark:bg-white dark:text-black font-medium text-sm hover:bg-neutral-800 dark:hover:bg-neutral-200 disabled:opacity-60 transition-all flex items-center justify-center gap-2 cursor-pointer mt-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{statusStep || 'Memproses...'}</span>
                </>
              ) : mode === 'signin' ? (
                <span>Buka Kunci Vault</span>
              ) : (
                <span>Cipta Akaun &amp; Sulitkan Vault</span>
              )}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-neutral-200 dark:border-neutral-900 flex items-center justify-between text-[11px] font-mono text-neutral-500">
            <span>ZERO-KNOWLEDGE ENCRYPTED</span>
            <span>PBKDF2 · AES-256-GCM</span>
          </div>
        </div>
      </div>
    </div>
  );
};
