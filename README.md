# EYFA Natural Oil POS

Aplikasi kasir mobile-first, inventori, HPP, dan laporan penjualan berbasis Next.js dan Supabase. Seluruh perubahan finansial/stok dilakukan oleh RPC PostgreSQL atomik; browser tidak dapat menulis tabel inti secara langsung.

## Menjalankan lokal

1. Buat proyek Supabase, lalu jalankan migration dan seed:

   ```bash
   supabase db push
   supabase db seed
   ```

2. Salin `.env.example` ke `.env.local` dan isi URL serta anon/publishable key proyek.
3. Buat pengguna melalui Supabase Auth. Trigger otomatis membuat profil `cashier`.
4. Jadikan pengguna pertama sebagai owner melalui SQL Editor (hanya bootstrap sekali):

   ```sql
   update public.profiles set role = 'owner' where id = '<AUTH_USER_UUID>';
   ```

5. Jalankan `npm run dev`.

Tidak ada service-role key yang digunakan aplikasi web. Akun publik/sign-up sengaja tidak disediakan.

## Pemeriksaan

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

Lihat [supabase/migrations/202608220001_initial_schema.sql](supabase/migrations/202608220001_initial_schema.sql) untuk tabel, RLS, indeks, realtime, storage, dan RPC transaksi.
