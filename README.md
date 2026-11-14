# DYN SH SaaS

DYN SH SaaS adalah sistem operasional dan penjualan restoran berbasis Express, MongoDB, dan frontend HTML/CSS/JavaScript. Project ini sudah dilengkapi dashboard internal untuk owner/staff dan web penjualan untuk customer.

## Fitur utama

- Login aman memakai JWT, bcrypt, rate limit, Helmet, CORS whitelist, dan validasi input.
- Menu daftar akun customer langsung dari panel login.
- Role internal: owner, executive, manager, dan cashier.
- Role customer terpisah untuk pemesanan melalui web penjualan.
- Dashboard owner/staff untuk KPI, menu, order, dan cabang; pembuatan akun staff hanya tersedia untuk owner.
- Web penjualan customer di `frontend/sales.html`.
- Order online dari customer masuk ke daftar order dashboard.
- Owner memiliki menu `Web Penjualan` dari sidebar dashboard.
- Staff dapat mengubah status order: menunggu, dikonfirmasi, diproses, siap, selesai, atau dibatalkan.
- Seed menyediakan 20 produk siap jual dari kategori Makanan, Minuman, dan Dessert lengkap dengan foto menu.
- Data transaksi awal tidak dibuat otomatis agar laporan bisnis tetap bersih.
- Password tidak pernah ditampilkan di UI dan tidak dicetak saat seed.

## Struktur folder

```text
dyn_sh_saas/
  backend/              Express API + MongoDB
  frontend/             Dashboard internal dan web penjualan customer
  database/             Catatan konfigurasi database MongoDB
  docker-compose.yml    MongoDB lokal via Docker
```

## Prasyarat

- Node.js 18.18 atau lebih baru.
- MongoDB lokal atau MongoDB Atlas.
- Browser modern.
- Docker Desktop opsional untuk menjalankan MongoDB lokal.

## Cara menjalankan dengan MongoDB lokal via Docker

### 1. Jalankan MongoDB

Dari folder root project:

```bash
docker compose up -d
```

MongoDB lokal berjalan di:

```text
mongodb://127.0.0.1:27017/dyn_sh_saas_final
```

### 2. Konfigurasi backend

Masuk ke folder backend:

```bash
cd backend
cp .env.example .env
```

Edit file `.env` lalu ubah nilai penting berikut:

```env
JWT_SECRET=isi_dengan_secret_panjang_minimal_32_karakter
SEED_OWNER_PASSWORD=isi_password_owner_yang_kuat
SEED_OWNER_EMAIL=email_owner_bisnis
SEED_OWNER_PHONE=nomor_hp_owner_bisnis
```

Aturan password yang disarankan:

- Minimal 10 karakter.
- Mengandung huruf besar, huruf kecil, dan angka.
- Tidak memakai kata sandi yang mudah ditebak.
- Jangan commit file `.env` ke repository publik.

### 3. Install dependency backend

```bash
npm install
```

### 4. Seed database

```bash
npm run seed
```

Script seed membuat tenant bisnis, cabang pusat, dan akun owner. Username owner diambil dari:

```env
SEED_OWNER_USERNAME=owner.dynsh
```

Password owner adalah password yang Anda isi di:

```env
SEED_OWNER_PASSWORD=...
```

### 5. Jalankan backend

Mode development:

```bash
npm run dev
```

Mode biasa:

```bash
npm start
```

Cek API:

```text
http://localhost:5000/api/health
```

### 6. Jalankan frontend

Dari folder root project, jalankan static server di port 5500:

```bash
python3 -m http.server 5500 -d frontend
```

Buka login panel:

```text
http://localhost:5500/index.html
```

Buka web penjualan customer:

```text
http://localhost:5500/sales.html
```

## Alur pemakaian

