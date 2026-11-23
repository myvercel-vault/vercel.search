export type VaultItemType = 'login' | 'card' | 'note' | 'identity' | 'ssh_key';

export interface CustomField {
  id: string;
  label: string;
  value: string;
  hidden: boolean;
}

export interface PasswordHistoryEntry {
  password: string;
  changedAt: string;
}

export interface LoginPayload {
  username: string;
  password: string;
  urls: string[];
  totpSecret?: string;
  passwordHistory?: PasswordHistoryEntry[];
}

export interface CardPayload {
  cardholderName: string;
  brand: 'Visa' | 'Mastercard' | 'Amex' | 'Discover' | 'Other';
  number: string;
  expMonth: string;
  expYear: string;
  cvv: string;
  pin?: string;
  billingZip?: string;
}

export interface NotePayload {
  content: string;
  tags?: string[];
}

export interface IdentityPayload {
  title: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  email: string;
  phone: string;
  company?: string;
  passportNumber?: string;
  licenseNumber?: string;
  nationalId?: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

export interface SshKeyPayload {
  keyType: 'Ed25519' | 'RSA-4096' | 'API Token' | 'Env Secret';
  publicKey: string;
  privateKey: string;
  fingerprint?: string;
  environment?: 'Production' | 'Preview' | 'Development';
}

export interface DecryptedVaultPayload {
  notes?: string;
  customFields?: CustomField[];
  login?: LoginPayload;
  card?: CardPayload;
  note?: NotePayload;
  identity?: IdentityPayload;
  sshKey?: SshKeyPayload;
}

export interface VaultItemRecord {
  id: string;
  userId: string;
  type: VaultItemType;
  title: string;
  subtitle: string;
  domain?: string;
  folderId: string | null;
  favorite: boolean;
  repromptMasterPassword?: boolean;
  encryptedData: string; // AES-256-GCM base64 ciphertext (iv:ciphertext)
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface DecryptedVaultItem extends Omit<VaultItemRecord, 'encryptedData'> {
  encryptedData: string;
  data: DecryptedVaultPayload;
}

export interface VaultFolder {
  id: string;
  userId: string;
  name: string;
  icon?: string;
  createdAt: string;
}

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  passwordHint?: string;
  kdfSalt: string;
  kdfIterations: number;
  recoveryKeyHash?: string;
  autoLockMinutes: number;
  createdAt: string;
  lastLoginAt: string;
}

export interface AuditLogEntry {
  id: string;
  action: string;
  detail: string;
  ip: string;
  timestamp: string;
}

export interface AuthSessionResponse {
  token: string;
  user: UserProfile;
  recoveryKey?: string;
}
