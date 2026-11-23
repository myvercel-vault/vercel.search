import type { DecryptedVaultItem, DecryptedVaultPayload, VaultItemRecord } from '../types/vault';

const encoder = new TextEncoder();
const decoder = new TextDecoder();

export function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export function hexToBytes(hex: string): Uint8Array {
  const clean = hex.length % 2 === 0 ? hex : `0${hex}`;
  const arr = new Uint8Array(clean.length / 2);
  for (let i = 0; i < arr.length; i++) {
    arr[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  }
  return arr;
}

export function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export function generateSaltHex(byteLength = 16): string {
  const bytes = new Uint8Array(byteLength);
  crypto.getRandomValues(bytes);
  return bytesToHex(bytes);
}

/**
 * Derives TWO cryptographically separated keys from the Master Password + Email + Salt:
 * 1. vaultKey (CryptoKey AES-256-GCM) — stays ONLY in client RAM, never transmitted to server
 * 2. authKey (64-char hex string) — sent to server for scrypt authentication verification
 *
 * Mirrors Bitwarden & 1Password Zero-Knowledge key separation architecture.
 */
export async function deriveMasterKeys(
  masterPassword: string,
  email: string,
  saltHex: string,
  iterations = 310000
): Promise<{ vaultKey: CryptoKey; authKey: string }> {
  const normalizedEmail = email.trim().toLowerCase();
  const baseKeyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(`${normalizedEmail}:${masterPassword}`),
    { name: 'PBKDF2' },
    false,
    ['deriveBits', 'deriveKey']
  );

  const saltBytes = hexToBytes(saltHex);

  // Derive 512 bits (64 bytes): first 32 bytes -> AES-256 Vault Key, next 32 bytes -> Auth Key
  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: saltBytes as BufferSource,
      iterations,
      hash: 'SHA-256',
    },
    baseKeyMaterial,
    512
  );

  const allBytes = new Uint8Array(derivedBits);
  const vaultKeyBytes = allBytes.slice(0, 32);
  const authKeyBytes = allBytes.slice(32, 64);

  const vaultKey = await crypto.subtle.importKey(
    'raw',
    vaultKeyBytes,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );

  // Additional domain separation hash on authKey
  const authDigest = await crypto.subtle.digest('SHA-256', authKeyBytes);
  const authKey = bytesToHex(new Uint8Array(authDigest));

  return { vaultKey, authKey };
}

export async function encryptVaultPayload(
  payload: DecryptedVaultPayload,
  vaultKey: CryptoKey
): Promise<string> {
  const iv = new Uint8Array(12);
  crypto.getRandomValues(iv);
  const plaintext = encoder.encode(JSON.stringify(payload));
  const cipherBuffer = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    vaultKey,
    plaintext
  );
  const cipherBytes = new Uint8Array(cipherBuffer);
  return `v1.${bytesToBase64(iv)}.${bytesToBase64(cipherBytes)}`;
}

export async function decryptVaultPayload(
  encryptedString: string,
  vaultKey: CryptoKey
): Promise<DecryptedVaultPayload> {
  if (!encryptedString.startsWith('v1.')) {
    throw new Error('Unsupported cipher format');
  }
  const parts = encryptedString.split('.');
  if (parts.length !== 3) {
    throw new Error('Malformed encrypted payload');
  }
  const iv = base64ToBytes(parts[1]);
  const cipherBytes = base64ToBytes(parts[2]);

  const plainBuffer = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: iv as BufferSource },
    vaultKey,
    cipherBytes as BufferSource
  );
  const jsonText = decoder.decode(plainBuffer);
  return JSON.parse(jsonText) as DecryptedVaultPayload;
}

export async function decryptAllItems(
  records: VaultItemRecord[],
  vaultKey: CryptoKey
): Promise<DecryptedVaultItem[]> {
  const out: DecryptedVaultItem[] = [];
  for (const rec of records) {
    try {
      const data = await decryptVaultPayload(rec.encryptedData, vaultKey);
      out.push({ ...rec, data });
    } catch {
      out.push({
        ...rec,
        data: {
          notes: '[Tidak dapat menyahsulit item ini dengan kunci semasa]',
        },
      });
    }
  }
  return out;
}

/**
 * RFC 6238 TOTP 2FA Live Code Generator (SHA-1, 6 digits, 30s period)
 * Works purely in browser WebCrypto — just like 1Password & Bitwarden Authenticator!
 */
const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

function decodeBase32(input: string): Uint8Array {
  const cleaned = input
    .toUpperCase()
    .replace(/\s+/g, '')
    .replace(/=+$/, '')
    .replace(/[^A-Z2-7]/g, '');
  let bits = 0;
  let value = 0;
  const output: number[] = [];

  for (let i = 0; i < cleaned.length; i++) {
    const idx = BASE32_ALPHABET.indexOf(cleaned[i]);
    if (idx === -1) continue;
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      output.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return new Uint8Array(output);
}

export function extractTotpSecret(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed.toLowerCase().startsWith('otpauth://')) {
    try {
      const url = new URL(trimmed);
      return url.searchParams.get('secret') || '';
    } catch {
      return '';
    }
  }
  return trimmed;
}

