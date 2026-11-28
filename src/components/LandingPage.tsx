import React from 'react';
import {
  Shield,
  Lock,
  KeyRound,
  CreditCard,
  FileText,
  UserCheck,
  Terminal,
  ArrowRight,
  Check,
  Sparkles,
  RefreshCw,
  Sun,
  Moon,
  Fingerprint,
  EyeOff,
  Activity,
} from 'lucide-react';

interface LandingPageProps {
  darkMode: boolean;
  onToggleTheme: () => void;
  onOpenAuth: (mode: 'signin' | 'signup') => void;
  onQuickDemo: () => void;
}

export const VercelTriangle: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => (
  <svg viewBox="0 0 76 65" fill="currentColor" className={className} aria-hidden="true">
    <path d="M37.5274 0L75.0548 65H0L37.5274 0Z" />
  </svg>
);

export const LandingPage: React.FC<LandingPageProps> = ({
  darkMode,
  onToggleTheme,
  onOpenAuth,
  onQuickDemo,
}) => {
  return (
    <div className="min-h-screen bg-white text-black dark:bg-black dark:text-white flex flex-col selection:bg-black selection:text-white dark:selection:bg-white dark:selection:text-black">
      {/* Top Navbar (Vercel.com exact style) */}
      <header className="sticky top-0 z-40 h-16 border-b border-neutral-200 dark:border-neutral-800/90 bg-white/80 dark:bg-black/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto h-full px-4 sm:px-6 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2.5 font-semibold tracking-tight text-sm sm:text-base">
              <VercelTriangle className="w-4 h-4" />
              <span className="text-neutral-300 dark:text-neutral-700 font-light text-lg">/</span>
              <span className="font-bold tracking-tight">Vault</span>
              <span className="hidden sm:inline-flex items-center px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider border border-neutral-200 dark:border-neutral-800 rounded-full text-neutral-600 dark:text-neutral-400">
                Zero-Knowledge v2.5
              </span>
            </div>

            <nav className="hidden md:flex items-center gap-6 text-sm text-neutral-600 dark:text-neutral-400">
              <a href="#features" className="hover:text-black dark:hover:text-white transition-colors">
                Seni Bina
              </a>
              <a href="#item-types" className="hover:text-black dark:hover:text-white transition-colors">
                Jenis Item
              </a>
              <a href="#security" className="hover:text-black dark:hover:text-white transition-colors">
                Watchtower
              </a>
            </nav>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={onToggleTheme}
              title={darkMode ? 'Tukar ke Mod Cerah' : 'Tukar ke Mod Gelap'}
              className="w-9 h-9 rounded-full border border-neutral-200 dark:border-neutral-800 flex items-center justify-center text-neutral-600 dark:text-neutral-400 hover:text-black dark:hover:text-white hover:border-neutral-400 dark:hover:border-neutral-600 transition-colors cursor-pointer"
            >
              {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            <button
              onClick={() => onOpenAuth('signin')}
              className="px-3.5 py-1.5 text-sm font-medium rounded-md border border-neutral-200 dark:border-neutral-800 text-neutral-800 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-900 transition-colors cursor-pointer"
            >
              Log In
            </button>

            <button
              onClick={() => onOpenAuth('signup')}
              className="px-3.5 py-1.5 text-sm font-medium rounded-md bg-black text-white dark:bg-white dark:text-black hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-colors cursor-pointer"
            >
              Sign Up
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section with Vercel Grid + Crosshairs */}
      <main className="flex-1">
        <section className="relative overflow-hidden border-b border-neutral-200 dark:border-neutral-800/90 vercel-grid vercel-hero-glow">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-20 pb-24 sm:pt-28 sm:pb-32 relative">
            {/* Architectural Crosshair Accents */}
            <div className="hidden sm:block absolute top-10 left-6 text-neutral-300 dark:text-neutral-700 font-mono text-lg select-none">
              +
            </div>
            <div className="hidden sm:block absolute top-10 right-6 text-neutral-300 dark:text-neutral-700 font-mono text-lg select-none">
              +
            </div>

            <div className="max-w-3xl mx-auto text-center">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-neutral-200 dark:border-neutral-800 bg-white/90 dark:bg-neutral-950/90 text-xs font-mono text-neutral-600 dark:text-neutral-400 mb-8">
                <span className="w-1.5 h-1.5 rounded-full bg-black dark:bg-white animate-pulse" />
                <span>PBKDF2 310,000 ITERATIONS · AES-256-GCM · ZERO-KNOWLEDGE</span>
              </div>

              <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-[-0.04em] leading-[1.04] bg-gradient-to-b from-black via-neutral-800 to-neutral-500 dark:from-white dark:via-neutral-100 dark:to-neutral-500 bg-clip-text text-transparent">
                Kuasai Setiap Kata Laluan Dalam Ketepatan Monokrom.
              </h1>

              <p className="mt-6 text-base sm:text-lg text-neutral-600 dark:text-neutral-400 max-w-2xl mx-auto leading-relaxed">
                Pengurus kata laluan bertaraf enterprise seperti{' '}
                <span className="text-black dark:text-white font-medium">1Password</span> &amp;{' '}
                <span className="text-black dark:text-white font-medium">Bitwarden</span>. Semua
                log masuk, kad kredit, kod 2FA TOTP, nota rahsia dan kunci SSH disulitkan secara
                tempatan sebelum meninggalkan pelayar anda.
              </p>

              <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3.5">
                <button
                  onClick={() => onOpenAuth('signup')}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-black text-white dark:bg-white dark:text-black font-medium text-sm hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-all cursor-pointer shadow-sm"
                >
                  <VercelTriangle className="w-3.5 h-3.5" />
                  <span>Cipta Vault Percuma</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                <button
                  onClick={() => onOpenAuth('signin')}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg border border-neutral-300 dark:border-neutral-800 bg-white dark:bg-black text-black dark:text-white font-medium text-sm hover:bg-neutral-50 dark:hover:bg-neutral-950 transition-all cursor-pointer"
                >
                  <Lock className="w-4 h-4" />
                  <span>Sign In ke Vault</span>
                </button>

                <button
                  onClick={onQuickDemo}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 rounded-lg border border-dashed border-neutral-300 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400 hover:text-black dark:hover:text-white hover:border-neutral-500 text-sm font-mono transition-all cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Cuba Vault Contoh</span>
                </button>
              </div>
            </div>

            {/* Interactive Monochrome Vault Preview Frame */}
            <div className="mt-16 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#050505] shadow-2xl overflow-hidden">
              <div className="h-10 px-4 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between bg-neutral-50 dark:bg-[#0a0a0a]">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full border border-neutral-300 dark:border-neutral-700" />
                  <span className="w-2.5 h-2.5 rounded-full border border-neutral-300 dark:border-neutral-700" />
                  <span className="w-2.5 h-2.5 rounded-full border border-neutral-300 dark:border-neutral-700" />
                </div>
                <div className="text-[11px] font-mono text-neutral-500 flex items-center gap-1.5">
                  <Lock className="w-3 h-3" />
                  <span>vault.vercel.app — AES-256-GCM Unlocked</span>
                </div>
                <div className="text-[11px] font-mono text-neutral-500">⌘K</div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-12 divide-y md:divide-y-0 md:divide-x divide-neutral-200 dark:divide-neutral-800/90 text-left">
                {/* Left Sidebar Preview */}
                <div className="md:col-span-3 p-4 space-y-1.5 bg-neutral-50/50 dark:bg-[#070707]">
                  <div className="text-[10px] font-mono uppercase tracking-widest text-neutral-400 px-2.5 py-1">
                    Vaults &amp; Kategori
                  </div>
                  {[
                    { label: 'Semua Item', count: '24', active: true },
                    { label: 'Kegemaran', count: '6', active: false },
                    { label: 'Logins & 2FA', count: '15', active: false },
                    { label: 'Kad Pembayaran', count: '3', active: false },
                    { label: 'Nota Rahsia', count: '4', active: false },
                    { label: 'SSH & API Keys', count: '2', active: false },
                  ].map((nav) => (
                    <div
                      key={nav.label}
                      className={`flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs ${
                        nav.active
                          ? 'bg-black text-white dark:bg-white dark:text-black font-medium'
                          : 'text-neutral-600 dark:text-neutral-400'
                      }`}
                    >
                      <span>{nav.label}</span>
                      <span className="font-mono text-[11px] opacity-75">{nav.count}</span>
                    </div>
                  ))}
                </div>

                {/* Middle Item List Preview */}
                <div className="md:col-span-4 p-4 space-y-2">
                  <div className="text-[10px] font-mono uppercase tracking-widest text-neutral-400 px-1">
                    Disulitkan Secara Tempatan
                  </div>
                  {[
                    {
                      title: 'Vercel Cloud Console',
                      sub: 'founder@monolith.dev',
                      badge: '2FA',
                      selected: true,
                    },
                    {
                      title: 'GitHub Enterprise',
                      sub: 'secops@monolith.dev',
                      badge: '2FA',
                      selected: false,
                    },
                    {
                      title: 'Black Metal Corporate Visa',
                      sub: '•••• 4829 · 09/29',
                      badge: 'CARD',
                      selected: false,
                    },
                    {
                      title: 'Production Ed25519 Key',
                      sub: 'SHA256:k9L2xP8vQ4mN7rT1',
                      badge: 'SSH',
                      selected: false,
                    },
                  ].map((row) => (
                    <div
                      key={row.title}
                      className={`p-3 rounded-lg border transition-colors ${
                        row.selected
                          ? 'border-black dark:border-white bg-neutral-100/70 dark:bg-neutral-900/70'
                          : 'border-neutral-200 dark:border-neutral-800/80'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold">{row.title}</span>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded border border-neutral-300 dark:border-neutral-700">
                          {row.badge}
                        </span>
                      </div>
                      <div className="text-[11px] text-neutral-500 font-mono mt-1 truncate">
                        {row.sub}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Right Inspector Preview */}
                <div className="md:col-span-5 p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-bold">Vercel Cloud Console</div>
                      <div className="text-xs text-neutral-500 font-mono">https://vercel.com</div>
                    </div>
                    <span className="px-2 py-0.5 text-[10px] font-mono border border-neutral-300 dark:border-neutral-700 rounded-full">
                      ENTROPY 128-BIT
                    </span>
                  </div>

                  <div className="rounded-lg border border-neutral-200 dark:border-neutral-800 divide-y divide-neutral-200 dark:divide-neutral-800">
                    <div className="p-3">
                      <div className="text-[10px] font-mono uppercase text-neutral-500">
                        Emel / Username
                      </div>
                      <div className="text-xs font-mono mt-0.5">founder@monolith.dev</div>
                    </div>
                    <div className="p-3 flex items-center justify-between">
                      <div>
                        <div className="text-[10px] font-mono uppercase text-neutral-500">
                          Kata Laluan
                        </div>
                        <div className="text-xs font-mono mt-0.5 tracking-widest">
                          ••••••••••••••••••••
                        </div>
                      </div>
                      <span className="text-[10px] font-mono px-2 py-1 rounded border border-neutral-200 dark:border-neutral-800">
                        Salin
                      </span>
                    </div>
                    <div className="p-3 flex items-center justify-between bg-neutral-50 dark:bg-neutral-950">
                      <div>
                        <div className="text-[10px] font-mono uppercase text-neutral-500">
                          Kod Pengesahan TOTP (2FA)
                        </div>
                        <div className="text-base font-mono font-semibold tracking-wider mt-0.5 tabular-nums">
                          492 817
                        </div>
                      </div>
                      <span className="text-[11px] font-mono text-neutral-500">24s</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Architectural Feature Grid (1px Vercel Bento Grid) */}
        <section
          id="features"
          className="border-b border-neutral-200 dark:border-neutral-800/90 py-20 sm:py-24"
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="max-w-2xl mb-12">
              <div className="text-xs font-mono uppercase tracking-widest text-neutral-500 mb-2">
                Zero-Knowledge Architecture
              </div>
              <h2 className="text-2xl sm:text-4xl font-bold tracking-tight">
                Direka seperti Bitwarden &amp; 1Password. Digilap seperti Vercel.
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 border-t border-l border-neutral-200 dark:border-neutral-800">
              {[
                {
                  icon: Shield,
                  title: 'Penyulitan AES-256-GCM Sisi Klien',
                  desc: 'Master Password anda tidak pernah dihantar ke pelayan. Pelayar menjana kunci penyulitan 256-bit melalui PBKDF2-SHA256 (310,000 iterasi).',
                },
                {
                  icon: Fingerprint,
                  title: 'Pengasingan Kunci Auth & Vault',
                  desc: 'Kunci pengesahan (scrypt server verifier) dan kunci penyulitan vault diasingkan secara matematik untuk ketahanan penuh Zero-Knowledge.',
                },
                {
                  icon: RefreshCw,
                  title: 'Penjana Kod TOTP 2FA Langsung',
                  desc: 'Simpan rahsia Base32 atau URI otpauth:// dan hasilkan kod 6-digit RFC 6238 secara masa nyata setiap 30 saat terus di dalam vault.',
                },
                {
                  icon: Sparkles,
                  title: 'Generator Kata Laluan & Passphrase',
                  desc: 'Jana kata laluan entropi tinggi, EFF Diceware passphrase mudah ingat, atau PIN selamat beserta anggaran masa pecah kriptografi.',
                },
                {
                  icon: Activity,
                  title: 'Watchtower Audit Keselamatan',
                  desc: 'Kesan kata laluan lemah, diguna semula (reused), ketiadaan 2FA, dan pautan HTTP tidak selamat secara masa nyata.',
                },
                {
                  icon: EyeOff,
                  title: 'Kunci Automatik & Master Reprompt',
                  desc: 'Kunci vault secara segera dengan satu klik atau pemasa melahu automatik, serta lindungi item sensitif dengan pengesahan semula.',
                },
              ].map((feat) => (
                <div
                  key={feat.title}
                  className="p-7 border-r border-b border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50/80 dark:hover:bg-neutral-950 transition-colors"
                >
                  <div className="w-9 h-9 rounded-lg border border-neutral-200 dark:border-neutral-800 flex items-center justify-center mb-5 bg-white dark:bg-black">
                    <feat.icon className="w-4 h-4" />
                  </div>
                  <h3 className="text-base font-semibold tracking-tight mb-2">{feat.title}</h3>
                  <p className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
                    {feat.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Supported Vault Item Types */}
        <section
          id="item-types"
          className="border-b border-neutral-200 dark:border-neutral-800/90 py-20"
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-4">
              <div>
                <div className="text-xs font-mono uppercase tracking-widest text-neutral-500 mb-2">
                  Semua Rahsia Dalam Satu Tempat
                </div>
                <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
                  5 Jenis Item Tersulit Lengkap
                </h2>
              </div>
              <button
                onClick={() => onOpenAuth('signup')}
                className="self-start inline-flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-md border border-neutral-300 dark:border-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-900 transition-colors cursor-pointer"
              >
                <span>Buka Akaun Sekarang</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              {[
                {
                  icon: KeyRound,
                  name: 'Log Masuk & 2FA',
                  items: ['Username & Password', 'Pelbagai URL autofill', 'Kod TOTP 6-digit live', 'Sejarah kata laluan'],
                },
                {
                  icon: CreditCard,
                  name: 'Kad Kredit / Debit',
                  items: ['Nombor kad & CVV', 'Tarikh luput & PIN', 'Salinan pantas 1-klik', 'Perlindungan Reprompt'],
                },
                {
                  icon: FileText,
                  name: 'Nota Selamat',
                  items: ['Kod pemulihan rahsia', ' lesen perisian', 'Konfigurasi pelayan', 'Tag carian pantas'],
                },
                {
                  icon: UserCheck,
                  name: 'Identiti Peribadi',
                  items: ['Nama penuh & syarikat', 'Nombor Pasport / ID', 'Alamat surat-menyurat', 'Telefon & Emel'],
                },
                {
                  icon: Terminal,
                  name: 'SSH & Kunci API',
                  items: ['Ed25519 / RSA-4096', 'Token produksi .env', 'Cap jari SHA256', 'Label persekitaran'],
                },
              ].map((cat) => (
                <div
                  key={cat.name}
                  className="p-5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#060606] flex flex-col justify-between"
                >
                  <div>
                    <div className="w-8 h-8 rounded-md bg-black text-white dark:bg-white dark:text-black flex items-center justify-center mb-4">
                      <cat.icon className="w-4 h-4" />
                    </div>
                    <h3 className="font-semibold text-sm mb-3">{cat.name}</h3>
                    <ul className="space-y-2">
                      {cat.items.map((pt) => (
                        <li
                          key={pt}
                          className="text-xs text-neutral-600 dark:text-neutral-400 flex items-center gap-2"
                        >
                          <Check className="w-3.5 h-3.5 shrink-0 text-black dark:text-white" />
                          <span>{pt}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Bottom CTA */}
        <section id="security" className="py-20">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
            <VercelTriangle className="w-8 h-8 mx-auto mb-6" />
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
              Sedia untuk mengawal keselamatan digital anda?
            </h2>
            <p className="mt-3 text-neutral-600 dark:text-neutral-400 text-sm sm:text-base max-w-xl mx-auto">
              Daftar dengan emel &amp; Master Password anda dalam masa beberapa saat, atau uji terus
              dengan akaun demo penuh.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <button
                onClick={() => onOpenAuth('signup')}
                className="px-6 py-3 rounded-lg bg-black text-white dark:bg-white dark:text-black font-medium text-sm hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-colors cursor-pointer"
              >
                Daftar Akaun Baru
              </button>
              <button
                onClick={() => onOpenAuth('signin')}
                className="px-6 py-3 rounded-lg border border-neutral-300 dark:border-neutral-800 font-medium text-sm hover:bg-neutral-100 dark:hover:bg-neutral-900 transition-colors cursor-pointer"
              >
                Log Masuk Sedia Ada
              </button>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-neutral-200 dark:border-neutral-800 py-8 text-xs text-neutral-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <VercelTriangle className="w-3.5 h-3.5 text-black dark:text-white" />
            <span className="font-semibold text-black dark:text-white">VERCEL VAULT</span>
            <span>— Zero-Knowledge Password Manager</span>
          </div>
          <div className="font-mono">AES-256-GCM · PBKDF2-SHA256 · TOTP RFC-6238</div>
        </div>
      </footer>
    </div>
  );
};
