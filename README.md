# EYFA Natural Oil POS

Aplikasi kasir mobile-first, inventori, HPP, dan laporan penjualan berbasis Next.js dan Supabase. Seluruh perubahan finansial/stok dilakukan oleh RPC PostgreSQL atomik; browser tidak dapat menulis tabel inti secara langsung. Pembayaran tunai menyimpan uang diterima dan kembalian agar struk thermal 58/80 mm dapat dicetak ulang.

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

Migration kedua, [supabase/migrations/202608230001_performance_and_cash_tender.sql](supabase/migrations/202608230001_performance_and_cash_tender.sql), menambahkan nominal tunai/kembalian, RPC checkout kompatibel, indeks ledger terbaru, dan evaluasi RLS per-statement yang lebih ringan. Jalankan `supabase db push` pada proyek yang sudah memakai migration awal.

Navigasi operasional memakai loading skeleton per rute dan partial prefetch bawaan Next.js. Data dashboard/kasir diambil paralel; aplikasi sengaja tidak melakukan full prefetch seluruh data transaksi agar database tidak menerima request spekulatif dan data stok tidak menjadi basi.
