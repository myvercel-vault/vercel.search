import express from 'express';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = Number(process.env.PORT || 3000);
const DATA_DIR = path.resolve(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'prism-vault-db.json');

interface StoredUser {
  id: string;
  email: string;
  name: string;
  passwordHint?: string;
  authSalt: string;
  authHash: string;
  kdfSalt: string;
  kdfIterations: number;
  recoverySalt?: string;
  recoveryHash?: string;
  autoLockMinutes: number;
  createdAt: string;
  lastLoginAt: string;
}

interface StoredSession {
  token: string;
  userId: string;
  createdAt: string;
  expiresAt: string;
  userAgent?: string;
}

interface StoredFolder {
  id: string;
  userId: string;
  name: string;
  icon?: string;
  createdAt: string;
}

interface StoredVaultItem {
  id: string;
  userId: string;
  type: 'login' | 'card' | 'note' | 'identity' | 'ssh_key';
  title: string;
  subtitle: string;
  domain?: string;
  folderId: string | null;
  favorite: boolean;
  repromptMasterPassword?: boolean;
  encryptedData: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

interface StoredAuditLog {
  id: string;
  userId: string;
  action: string;
  detail: string;
  ip: string;
  timestamp: string;
}

interface DatabaseSchema {
  users: StoredUser[];
  sessions: StoredSession[];
  folders: StoredFolder[];
  items: StoredVaultItem[];
  auditLogs: StoredAuditLog[];
}

function ensureDataDir(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function loadDb(): DatabaseSchema {
  ensureDataDir();
  if (!fs.existsSync(DB_FILE)) {
    const initial: DatabaseSchema = {
      users: [],
      sessions: [],
      folders: [],
      items: [],
      auditLogs: [],
    };
    fs.writeFileSync(DB_FILE, JSON.stringify(initial, null, 2), 'utf-8');
    return initial;
  }
  try {
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    const parsed = JSON.parse(raw) as Partial<DatabaseSchema>;
    return {
      users: Array.isArray(parsed.users) ? parsed.users : [],
      sessions: Array.isArray(parsed.sessions) ? parsed.sessions : [],
      folders: Array.isArray(parsed.folders) ? parsed.folders : [],
      items: Array.isArray(parsed.items) ? parsed.items : [],
      auditLogs: Array.isArray(parsed.auditLogs) ? parsed.auditLogs : [],
    };
  } catch {
    return { users: [], sessions: [], folders: [], items: [], auditLogs: [] };
  }
}

function saveDb(db: DatabaseSchema): void {
  ensureDataDir();
  const tmpFile = `${DB_FILE}.tmp`;
  fs.writeFileSync(tmpFile, JSON.stringify(db, null, 2), 'utf-8');
  fs.renameSync(tmpFile, DB_FILE);
}

function hashSecret(secret: string, saltHex: string): string {
  const salt = Buffer.from(saltHex, 'hex');
  return crypto.scryptSync(secret, salt, 64).toString('hex');
}

function verifySecret(secret: string, saltHex: string, expectedHashHex: string): boolean {
  const computed = Buffer.from(hashSecret(secret, saltHex), 'hex');
  const expected = Buffer.from(expectedHashHex, 'hex');
  if (computed.length !== expected.length) return false;
  return crypto.timingSafeEqual(computed, expected);
}

function sanitizeUser(user: StoredUser) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    passwordHint: user.passwordHint || '',
    kdfSalt: user.kdfSalt,
    kdfIterations: user.kdfIterations,
    autoLockMinutes: user.autoLockMinutes ?? 15,
    createdAt: user.createdAt,
    lastLoginAt: user.lastLoginAt,
  };
}

function generateRecoveryKey(): string {
  const chunks: string[] = [];
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  for (let c = 0; c < 6; c++) {
    let part = '';
    const bytes = crypto.randomBytes(4);
    for (let i = 0; i < 4; i++) {
      part += alphabet[bytes[i] % alphabet.length];
    }
    chunks.push(part);
  }
  return `VLT-${chunks.join('-')}`;
}

