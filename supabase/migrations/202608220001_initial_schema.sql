-- EYFA Natural Oil POS: authoritative schema, audit ledger, RLS, and atomic RPCs.
create extension if not exists pgcrypto;

create type public.user_role as enum ('owner', 'admin', 'cashier');
create type public.barcode_kind as enum ('qr', 'ean13', 'ean8', 'code128', 'custom');
create type public.sale_status as enum ('completed', 'voided');
create type public.stock_movement_kind as enum ('sale', 'stock_in', 'adjustment_in', 'adjustment_out', 'return', 'initial');
create type public.payment_kind as enum ('cash', 'transfer', 'qris', 'other');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  role public.user_role not null default 'cashier',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) > 0),
  variant text not null check (variant in ('Murni', 'Bakar', 'Hitam')),
  size_ml integer not null check (size_ml > 0),
  sku text not null unique,
  barcode_value text unique,
  barcode_type public.barcode_kind,
  selling_price numeric(14,2) not null check (selling_price >= 0),
  hpp numeric(14,2) check (hpp is null or hpp >= 0),
  stock_quantity integer not null default 0 check (stock_quantity >= 0),
  low_stock_threshold integer not null default 5 check (low_stock_threshold >= 0),
  image_url text not null default '',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint barcode_consistency check ((barcode_value is null and barcode_type is null) or (barcode_value is not null and barcode_type is not null))
);

create sequence public.sale_number_seq;

create table public.sales (
  id uuid primary key default gen_random_uuid(),
  transaction_code text not null unique,
  cashier_id uuid not null references public.profiles(id),
  idempotency_key uuid not null unique,
  payment_method public.payment_kind,
  subtotal numeric(14,2) not null check (subtotal >= 0),
  total_amount numeric(14,2) not null check (total_amount >= 0),
  total_cogs numeric(14,2),
  gross_profit numeric(14,2),
  status public.sale_status not null default 'completed',
  note text,
  void_reason text,
  voided_by uuid references public.profiles(id),
  voided_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.sale_items (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid not null references public.sales(id),
  product_id uuid not null references public.products(id),
  product_name_snapshot text not null,
  sku_snapshot text not null,
  variant_snapshot text not null,
  size_ml_snapshot integer not null,
  quantity integer not null check (quantity > 0),
  unit_selling_price numeric(14,2) not null check (unit_selling_price >= 0),
  unit_hpp numeric(14,2),
  line_revenue numeric(14,2) not null check (line_revenue >= 0),
  line_cogs numeric(14,2),
  line_gross_profit numeric(14,2),
  created_at timestamptz not null default now()
);

create table public.stock_movements (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id),
  movement_type public.stock_movement_kind not null,
  quantity_change integer not null check (quantity_change <> 0),
  stock_before integer not null check (stock_before >= 0),
  stock_after integer not null check (stock_after >= 0),
  sale_id uuid references public.sales(id),
  reference_note text,
  unit_cost numeric(14,2) check (unit_cost is null or unit_cost >= 0),
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);

create index products_barcode_idx on public.products(barcode_value) where barcode_value is not null;
create index products_sku_idx on public.products(sku);
create index products_active_idx on public.products(is_active);
create index sales_created_idx on public.sales(created_at desc);
create index sales_status_created_idx on public.sales(status, created_at desc);
create index sales_cashier_created_idx on public.sales(cashier_id, created_at desc);
create index sale_items_sale_idx on public.sale_items(sale_id);
create index sale_items_product_idx on public.sale_items(product_id);
create index stock_movements_product_created_idx on public.stock_movements(product_id, created_at desc);

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$ begin new.updated_at = now(); return new; end $$;
create trigger profiles_touch before update on public.profiles for each row execute function public.touch_updated_at();
create trigger products_touch before update on public.products for each row execute function public.touch_updated_at();

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)));
  return new;
end $$;
create trigger auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

create or replace function public.current_role()
returns public.user_role language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid() and is_active = true
$$;

create or replace function public.require_admin()
returns void language plpgsql stable security definer set search_path = public as $$
begin
  if coalesce(public.current_role() in ('owner', 'admin'), false) = false then
    raise exception 'Akses hanya untuk owner/admin' using errcode = '42501';
  end if;
end $$;

alter table public.profiles enable row level security;
alter table public.products enable row level security;
alter table public.sales enable row level security;
alter table public.sale_items enable row level security;
alter table public.stock_movements enable row level security;

