import React, { useState } from 'react';
import {
  X,
  Plus,
  Trash2,
  Sparkles,
  Eye,
  EyeOff,
  Star,
  ShieldAlert,
  Loader2,
} from 'lucide-react';
import type {
  CustomField,
  DecryptedVaultItem,
  DecryptedVaultPayload,
  VaultFolder,
  VaultItemType,
} from '../types/vault';
import { evaluatePasswordStrength, generateSecret } from '../utils/crypto';

interface VaultItemModalProps {
  open: boolean;
  editingItem: DecryptedVaultItem | null;
  defaultType?: VaultItemType;
  folders: VaultFolder[];
  onClose: () => void;
  onSave: (draft: {
    id?: string;
    type: VaultItemType;
    title: string;
    subtitle: string;
    domain?: string;
    folderId: string | null;
    favorite: boolean;
    repromptMasterPassword: boolean;
    payload: DecryptedVaultPayload;
  }) => Promise<void>;
}

function extractCleanDomain(rawUrl: string): string | undefined {
  const trimmed = rawUrl.trim();
  if (!trimmed) return undefined;
  try {
    const withProto = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    return new URL(withProto).hostname.replace(/^www\./, '');
  } catch {
    return undefined;
  }
}

export const VaultItemModal: React.FC<VaultItemModalProps> = ({
  open,
  editingItem,
  defaultType = 'login',
  folders,
  onClose,
  onSave,
}) => {
  const initialType: VaultItemType = editingItem?.type || defaultType;

  const [type, setType] = useState<VaultItemType>(initialType);
  const [title, setTitle] = useState(editingItem?.title || '');
  const [folderId, setFolderId] = useState<string>(editingItem?.folderId || '');
  const [favorite, setFavorite] = useState(editingItem?.favorite || false);
  const [repromptMasterPassword, setRepromptMasterPassword] = useState(
    editingItem?.repromptMasterPassword || false
  );
  const [notes, setNotes] = useState(editingItem?.data.notes || '');
  const [customFields, setCustomFields] = useState<CustomField[]>(
    editingItem?.data.customFields || []
  );

  // Login fields
  const [username, setUsername] = useState(editingItem?.data.login?.username || '');
  const [password, setPassword] = useState(editingItem?.data.login?.password || '');
  const [showPwd, setShowPwd] = useState(false);
  const [urlsText, setUrlsText] = useState(
    (editingItem?.data.login?.urls || ['']).join('\n')
  );
  const [totpSecret, setTotpSecret] = useState(editingItem?.data.login?.totpSecret || '');

  // Card fields
  const [cardholderName, setCardholderName] = useState(
    editingItem?.data.card?.cardholderName || ''
  );
  const [brand, setBrand] = useState<'Visa' | 'Mastercard' | 'Amex' | 'Discover' | 'Other'>(
    editingItem?.data.card?.brand || 'Visa'
  );
  const [cardNumber, setCardNumber] = useState(editingItem?.data.card?.number || '');
  const [expMonth, setExpMonth] = useState(editingItem?.data.card?.expMonth || '12');
  const [expYear, setExpYear] = useState(editingItem?.data.card?.expYear || '2029');
  const [cvv, setCvv] = useState(editingItem?.data.card?.cvv || '');
  const [pin, setPin] = useState(editingItem?.data.card?.pin || '');
  const [billingZip, setBillingZip] = useState(editingItem?.data.card?.billingZip || '');

  // Note fields
  const [noteContent, setNoteContent] = useState(editingItem?.data.note?.content || '');
  const [noteTags, setNoteTags] = useState((editingItem?.data.note?.tags || []).join(', '));

  // Identity fields
  const [idTitle, setIdTitle] = useState(editingItem?.data.identity?.title || 'Mx.');
  const [firstName, setFirstName] = useState(editingItem?.data.identity?.firstName || '');
  const [lastName, setLastName] = useState(editingItem?.data.identity?.lastName || '');
  const [idEmail, setIdEmail] = useState(editingItem?.data.identity?.email || '');
  const [phone, setPhone] = useState(editingItem?.data.identity?.phone || '');
  const [company, setCompany] = useState(editingItem?.data.identity?.company || '');
  const [passportNumber, setPassportNumber] = useState(
    editingItem?.data.identity?.passportNumber || ''
  );
  const [licenseNumber, setLicenseNumber] = useState(
    editingItem?.data.identity?.licenseNumber || ''
  );
  const [addressLine1, setAddressLine1] = useState(
    editingItem?.data.identity?.addressLine1 || ''
  );
  const [city, setCity] = useState(editingItem?.data.identity?.city || '');
  const [stateProv, setStateProv] = useState(editingItem?.data.identity?.state || '');
  const [postalCode, setPostalCode] = useState(editingItem?.data.identity?.postalCode || '');
  const [country, setCountry] = useState(editingItem?.data.identity?.country || 'Malaysia');

  // SSH / API Key fields
  const [keyType, setKeyType] = useState<'Ed25519' | 'RSA-4096' | 'API Token' | 'Env Secret'>(
    editingItem?.data.sshKey?.keyType || 'Ed25519'
  );
  const [publicKey, setPublicKey] = useState(editingItem?.data.sshKey?.publicKey || '');
  const [privateKey, setPrivateKey] = useState(editingItem?.data.sshKey?.privateKey || '');
  const [fingerprint, setFingerprint] = useState(editingItem?.data.sshKey?.fingerprint || '');
  const [environment, setEnvironment] = useState<'Production' | 'Preview' | 'Development'>(
    editingItem?.data.sshKey?.environment || 'Production'
  );

  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  if (!open) return null;

  const pwdStrength = evaluatePasswordStrength(password);

  const handleQuickGen = () => {
    const next = generateSecret({
      mode: 'password',
      length: 22,
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
    setPassword(next);
    setShowPwd(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setErr('Tajuk item diperlukan.');
      return;
    }
    setErr('');
    setSaving(true);

    try {
      let subtitle = '';
      let domain: string | undefined;
      const payload: DecryptedVaultPayload = {
        notes: notes.trim() || undefined,
        customFields: customFields.filter((cf) => cf.label.trim() || cf.value.trim()),
      };

      if (type === 'login') {
        const urls = urlsText
          .split('\n')
          .map((u) => u.trim())
          .filter(Boolean);
        domain = urls[0] ? extractCleanDomain(urls[0]) : undefined;
        subtitle = username.trim() || domain || 'Log Masuk';

        const prevHistory = editingItem?.data.login?.passwordHistory || [];
        const oldPwd = editingItem?.data.login?.password;
        const nextHistory =
          oldPwd && oldPwd !== password
            ? [{ password: oldPwd, changedAt: new Date().toISOString() }, ...prevHistory].slice(0, 8)
            : prevHistory;

        payload.login = {
          username: username.trim(),
          password,
          urls,
          totpSecret: totpSecret.trim() || undefined,
          passwordHistory: nextHistory,
        };
      } else if (type === 'card') {
        const cleanDigits = cardNumber.replace(/\s+/g, '');
        const last4 = cleanDigits.slice(-4) || '0000';
        subtitle = `•••• ${last4} · Exp ${expMonth}/${expYear.slice(-2)}`;
        payload.card = {
          cardholderName: cardholderName.trim(),
          brand,
          number: cleanDigits,
          expMonth,
          expYear,
          cvv: cvv.trim(),
          pin: pin.trim() || undefined,
          billingZip: billingZip.trim() || undefined,
        };
      } else if (type === 'note') {
        const tags = noteTags
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean);
        subtitle = tags.length > 0 ? `#${tags.join(' #')}` : 'Nota Tersulit';
        payload.note = {
          content: noteContent,
          tags,
        };
      } else if (type === 'identity') {
        subtitle = idEmail.trim() || `${firstName} ${lastName}`.trim() || 'Identiti';
        payload.identity = {
          title: idTitle,
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          email: idEmail.trim(),
          phone: phone.trim(),
          company: company.trim() || undefined,
          passportNumber: passportNumber.trim() || undefined,
          licenseNumber: licenseNumber.trim() || undefined,
          addressLine1: addressLine1.trim(),
          city: city.trim(),
          state: stateProv.trim(),
          postalCode: postalCode.trim(),
          country: country.trim(),
        };
      } else if (type === 'ssh_key') {
        subtitle = `${keyType} · ${environment}`;
        payload.sshKey = {
          keyType,
          publicKey: publicKey.trim(),
          privateKey: privateKey.trim(),
          fingerprint: fingerprint.trim() || undefined,
          environment,
        };
      }

      await onSave({
        id: editingItem?.id,
        type,
        title: title.trim(),
        subtitle,
        domain,
        folderId: folderId || null,
        favorite,
        repromptMasterPassword,
        payload,
      });
      onClose();
    } catch (saveErr) {
      setErr(saveErr instanceof Error ? saveErr.message : 'Gagal menyimpan item.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5">
      <div className="w-full max-w-2xl max-h-[92vh] flex flex-col rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#070707] text-black dark:text-white shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between shrink-0">
          <div>
            <h2 className="font-bold text-base tracking-tight">
              {editingItem ? 'Kemaskini Item Vault' : 'Tambah Item Tersulit Baru'}
            </h2>
            <p className="text-[11px] font-mono text-neutral-500">
              Disulitkan dengan AES-256-GCM sebelum dihantar ke pelayan
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-500 hover:text-black dark:hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {err && (
            <div className="p-3 rounded-lg border border-black dark:border-white text-xs font-medium">
              {err}
            </div>
          )}

          {/* Type switcher when creating new */}
          {!editingItem && (
            <div>
              <label className="block text-xs font-medium text-neutral-500 mb-2">
                Jenis Item
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {(
                  [
                    { id: 'login', label: 'Log Masuk' },
                    { id: 'card', label: 'Kad Kredit' },
                    { id: 'note', label: 'Nota Selamat' },
                    { id: 'identity', label: 'Identiti' },
                    { id: 'ssh_key', label: 'SSH / API' },
                  ] as const
                ).map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setType(t.id)}
                    className={`py-2 px-2.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                      type === t.id
                        ? 'bg-black text-white dark:bg-white dark:text-black border-black dark:border-white'
                        : 'border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400 hover:border-neutral-400'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Title + Folder */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium mb-1.5">Nama / Tajuk Item *</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Contoh: Vercel Cloud, Maybank2u, AWS Root"
                className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-300 dark:border-neutral-800 bg-white dark:bg-black focus:outline-none focus:border-black dark:focus:border-white"
              />
            </div>

            <div>
              <label className="block text-xs font-medium mb-1.5">Folder</label>
              <select
                value={folderId}
                onChange={(e) => setFolderId(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-300 dark:border-neutral-800 bg-white dark:bg-black focus:outline-none focus:border-black dark:focus:border-white"
              >
                <option value="">Tiada Folder</option>
                {folders.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Type-specific fields */}
          {type === 'login' && (
            <div className="space-y-4 p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-950/60">
              <div>
                <label className="block text-xs font-medium mb-1.5">Emel / Username</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="nama@domain.com"
                  className="w-full px-3 py-2 text-sm font-mono rounded-lg border border-neutral-300 dark:border-neutral-800 bg-white dark:bg-black focus:outline-none focus:border-black dark:focus:border-white"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-medium">Kata Laluan</label>
                  <button
                    type="button"
                    onClick={handleQuickGen}
                    className="inline-flex items-center gap-1 text-[11px] font-mono text-neutral-600 dark:text-neutral-300 hover:underline cursor-pointer"
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>Jana Kata Laluan Rawak</span>
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showPwd ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••••••"
                    className="w-full pl-3 pr-10 py-2 text-sm font-mono rounded-lg border border-neutral-300 dark:border-neutral-800 bg-white dark:bg-black focus:outline-none focus:border-black dark:focus:border-white"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd(!showPwd)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-black dark:hover:text-white cursor-pointer"
                  >
                    {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {password && (
                  <div className="mt-1.5 flex items-center justify-between text-[11px] font-mono text-neutral-500">
                    <span>Kekuatan: {pwdStrength.label}</span>
                    <span>{pwdStrength.entropyBits} bit</span>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium mb-1.5">
                  Kunci Pengesah TOTP 2FA (Base32 atau URI otpauth://)
                </label>
                <input
                  type="text"
                  value={totpSecret}
                  onChange={(e) => setTotpSecret(e.target.value)}
                  placeholder="Contoh: JBSWY3DPEHPK3PXP"
                  className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-neutral-300 dark:border-neutral-800 bg-white dark:bg-black focus:outline-none focus:border-black dark:focus:border-white"
                />
              </div>

              <div>
                <label className="block text-xs font-medium mb-1.5">
                  URL Laman Web (Satu URL setiap baris)
                </label>
                <textarea
                  rows={2}
                  value={urlsText}
                  onChange={(e) => setUrlsText(e.target.value)}
                  placeholder="https://vercel.com/login"
                  className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-neutral-300 dark:border-neutral-800 bg-white dark:bg-black focus:outline-none focus:border-black dark:focus:border-white"
                />
              </div>
            </div>
          )}

          {type === 'card' && (
            <div className="space-y-4 p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-950/60">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium mb-1.5">Nama Pemegang Kad</label>
                  <input
                    type="text"
                    value={cardholderName}
                    onChange={(e) => setCardholderName(e.target.value)}
                    placeholder="ALEX RAHMAN"
                    className="w-full px-3 py-2 text-sm font-mono rounded-lg border border-neutral-300 dark:border-neutral-800 bg-white dark:bg-black"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1.5">Rangkaian Kad</label>
                  <select
                    value={brand}
                    onChange={(e) => setBrand(e.target.value as typeof brand)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-300 dark:border-neutral-800 bg-white dark:bg-black"
                  >
                    <option value="Visa">Visa</option>
                    <option value="Mastercard">Mastercard</option>
                    <option value="Amex">American Express</option>
                    <option value="Discover">Discover</option>
                    <option value="Other">Lain-lain</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium mb-1.5">Nombor Kad</label>
                <input
                  type="text"
                  value={cardNumber}
                  onChange={(e) => setCardNumber(e.target.value)}
                  placeholder="4532 8910 4421 4829"
                  className="w-full px-3 py-2 text-sm font-mono rounded-lg border border-neutral-300 dark:border-neutral-800 bg-white dark:bg-black"
                />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1.5">Bulan Luput</label>
                  <input
                    type="text"
                    maxLength={2}
                    value={expMonth}
                    onChange={(e) => setExpMonth(e.target.value)}
                    placeholder="09"
                    className="w-full px-3 py-2 text-sm font-mono rounded-lg border border-neutral-300 dark:border-neutral-800 bg-white dark:bg-black"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1.5">Tahun Luput</label>
                  <input
                    type="text"
                    maxLength={4}
                    value={expYear}
                    onChange={(e) => setExpYear(e.target.value)}
                    placeholder="2029"
                    className="w-full px-3 py-2 text-sm font-mono rounded-lg border border-neutral-300 dark:border-neutral-800 bg-white dark:bg-black"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1.5">CVV / CVC</label>
                  <input
                    type="password"
                    maxLength={4}
                    value={cvv}
                    onChange={(e) => setCvv(e.target.value)}
                    placeholder="•••"
                    className="w-full px-3 py-2 text-sm font-mono rounded-lg border border-neutral-300 dark:border-neutral-800 bg-white dark:bg-black"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1.5">PIN ATM</label>
                  <input
                    type="password"
                    maxLength={8}
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    placeholder="••••"
                    className="w-full px-3 py-2 text-sm font-mono rounded-lg border border-neutral-300 dark:border-neutral-800 bg-white dark:bg-black"
                  />
                </div>
              </div>
            </div>
          )}

          {type === 'note' && (
            <div className="space-y-4 p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-950/60">
              <div>
                <label className="block text-xs font-medium mb-1.5">Kandungan Nota Rahsia</label>
                <textarea
                  rows={6}
                  value={noteContent}
                  onChange={(e) => setNoteContent(e.target.value)}
                  placeholder="Tulis maklumat sensitif, kunci pemulihan, seed phrase, atau konfigurasi rahsia..."
                  className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-neutral-300 dark:border-neutral-800 bg-white dark:bg-black"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5">Tag (Pisahkan dengan koma)</label>
                <input
                  type="text"
                  value={noteTags}
                  onChange={(e) => setNoteTags(e.target.value)}
                  placeholder="recovery, crypto, server"
                  className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-neutral-300 dark:border-neutral-800 bg-white dark:bg-black"
                />
              </div>
            </div>
          )}

          {type === 'identity' && (
            <div className="space-y-4 p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-950/60">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1.5">Gelaran</label>
                  <input
                    type="text"
                    value={idTitle}
                    onChange={(e) => setIdTitle(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-300 dark:border-neutral-800 bg-white dark:bg-black"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1.5">Nama Pertama</label>
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-300 dark:border-neutral-800 bg-white dark:bg-black"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1.5">Nama Akhir</label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-300 dark:border-neutral-800 bg-white dark:bg-black"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1.5">Emel</label>
                  <input
                    type="email"
                    value={idEmail}
                    onChange={(e) => setIdEmail(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-300 dark:border-neutral-800 bg-white dark:bg-black"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1.5">Telefon</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-300 dark:border-neutral-800 bg-white dark:bg-black"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1.5">Syarikat</label>
                  <input
                    type="text"
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-300 dark:border-neutral-800 bg-white dark:bg-black"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1.5">No. Pasport</label>
                  <input
                    type="text"
                    value={passportNumber}
                    onChange={(e) => setPassportNumber(e.target.value)}
                    className="w-full px-3 py-2 text-sm font-mono rounded-lg border border-neutral-300 dark:border-neutral-800 bg-white dark:bg-black"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1.5">No. Kad Pengenalan / Lesen</label>
                  <input
                    type="text"
                    value={licenseNumber}
                    onChange={(e) => setLicenseNumber(e.target.value)}
                    className="w-full px-3 py-2 text-sm font-mono rounded-lg border border-neutral-300 dark:border-neutral-800 bg-white dark:bg-black"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium mb-1.5">Alamat Baris 1</label>
                <input
                  type="text"
                  value={addressLine1}
                  onChange={(e) => setAddressLine1(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-neutral-300 dark:border-neutral-800 bg-white dark:bg-black"
                />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <input
                  type="text"
                  placeholder="Bandar"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="px-3 py-2 text-xs rounded-lg border border-neutral-300 dark:border-neutral-800 bg-white dark:bg-black"
                />
                <input
                  type="text"
                  placeholder="Negeri"
                  value={stateProv}
                  onChange={(e) => setStateProv(e.target.value)}
                  className="px-3 py-2 text-xs rounded-lg border border-neutral-300 dark:border-neutral-800 bg-white dark:bg-black"
                />
                <input
                  type="text"
                  placeholder="Poskod"
                  value={postalCode}
                  onChange={(e) => setPostalCode(e.target.value)}
                  className="px-3 py-2 text-xs font-mono rounded-lg border border-neutral-300 dark:border-neutral-800 bg-white dark:bg-black"
                />
                <input
                  type="text"
                  placeholder="Negara"
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  className="px-3 py-2 text-xs rounded-lg border border-neutral-300 dark:border-neutral-800 bg-white dark:bg-black"
                />
              </div>
            </div>
          )}

          {type === 'ssh_key' && (
            <div className="space-y-4 p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-950/60">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1.5">Jenis Kunci / Rahsia</label>
                  <select
                    value={keyType}
                    onChange={(e) => setKeyType(e.target.value as typeof keyType)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-300 dark:border-neutral-800 bg-white dark:bg-black"
                  >
                    <option value="Ed25519">Ed25519 SSH</option>
                    <option value="RSA-4096">RSA-4096 SSH</option>
                    <option value="API Token">Bearer API Token</option>
                    <option value="Env Secret">.env Secret</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1.5">Persekitaran</label>
                  <select
                    value={environment}
                    onChange={(e) => setEnvironment(e.target.value as typeof environment)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-300 dark:border-neutral-800 bg-white dark:bg-black"
                  >
                    <option value="Production">Production</option>
                    <option value="Preview">Preview</option>
                    <option value="Development">Development</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium mb-1.5">Public Key / Key ID</label>
                <input
                  type="text"
                  value={publicKey}
                  onChange={(e) => setPublicKey(e.target.value)}
                  placeholder="ssh-ed25519 AAAAC3NzaC1lZDI1NTE5..."
                  className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-neutral-300 dark:border-neutral-800 bg-white dark:bg-black"
                />
              </div>

              <div>
                <label className="block text-xs font-medium mb-1.5">Private Key / Secret Value</label>
                <textarea
                  rows={4}
                  value={privateKey}
                  onChange={(e) => setPrivateKey(e.target.value)}
                  placeholder="-----BEGIN OPENSSH PRIVATE KEY----- atau sk_live_..."
                  className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-neutral-300 dark:border-neutral-800 bg-white dark:bg-black"
                />
              </div>

              <div>
                <label className="block text-xs font-medium mb-1.5">Fingerprint (Pilihan)</label>
                <input
                  type="text"
                  value={fingerprint}
                  onChange={(e) => setFingerprint(e.target.value)}
                  placeholder="SHA256:..."
                  className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-neutral-300 dark:border-neutral-800 bg-white dark:bg-black"
                />
              </div>
            </div>
          )}

          {/* Custom Fields (Bitwarden / 1Password signature feature) */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-neutral-600 dark:text-neutral-400">
                Medan Tersuai (Custom Fields)
              </label>
              <button
                type="button"
                onClick={() =>
                  setCustomFields([
                    ...customFields,
                    { id: `cf_${Date.now()}`, label: '', value: '', hidden: false },
                  ])
                }
                className="inline-flex items-center gap-1 text-xs font-medium hover:underline cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Tambah Medan</span>
              </button>
            </div>

            {customFields.map((cf, index) => (
              <div key={cf.id} className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Label (cth: PIN Sokongan)"
                  value={cf.label}
                  onChange={(e) => {
                    const copy = [...customFields];
                    copy[index] = { ...cf, label: e.target.value };
                    setCustomFields(copy);
                  }}
                  className="w-1/3 px-2.5 py-1.5 text-xs rounded-lg border border-neutral-300 dark:border-neutral-800 bg-white dark:bg-black"
                />
                <input
                  type={cf.hidden ? 'password' : 'text'}
                  placeholder="Nilai"
                  value={cf.value}
                  onChange={(e) => {
                    const copy = [...customFields];
                    copy[index] = { ...cf, value: e.target.value };
                    setCustomFields(copy);
                  }}
                  className="flex-1 px-2.5 py-1.5 text-xs font-mono rounded-lg border border-neutral-300 dark:border-neutral-800 bg-white dark:bg-black"
                />
                <label className="flex items-center gap-1 text-[11px] text-neutral-500 cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    checked={cf.hidden}
                    onChange={(e) => {
                      const copy = [...customFields];
                      copy[index] = { ...cf, hidden: e.target.checked };
                      setCustomFields(copy);
                    }}
                    className="accent-black dark:accent-white"
                  />
                  <span>Rahsia</span>
                </label>
                <button
                  type="button"
                  onClick={() => setCustomFields(customFields.filter((_, i) => i !== index))}
                  className="p-1.5 text-neutral-400 hover:text-black dark:hover:text-white cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>

          {/* Notes */}
          {type !== 'note' && (
            <div>
              <label className="block text-xs font-medium mb-1.5">Nota Tambahan</label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Catatan rahsia berkaitan akaun ini..."
                className="w-full px-3 py-2 text-xs rounded-lg border border-neutral-300 dark:border-neutral-800 bg-white dark:bg-black"
              />
            </div>
          )}

          {/* Security Options */}
          <div className="flex flex-wrap items-center gap-4 pt-2 border-t border-neutral-200 dark:border-neutral-800 text-xs">
            <label className="inline-flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={favorite}
                onChange={(e) => setFavorite(e.target.checked)}
                className="accent-black dark:accent-white"
              />
              <Star className="w-3.5 h-3.5" />
              <span>Tandakan Kegemaran (Favorite)</span>
            </label>

            <label className="inline-flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={repromptMasterPassword}
                onChange={(e) => setRepromptMasterPassword(e.target.checked)}
                className="accent-black dark:accent-white"
              />
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Minta Semula Master Password Sebelum Didedahkan</span>
            </label>
          </div>

          {/* Footer Buttons */}
          <div className="flex justify-end gap-2.5 pt-3 border-t border-neutral-200 dark:border-neutral-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-neutral-300 dark:border-neutral-800 text-xs font-medium hover:bg-neutral-100 dark:hover:bg-neutral-900 cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 rounded-lg bg-black text-white dark:bg-white dark:text-black text-xs font-semibold hover:bg-neutral-800 dark:hover:bg-neutral-200 disabled:opacity-60 inline-flex items-center gap-2 cursor-pointer"
            >
              {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>{editingItem ? 'Simpan Perubahan' : 'Sulitkan & Simpan'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
