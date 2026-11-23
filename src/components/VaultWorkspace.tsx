import React, { useState, useMemo, useEffect } from 'react';
import {
  Search,
  Plus,
  Star,
  KeyRound,
  CreditCard,
  FileText,
  UserCheck,
  Terminal,
  Shield,
  Trash2,
  Folder,
  FolderPlus,
  Settings,
  Sliders,
  Lock,
  LogOut,
  Sun,
  Moon,
  Menu,
  X,
  Copy,
  Check,
} from 'lucide-react';
import { VercelTriangle } from './LandingPage';
import { VaultInspector } from './VaultInspector';
import { WatchtowerView } from './WatchtowerView';
import { SettingsView } from './SettingsView';
import { PasswordGeneratorModal } from './PasswordGeneratorModal';
import { VaultItemModal } from './VaultItemModal';
import type {
  AuditLogEntry,
  DecryptedVaultItem,
  DecryptedVaultPayload,
  UserProfile,
  VaultFolder,
  VaultItemType,
} from '../types/vault';

type SidebarFilter =
  | { kind: 'all' }
  | { kind: 'favorites' }
  | { kind: 'type'; type: VaultItemType }
  | { kind: 'folder'; folderId: string }
  | { kind: 'trash' }
  | { kind: 'watchtower' }
  | { kind: 'settings' };

interface VaultWorkspaceProps {
  user: UserProfile;
  authKey: string;
  darkMode: boolean;
  onToggleTheme: () => void;
  items: DecryptedVaultItem[];
  folders: VaultFolder[];
  auditLogs: AuditLogEntry[];
  onSaveItem: (draft: {
    id?: string;
    type: VaultItemType;
    title: string;
    subtitle: string;
    domain?: string;
    folderId: string | null;
    favorite: boolean;
    repromptMasterPassword: boolean;
    payload: DecryptedVaultPayload;
  }) => Promise<DecryptedVaultItem>;
  onToggleFavorite: (item: DecryptedVaultItem) => Promise<void>;
  onMoveToTrash: (item: DecryptedVaultItem) => Promise<void>;
  onRestoreFromTrash: (item: DecryptedVaultItem) => Promise<void>;
  onPermanentDelete: (item: DecryptedVaultItem) => Promise<void>;
  onEmptyTrash: () => Promise<void>;
  onCreateFolder: (name: string) => Promise<void>;
  onDeleteFolder: (folderId: string) => Promise<void>;
  onUpdateSettings: (patch: {
    name?: string;
    passwordHint?: string;
    autoLockMinutes?: number;
  }) => Promise<void>;
  onImportItems: (rawJson: string) => Promise<number>;
  onLockVault: () => void;
  onLogout: () => void;
}