create policy profiles_self_read on public.profiles for select to authenticated using (id = auth.uid() or public.current_role() in ('owner','admin'));
create policy products_read on public.products for select to authenticated using (is_active or public.current_role() in ('owner','admin'));
create policy sales_read on public.sales for select to authenticated using (public.current_role() in ('owner','admin') or cashier_id = auth.uid());
create policy sale_items_read on public.sale_items for select to authenticated using (
  exists (select 1 from public.sales s where s.id = sale_id and (public.current_role() in ('owner','admin') or s.cashier_id = auth.uid()))
);
create policy stock_movements_admin_read on public.stock_movements for select to authenticated using (public.current_role() in ('owner','admin'));

-- Table writes are intentionally withheld; all mutations go through validated RPCs.
revoke insert, update, delete on public.profiles, public.products, public.sales, public.sale_items, public.stock_movements from anon, authenticated;
grant select on public.profiles, public.products, public.sales, public.sale_items, public.stock_movements to authenticated;

create or replace function public.create_product(
  p_name text, p_variant text, p_size_ml integer, p_sku text, p_selling_price numeric,
  p_hpp numeric default null, p_initial_stock integer default 0, p_low_stock_threshold integer default 5,
  p_image_url text default '', p_barcode_value text default null, p_barcode_type text default null
) returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid; v_barcode_kind public.barcode_kind;
begin
  perform public.require_admin();
  if p_initial_stock < 0 then raise exception 'Stok awal tidak boleh negatif'; end if;
  if p_barcode_value is not null then v_barcode_kind := coalesce(p_barcode_type, 'custom')::public.barcode_kind; end if;
  insert into public.products(name, variant, size_ml, sku, selling_price, hpp, stock_quantity, low_stock_threshold, image_url, barcode_value, barcode_type)
  values (trim(p_name), initcap(trim(p_variant)), p_size_ml, upper(trim(p_sku)), p_selling_price, p_hpp, p_initial_stock, p_low_stock_threshold, p_image_url, nullif(trim(p_barcode_value), ''), v_barcode_kind)
  returning id into v_id;
  if p_initial_stock > 0 then
    insert into public.stock_movements(product_id, movement_type, quantity_change, stock_before, stock_after, reference_note, created_by)
    values (v_id, 'initial', p_initial_stock, 0, p_initial_stock, 'Stok awal produk', auth.uid());
  end if;
  return v_id;
exception when unique_violation then
  raise exception 'SKU atau barcode sudah digunakan oleh produk lain' using errcode = '23505';
end $$;

create or replace function public.update_product(
  p_id uuid, p_name text, p_variant text, p_size_ml integer, p_sku text, p_selling_price numeric,
  p_hpp numeric, p_low_stock_threshold integer, p_image_url text, p_barcode_value text, p_barcode_type text
) returns void language plpgsql security definer set search_path = public as $$
begin
  perform public.require_admin();
  update public.products set name=trim(p_name), variant=initcap(trim(p_variant)), size_ml=p_size_ml,
    sku=upper(trim(p_sku)), selling_price=p_selling_price, hpp=p_hpp,
    low_stock_threshold=p_low_stock_threshold, image_url=p_image_url,
    barcode_value=nullif(trim(p_barcode_value), ''),
    barcode_type=case when nullif(trim(p_barcode_value), '') is null then null else coalesce(p_barcode_type, 'custom')::public.barcode_kind end
  where id=p_id;
  if not found then raise exception 'Produk tidak ditemukan'; end if;
exception when unique_violation then
  raise exception 'SKU atau barcode sudah digunakan oleh produk lain' using errcode = '23505';
end $$;