export async function generateTotpCode(
  rawSecret: string,
  timestampMs = Date.now(),
  period = 30
): Promise<{ code: string; remainingSeconds: number } | null> {
  const secret = extractTotpSecret(rawSecret);
  if (!secret) return null;
  const keyBytes = decodeBase32(secret);
  if (keyBytes.length === 0) return null;

  const epochSeconds = Math.floor(timestampMs / 1000);
  const counter = Math.floor(epochSeconds / period);
  const remainingSeconds = period - (epochSeconds % period);

  const counterBytes = new Uint8Array(8);
  let temp = counter;
  for (let i = 7; i >= 0; i--) {
    counterBytes[i] = temp & 0xff;
    temp = Math.floor(temp / 256);
  }

  try {
    const hmacKey = await crypto.subtle.importKey(
      'raw',
      keyBytes as BufferSource,
      { name: 'HMAC', hash: 'SHA-1' },
      false,
      ['sign']
    );
    const sig = new Uint8Array(await crypto.subtle.sign('HMAC', hmacKey, counterBytes));
    const offset = sig[sig.length - 1] & 0x0f;
    const binary =
      ((sig[offset] & 0x7f) << 24) |
      ((sig[offset + 1] & 0xff) << 16) |
      ((sig[offset + 2] & 0xff) << 8) |
      (sig[offset + 3] & 0xff);
    const otp = (binary % 1_000_000).toString().padStart(6, '0');
    return { code: otp, remainingSeconds };
  } catch {
    return null;
  }
}

/**
 * Password & Passphrase Generator + Entropy / Crack-time Calculator
 */
const EFF_WORDS = [
  'anchor', 'arctic', 'atom', 'aurora', 'axiom', 'beacon', 'binary', 'blade',
  'breeze', 'bridge', 'canyon', 'carbon', 'cascade', 'cipher', 'cobalt', 'comet',
  'compass', 'coral', 'cosmos', 'crystal', 'delta', 'diamond', 'drift', 'eclipse',
  'ember', 'enigma', 'epoch', 'falcon', 'fiber', 'fjord', 'flux', 'forge',
  'frost', 'galaxy', 'garnet', 'glacier', 'granite', 'gravity', 'harbor', 'haven',
  'helix', 'horizon', 'impulse', 'indigo', 'ivory', 'jasper', 'kernel', 'kinetic',
  'krypton', 'lagoon', 'lantern', 'laser', 'lattice', 'legend', 'lithium', 'lumen',
  'lunar', 'magnet', 'marble', 'matrix', 'meadow', 'mercury', 'meteor', 'mirage',
  'monolith', 'nebula', 'nectar', 'neutron', 'nexus', 'nimbus', 'noble', 'nordic',
  'nova', 'obsidian', 'ocean', 'omega', 'onyx', 'opal', 'orbit', 'origin',
  'osmium', 'oxygen', 'paradox', 'pebble', 'phantom', 'phoenix', 'photon', 'pioneer',
  'plasma', 'platinum', 'polar', 'prism', 'pulsar', 'quantum', 'quartz', 'quasar',
  'radar', 'radiant', 'raven', 'reactor', 'reflex', 'relic', 'ribbon', 'ripple',
  'rocket', 'ruby', 'runway', 'saffron', 'sapphire', 'saturn', 'scalar', 'scepter',
  'seismic', 'sentinel', 'shadow', 'sierra', 'signal', 'silicon', 'silver', 'solstice',
  'sonar', 'spark', 'spectra', 'sphere', 'spiral', 'summit', 'velvet', 'vertex',
  'vortex', 'zenith', 'zephyr', 'zircon',
];

export interface GeneratorOptions {
  mode: 'password' | 'passphrase' | 'pin';
  length: number;
  uppercase: boolean;
  lowercase: boolean;
  numbers: boolean;
  symbols: boolean;
  avoidAmbiguous: boolean;
  wordCount: number;
  separator: string;
  capitalizeWords: boolean;
  includeNumberInPhrase: boolean;
}

