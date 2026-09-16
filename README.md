# Nafilah POS

Aplikasi kasir untuk kedai Nafilah. Berbasis web (Next.js), database **Turso**
(SQLite di cloud, diakses lewat HTTP). Bisa dipakai langsung dari browser HP Android —
tidak perlu install dari Play Store.

> Kenapa Turso (bukan MySQL/Supabase)? Turso diakses lewat HTTP biasa (port 443), bukan
> protokol database mentah di port khusus — jadi tidak gampang diblokir jaringan/ISP
> seperti yang sering terjadi pada MySQL self-hosted, dan cocok untuk deploy ke
> lingkungan serverless seperti Vercel.

## Alur pesanan

```
Kasir pilih menu → Buat Pesanan (nota terbit)
        │  status: Menunggu Bayar
        ▼
Customer bayar di kasir → Tandai Sudah Bayar
        │  status: Diproses
        ▼
Dapur menyiapkan pesanan → Tandai Siap Diambil
        │  status: Siap Diambil
        ▼
Customer tunjukkan nota → Selesai / Sudah Diambil
        │  status: Selesai
```

Ada juga status **Dibatalkan** untuk pesanan yang batal sebelum dibayar.

Setiap halaman **polling otomatis tiap 4 detik** (lihat `lib/apiClient.js`) supaya
perubahan dari HP/tab lain ikut muncul tanpa perlu refresh manual.

## Halaman aplikasi

- **Kasir** (`/`) — pilih menu, atur jumlah, buat pesanan, nota langsung muncul.
- **Antrian** (`/antrian`) — daftar pesanan per status, tombol untuk memproses tiap tahap.
- **Menu** (`/menu`) — tambah/edit/hapus menu, atur harga & kategori, tandai stok habis.
- **Laporan** (`/laporan`) — rekap omset & menu terlaris per hari/minggu/bulan/kustom.

## Arsitektur

```
Browser (React, app/*)
   │  fetch()
   ▼
Next.js API routes (app/api/menu, app/api/orders)
   │  @libsql/client (HTTP)
   ▼
Turso (SQLite di cloud)
```

- `lib/db.js` — koneksi Turso + semua query SQL (dijalankan di server saja).
- `lib/apiClient.js` — helper `fetch()` yang dipakai halaman React untuk memanggil API di atas.
- `app/api/menu/`, `app/api/orders/` — endpoint REST sederhana (GET/POST/PATCH/DELETE).

---

## 1. Buat database Turso (gratis)

1. Daftar/masuk di **https://turso.tech** (bisa pakai akun GitHub).
2. Install **Turso CLI**:
   - macOS/Linux: `curl -sSfL https://get.tur.so/install.sh | bash`
   - Windows: pakai **WSL** (Windows Subsystem for Linux) lalu jalankan perintah di atas
     di dalam WSL, atau install lewat **Scoop**: `scoop install turso`
3. Login lewat CLI (akan membuka browser untuk autentikasi):
   ```bash
   turso auth login
   ```
4. Buat database:
   ```bash
   turso db create nafilah-pos
   ```
5. Ambil URL koneksinya:
   ```bash
   turso db show nafilah-pos --url
   ```
   Hasilnya seperti `libsql://nafilah-pos-username.turso.io` — catat ini.
6. Buat token akses:
   ```bash
   turso db tokens create nafilah-pos
   ```
   Hasilnya string panjang — catat ini juga.

## 2. Import skema

```bash
turso db shell nafilah-pos < turso/schema.sql
```

Ini otomatis membuat tabel `menu_items`, `order_counters`, `orders`, dan mengisi 6 menu
contoh (boleh dihapus/diedit nanti lewat halaman Menu).

Cek isinya (opsional):
```bash
turso db shell nafilah-pos "SELECT * FROM menu_items;"
```

## 3. Jalankan aplikasi di komputer

Butuh [Node.js](https://nodejs.org) versi 18 ke atas.

```bash
npm install
cp .env.local.example .env.local
```

Isi `.env.local` dengan nilai dari langkah 1:

```
TURSO_DATABASE_URL=libsql://nafilah-pos-username.turso.io
TURSO_AUTH_TOKEN=isi-token-panjang-dari-turso
```

Lalu:

```bash
npm run dev
```

Buka `http://localhost:3000` — kalau 6 menu contoh muncul, koneksi ke Turso sudah benar.

## 4. Deploy ke Vercel

1. Push folder project ini ke repository GitHub baru.
2. Buka **https://vercel.com** → **Add New → Project** → import repo tersebut.
3. Di bagian **Environment Variables**, tambahkan `TURSO_DATABASE_URL` dan
   `TURSO_AUTH_TOKEN` dengan nilai yang sama seperti di `.env.local`.
4. Klik **Deploy**. Setelah selesai, Anda dapat URL seperti
   `https://nafilah-pos.vercel.app` — bisa dibuka dari HP mana saja, kapan saja, tanpa
   perlu komputer server menyala.
5. Di HP, buka URL tersebut di Chrome → menu titik tiga (⋮) → **Add to Home screen**
   supaya jadi ikon fullscreen seperti aplikasi native.

---

## Struktur project

```
app/
  page.js              → halaman Kasir (pilih menu, buat pesanan)
  antrian/page.js      → halaman Antrian (kelola status pesanan)
  menu/page.js         → halaman Menu (CRUD menu & harga)
  laporan/page.js       → halaman Laporan (rekap omset)
  layout.js             → layout global, font, bottom navigation
  api/
    menu/route.js       → GET (list) & POST (tambah menu)
    menu/[id]/route.js  → PATCH (update/toggle) & DELETE menu
    orders/route.js     → GET (list/filter tanggal) & POST (buat pesanan)
    orders/[id]/route.js → PATCH (ubah status pesanan)
components/
  BottomNav.js           → navigasi bawah + badge jumlah antrian aktif
lib/
  db.js                  → koneksi Turso (@libsql/client) + semua query SQL
  apiClient.js            → helper fetch() dipakai halaman React + interval polling
  format.js                → format Rupiah & waktu
  statusConfig.js           → label, warna, dan alur status pesanan
  dateRange.js               → hitung rentang tanggal untuk halaman Laporan
turso/
  schema.sql                 → skema database + data contoh (import sekali di awal)
```

## Ide pengembangan lanjutan

- **PIN/login staff** — saat ini aplikasi terbuka bebas tanpa login.
- **Cetak struk ke printer thermal** — nota saat ini tampil di layar; kalau punya printer
  Bluetooth thermal, bisa ditambahkan integrasi Web Bluetooth atau print via browser.
- **Backup database** — Turso punya point-in-time restore bawaan (lihat dashboard/CLI:
  `turso db show nafilah-pos`), tapi untuk data penting sebaiknya tetap rutin export:
  ```bash
  turso db shell nafilah-pos ".dump" > backup.sql
  ```
- **Nomor nota harian** — `order_number` reset otomatis tiap hari (UTC) mulai dari 1,
  diatur lewat tabel `order_counters` + transaksi di `lib/db.js` (fungsi `createOrder`).
