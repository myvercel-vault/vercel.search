# Panduan sambungkan Clerk + Neon + Render

Panduan ini untuk projek Vercel Vault yang sedia ada. Projek menggunakan:

- **Clerk** untuk daftar/log masuk identiti pengguna.
- **Master Password Vault** yang berasingan untuk membuka kunci penyulitan vault.
- **Neon PostgreSQL** untuk simpanan persisten.
- **Render Web Service** untuk menjalankan frontend Vite dan backend Express bersama-sama.

> Clerk tidak menggantikan Master Password. Pengguna log masuk dengan Clerk dahulu, kemudian masukkan Master Password untuk menyahsulit vault. Jangan gunakan Master Password sebagai kata laluan Clerk.

## 1. Sediakan Clerk

1. Buka [Clerk Dashboard](https://dashboard.clerk.com/) dan cipta aplikasi Clerk.
2. Dalam tetapan **User & authentication**, aktifkan kaedah pendaftaran/log masuk yang anda mahu. Untuk permulaan, e-mel dengan kod pengesahan atau pautan e-mel adalah pilihan yang mudah.
3. Tetapkan pengesahan e-mel supaya pengguna mengesahkan alamat e-mel. Backend aplikasi menolak pendaftaran vault jika e-mel Clerk belum disahkan.
4. Buka halaman **API keys** aplikasi Clerk. Salin:
   - **Publishable key** (`pk_test_...` semasa ujian, atau `pk_live_...` untuk production).
   - **Secret key** (`sk_test_...` semasa ujian, atau `sk_live_...` untuk production).
5. Untuk production, tukar Clerk ke production keys dan daftarkan domain Render aplikasi anda dalam tetapan domain/origin Clerk. Tambahkan domain sendiri jika anda menggunakannya.
6. Untuk ujian di komputer sendiri, benarkan `localhost` jika tetapan domain/origin aplikasi Clerk anda memerlukannya.

Simpan `Secret key` untuk backend sahaja. Jangan letak dalam kod frontend, GitHub, atau pemboleh ubah yang bermula dengan `VITE_`.

Rujukan rasmi:
- [Clerk React quickstart](https://clerk.com/docs/react/getting-started/quickstart)
- [Clerk Express quickstart](https://clerk.com/docs/expressjs/getting-started/quickstart)
- [Clerk API keys](https://dashboard.clerk.com/~/api-keys)

## 2. Cipta pangkalan data Neon

1. Buka [Neon Console](https://console.neon.tech/) dan cipta projek PostgreSQL.
2. Pilih region yang dekat dengan pengguna/server anda; **Singapore (`aws-ap-southeast-1`)** sesuai sebagai titik mula untuk Malaysia.
3. Dalam projek Neon, buka **Connect** dan salin connection string PostgreSQL untuk database/role yang dipilih. Jika Neon menawarkan pooled connection string, gunakan yang berlabel **Pooled connection** untuk aplikasi web.
4. Jangan hantar connection string ke browser atau commit ke Git.

### Perlu run SQL secara manual?

**Tidak perlu untuk setup biasa.** Apabila Render mula menjalankan backend dengan `DATABASE_URL`, `server.ts` akan mencipta jadual `vault_state` secara automatik dan memasukkan rekod kosong jika jadual itu belum ada. Tiada migration atau SQL manual diperlukan sebelum deploy.

Jika anda mahu mencipta jadual lebih awal, buka **SQL Editor** di Neon dan jalankan SQL yang sama:

```sql
CREATE TABLE IF NOT EXISTS vault_state (
  id SMALLINT PRIMARY KEY CHECK (id = 1),
  data JSONB NOT NULL
);

INSERT INTO vault_state (id, data)
VALUES (
  1,
  '{"users":[],"sessions":[],"folders":[],"items":[],"auditLogs":[]}'::jsonb
)
ON CONFLICT (id) DO NOTHING;
```

### Sahkan pangkalan data

Selepas deploy berjaya, query ini menunjukkan sama ada jadual dan rekod awal wujud:

```sql
SELECT
  id,
  jsonb_array_length(data->'users') AS user_count,
  jsonb_array_length(data->'items') AS item_count,
  jsonb_array_length(data->'folders') AS folder_count
FROM vault_state;
```

Sebelum sesiapa mendaftar, bilangannya dijangka `0`. Untuk semak pengguna selepas ujian, jalankan query yang sama. Elakkan paparkan atau kongsi keseluruhan nilai `data`; ia mengandungi rekod akaun dan data vault.

## 3. Cara backend projek menggunakan Clerk dan Neon

Integrasi telah ditambah dalam `server.ts`. Secara ringkas, backend menyambung ke Neon melalui `pg`:

```ts
const pool = process.env.DATABASE_URL
  ? new Pool({ connectionString: process.env.DATABASE_URL })
  : null;
```

Semasa startup, backend menyediakan jadual `vault_state`. Untuk permintaan API, backend membaca rekod JSONB dalam transaksi PostgreSQL. Permintaan yang mengubah data menulis semula dokumen itu ke Neon. Tanpa `DATABASE_URL`, mod pembangunan tempatan kembali menggunakan fail `data/prism-vault-db.json`.

Clerk Express middleware mengesahkan token sebelum backend mengaitkan akaun Clerk dengan rekod vault:

```ts
app.use(clerkMiddleware());

const { isAuthenticated, userId } = getAuth(req);
if (!isAuthenticated || !userId) {
  res.status(401).json({ error: 'Unauthorized' });
  return;
}
```

Projek menggunakan Clerk `userId` sebagai pautan identiti. API vault juga memerlukan sesi vault aplikasi. Frontend menghantar token Clerk dan sesi vault dalam header yang berasingan; kod frontend/backend sedia menguruskan ini. Jangan buang middleware atau pemeriksaan pemilik akaun.

Kandungan rahsia item disulitkan di browser sebelum disimpan. Walau bagaimanapun, tajuk item, kategori, folder, e-mel, rekod audit dan sebahagian metadata akaun tidak disulitkan oleh AES vault. Hadkan akses dashboard Neon dan jangan anggap semua kolum/metadata sebagai zero-knowledge.

## 4. Uji secara tempatan (pilihan)

Salin template environment:

```bash
cp .env.example .env
```

Isi `.env` dengan keys Clerk dan Neon sebenar:

```env
VITE_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
DATABASE_URL=postgresql://...neon.tech/...?...sslmode=require
```

Kemudian jalankan:

```bash
npm install --legacy-peer-deps
npm run dev
```

Buka `http://localhost:3000`, daftar/log masuk melalui Clerk, kemudian cipta Master Password Vault. Semak Neon SQL Editor menggunakan query pengesahan di atas.

Fail `.env` diabaikan oleh Git. Jangan tampal nilainya dalam isu, chat awam, screenshot, atau commit.

## 5. Deploy ke Render

1. Push perubahan projek ke GitHub.
2. Di [Render Dashboard](https://dashboard.render.com/), pilih **New → Web Service** dan sambungkan repository GitHub.
3. Pilih branch yang hendak dideploy dan tetapkan:
   - **Runtime:** Node
   - **Build Command:** `npm ci --legacy-peer-deps && npm run build`
   - **Start Command:** `npm start`
4. Dalam **Environment**, tambah pemboleh ubah ini:

   | Key | Value | Kegunaan |
   |---|---|---|
   | `NODE_ENV` | `production` | Aktifkan konfigurasi production |
   | `VITE_CLERK_PUBLISHABLE_KEY` | Clerk publishable key | Digunakan semasa build UI; wajib tersedia sebelum build |
   | `CLERK_SECRET_KEY` | Clerk secret key | Backend mengesahkan pengguna |
   | `DATABASE_URL` | Neon connection string | Backend menyambung ke PostgreSQL |

5. Untuk ujian awal, anda boleh gunakan `pk_test_...` dan `sk_test_...`. Sebelum buka kepada pengguna, tukar kepada production keys dan pastikan domain Render telah dibenarkan/ditetapkan dalam Clerk.
6. Klik **Create Web Service**. Jika service sudah wujud, simpan environment variables dan pilih **Manual Deploy → Deploy latest commit**.
7. Tunggu deploy siap. Backend akan menyediakan jadual Neon pada startup.
8. Buka URL Render. Cuba aliran Clerk → cipta Master Password → tambah item ujian. Kemudian sahkan bilangan pengguna/item dalam Neon dengan SQL di atas.

**Penting:** `VITE_CLERK_PUBLISHABLE_KEY` dimasukkan ke dalam bundle UI semasa build. Jika anda menambah atau menukar key itu selepas build, deploy semula supaya UI dibina dengan nilai terkini. `CLERK_SECRET_KEY` dan `DATABASE_URL` mesti kekal rahsia server-side.

## 6. Jika gagal

- **Aplikasi gagal startup / log sebut missing environment variables:** pastikan ketiga-tiga key Clerk/Neon dan `NODE_ENV=production` ditetapkan pada Render.
- **Clerk sign-in tidak muncul atau domain ditolak:** periksa Publishable Key sepadan dengan aplikasi Clerk dan domain Render dibenarkan dalam tetapan Clerk. Selepas menukar `VITE_CLERK_PUBLISHABLE_KEY`, deploy semula.
- **Gagal sambung PostgreSQL:** semak connection string Neon, password role, nama database, dan gunakan string yang sesuai untuk aplikasi Node. Pastikan ia disimpan sebagai `DATABASE_URL` di Render.
- **Sign-in berjaya tetapi vault tidak dapat dibuka:** Clerk dan Master Password ialah dua langkah berasingan. Gunakan Master Password yang sama ketika mencipta vault; ia tidak boleh dipulihkan oleh Clerk.
- **Jadual tiada:** periksa Render startup logs dan `DATABASE_URL`. Backend mencipta jadual automatik semasa startup apabila sambungan Neon berjaya.

## Had reka bentuk simpanan semasa

Untuk memudahkan setup awal, aplikasi menyimpan rekod dalam **satu baris JSONB** dan mengunci baris itu semasa permintaan API. Ini persisten dan sesuai untuk ujian awal, tetapi semua permintaan dikendalikan secara bersiri dan bukan reka bentuk untuk trafik/pengguna ramai. Sebelum pelancaran skala besar, pindahkan users, sessions, folders, items dan audit logs kepada jadual PostgreSQL berasingan dengan migration.

Data dalam fail lokal `data/prism-vault-db.json` **tidak dipindahkan secara automatik** ke Neon. Tutorial ini mengandaikan pangkalan data Neon baharu/kosong dan tiada pengguna sedia ada.
