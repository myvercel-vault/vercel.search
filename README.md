# ▲ Vercel Vault — Zero-Knowledge Password & Secrets Manager

Pengurus kata laluan (Password Manager) moden berinspirasikan **Bitwarden** & **1Password** dengan reka bentuk tema **Hitam Putih Monokrom** premium ala [vercel.com](https://vercel.com).

## Ciri Utama

- **Sistem Akaun Lengkap (Sign Up & Sign In Emel + Master Password)**
  - Pengasingan kunci kriptografi melalui **PBKDF2-HMAC-SHA256 (310,000 iterasi)**.
  - Pengesahan sisi pelayan menggunakan `scrypt` tanpa pernah menerima Master Password mentah.
  - Penjanaan **Secret Emergency Recovery Kit (.txt)** semasa pendaftaran akaun baru.
  - Sokongan pembayang kata laluan (Master Password Hint) dan **1-Klik Demo Akaun**.
- **Penyulitan Zero-Knowledge Sisi Klien (AES-256-GCM)**
  - Semua kata laluan, nombor kad, nota rahsia dan kunci SSH disulitkan dengan WebCrypto `AES-256-GCM` sebelum dihantar ke pelayan.
- **5 Kategori Item Vault Lengkap**
  - **Log Masuk & 2FA**: Username, Password, pelbagai URL autofill, sejarah kata laluan & **Penjana Kod TOTP 2FA 6-digit masa nyata (RFC 6238)**.
  - **Kad Pembayaran**: Visual kad logam monokrom, nombor kad, CVV, PIN & tarikh luput.
  - **Nota Selamat**: Kandungan rahsia Markdown/teks dan sistem tag.
  - **Identiti Peribadi**: Nama penuh, syarikat, pasport, ID/lesen & alamat penuh.
  - **SSH & Kunci API**: Ed25519 / RSA-4096 / Token `.env` dengan persekitaran Production/Preview/Development.
- **Alat Keselamatan Bersepadu**
  - **Password & Passphrase Generator**: Kata laluan rawak, frasa EFF Diceware, atau PIN dengan pengiraan entropi bit & anggaran masa pecah.
  - **Watchtower Security Audit**: Mengesan kata laluan lemah, diguna semula (reused), tiada 2FA, dan pautan HTTP tanpa TLS.
  - **Auto-Lock & Master Password Reprompt**: Kunci sesi automatik apabila melahu & pengesahan semula untuk item sensitif.
  - **Import / Export JSON**: Serasi dengan format eksport JSON Bitwarden & Vercel Vault.

## Menjalankan Projek Secara Tempatan

```bash
npm install --legacy-peer-deps
npm run build
NODE_ENV=production npm run dev
```