export const VaultWorkspace: React.FC<VaultWorkspaceProps> = ({
  user,
  authKey,
  darkMode,
  onToggleTheme,
  items,
  folders,
  auditLogs,
  onSaveItem,
  onToggleFavorite,
  onMoveToTrash,
  onRestoreFromTrash,
  onPermanentDelete,
  onEmptyTrash,
  onCreateFolder,
  onDeleteFolder,
  onUpdateSettings,
  onImportItems,
  onLockVault,
  onLogout,
}) => {
  const [filter, setFilter] = useState<SidebarFilter>({ kind: 'all' });
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItemId, setSelectedItemId] = useState<string | null>(
    items.find((i) => !i.deletedAt)?.id || null
  );

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [generatorOpen, setGeneratorOpen] = useState(false);
  const [itemModalOpen, setItemModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<DecryptedVaultItem | null>(null);

  const [addingFolder, setAddingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [quickCopiedId, setQuickCopiedId] = useState<string | null>(null);

  // Keyboard shortcut Cmd/Ctrl + K to focus search
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        const el = document.getElementById('vault-global-search');
        el?.focus();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const counts = useMemo(() => {
    const active = items.filter((i) => !i.deletedAt);
    return {
      all: active.length,
      favorites: active.filter((i) => i.favorite).length,
      login: active.filter((i) => i.type === 'login').length,
      card: active.filter((i) => i.type === 'card').length,
      note: active.filter((i) => i.type === 'note').length,
      identity: active.filter((i) => i.type === 'identity').length,
      ssh_key: active.filter((i) => i.type === 'ssh_key').length,
      trash: items.filter((i) => Boolean(i.deletedAt)).length,
    };
  }, [items]);

  const filteredItems = useMemo(() => {
    let base: DecryptedVaultItem[] = [];
    if (filter.kind === 'trash') {
      base = items.filter((i) => Boolean(i.deletedAt));
    } else {
      base = items.filter((i) => !i.deletedAt);
      if (filter.kind === 'favorites') {
        base = base.filter((i) => i.favorite);
      } else if (filter.kind === 'type') {
        base = base.filter((i) => i.type === filter.type);
      } else if (filter.kind === 'folder') {
        base = base.filter((i) => i.folderId === filter.folderId);
      }
    }

    const q = searchQuery.trim().toLowerCase();
    if (!q) return base;

    return base.filter((item) => {
      const hay = [
        item.title,
        item.subtitle,
        item.domain || '',
        item.data.notes || '',
        item.data.login?.username || '',
        ...(item.data.login?.urls || []),
        ...(item.data.note?.tags || []),
      ]
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });
  }, [items, filter, searchQuery]);

  const selectedItem = useMemo(
    () => items.find((i) => i.id === selectedItemId) || null,
    [items, selectedItemId]
  );

  // Ensure valid selection when switching views
  useEffect(() => {
    if (filter.kind === 'watchtower' || filter.kind === 'settings') return;
    if (!selectedItemId || !filteredItems.some((i) => i.id === selectedItemId)) {
      setSelectedItemId(filteredItems[0]?.id || null);
    }
  }, [filter, filteredItems, selectedItemId]);

  const handleOpenNewItem = () => {
    setEditingItem(null);
    setItemModalOpen(true);
  };

  const handleOpenEditItem = (item: DecryptedVaultItem) => {
    setEditingItem(item);
    setItemModalOpen(true);
  };

  const handleSubmitFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;
    await onCreateFolder(newFolderName.trim());
    setNewFolderName('');
    setAddingFolder(false);
  };

  const renderTypeBadge = (type: VaultItemType, hasTotp?: boolean) => {
    if (type === 'login' && hasTotp) return '2FA';
    if (type === 'login') return 'LOGIN';
    if (type === 'card') return 'CARD';
    if (type === 'note') return 'NOTE';
    if (type === 'identity') return 'ID';
    return 'SSH';
  };

  const defaultCreateType: VaultItemType =
    filter.kind === 'type' ? filter.type : 'login';

  return (
    <div className="h-screen flex flex-col bg-white text-black dark:bg-black dark:text-white overflow-hidden">
      {/* Top Global Vercel Command Header */}
      <header className="h-14 px-4 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between gap-3 shrink-0 bg-white dark:bg-[#030303]">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-1.5 rounded-md border border-neutral-200 dark:border-neutral-800 cursor-pointer"
          >
            {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>

          <div className="flex items-center gap-2 font-semibold text-sm">
            <VercelTriangle className="w-4 h-4" />
            <span className="text-neutral-300 dark:text-neutral-700">/</span>
            <span className="font-bold tracking-tight">Vault</span>
            <span className="hidden sm:inline-block text-xs text-neutral-500 font-mono truncate max-w-[180px]">
              ({user.email})
            </span>
          </div>
        </div>

        {/* Global Search Bar */}
        <div className="flex-1 max-w-md relative">
          <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            id="vault-global-search"
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              if (filter.kind === 'watchtower' || filter.kind === 'settings') {
                setFilter({ kind: 'all' });
              }
            }}
            placeholder="Cari log masuk, domain, kad, nota... (⌘K)"
            className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 focus:outline-none focus:border-black dark:focus:border-white transition-colors"
          />
        </div>

        {/* Right Controls */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setGeneratorOpen(true)}
            title="Penjana Kata Laluan"
            className="px-2.5 py-1.5 rounded-lg border border-neutral-200 dark:border-neutral-800 text-xs font-medium hidden sm:inline-flex items-center gap-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-900 cursor-pointer"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Generator</span>
          </button>

          <button
            type="button"
            onClick={handleOpenNewItem}
            className="px-3 py-1.5 rounded-lg bg-black text-white dark:bg-white dark:text-black text-xs font-semibold inline-flex items-center gap-1.5 hover:bg-neutral-800 dark:hover:bg-neutral-200 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Item Baru</span>
          </button>

          <button
            type="button"
            onClick={onToggleTheme}
            title="Tukar Tema Hitam/Putih"
            className="p-1.5 rounded-lg border border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400 hover:text-black dark:hover:text-white cursor-pointer"
          >
            {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          <button
            type="button"
            onClick={onLockVault}
            title="Kunci Vault Sekarang"
            className="p-1.5 rounded-lg border border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400 hover:text-black dark:hover:text-white cursor-pointer"
          >
            <Lock className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={onLogout}
            title="Log Keluar"
            className="p-1.5 rounded-lg border border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400 hover:text-black dark:hover:text-white cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main 3-Pane Body */}
      <div className="flex-1 flex min-h-0 relative">
        {/* Left Navigation Sidebar */}
        <aside
          className={`${
            mobileMenuOpen ? 'fixed inset-y-14 left-0 z-30 w-64 shadow-2xl' : 'hidden'
          } lg:static lg:block lg:w-60 border-r border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-[#050505] overflow-y-auto p-3 flex flex-col justify-between shrink-0`}
        >
          <div className="space-y-5">
            {/* Primary Filters */}
            <div className="space-y-0.5">
              <div className="px-2.5 py-1 text-[10px] font-mono uppercase tracking-widest text-neutral-400">
                Vault Utama
              </div>
              <button
                type="button"
                onClick={() => {
                  setFilter({ kind: 'all' });
                  setMobileMenuOpen(false);
                }}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors cursor-pointer ${
                  filter.kind === 'all'
                    ? 'bg-black text-white dark:bg-white dark:text-black font-semibold'
                    : 'text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200/60 dark:hover:bg-neutral-900'
                }`}
              >
                <span>Semua Item</span>
                <span className="font-mono text-[11px] opacity-75">{counts.all}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setFilter({ kind: 'favorites' });
                  setMobileMenuOpen(false);
                }}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors cursor-pointer ${
                  filter.kind === 'favorites'
                    ? 'bg-black text-white dark:bg-white dark:text-black font-semibold'
                    : 'text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200/60 dark:hover:bg-neutral-900'
                }`}
              >
                <span className="inline-flex items-center gap-2">
                  <Star className="w-3.5 h-3.5" />
                  <span>Kegemaran</span>
                </span>
                <span className="font-mono text-[11px] opacity-75">{counts.favorites}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setFilter({ kind: 'watchtower' });
                  setMobileMenuOpen(false);
                }}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors cursor-pointer ${
                  filter.kind === 'watchtower'
                    ? 'bg-black text-white dark:bg-white dark:text-black font-semibold'
                    : 'text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200/60 dark:hover:bg-neutral-900'
                }`}
              >
                <span className="inline-flex items-center gap-2">
                  <Shield className="w-3.5 h-3.5" />
                  <span>Watchtower Audit</span>
                </span>
              </button>
            </div>

            {/* Categories */}
            <div className="space-y-0.5">
              <div className="px-2.5 py-1 text-[10px] font-mono uppercase tracking-widest text-neutral-400">
                Jenis Rahsia
              </div>
              {(
                [
                  { type: 'login', label: 'Log Masuk & 2FA', icon: KeyRound, count: counts.login },
                  { type: 'card', label: 'Kad Pembayaran', icon: CreditCard, count: counts.card },
                  { type: 'note', label: 'Nota Selamat', icon: FileText, count: counts.note },
                  { type: 'identity', label: 'Identiti', icon: UserCheck, count: counts.identity },
                  { type: 'ssh_key', label: 'SSH & Kunci API', icon: Terminal, count: counts.ssh_key },
                ] as const
              ).map((cat) => {
                const active = filter.kind === 'type' && filter.type === cat.type;
                return (
                  <button
                    key={cat.type}
                    type="button"
                    onClick={() => {
                      setFilter({ kind: 'type', type: cat.type });
                      setMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors cursor-pointer ${
                      active
                        ? 'bg-black text-white dark:bg-white dark:text-black font-semibold'
                        : 'text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200/60 dark:hover:bg-neutral-900'
                    }`}
                  >
                    <span className="inline-flex items-center gap-2">
                      <cat.icon className="w-3.5 h-3.5" />
                      <span>{cat.label}</span>
                    </span>
                    <span className="font-mono text-[11px] opacity-75">{cat.count}</span>
                  </button>
                );
              })}
            </div>

            {/* Folders */}
            <div className="space-y-1">
              <div className="px-2.5 py-1 flex items-center justify-between">
                <span className="text-[10px] font-mono uppercase tracking-widest text-neutral-400">
                  Folder
                </span>
                <button
                  type="button"
                  onClick={() => setAddingFolder(!addingFolder)}
                  title="Tambah Folder"
                  className="text-neutral-500 hover:text-black dark:hover:text-white cursor-pointer"
                >
                  <FolderPlus className="w-3.5 h-3.5" />
                </button>
              </div>

              {addingFolder && (
                <form onSubmit={handleSubmitFolder} className="px-2 pb-1 flex gap-1">
                  <input
                    type="text"
                    autoFocus
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    placeholder="Nama folder..."
                    className="w-full px-2 py-1 text-xs rounded border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-black"
                  />
                  <button
                    type="submit"
                    className="px-2 py-1 text-xs rounded bg-black text-white dark:bg-white dark:text-black font-medium cursor-pointer"
                  >
                    +
                  </button>
                </form>
              )}

              {folders.map((fld) => {
                const active = filter.kind === 'folder' && filter.folderId === fld.id;
                const count = items.filter((i) => !i.deletedAt && i.folderId === fld.id).length;
                return (
                  <div
                    key={fld.id}
                    className={`group flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors ${
                      active
                        ? 'bg-black text-white dark:bg-white dark:text-black font-semibold'
                        : 'text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200/60 dark:hover:bg-neutral-900'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setFilter({ kind: 'folder', folderId: fld.id });
                        setMobileMenuOpen(false);
                      }}
                      className="flex-1 flex items-center gap-2 text-left truncate cursor-pointer"
                    >
                      <Folder className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{fld.name}</span>
                    </button>
                    <div className="flex items-center gap-1">
                      <span className="font-mono text-[11px] opacity-75">{count}</span>
                      <button
                        type="button"
                        onClick={() => onDeleteFolder(fld.id)}
                        title="Padam folder"
                        className="opacity-0 group-hover:opacity-100 p-0.5 hover:text-neutral-400 cursor-pointer"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Bottom Trash & Settings */}
          <div className="pt-4 mt-4 border-t border-neutral-200 dark:border-neutral-800 space-y-0.5">
            <button
              type="button"
              onClick={() => {
                setGeneratorOpen(true);
                setMobileMenuOpen(false);
              }}
              className="sm:hidden w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200/60 dark:hover:bg-neutral-900 cursor-pointer"
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Password Generator</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setFilter({ kind: 'trash' });
                setMobileMenuOpen(false);
              }}
              className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors cursor-pointer ${
                filter.kind === 'trash'
                  ? 'bg-black text-white dark:bg-white dark:text-black font-semibold'
                  : 'text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200/60 dark:hover:bg-neutral-900'
              }`}
            >
              <span className="inline-flex items-center gap-2">
                <Trash2 className="w-3.5 h-3.5" />
                <span>Trash</span>
              </span>
              <span className="font-mono text-[11px] opacity-75">{counts.trash}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setFilter({ kind: 'settings' });
                setMobileMenuOpen(false);
              }}
              className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs transition-colors cursor-pointer ${
                filter.kind === 'settings'
                  ? 'bg-black text-white dark:bg-white dark:text-black font-semibold'
                  : 'text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200/60 dark:hover:bg-neutral-900'
              }`}
            >
              <Settings className="w-3.5 h-3.5" />
              <span>Tetapan &amp; Import/Export</span>
            </button>
          </div>
        </aside>

        {/* Main Content Switch: Watchtower | Settings | 2-Column Item List + Inspector */}
        {filter.kind === 'watchtower' ? (
          <main className="flex-1 min-w-0 bg-white dark:bg-black">
            <WatchtowerView
              items={items}
              onInspectItem={(itemId) => {
                setFilter({ kind: 'all' });
                setSelectedItemId(itemId);
              }}
            />
          </main>
        ) : filter.kind === 'settings' ? (
          <main className="flex-1 min-w-0 bg-white dark:bg-black">
            <SettingsView
              user={user}
              items={items}
              auditLogs={auditLogs}
              onUpdateSettings={onUpdateSettings}
              onImportItems={onImportItems}
            />
          </main>
        ) : (
          <main className="flex-1 min-w-0 grid grid-cols-1 md:grid-cols-12 divide-y md:divide-y-0 md:divide-x divide-neutral-200 dark:divide-neutral-800">
            {/* Middle Pane: Filtered Vault Item List */}
            <section className="md:col-span-5 lg:col-span-4 flex flex-col min-h-0 bg-white dark:bg-[#030303]">
              <div className="px-4 py-3 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between shrink-0">
                <span className="text-xs font-mono text-neutral-500">
                  {filteredItems.length} item tersulit
                </span>
                {filter.kind === 'trash' && counts.trash > 0 && (
                  <button
                    type="button"
                    onClick={onEmptyTrash}
                    className="text-xs font-medium underline hover:opacity-75 cursor-pointer"
                  >
                    Kosongkan Trash
                  </button>
                )}
              </div>

              <div className="flex-1 overflow-y-auto p-2.5 space-y-1.5">
                {filteredItems.length === 0 ? (
                  <div className="py-16 px-4 text-center">
                    <p className="text-xs text-neutral-500">Tiada item ditemui dalam pandangan ini.</p>
                    {filter.kind !== 'trash' && (
                      <button
                        type="button"
                        onClick={handleOpenNewItem}
                        className="mt-3 px-3.5 py-1.5 rounded-lg border border-neutral-300 dark:border-neutral-800 text-xs font-medium hover:bg-neutral-100 dark:hover:bg-neutral-900 cursor-pointer"
                      >
                        + Tambah Item Pertama
                      </button>
                    )}
                  </div>
                ) : (
                  filteredItems.map((it) => {
                    const isSelected = it.id === selectedItemId;
                    const quickSecret =
                      it.data.login?.password ||
                      it.data.card?.number ||
                      it.data.sshKey?.privateKey ||
                      '';
                    return (
                      <div
                        key={it.id}
                        onClick={() => setSelectedItemId(it.id)}
                        className={`group p-3 rounded-xl border transition-all cursor-pointer ${
                          isSelected
                            ? 'border-black dark:border-white bg-neutral-100/80 dark:bg-neutral-900/80'
                            : 'border-transparent hover:border-neutral-200 dark:hover:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-950'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            {it.favorite && (
                              <Star className="w-3 h-3 shrink-0" fill="currentColor" />
                            )}
                            <span className="text-xs sm:text-sm font-semibold truncate">
                              {it.title}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            {quickSecret && !it.repromptMasterPassword && (
                              <button
                                type="button"
                                title="Salin kata laluan / nombor pantas"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigator.clipboard.writeText(quickSecret);
                                  setQuickCopiedId(it.id);
                                  setTimeout(() => setQuickCopiedId(null), 1500);
                                }}
                                className="opacity-0 group-hover:opacity-100 p-1 rounded border border-neutral-300 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300 cursor-pointer"
                              >
                                {quickCopiedId === it.id ? (
                                  <Check className="w-3 h-3" />
                                ) : (
                                  <Copy className="w-3 h-3" />
                                )}
                              </button>
                            )}
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded border border-neutral-200 dark:border-neutral-800 text-neutral-500">
                              {renderTypeBadge(it.type, Boolean(it.data.login?.totpSecret))}
                            </span>
                          </div>
                        </div>

                        <div className="mt-1 text-xs font-mono text-neutral-500 truncate">
                          {it.subtitle}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </section>

            {/* Right Pane: Detailed Decrypted Inspector */}
            <section className="md:col-span-7 lg:col-span-8 min-h-0 bg-white dark:bg-black">
              <VaultInspector
                item={selectedItem}
                folders={folders}
                userEmail={user.email}
                userSalt={user.kdfSalt}
                userIterations={user.kdfIterations}
                expectedAuthKey={authKey}
                onEdit={handleOpenEditItem}
                onToggleFavorite={onToggleFavorite}
                onMoveToTrash={onMoveToTrash}
                onRestoreFromTrash={onRestoreFromTrash}
                onPermanentDelete={onPermanentDelete}
              />
            </section>
          </main>
        )}
      </div>

      {/* Password Generator Modal */}
      <PasswordGeneratorModal
        open={generatorOpen}
        onClose={() => setGeneratorOpen(false)}
      />

      {/* Add / Edit Item Modal */}
      {itemModalOpen && (
        <VaultItemModal
          open={itemModalOpen}
          editingItem={editingItem}
          defaultType={defaultCreateType}
          folders={folders}
          onClose={() => setItemModalOpen(false)}
          onSave={async (draft) => {
            const saved = await onSaveItem(draft);
            setSelectedItemId(saved.id);
          }}
        />
      )}
    </div>
  );
};