create or replace function public.archive_product(p_product_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform public.require_admin();
  update public.products set is_active=false where id=p_product_id and is_active=true;
  if not found then raise exception 'Produk tidak ditemukan atau sudah diarsipkan'; end if;
end $$;

create or replace function public.restore_product(p_product_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform public.require_admin();
  update public.products set is_active=true where id=p_product_id and is_active=false;
  if not found then raise exception 'Produk tidak ditemukan atau sudah aktif'; end if;
end $$;

create or replace function public.add_stock(p_product_id uuid, p_quantity integer, p_note text default null, p_unit_cost numeric default null, p_update_hpp boolean default false)
returns integer language plpgsql security definer set search_path = public as $$
declare v_before integer; v_after integer;
begin
  perform public.require_admin();
  if p_quantity <= 0 then raise exception 'Jumlah stok masuk harus lebih dari 0'; end if;
  select stock_quantity into v_before from public.products where id=p_product_id for update;
  if not found then raise exception 'Produk tidak ditemukan'; end if;
  v_after := v_before + p_quantity;
  update public.products set stock_quantity=v_after,
    hpp=case when p_update_hpp then coalesce(p_unit_cost, hpp) else hpp end where id=p_product_id;
  insert into public.stock_movements(product_id,movement_type,quantity_change,stock_before,stock_after,reference_note,unit_cost,created_by)
  values(p_product_id,'stock_in',p_quantity,v_before,v_after,p_note,p_unit_cost,auth.uid());
  return v_after;
end $$;

create or replace function public.adjust_stock(p_product_id uuid, p_quantity_change integer, p_reason text)
returns integer language plpgsql security definer set search_path = public as $$
declare v_before integer; v_after integer;
begin
  perform public.require_admin();
  if p_quantity_change = 0 then raise exception 'Penyesuaian tidak boleh nol'; end if;
  if length(trim(coalesce(p_reason,''))) < 3 then raise exception 'Alasan penyesuaian wajib diisi'; end if;
  select stock_quantity into v_before from public.products where id=p_product_id for update;
  if not found then raise exception 'Produk tidak ditemukan'; end if;
  v_after := v_before + p_quantity_change;
  if v_after < 0 then raise exception 'Stok tidak boleh menjadi negatif'; end if;
  update public.products set stock_quantity=v_after where id=p_product_id;
  insert into public.stock_movements(product_id,movement_type,quantity_change,stock_before,stock_after,reference_note,created_by)
  values(p_product_id,case when p_quantity_change>0 then 'adjustment_in' else 'adjustment_out' end,p_quantity_change,v_before,v_after,trim(p_reason),auth.uid());
  return v_after;
end $$;

create or replace function public.create_sale(p_items jsonb, p_payment_method text default 'cash', p_note text default null, p_idempotency_key uuid default gen_random_uuid())
returns table(sale_id uuid, transaction_code text, total numeric) language plpgsql security definer set search_path = public as $$
declare
  v_sale_id uuid; v_code text; v_total numeric(14,2):=0; v_cogs numeric(14,2):=0; v_hpp_complete boolean:=true;
  v_item record; v_product public.products%rowtype; v_existing public.sales%rowtype;
begin
  if auth.uid() is null or public.current_role() is null then raise exception 'Sesi tidak sah' using errcode='42501'; end if;
  if p_idempotency_key is null then raise exception 'Kunci idempotensi wajib diisi'; end if;
  -- Serialize identical retries before checking/locking stock, including truly concurrent taps.
  perform pg_advisory_xact_lock(hashtextextended(p_idempotency_key::text, 0));
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items)=0 then raise exception 'Transaksi harus memiliki produk'; end if;
  if jsonb_array_length(p_items)>50 then raise exception 'Terlalu banyak item dalam satu transaksi'; end if;
  select * into v_existing from public.sales where idempotency_key=p_idempotency_key;
  if found then return query select v_existing.id,v_existing.transaction_code,v_existing.total_amount; return; end if;
  if p_payment_method not in ('cash','transfer','qris','other') then raise exception 'Metode pembayaran tidak valid'; end if;

  v_sale_id:=gen_random_uuid();
  v_code:='EYFA-'||to_char(timezone('Asia/Makassar',now()),'YYMMDD')||'-'||lpad(nextval('public.sale_number_seq')::text,6,'0');
  -- Aggregate duplicate product entries and lock deterministically to avoid deadlocks.
  for v_item in select (e->>'product_id')::uuid product_id, sum((e->>'quantity')::integer)::integer quantity
    from jsonb_array_elements(p_items) e group by (e->>'product_id')::uuid order by (e->>'product_id')::uuid
  loop
    if v_item.quantity<=0 then raise exception 'Jumlah produk harus lebih dari 0'; end if;
    select * into v_product from public.products where id=v_item.product_id for update;
    if not found or not v_product.is_active then raise exception 'Produk tidak ditemukan atau sudah diarsipkan'; end if;
    if v_product.stock_quantity<v_item.quantity then raise exception 'Stok % tersisa %. Kurangi jumlah pembelian.',v_product.name,v_product.stock_quantity; end if;
    v_total:=v_total+(v_product.selling_price*v_item.quantity);
    if v_product.hpp is null then v_hpp_complete:=false; else v_cogs:=v_cogs+(v_product.hpp*v_item.quantity); end if;
  end loop;

  insert into public.sales(id,transaction_code,cashier_id,idempotency_key,payment_method,subtotal,total_amount,total_cogs,gross_profit,note)
  values(v_sale_id,v_code,auth.uid(),p_idempotency_key,p_payment_method::public.payment_kind,v_total,v_total,
    case when v_hpp_complete then v_cogs else null end,case when v_hpp_complete then v_total-v_cogs else null end,nullif(trim(p_note),''));

  for v_item in select (e->>'product_id')::uuid product_id, sum((e->>'quantity')::integer)::integer quantity
    from jsonb_array_elements(p_items) e group by (e->>'product_id')::uuid order by (e->>'product_id')::uuid
  loop
    select * into v_product from public.products where id=v_item.product_id for update;
    insert into public.sale_items(sale_id,product_id,product_name_snapshot,sku_snapshot,variant_snapshot,size_ml_snapshot,quantity,
      unit_selling_price,unit_hpp,line_revenue,line_cogs,line_gross_profit)
    values(v_sale_id,v_product.id,v_product.name,v_product.sku,v_product.variant,v_product.size_ml,v_item.quantity,
      v_product.selling_price,v_product.hpp,v_product.selling_price*v_item.quantity,
      case when v_product.hpp is null then null else v_product.hpp*v_item.quantity end,
      case when v_product.hpp is null then null else (v_product.selling_price-v_product.hpp)*v_item.quantity end);
    update public.products set stock_quantity=stock_quantity-v_item.quantity where id=v_product.id;
    insert into public.stock_movements(product_id,movement_type,quantity_change,stock_before,stock_after,sale_id,reference_note,created_by)
    values(v_product.id,'sale',-v_item.quantity,v_product.stock_quantity,v_product.stock_quantity-v_item.quantity,v_sale_id,v_code,auth.uid());
  end loop;
  return query select v_sale_id,v_code,v_total;
exception when unique_violation then
  select * into v_existing from public.sales where idempotency_key=p_idempotency_key;
  if found then return query select v_existing.id,v_existing.transaction_code,v_existing.total_amount; else raise; end if;
end $$;

create or replace function public.void_sale(p_sale_id uuid, p_reason text)
returns void language plpgsql security definer set search_path = public as $$
declare v_sale public.sales%rowtype; v_item record; v_product public.products%rowtype;
begin
  perform public.require_admin();
  if length(trim(coalesce(p_reason,'')))<3 then raise exception 'Alasan void wajib diisi'; end if;
  select * into v_sale from public.sales where id=p_sale_id for update;
  if not found then raise exception 'Transaksi tidak ditemukan'; end if;
  if v_sale.status='voided' then raise exception 'Transaksi sudah dibatalkan'; end if;
  for v_item in select product_id,quantity from public.sale_items where sale_id=p_sale_id order by product_id loop
    select * into v_product from public.products where id=v_item.product_id for update;
    update public.products set stock_quantity=stock_quantity+v_item.quantity where id=v_item.product_id;
    insert into public.stock_movements(product_id,movement_type,quantity_change,stock_before,stock_after,sale_id,reference_note,created_by)
    values(v_item.product_id,'return',v_item.quantity,v_product.stock_quantity,v_product.stock_quantity+v_item.quantity,p_sale_id,'Void '||v_sale.transaction_code||': '||trim(p_reason),auth.uid());
  end loop;
  update public.sales set status='voided',void_reason=trim(p_reason),voided_by=auth.uid(),voided_at=now() where id=p_sale_id;
end $$;

revoke execute on function public.current_role() from public, anon;
revoke execute on function public.create_product(text,text,integer,text,numeric,numeric,integer,integer,text,text,text) from public, anon;
revoke execute on function public.update_product(uuid,text,text,integer,text,numeric,numeric,integer,text,text,text) from public, anon;
revoke execute on function public.archive_product(uuid), public.restore_product(uuid), public.add_stock(uuid,integer,text,numeric,boolean), public.adjust_stock(uuid,integer,text), public.create_sale(jsonb,text,text,uuid), public.void_sale(uuid,text) from public, anon;
grant execute on function public.current_role() to authenticated;
grant execute on function public.create_product(text,text,integer,text,numeric,numeric,integer,integer,text,text,text) to authenticated;
grant execute on function public.update_product(uuid,text,text,integer,text,numeric,numeric,integer,text,text,text) to authenticated;
grant execute on function public.archive_product(uuid), public.restore_product(uuid), public.add_stock(uuid,integer,text,numeric,boolean), public.adjust_stock(uuid,integer,text), public.create_sale(jsonb,text,text,uuid), public.void_sale(uuid,text) to authenticated;

-- Selective realtime publications for operational screens.
alter publication supabase_realtime add table public.products;
alter publication supabase_realtime add table public.sales;

-- Product image uploads are restricted to admins; public read keeps next/image simple.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('product-images','product-images',true,5242880,array['image/jpeg','image/png','image/webp'])
on conflict(id) do nothing;
create policy product_images_admin_insert on storage.objects for insert to authenticated
with check(bucket_id='product-images' and public.current_role() in ('owner','admin'));
create policy product_images_admin_update on storage.objects for update to authenticated
using(bucket_id='product-images' and public.current_role() in ('owner','admin'));
create policy product_images_public_read on storage.objects for select using(bucket_id='product-images');