1. Jalankan MongoDB, backend, dan frontend.
2. Login sebagai owner.
3. Gunakan 20 menu seed yang sudah tersedia atau tambahkan menu dari halaman `Menu Management`.
4. Owner dapat menambahkan cashier, manager, atau executive dari halaman `Team Management`.
5. Klik `Web Penjualan` dari dashboard owner untuk membuka halaman penjualan customer.
6. Customer dapat membuat akun melalui menu `Daftar Customer` pada login panel.
7. Customer login, memilih menu, memilih outlet, lalu mengirim pesanan.
8. Order customer muncul di halaman `Orders` dashboard untuk diproses staff.

## Endpoint penting

| Endpoint | Fungsi |
|---|---|
| `POST /api/auth/login` | Login staff/customer |
| `POST /api/auth/register` | Daftar akun customer |
| `GET /api/sales/menu` | Katalog menu aktif untuk web penjualan |
| `GET /api/sales/branches` | Outlet aktif untuk checkout |
| `POST /api/sales/orders` | Customer membuat order online |
| `GET /api/sales/my-orders` | Riwayat order customer |
| `GET /api/orders` | Staff melihat order POS dan online |
| `PATCH /api/orders/:id/status` | Staff mengubah status order |

## Catatan produksi

Sebelum dipakai pada domain publik, lakukan konfigurasi berikut:

1. Jalankan aplikasi melalui HTTPS.
2. Gunakan MongoDB dengan backup rutin.
3. Ganti `JWT_SECRET` dengan secret panjang dan acak.
4. Batasi `CORS_ORIGIN` hanya ke domain aplikasi Anda.
5. Jalankan backend memakai PM2, Docker, atau process manager lain.
6. Siapkan backup database dan monitoring uptime.
7. Tambahkan layanan email/SMS bila ingin fitur verifikasi akun dan reset password.
8. Integrasikan payment gateway resmi bila pembayaran online ingin otomatis terverifikasi.
9. Sesuaikan pajak, service charge, dan invoice dengan kebutuhan bisnis.


## End-to-end test lokal dengan MongoDB

Project ini sudah dilengkapi script smoke test end-to-end. Setelah MongoDB aktif dan `backend/.env` sudah diisi, jalankan:

```bash
cd backend
npm install
npm run e2e:local
```

Script ini akan menjalankan seed, start API sementara, login owner, validasi 20 menu seed, membuat akun cashier, daftar customer, membuat order online, mengecek order di dashboard, dan mengubah status order. Detail lengkap ada di `RUN_E2E_LOCAL.md`.

## Troubleshooting

### Backend tidak start

Pastikan file `backend/.env` berisi `MONGODB_URI` dan `JWT_SECRET` minimal 32 karakter.

### Login owner gagal

Pastikan sudah menjalankan:

```bash
npm run seed
```

Pastikan username dan password sesuai nilai di file `.env`.

### Web penjualan tidak menampilkan menu

Jalankan `npm run seed` agar 20 produk awal tersedia, atau login sebagai owner lalu tambahkan menu dan pastikan status menu aktif.

## Polish UI terbaru

Versi ini menambahkan:

- Tampilan lebih stylish dengan font Plus Jakarta Sans + Space Grotesk.
- Dark mode dan light mode di semua halaman frontend.
- Selector bahasa dengan banyak bahasa dunia. Bahasa Indonesia/English punya fallback internal; bahasa lain memakai Google Translate widget jika browser memiliki akses internet.
- Widget Customer Service di web penjualan:
  - tombol WhatsApp langsung,
  - form chat customer service.
- Inbox Customer Service di dashboard owner/staff untuk melihat, membalas, dan menutup pesan customer.

### Mengganti nomor WhatsApp customer service

Buka file:

```text
frontend/js/ui.js
```

Cari:

```js
const whatsappNumber = window.DYN_SH_WHATSAPP || '6281234567890';
```

Ganti `6281234567890` dengan nomor WhatsApp bisnis, format internasional tanpa tanda plus.
Contoh:

```js
const whatsappNumber = window.DYN_SH_WHATSAPP || '6282112345678';
```

## Dokumentasi tambahan

- [Panduan E2E lokal](docs/e2e-local.md)
- [Showcase proyek (PDF)](docs/showcase.pdf)

## Lisensi

MIT