function recordAudit(
  db: DatabaseSchema,
  userId: string,
  action: string,
  detail: string,
  ip: string
): void {
  db.auditLogs.unshift({
    id: `aud_${crypto.randomUUID()}`,
    userId,
    action,
    detail,
    ip: ip || '127.0.0.1',
    timestamp: new Date().toISOString(),
  });
  // Keep latest 100 per user
  const userLogs = db.auditLogs.filter((l) => l.userId === userId);
  if (userLogs.length > 100) {
    const allowedIds = new Set(userLogs.slice(0, 100).map((l) => l.id));
    db.auditLogs = db.auditLogs.filter((l) => l.userId !== userId || allowedIds.has(l.id));
  }
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '4mb' }));

  // Simple rate limiter for auth routes
  const authAttempts = new Map<string, { count: number; resetAt: number }>();
  function checkRateLimit(ip: string): boolean {
    const now = Date.now();
    const record = authAttempts.get(ip);
    if (!record || record.resetAt < now) {
      authAttempts.set(ip, { count: 1, resetAt: now + 60_000 });
      return true;
    }
    if (record.count >= 25) return false;
    record.count += 1;
    return true;
  }

  function authenticate(req: express.Request): { db: DatabaseSchema; user: StoredUser; token: string } | null {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
    if (!token) return null;
    const db = loadDb();
    const now = new Date().toISOString();
    const session = db.sessions.find((s) => s.token === token && s.expiresAt > now);
    if (!session) return null;
    const user = db.users.find((u) => u.id === session.userId);
    if (!user) return null;
    return { db, user, token };
  }

  app.get('/api/health', (_req, res) => {
    res.json({
      ok: true,
      service: 'vercel-vault-api',
      encryption: 'AES-256-GCM + PBKDF2-SHA256 + scrypt',
      timestamp: new Date().toISOString(),
    });
  });

  // Pre-login salt lookup so client can derive separate Auth Key & Vault Encryption Key
  app.post('/api/auth/prelogin', (req, res) => {
    const email = String(req.body?.email || '').trim().toLowerCase();
    if (!email || !email.includes('@')) {
      res.status(400).json({ error: 'Valid email address is required.' });
      return;
    }
    const db = loadDb();
    const existing = db.users.find((u) => u.email === email);
    if (existing) {
      res.json({
        kdfSalt: existing.kdfSalt,
        kdfIterations: existing.kdfIterations,
      });
      return;
    }
    // Deterministic pseudo-salt so non-existent emails are indistinguishable
    const fakeSalt = crypto
      .createHmac('sha256', 'vault-prelogin-mask-v1')
      .update(email)
      .digest('hex')
      .slice(0, 32);
    res.json({
      kdfSalt: fakeSalt,
      kdfIterations: 310000,
    });
  });

  // Sign Up with Email + Master Password (client sends authVerifier derived via PBKDF2, or raw fallback)
  app.post('/api/auth/signup', (req, res) => {
    const ip = req.ip || '127.0.0.1';
    if (!checkRateLimit(ip)) {
      res.status(429).json({ error: 'Too many attempts. Please wait a minute.' });
      return;
    }

    const email = String(req.body?.email || '').trim().toLowerCase();
    const name = String(req.body?.name || '').trim().slice(0, 80);
    const authKey = String(req.body?.authKey || '');
    const kdfSalt = String(req.body?.kdfSalt || '').trim();
    const kdfIterations = Number(req.body?.kdfIterations || 310000);
    const passwordHint = String(req.body?.passwordHint || '').trim().slice(0, 120);
    const initialFolders = Array.isArray(req.body?.initialFolders) ? req.body.initialFolders : [];
    const initialItems = Array.isArray(req.body?.initialItems) ? req.body.initialItems : [];

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      res.status(400).json({ error: 'Sila masukkan alamat emel yang sah.' });
      return;
    }
    if (!authKey || authKey.length < 16) {
      res.status(400).json({ error: 'Master Password tidak memenuhi syarat keselamatan.' });
      return;
    }
    if (!kdfSalt || kdfSalt.length < 16) {
      res.status(400).json({ error: 'Salt kriptografi tidak sah.' });
      return;
    }

    const db = loadDb();
    if (db.users.some((u) => u.email === email)) {
      res.status(409).json({ error: 'Akaun dengan emel ini sudah wujud. Sila Sign In.' });
      return;
    }

    const now = new Date().toISOString();
    const userId = `usr_${crypto.randomUUID()}`;
    const authSalt = crypto.randomBytes(16).toString('hex');
    const authHash = hashSecret(authKey, authSalt);

    const recoveryKey = generateRecoveryKey();
    const recoverySalt = crypto.randomBytes(16).toString('hex');
    const recoveryHash = hashSecret(recoveryKey, recoverySalt);

    const newUser: StoredUser = {
      id: userId,
      email,
      name: name || email.split('@')[0],
      passwordHint,
      authSalt,
      authHash,
      kdfSalt,
      kdfIterations,
      recoverySalt,
      recoveryHash,
      autoLockMinutes: 15,
      createdAt: now,
      lastLoginAt: now,
    };

    db.users.push(newUser);

    // Create default folders
    const folderMap = new Map<string, string>();
    const defaultFolderNames =
      initialFolders.length > 0
        ? initialFolders.map((f: unknown) => String(f).trim()).filter(Boolean)
        : ['Engineering & Cloud', 'Personal', 'Finance & Billing', 'Work'];

    for (const folderName of defaultFolderNames) {
      const fid = `fld_${crypto.randomUUID()}`;
      folderMap.set(folderName, fid);
      db.folders.push({
        id: fid,
        userId,
        name: folderName,
        createdAt: now,
      });
    }

    // Seed encrypted starter items if client generated starter vault
    for (const rawItem of initialItems) {
      if (!rawItem || typeof rawItem !== 'object') continue;
      const folderName = typeof rawItem.folderName === 'string' ? rawItem.folderName : '';
      const mappedFolderId = folderName && folderMap.has(folderName) ? folderMap.get(folderName)! : null;
      db.items.push({
        id: `itm_${crypto.randomUUID()}`,
        userId,
        type: ['login', 'card', 'note', 'identity', 'ssh_key'].includes(rawItem.type)
          ? rawItem.type
          : 'login',
        title: String(rawItem.title || 'Untitled').slice(0, 160),
        subtitle: String(rawItem.subtitle || '').slice(0, 160),
        domain: rawItem.domain ? String(rawItem.domain).slice(0, 160) : undefined,
        folderId: mappedFolderId,
        favorite: Boolean(rawItem.favorite),
        repromptMasterPassword: Boolean(rawItem.repromptMasterPassword),
        encryptedData: String(rawItem.encryptedData || ''),
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
      });
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 14).toISOString();
    db.sessions.push({
      token,
      userId,
      createdAt: now,
      expiresAt,
      userAgent: String(req.headers['user-agent'] || '').slice(0, 180),
    });

    recordAudit(db, userId, 'ACCOUNT_CREATED', `Vault dicipta untuk ${email}`, ip);
    saveDb(db);

    res.status(201).json({
      token,
      user: sanitizeUser(newUser),
      recoveryKey,
    });
  });

  // Sign In with Email + Master Password
  app.post('/api/auth/login', (req, res) => {
    const ip = req.ip || '127.0.0.1';
    if (!checkRateLimit(ip)) {
      res.status(429).json({ error: 'Terlalu banyak percubaan log masuk. Sila cuba sebentar lagi.' });
      return;
    }

    const email = String(req.body?.email || '').trim().toLowerCase();
    const authKey = String(req.body?.authKey || '');

    if (!email || !authKey) {
      res.status(400).json({ error: 'Emel dan Master Password diperlukan.' });
      return;
    }

    const db = loadDb();
    const user = db.users.find((u) => u.email === email);
    if (!user || !verifySecret(authKey, user.authSalt, user.authHash)) {
      res.status(401).json({ error: 'Emel atau Master Password tidak tepat.' });
      return;
    }

    const now = new Date().toISOString();
    user.lastLoginAt = now;

    // Clean expired sessions
    db.sessions = db.sessions.filter((s) => s.expiresAt > now);

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 14).toISOString();
    db.sessions.push({
      token,
      userId: user.id,
      createdAt: now,
      expiresAt,
      userAgent: String(req.headers['user-agent'] || '').slice(0, 180),
    });

    recordAudit(db, user.id, 'VAULT_LOGIN', 'Log masuk berjaya menggunakan Master Password', ip);
    saveDb(db);

    res.json({
      token,
      user: sanitizeUser(user),
    });
  });

  // Password Hint lookup
  app.post('/api/auth/hint', (req, res) => {
    const email = String(req.body?.email || '').trim().toLowerCase();
    const db = loadDb();
    const user = db.users.find((u) => u.email === email);
    if (!user || !user.passwordHint) {
      res.json({ hint: 'Tiada pembayang (hint) ditetapkan untuk akaun ini.' });
      return;
    }
    res.json({ hint: user.passwordHint });
  });

  app.get('/api/auth/me', (req, res) => {
    const ctx = authenticate(req);
    if (!ctx) {
      res.status(401).json({ error: 'Sesi tamat tempoh atau tidak sah.' });
      return;
    }
    res.json({ user: sanitizeUser(ctx.user) });
  });

  app.post('/api/auth/logout', (req, res) => {
    const ctx = authenticate(req);
    if (ctx) {
      ctx.db.sessions = ctx.db.sessions.filter((s) => s.token !== ctx.token);
      recordAudit(ctx.db, ctx.user.id, 'VAULT_LOGOUT', 'Sesi ditamatkan oleh pengguna', req.ip || '127.0.0.1');
      saveDb(ctx.db);
    }
    res.json({ ok: true });
  });

  app.patch('/api/auth/settings', (req, res) => {
    const ctx = authenticate(req);
    if (!ctx) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    const { name, passwordHint, autoLockMinutes } = req.body ?? {};
    if (typeof name === 'string' && name.trim()) {
      ctx.user.name = name.trim().slice(0, 80);
    }
    if (typeof passwordHint === 'string') {
      ctx.user.passwordHint = passwordHint.trim().slice(0, 120);
    }
    if (typeof autoLockMinutes === 'number' && [0, 1, 5, 15, 30, 60].includes(autoLockMinutes)) {
      ctx.user.autoLockMinutes = autoLockMinutes;
    }
    recordAudit(ctx.db, ctx.user.id, 'SETTINGS_UPDATED', 'Tetapan profil & keselamatan dikemaskini', req.ip || '127.0.0.1');
    saveDb(ctx.db);
    res.json({ user: sanitizeUser(ctx.user) });
  });

  // Full Vault Sync (items + folders + auditLogs)
  app.get('/api/vault', (req, res) => {
    const ctx = authenticate(req);
    if (!ctx) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    const folders = ctx.db.folders.filter((f) => f.userId === ctx.user.id);
    const items = ctx.db.items
      .filter((i) => i.userId === ctx.user.id)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    const auditLogs = ctx.db.auditLogs.filter((l) => l.userId === ctx.user.id).slice(0, 40);

    res.json({ folders, items, auditLogs });
  });

  // Create Folder
  app.post('/api/vault/folders', (req, res) => {
    const ctx = authenticate(req);
    if (!ctx) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    const name = String(req.body?.name || '').trim().slice(0, 60);
    if (!name) {
      res.status(400).json({ error: 'Nama folder diperlukan.' });
      return;
    }
    const folder: StoredFolder = {
      id: `fld_${crypto.randomUUID()}`,
      userId: ctx.user.id,
      name,
      createdAt: new Date().toISOString(),
    };
    ctx.db.folders.push(folder);
    recordAudit(ctx.db, ctx.user.id, 'FOLDER_CREATED', `Folder "${name}" dicipta`, req.ip || '127.0.0.1');
    saveDb(ctx.db);
    res.status(201).json({ folder });
  });

  // Delete Folder
  app.delete('/api/vault/folders/:id', (req, res) => {
    const ctx = authenticate(req);
    if (!ctx) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    const folderId = req.params.id;
    const idx = ctx.db.folders.findIndex((f) => f.id === folderId && f.userId === ctx.user.id);
    if (idx === -1) {
      res.status(404).json({ error: 'Folder tidak dijumpai.' });
      return;
    }
    const removed = ctx.db.folders[idx];
    ctx.db.folders.splice(idx, 1);
    for (const item of ctx.db.items) {
      if (item.userId === ctx.user.id && item.folderId === folderId) {
        item.folderId = null;
      }
    }
    recordAudit(ctx.db, ctx.user.id, 'FOLDER_DELETED', `Folder "${removed.name}" dipadam`, req.ip || '127.0.0.1');
    saveDb(ctx.db);
    res.json({ ok: true });
  });

  // Create Vault Item
  app.post('/api/vault/items', (req, res) => {
    const ctx = authenticate(req);
    if (!ctx) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    const body = req.body ?? {};
    const type = ['login', 'card', 'note', 'identity', 'ssh_key'].includes(body.type)
      ? body.type
      : 'login';
    const title = String(body.title || '').trim().slice(0, 160);
    const subtitle = String(body.subtitle || '').trim().slice(0, 160);
    const encryptedData = String(body.encryptedData || '');

    if (!title || !encryptedData) {
      res.status(400).json({ error: 'Tajuk dan data tersulit diperlukan.' });
      return;
    }

    const now = new Date().toISOString();
    const item: StoredVaultItem = {
      id: `itm_${crypto.randomUUID()}`,
      userId: ctx.user.id,
      type,
      title,
      subtitle,
      domain: body.domain ? String(body.domain).trim().slice(0, 160) : undefined,
      folderId: body.folderId ? String(body.folderId) : null,
      favorite: Boolean(body.favorite),
      repromptMasterPassword: Boolean(body.repromptMasterPassword),
      encryptedData,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    };

    ctx.db.items.unshift(item);
    recordAudit(ctx.db, ctx.user.id, 'ITEM_CREATED', `Item ${type.toUpperCase()} "${title}" ditambah`, req.ip || '127.0.0.1');
    saveDb(ctx.db);
    res.status(201).json({ item });
  });

  // Bulk Import Vault Items
  app.post('/api/vault/items/bulk', (req, res) => {
    const ctx = authenticate(req);
    if (!ctx) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    const rawItems = Array.isArray(req.body?.items) ? req.body.items : [];
    if (rawItems.length === 0 || rawItems.length > 500) {
      res.status(400).json({ error: 'Jumlah item import mestilah antara 1 hingga 500.' });
      return;
    }
    const now = new Date().toISOString();
    const created: StoredVaultItem[] = [];
    for (const r of rawItems) {
      if (!r?.title || !r?.encryptedData) continue;
      const item: StoredVaultItem = {
        id: `itm_${crypto.randomUUID()}`,
        userId: ctx.user.id,
        type: ['login', 'card', 'note', 'identity', 'ssh_key'].includes(r.type) ? r.type : 'login',
        title: String(r.title).trim().slice(0, 160),
        subtitle: String(r.subtitle || '').trim().slice(0, 160),
        domain: r.domain ? String(r.domain).trim().slice(0, 160) : undefined,
        folderId: r.folderId ? String(r.folderId) : null,
        favorite: Boolean(r.favorite),
        repromptMasterPassword: Boolean(r.repromptMasterPassword),
        encryptedData: String(r.encryptedData),
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
      };
      ctx.db.items.unshift(item);
      created.push(item);
    }
    recordAudit(ctx.db, ctx.user.id, 'VAULT_IMPORT', `${created.length} item diimport ke dalam vault`, req.ip || '127.0.0.1');
    saveDb(ctx.db);
    res.status(201).json({ items: created });
  });

  // Update Vault Item (edit, favorite toggle, trash/restore)
  app.put('/api/vault/items/:id', (req, res) => {
    const ctx = authenticate(req);
    if (!ctx) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    const item = ctx.db.items.find((i) => i.id === req.params.id && i.userId === ctx.user.id);
    if (!item) {
      res.status(404).json({ error: 'Item tidak dijumpai.' });
      return;
    }
    const body = req.body ?? {};
    if (typeof body.title === 'string' && body.title.trim()) {
      item.title = body.title.trim().slice(0, 160);
    }
    if (typeof body.subtitle === 'string') {
      item.subtitle = body.subtitle.trim().slice(0, 160);
    }
    if (body.domain !== undefined) {
      item.domain = body.domain ? String(body.domain).trim().slice(0, 160) : undefined;
    }
    if (body.folderId !== undefined) {
      item.folderId = body.folderId ? String(body.folderId) : null;
    }
    if (typeof body.favorite === 'boolean') {
      item.favorite = body.favorite;
    }
    if (typeof body.repromptMasterPassword === 'boolean') {
      item.repromptMasterPassword = body.repromptMasterPassword;
    }
    if (typeof body.encryptedData === 'string' && body.encryptedData) {
      item.encryptedData = body.encryptedData;
    }
    if (body.deletedAt !== undefined) {
      item.deletedAt = body.deletedAt ? String(body.deletedAt) : null;
    }
    item.updatedAt = new Date().toISOString();
    saveDb(ctx.db);
    res.json({ item });
  });

  // Permanently delete Vault Item
  app.delete('/api/vault/items/:id', (req, res) => {
    const ctx = authenticate(req);
    if (!ctx) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    const idx = ctx.db.items.findIndex((i) => i.id === req.params.id && i.userId === ctx.user.id);
    if (idx === -1) {
      res.status(404).json({ error: 'Item tidak dijumpai.' });
      return;
    }
    const removed = ctx.db.items[idx];
    ctx.db.items.splice(idx, 1);
    recordAudit(ctx.db, ctx.user.id, 'ITEM_PURGED', `Item "${removed.title}" dipadam secara kekal`, req.ip || '127.0.0.1');
    saveDb(ctx.db);
    res.json({ ok: true });
  });

  // Empty Trash
  app.delete('/api/vault/trash', (req, res) => {
    const ctx = authenticate(req);
    if (!ctx) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    const before = ctx.db.items.length;
    ctx.db.items = ctx.db.items.filter((i) => !(i.userId === ctx.user.id && i.deletedAt !== null));
    const count = before - ctx.db.items.length;
    recordAudit(ctx.db, ctx.user.id, 'TRASH_EMPTIED', `${count} item dalam Trash dipadam kekal`, req.ip || '127.0.0.1');
    saveDb(ctx.db);
    res.json({ purged: count });
  });

  // Vite middleware in dev or static files in prod
  const distPath = path.resolve(__dirname, 'dist');
  const isProd = process.env.NODE_ENV === 'production' && fs.existsSync(distPath);

  if (isProd) {
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`▲ VERCEL VAULT running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
