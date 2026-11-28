import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Loader2 } from 'lucide-react';
import { LandingPage, VercelTriangle } from './components/LandingPage';
import { AuthView } from './components/AuthView';
import { LockScreen } from './components/LockScreen';
import { VaultWorkspace } from './components/VaultWorkspace';
import {
  decryptAllItems,
  deriveMasterKeys,
  encryptVaultPayload,
  generateSaltHex,
} from './utils/crypto';
import { buildStarterVaultItems } from './utils/starterVault';
import type {
  AuditLogEntry,
  DecryptedVaultItem,
  DecryptedVaultPayload,
  UserProfile,
  VaultFolder,
  VaultItemRecord,
  VaultItemType,
} from './types/vault';

const TOKEN_STORAGE_KEY = 'vercel_vault_session_token';
const THEME_STORAGE_KEY = 'vercel_vault_dark_mode';

export function App({
  onClerkSignOut,
  getClerkToken,
}: {
  onClerkSignOut?: () => Promise<void>;
  getClerkToken?: () => Promise<string | null>;
} = {}) {
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    return saved !== null ? saved === 'true' : true;
  });

  const [booting, setBooting] = useState(true);
  const [screen, setScreen] = useState<'landing' | 'auth' | 'locked' | 'vault'>(() =>
    new URLSearchParams(window.location.search).has('auth') ? 'auth' : 'landing'
  );
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>(() =>
    new URLSearchParams(window.location.search).get('auth') === 'signup' ? 'signup' : 'signin'
  );

  const [token, setToken] = useState<string | null>(() =>
    localStorage.getItem(TOKEN_STORAGE_KEY)
  );
  const [user, setUser] = useState<UserProfile | null>(null);
  const [vaultKey, setVaultKey] = useState<CryptoKey | null>(null);
  const [authKey, setAuthKey] = useState<string>('');

  const [items, setItems] = useState<DecryptedVaultItem[]>([]);
  const [folders, setFolders] = useState<VaultFolder[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [demoCreating, setDemoCreating] = useState(false);

  const idleTimerRef = useRef<number | null>(null);

  const apiFetch = useCallback(
    async (input: RequestInfo | URL, init: RequestInit = {}) => {
      const headers = new Headers(init.headers);
      if (import.meta.env.VITE_CLERK_PUBLISHABLE_KEY) {
        const appSession = headers.get('Authorization')?.replace(/^Bearer\s+/i, '');
        const clerkToken = await getClerkToken?.();
        if (appSession) headers.set('X-Vault-Session', appSession);
        if (clerkToken) headers.set('Authorization', `Bearer ${clerkToken}`);
        else headers.delete('Authorization');
      }
      return fetch(input, { ...init, headers });
    },
    [getClerkToken]
  );

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
    localStorage.setItem(THEME_STORAGE_KEY, String(darkMode));
  }, [darkMode]);

  const loadVaultData = useCallback(async (sessionToken: string, key: CryptoKey) => {
    const res = await apiFetch('/api/vault', {
      headers: { Authorization: `Bearer ${sessionToken}` },
    });
    if (!res.ok) {
      throw new Error('Gagal memuatkan data vault.');
    }
    const data = await res.json();
    const decrypted = await decryptAllItems(data.items as VaultItemRecord[], key);
    setFolders(data.folders || []);
    setItems(decrypted);
    setAuditLogs(data.auditLogs || []);
  }, [apiFetch]);

  // Initial session check: if valid token exists in localStorage, show LockScreen (since CryptoKey is never persisted to disk)
  useEffect(() => {
    let cancelled = false;
    async function restoreSession() {
      const savedToken = localStorage.getItem(TOKEN_STORAGE_KEY);
      if (!savedToken) {
        if (!cancelled) setBooting(false);
        return;
      }
      try {
        const res = await apiFetch('/api/auth/me', {
          headers: { Authorization: `Bearer ${savedToken}` },
        });
        if (!res.ok) {
          localStorage.removeItem(TOKEN_STORAGE_KEY);
          if (!cancelled) {
            setToken(null);
            setScreen('landing');
          }
          return;
        }
        const data = await res.json();
        if (!cancelled) {
          setUser(data.user);
          setToken(savedToken);
          setScreen('locked');
        }
      } catch {
        localStorage.removeItem(TOKEN_STORAGE_KEY);
      } finally {
        if (!cancelled) setBooting(false);
      }
    }
    restoreSession();
    return () => {
      cancelled = true;
    };
  }, [apiFetch]);

  const handleLockVault = useCallback(() => {
    setVaultKey(null);
    setAuthKey('');
    setItems([]);
    setScreen('locked');
  }, []);

  // Auto-lock inactivity timer
  useEffect(() => {
    if (screen !== 'vault' || !user || !user.autoLockMinutes || user.autoLockMinutes <= 0) {
      return;
    }
    const timeoutMs = user.autoLockMinutes * 60 * 1000;
    const resetTimer = () => {
      if (idleTimerRef.current) window.clearTimeout(idleTimerRef.current);
      idleTimerRef.current = window.setTimeout(() => {
        handleLockVault();
      }, timeoutMs);
    };

    const events = ['mousemove', 'keydown', 'mousedown', 'touchstart'];
    events.forEach((ev) => window.addEventListener(ev, resetTimer));
    resetTimer();

    return () => {
      if (idleTimerRef.current) window.clearTimeout(idleTimerRef.current);
      events.forEach((ev) => window.removeEventListener(ev, resetTimer));
    };
  }, [screen, user, handleLockVault]);

  const handleLogout = async () => {
    if (token) {
      try {
        await apiFetch('/api/auth/logout', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        });
      } catch {
        // Ignore network errors on logout
      }
    }
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    setToken(null);
    setUser(null);
    setVaultKey(null);
    setAuthKey('');
    setItems([]);
    setFolders([]);
    setScreen('landing');
    if (onClerkSignOut) {
      try {
        await onClerkSignOut();
      } catch (error) {
        console.error('Failed to sign out from Clerk:', error);
      }
    }
  };

  // 1-Click Instant Demo Account Provisioner
  const handleQuickDemo = async () => {
    if (import.meta.env.VITE_CLERK_PUBLISHABLE_KEY) {
      setAuthMode('signup');
      setScreen('auth');
      return;
    }
    setDemoCreating(true);
    try {
      const demoEmail = 'demo@vercelvault.dev';
      const demoPass = 'Vercel-Vault-Demo-2026!';

      // Check prelogin first
      const preRes = await apiFetch('/api/auth/prelogin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: demoEmail }),
      });
      const preData = await preRes.json();
      const { vaultKey: existingKey, authKey: existingAuth } = await deriveMasterKeys(
        demoPass,
        demoEmail,
        preData.kdfSalt,
        preData.kdfIterations
      );

      const loginTry = await apiFetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: demoEmail, authKey: existingAuth }),
      });

      if (loginTry.ok) {
        const loginData = await loginTry.json();
        localStorage.setItem(TOKEN_STORAGE_KEY, loginData.token);
        setToken(loginData.token);
        setUser(loginData.user);
        setVaultKey(existingKey);
        setAuthKey(existingAuth);
        await loadVaultData(loginData.token, existingKey);
        setScreen('vault');
        return;
      }

      // Otherwise register demo user fresh
      const salt = generateSaltHex(16);
      const iterations = 310000;
      const { vaultKey: newKey, authKey: newAuth } = await deriveMasterKeys(
        demoPass,
        demoEmail,
        salt,
        iterations
      );
      const starterItems = await buildStarterVaultItems(newKey, demoEmail, 'Demo Architect');

      const signupRes = await apiFetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: demoEmail,
          name: 'Demo Architect',
          authKey: newAuth,
          kdfSalt: salt,
          kdfIterations: iterations,
          passwordHint: 'Vercel-Vault-Demo-2026!',
          initialFolders: ['Engineering & Cloud', 'Personal', 'Finance & Billing', 'Work'],
          initialItems: starterItems,
        }),
      });
      const signupData = await signupRes.json();
      if (!signupRes.ok) throw new Error(signupData.error || 'Gagal mencipta akaun demo.');

      localStorage.setItem(TOKEN_STORAGE_KEY, signupData.token);
      setToken(signupData.token);
      setUser(signupData.user);
      setVaultKey(newKey);
      setAuthKey(newAuth);
      await loadVaultData(signupData.token, newKey);
      setScreen('vault');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Gagal membuka akaun demo.');
    } finally {
      setDemoCreating(false);
    }
  };

  // Vault CRUD Handlers
  const handleSaveItem = async (draft: {
    id?: string;
    type: VaultItemType;
    title: string;
    subtitle: string;
    domain?: string;
    folderId: string | null;
    favorite: boolean;
    repromptMasterPassword: boolean;
    payload: DecryptedVaultPayload;
  }): Promise<DecryptedVaultItem> => {
    if (!token || !vaultKey) throw new Error('Sesi vault dikunci.');
    const encryptedData = await encryptVaultPayload(draft.payload, vaultKey);

    if (draft.id) {
      const res = await apiFetch(`/api/vault/items/${draft.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: draft.title,
          subtitle: draft.subtitle,
          domain: draft.domain,
          folderId: draft.folderId,
          favorite: draft.favorite,
          repromptMasterPassword: draft.repromptMasterPassword,
          encryptedData,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal mengemaskini item.');
      const updated: DecryptedVaultItem = { ...data.item, data: draft.payload };
      setItems((prev) => prev.map((it) => (it.id === updated.id ? updated : it)));
      return updated;
    } else {
      const res = await apiFetch('/api/vault/items', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          type: draft.type,
          title: draft.title,
          subtitle: draft.subtitle,
          domain: draft.domain,
          folderId: draft.folderId,
          favorite: draft.favorite,
          repromptMasterPassword: draft.repromptMasterPassword,
          encryptedData,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal menambah item.');
      const created: DecryptedVaultItem = { ...data.item, data: draft.payload };
      setItems((prev) => [created, ...prev]);
      return created;
    }
  };

  const handleToggleFavorite = async (item: DecryptedVaultItem) => {
    if (!token) return;
    const nextFav = !item.favorite;
    const res = await apiFetch(`/api/vault/items/${item.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ favorite: nextFav }),
    });
    if (res.ok) {
      setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, favorite: nextFav } : i)));
    }
  };

  const handleMoveToTrash = async (item: DecryptedVaultItem) => {
    if (!token) return;
    const deletedAt = new Date().toISOString();
    const res = await apiFetch(`/api/vault/items/${item.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ deletedAt }),
    });
    if (res.ok) {
      setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, deletedAt } : i)));
    }
  };

  const handleRestoreFromTrash = async (item: DecryptedVaultItem) => {
    if (!token) return;
    const res = await apiFetch(`/api/vault/items/${item.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ deletedAt: null }),
    });
    if (res.ok) {
      setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, deletedAt: null } : i)));
    }
  };

  const handlePermanentDelete = async (item: DecryptedVaultItem) => {
    if (!token) return;
    const res = await apiFetch(`/api/vault/items/${item.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      setItems((prev) => prev.filter((i) => i.id !== item.id));
    }
  };

  const handleEmptyTrash = async () => {
    if (!token) return;
    const res = await apiFetch('/api/vault/trash', {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      setItems((prev) => prev.filter((i) => !i.deletedAt));
    }
  };

  const handleCreateFolder = async (name: string) => {
    if (!token) return;
    const res = await apiFetch('/api/vault/folders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ name }),
    });
    if (res.ok) {
      const data = await res.json();
      setFolders((prev) => [...prev, data.folder]);
    }
  };

  const handleDeleteFolder = async (folderId: string) => {
    if (!token) return;
    const res = await apiFetch(`/api/vault/folders/${folderId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      setFolders((prev) => prev.filter((f) => f.id !== folderId));
      setItems((prev) =>
        prev.map((i) => (i.folderId === folderId ? { ...i, folderId: null } : i))
      );
    }
  };

  const handleUpdateSettings = async (patch: {
    name?: string;
    passwordHint?: string;
    autoLockMinutes?: number;
  }) => {
    if (!token) return;
    const res = await apiFetch('/api/auth/settings', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(patch),
    });
    if (res.ok) {
      const data = await res.json();
      setUser(data.user);
    }
  };

  // Supports both Vercel Vault JSON & Bitwarden JSON Export formats
  const handleImportItems = async (rawJson: string): Promise<number> => {
    if (!token || !vaultKey) throw new Error('Sesi vault dikunci.');
    const parsed = JSON.parse(rawJson);
    const list = Array.isArray(parsed?.items) ? parsed.items : [];
    if (list.length === 0) {
      throw new Error('Tiada item ditemui dalam fail JSON.');
    }

    const encryptedBatch: Array<{
      type: VaultItemType;
      title: string;
      subtitle: string;
      domain?: string;
      favorite: boolean;
      encryptedData: string;
    }> = [];

    for (const entry of list.slice(0, 300)) {
      // Vercel Vault native export format
      if (entry.data && typeof entry.title === 'string') {
        const encryptedData = await encryptVaultPayload(entry.data, vaultKey);
        encryptedBatch.push({
          type: entry.type || 'login',
          title: entry.title,
          subtitle: entry.subtitle || '',
          domain: entry.domain,
          favorite: Boolean(entry.favorite),
          encryptedData,
        });
        continue;
      }

      // Bitwarden JSON export format (type 1 = login, 2 = secure note, 3 = card, 4 = identity)
      if (typeof entry.name === 'string') {
        let mappedType: VaultItemType = 'login';
        const payload: DecryptedVaultPayload = { notes: entry.notes || undefined };
        let subtitle = '';

        if (entry.type === 2) {
          mappedType = 'note';
          subtitle = 'Bitwarden Note';
          payload.note = { content: entry.notes || '' };
        } else if (entry.type === 3 && entry.card) {
          mappedType = 'card';
          const num = String(entry.card.number || '');
          subtitle = `•••• ${num.slice(-4)}`;
          payload.card = {
            cardholderName: entry.card.cardholderName || '',
            brand: 'Visa',
            number: num,
            expMonth: entry.card.expMonth || '12',
            expYear: entry.card.expYear || '2029',
            cvv: entry.card.code || '',
          };
        } else {
          mappedType = 'login';
          const urls = Array.isArray(entry.login?.uris)
            ? entry.login.uris.map((u: { uri?: string }) => u.uri || '').filter(Boolean)
            : [];
          subtitle = entry.login?.username || 'Imported Login';
          payload.login = {
            username: entry.login?.username || '',
            password: entry.login?.password || '',
            urls,
            totpSecret: entry.login?.totp || undefined,
          };
        }

        const encryptedData = await encryptVaultPayload(payload, vaultKey);
        encryptedBatch.push({
          type: mappedType,
          title: entry.name,
          subtitle,
          favorite: Boolean(entry.favorite),
          encryptedData,
        });
      }
    }

    if (encryptedBatch.length === 0) {
      throw new Error('Format JSON tidak dikenali.');
    }

    const res = await apiFetch('/api/vault/items/bulk', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ items: encryptedBatch }),
    });
    if (!res.ok) {
      throw new Error('Gagal memuat naik item yang diimport.');
    }
    await loadVaultData(token, vaultKey);
    return encryptedBatch.length;
  };

  if (booting || demoCreating) {
    return (
      <div className="min-h-screen bg-white text-black dark:bg-black dark:text-white flex flex-col items-center justify-center gap-4">
        <VercelTriangle className="w-8 h-8 animate-pulse" />
        <div className="flex items-center gap-2 text-xs font-mono text-neutral-500">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          <span>
            {demoCreating
              ? 'Menyediakan Demo Zero-Knowledge Vault...'
              : 'Memulakan Enjin Kriptografi...'}
          </span>
        </div>
      </div>
    );
  }

  if (screen === 'auth') {
    return (
      <AuthView
        initialMode={authMode}
        onBackToLanding={() => setScreen('landing')}
        onAuthSuccess={async (session) => {
          localStorage.setItem(TOKEN_STORAGE_KEY, session.token);
          setToken(session.token);
          setUser(session.user);
          setVaultKey(session.vaultKey);
          setAuthKey(session.masterPasswordVerifyHash);
          await loadVaultData(session.token, session.vaultKey);
          setScreen('vault');
        }}
      />
    );
  }

  if (screen === 'locked' && user && token) {
    return (
      <LockScreen
        user={user}
        getClerkToken={getClerkToken}
        onUnlock={async (derivedVaultKey, derivedAuthKey) => {
          setVaultKey(derivedVaultKey);
          setAuthKey(derivedAuthKey);
          await loadVaultData(token, derivedVaultKey);
          setScreen('vault');
        }}
        onLogout={handleLogout}
      />
    );
  }

  if (screen === 'vault' && user && vaultKey) {
    return (
      <VaultWorkspace
        user={user}
        authKey={authKey}
        darkMode={darkMode}
        onToggleTheme={() => setDarkMode((d) => !d)}
        items={items}
        folders={folders}
        auditLogs={auditLogs}
        onSaveItem={handleSaveItem}
        onToggleFavorite={handleToggleFavorite}
        onMoveToTrash={handleMoveToTrash}
        onRestoreFromTrash={handleRestoreFromTrash}
        onPermanentDelete={handlePermanentDelete}
        onEmptyTrash={handleEmptyTrash}
        onCreateFolder={handleCreateFolder}
        onDeleteFolder={handleDeleteFolder}
        onUpdateSettings={handleUpdateSettings}
        onImportItems={handleImportItems}
        onLockVault={handleLockVault}
        onLogout={handleLogout}
      />
    );
  }

  return (
    <LandingPage
      darkMode={darkMode}
      onToggleTheme={() => setDarkMode((d) => !d)}
      onOpenAuth={(m) => {
        setAuthMode(m);
        setScreen('auth');
      }}
      onQuickDemo={handleQuickDemo}
    />
  );
}

export default App;
