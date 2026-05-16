# Cara menjalankan end-to-end test dengan MongoDB lokal

Panduan ini menjalankan alur penuh: seed database, start API, login owner, validasi 20 menu seed, membuat akun cashier, daftar customer, checkout order, cek order di dashboard owner, lalu update status order.

## 1. Jalankan MongoDB

Pilih salah satu.

### Opsi A — Docker Desktop

Dari folder root project:

```bash
docker compose up -d
```

### Opsi B — MongoDB sudah terpasang lokal

Pastikan service MongoDB aktif dan bisa diakses di:

```text
mongodb://127.0.0.1:27017/dyn_sh_saas_final
```

## 2. Siapkan backend env

```bash
cd backend
cp .env.example .env
```

Edit `backend/.env`, minimal isi/ganti ini:

```env
MONGODB_URI=mongodb://127.0.0.1:27017/dyn_sh_saas_final
JWT_SECRET=isi_secret_panjang_minimal_32_karakter_12345
SEED_OWNER_USERNAME=owner.dynsh
SEED_OWNER_PASSWORD=OwnerPassword123
SEED_OWNER_EMAIL=owner@bisnis.com
SEED_OWNER_PHONE=+6281234567890
```

Password owner harus minimal 10 karakter dan berisi huruf besar, huruf kecil, serta angka.

## 3. Install dependency

```bash
npm install
```

## 4. Jalankan end-to-end test

Masih dari folder `backend`:

```bash
npm run e2e:local
```

Jika berhasil, output terakhir akan seperti ini:

```text
[ E2E PASSED ] Semua alur utama berhasil: seed 20 produk, login owner, buat cashier, register customer, checkout, dashboard order, update status.
```

## 5. Jalankan aplikasi normal setelah test

```bash
npm run seed
npm start
```

Lalu dari folder root project jalankan frontend:

```bash
python -m http.server 5500 -d frontend
```

Buka:

```text
http://localhost:5500/index.html
http://localhost:5500/sales.html
```

## Catatan penting

- `npm run e2e:local` akan me-reset data database karena menjalankan seed terlebih dahulu.
- Jangan pakai database produksi untuk E2E test.
- Bila ingin test di database khusus, ubah `MONGODB_URI` misalnya menjadi `mongodb://127.0.0.1:27017/dyn_sh_saas_final_e2e`.
