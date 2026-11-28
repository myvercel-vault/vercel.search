# ▲ Vercel Vault — Zero-Knowledge Password & Secrets Manager

Pengurus kata laluan (Password Manager) moden berinspirasikan **Bitwarden** & **1Password** dengan reka bentuk tema **Hitam Putih Monokrom** premium ala [vercel.com](https://vercel.com).

## Ciri Utama

- **Sistem Akaun Clerk + Master Password**
  - Clerk mengendalikan pendaftaran dan pengesahan identiti.
  - Master Password berasingan kekal untuk membuka kunci penyulitan vault.
  - Pengasingan kunci kriptografi melalui **PBKDF2-HMAC-SHA256 (310,000 iterasi)**.
  - Pengesahan sisi pelayan menggunakan `scrypt` tanpa pernah menerima Master Password mentah.
  - Penjanaan **Secret Emergency Recovery Kit (.txt)** semasa pendaftaran akaun baru.
  - Sokongan pembayang kata laluan (Master Password Hint).
- **Storan Neon PostgreSQL**
  - Backend menggunakan Neon apabila `DATABASE_URL` ditetapkan.
  - Untuk pembangunan tempatan tanpa `DATABASE_URL`, data kekal dalam fail `data/`.
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
npm run dev
```

Untuk mengaktifkan Clerk dan Neon secara tempatan, cipta aplikasi Clerk dan pangkalan data Neon, kemudian salin template dan isi nilainya:

```env
VITE_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
DATABASE_URL=postgresql://...
```

Jalankan `cp .env.example .env`, kemudian ganti contoh nilai dalam `.env` dengan nilai sebenar.

Jangan kongsi atau commit `CLERK_SECRET_KEY` atau `DATABASE_URL`. Clerk mengurus sign-in; Master Password **bukan** digantikan oleh Clerk kerana ia diperlukan untuk memperoleh kunci penyulitan vault di pelayar.

## Deploy ke Render

Pilih **Web Service** dan tetapkan:

- **Build Command:** `npm ci --legacy-peer-deps && npm run build`
- **Start Command:** `npm start`
- **Environment Variables:** `NODE_ENV=production`, `VITE_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, `DATABASE_URL`

Masukkan `VITE_CLERK_PUBLISHABLE_KEY` semasa build juga, kerana Vite membenamkannya dalam UI. `CLERK_SECRET_KEY` dan `DATABASE_URL` hanya digunakan oleh backend. Tambahkan URL domain Render dalam konfigurasi domain/redirect Clerk.

Pada masa ini, data aplikasi disimpan sebagai satu dokumen JSONB dalam Neon dan permintaan API disiri untuk mengelakkan kemas kini bertindih. Ini memudahkan pelancaran awal, tetapi bukan reka bentuk skala tinggi; sebelum menerima ramai pengguna, pindahkan data ke jadual PostgreSQL berasingan. Data fail tempatan `data/` tidak dimigrasikan secara automatik ke Neon.
