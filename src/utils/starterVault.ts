import type { DecryptedVaultPayload, VaultItemType } from '../types/vault';
import { encryptVaultPayload, generateSecret } from './crypto';

export interface StarterEncryptedSeed {
  type: VaultItemType;
  title: string;
  subtitle: string;
  domain?: string;
  folderName: string;
  favorite: boolean;
  repromptMasterPassword?: boolean;
  encryptedData: string;
}

export async function buildStarterVaultItems(
  vaultKey: CryptoKey,
  userEmail: string,
  userName: string
): Promise<StarterEncryptedSeed[]> {
  const strong1 = generateSecret({
    mode: 'password',
    length: 24,
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

  const strong2 = generateSecret({
    mode: 'passphrase',
    length: 20,
    uppercase: true,
    lowercase: true,
    numbers: true,
    symbols: false,
    avoidAmbiguous: true,
    wordCount: 5,
    separator: '-',
    capitalizeWords: true,
    includeNumberInPhrase: true,
  });

  const seeds: Array<{
    type: VaultItemType;
    title: string;
    subtitle: string;
    domain?: string;
    folderName: string;
    favorite: boolean;
    repromptMasterPassword?: boolean;
    payload: DecryptedVaultPayload;
  }> = [
    {
      type: 'login',
      title: 'Vercel Cloud Console',
      subtitle: userEmail,
      domain: 'vercel.com',
      folderName: 'Engineering & Cloud',
      favorite: true,
      payload: {
        login: {
          username: userEmail,
          password: strong1,
          urls: ['https://vercel.com/login', 'https://vercel.com/dashboard'],
          totpSecret: 'JBSWY3DPEHPK3PXP',
        },
        notes: 'Akaun utama deployment produksi & domain pengurusan.',
        customFields: [
          { id: 'cf_1', label: 'Team Slug', value: 'prism-core-team', hidden: false },
          { id: 'cf_2', label: 'Deploy Hook Token', value: 'vcel_live_98a7bc61f0e21', hidden: true },
        ],
      },
    },
    {
      type: 'login',
      title: 'GitHub Enterprise',
      subtitle: userEmail,
      domain: 'github.com',
      folderName: 'Engineering & Cloud',
      favorite: true,
      payload: {
        login: {
          username: userEmail,
          password: strong2,
          urls: ['https://github.com/login'],
          totpSecret: 'HXDMVJECJJWSRB3HWIZR4IFUGFTMXBOZ',
        },
        notes: 'Repositori kod sumber utama dengan pengesahan 2FA TOTP aktif.',
      },
    },
    {
      type: 'card',
      title: 'Black Metal Corporate Visa',
      subtitle: '•••• 4829 · Exp 09/29',
      folderName: 'Finance & Billing',
      favorite: true,
      repromptMasterPassword: true,
      payload: {
        card: {
          cardholderName: userName.toUpperCase() || 'VAULT MEMBER',
          brand: 'Visa',
          number: '4532891044214829',
          expMonth: '09',
          expYear: '2029',
          cvv: '842',
          pin: '9041',
          billingZip: '50450',
        },
        notes: 'Kad korporat untuk langganan infrastruktur cloud (AWS, Vercel, Cloudflare).',
      },
    },
    {
      type: 'ssh_key',
      title: 'Production Ed25519 SSH & API Key',
      subtitle: 'SHA256:k9L2xP8vQ4mN7rT1wZ',
      folderName: 'Engineering & Cloud',
      favorite: false,
      payload: {
        sshKey: {
          keyType: 'Ed25519',
          publicKey: 'ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIK9L2xP8vQ4mN7rT1wZ8bV3cM6nQ2pL5 deploy@vercel.vault',
          privateKey: '-----BEGIN OPENSSH PRIVATE KEY-----\nb3BlbnNzaC1rZXktdjEAAAAABG5vbmUAAAAEbm9uZQAAAAAAAAABAAAAMwAAAAtzc2gtZW\nQyNTUxOQAAACB509JqX/2v8X1zN6R9mK4Lp0W8vC2xY7qR1tB5nJ8sKwAAAJB9f39/f39/\n-----END OPENSSH PRIVATE KEY-----',
          fingerprint: 'SHA256:k9L2xP8vQ4mN7rT1wZ8bV3cM6nQ2pL5',
          environment: 'Production',
        },
        notes: 'Digunakan untuk akses pelayan Linux pengeluaran & Git signing.',
      },
    },
    {
      type: 'note',
      title: 'Recovery Codes & Database Master URI',
      subtitle: 'Nota Tersulit Zero-Knowledge',
      folderName: 'Personal',
      favorite: false,
      payload: {
        note: {
          content:
            '# Kod Pemulihan Kecemasan\n\n- Backup Code 01: `8942-1104-9931`\n- Backup Code 02: `7731-5520-3108`\n- Backup Code 03: `4409-8821-6012`\n\n## PostgreSQL Production URI\n`postgresql://admin_ro:xK9#mP2$vL@db.internal.vercel-storage.com:5432/prod_vault`',
          tags: ['recovery', 'infrastructure', 'secret'],
        },
      },
    },
    {
      type: 'identity',
      title: `Identiti Rasmi — ${userName || 'Pengguna'}`,
      subtitle: userEmail,
      folderName: 'Personal',
      favorite: false,
      payload: {
        identity: {
          title: 'Mx.',
          firstName: userName.split(' ')[0] || 'Alex',
          lastName: userName.split(' ').slice(1).join(' ') || 'Rahman',
          email: userEmail,
          phone: '+60 12-889 4021',
          company: 'Monolith Labs Sdn Bhd',
          passportNumber: 'A58920411',
          licenseNumber: 'MY-890122-14-5521',
          addressLine1: 'Level 32, Menara Maxis, KLCC',
          city: 'Kuala Lumpur',
          state: 'Wilayah Persekutuan',
          postalCode: '50088',
          country: 'Malaysia',
        },
        notes: 'Profil auto-isi borang rasmi & maklumat pasport.',
      },
    },
  ];

  const out: StarterEncryptedSeed[] = [];
  for (const s of seeds) {
    const encryptedData = await encryptVaultPayload(s.payload, vaultKey);
    out.push({
      type: s.type,
      title: s.title,
      subtitle: s.subtitle,
      domain: s.domain,
      folderName: s.folderName,
      favorite: s.favorite,
      repromptMasterPassword: s.repromptMasterPassword,
      encryptedData,
    });
  }
  return out;
}
