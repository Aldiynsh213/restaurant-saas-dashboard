# Database

Project ini memakai MongoDB melalui Mongoose.

Data awal dibuat dengan script seed:

```bash
cd backend
npm run seed
```

Script seed membuat:

- Tenant bisnis utama.
- Satu cabang pusat.
- Satu akun owner.

Data transaksi tidak dibuat otomatis agar laporan bisnis tidak bercampur dengan data percobaan. Buat cabang, user, menu, dan transaksi dari aplikasi sesuai kebutuhan operasional.
