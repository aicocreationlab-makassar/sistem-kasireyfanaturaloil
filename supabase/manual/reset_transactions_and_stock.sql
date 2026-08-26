-- RESET OPERASIONAL EYFA
-- Menghapus seluruh transaksi dan ledger stok, lalu mengatur stok semua produk ke 0.
-- Katalog produk, harga, HPP, barcode, dan gambar produk tetap dipertahankan.
-- Tindakan ini permanen. Jalankan hanya melalui Supabase SQL Editor saat diperlukan.

begin;

lock table public.sales, public.sale_items, public.stock_movements, public.products
  in access exclusive mode;

truncate table public.sale_items, public.stock_movements, public.sales;

update public.products
set stock_quantity = 0;

alter sequence public.sale_number_seq restart with 1;

commit;

select
  (select count(*) from public.products) as produk_tetap_tersimpan,
  (select coalesce(sum(stock_quantity), 0) from public.products) as total_stok,
  (select count(*) from public.sales) as total_transaksi,
  (select count(*) from public.stock_movements) as total_ledger_stok;