export function generateSecret(opts: GeneratorOptions): string {
  if (opts.mode === 'pin') {
    const pinLen = Math.max(4, Math.min(12, opts.length));
    const rand = new Uint32Array(pinLen);
    crypto.getRandomValues(rand);
    return Array.from(rand)
      .map((n) => (n % 10).toString())
      .join('');
  }

  if (opts.mode === 'passphrase') {
    const count = Math.max(3, Math.min(10, opts.wordCount));
    const rand = new Uint32Array(count + 1);
    crypto.getRandomValues(rand);
    const words = Array.from({ length: count }, (_, idx) => {
      let w = EFF_WORDS[rand[idx] % EFF_WORDS.length];
      if (opts.capitalizeWords) {
        w = w.charAt(0).toUpperCase() + w.slice(1);
      }
      return w;
    });
    if (opts.includeNumberInPhrase) {
      const targetIdx = rand[count] % words.length;
      words[targetIdx] = `${words[targetIdx]}${(rand[count] % 90) + 10}`;
    }
    return words.join(opts.separator || '-');
  }

  const upper = opts.avoidAmbiguous ? 'ABCDEFGHJKLMNPQRSTUVWXYZ' : 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lower = opts.avoidAmbiguous ? 'abcdefghijkmnopqrstuvwxyz' : 'abcdefghijklmnopqrstuvwxyz';
  const digits = opts.avoidAmbiguous ? '23456789' : '0123456789';
  const syms = '!@#$%^&*_-+=?';

  let pool = '';
  const requiredChars: string[] = [];
  const reqRand = new Uint32Array(4);
  crypto.getRandomValues(reqRand);

  if (opts.uppercase) {
    pool += upper;
    requiredChars.push(upper[reqRand[0] % upper.length]);
  }
  if (opts.lowercase) {
    pool += lower;
    requiredChars.push(lower[reqRand[1] % lower.length]);
  }
  if (opts.numbers) {
    pool += digits;
    requiredChars.push(digits[reqRand[2] % digits.length]);
  }
  if (opts.symbols) {
    pool += syms;
    requiredChars.push(syms[reqRand[3] % syms.length]);
  }

  if (!pool) {
    pool = lower + digits;
  }

  const len = Math.max(6, Math.min(64, opts.length));
  const rand = new Uint32Array(len);
  crypto.getRandomValues(rand);

  const chars = Array.from({ length: len }, (_, i) => pool[rand[i] % pool.length]);
  for (let i = 0; i < requiredChars.length && i < chars.length; i++) {
    chars[i] = requiredChars[i];
  }

  // Fisher-Yates shuffle
  const shuffleRand = new Uint32Array(chars.length);
  crypto.getRandomValues(shuffleRand);
  for (let i = chars.length - 1; i > 0; i--) {
    const j = shuffleRand[i] % (i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }

  return chars.join('');
}

export interface PasswordStrengthReport {
  score: 0 | 1 | 2 | 3 | 4;
  entropyBits: number;
  label: string;
  crackTime: string;
  warnings: string[];
}

const COMMON_WEAK = new Set([
  'password', '123456', '12345678', 'qwerty', 'admin123', 'letmein', 'welcome', 'password123',
  'iloveyou', '111111', 'abc123', 'dragon', 'monkey',
]);

export function evaluatePasswordStrength(pwd: string): PasswordStrengthReport {
  if (!pwd) {
    return {
      score: 0,
      entropyBits: 0,
      label: 'Kosong',
      crackTime: 'Serta-merta',
      warnings: ['Sila masukkan kata laluan.'],
    };
  }

  const warnings: string[] = [];
  let poolSize = 0;
  if (/[a-z]/.test(pwd)) poolSize += 26;
  if (/[A-Z]/.test(pwd)) poolSize += 26;
  if (/[0-9]/.test(pwd)) poolSize += 10;
  if (/[^a-zA-Z0-9]/.test(pwd)) poolSize += 32;

  let entropy = Math.round(pwd.length * Math.log2(Math.max(poolSize, 2)));

  if (COMMON_WEAK.has(pwd.toLowerCase())) {
    entropy = Math.min(entropy, 14);
    warnings.push('Kata laluan ini terdapat dalam pangkalan data bocor biasa.');
  }
  if (/^(.)\1+$/.test(pwd)) {
    entropy = Math.min(entropy, 10);
    warnings.push('Aksara berulang mudah diteka.');
  }
  if (pwd.length < 10) {
    warnings.push('Gunakan sekurang-kurangnya 12–16 aksara untuk perlindungan optimum.');
  }

  let score: 0 | 1 | 2 | 3 | 4 = 0;
  let label = 'Sangat Lemah';
  let crackTime = '< 1 saat';

  if (entropy >= 95) {
    score = 4;
    label = 'Kriptografi Kukuh';
    crackTime = 'Berabad-abad';
  } else if (entropy >= 70) {
    score = 3;
    label = 'Kuat';
    crackTime = '> 50 tahun';
  } else if (entropy >= 50) {
    score = 2;
    label = 'Sederhana';
    crackTime = '~3 bulan';
  } else if (entropy >= 32) {
    score = 1;
    label = 'Lemah';
    crackTime = '~2 jam';
  }

  return { score, entropyBits: entropy, label, crackTime, warnings };
}
