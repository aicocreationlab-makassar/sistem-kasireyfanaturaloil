-- Owner-only permanent product deletion while preserving immutable sale snapshots.

alter table public.sale_items
  drop constraint if exists sale_items_product_id_fkey;

alter table public.sale_items
  alter column product_id drop not null;

alter table public.sale_items
  add constraint sale_items_product_id_fkey
  foreign key (product_id) references public.products(id) on delete set null;

create or replace function public.delete_product(p_product_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_image_url text;
begin
  if public.current_role() is distinct from 'owner'::public.user_role then
    raise exception 'Hanya owner yang dapat menghapus produk permanen' using errcode = '42501';
  end if;

  select product.image_url
  into v_image_url
  from public.products as product
  where product.id = p_product_id
  for update;

  if not found then
    raise exception 'Produk tidak ditemukan' using errcode = 'P0002';
  end if;

  -- Inventory history belongs to the deleted catalog item. Sale item snapshots
  -- remain authoritative and their product_id becomes null through the FK.
  delete from public.stock_movements where product_id = p_product_id;
  delete from public.products where id = p_product_id;

  return v_image_url;
end;
$$;

-- A historical sale may still be voided after its catalog product is gone.
-- Existing products are restored as usual; deleted products have no stock row
-- to restore, so the immutable sale is simply marked voided.
create or replace function public.void_sale(p_sale_id uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sale public.sales%rowtype;
  v_item record;
  v_product public.products%rowtype;
begin
  perform public.require_admin();
  if length(trim(coalesce(p_reason, ''))) < 3 then raise exception 'Alasan void wajib diisi'; end if;

  select * into v_sale from public.sales where id = p_sale_id for update;
  if not found then raise exception 'Transaksi tidak ditemukan'; end if;
  if v_sale.status = 'voided' then raise exception 'Transaksi sudah dibatalkan'; end if;

  for v_item in
    select product_id, quantity
    from public.sale_items
    where sale_id = p_sale_id and product_id is not null
    order by product_id
  loop
    select * into v_product from public.products where id = v_item.product_id for update;
    if found then
      update public.products
      set stock_quantity = stock_quantity + v_item.quantity
      where id = v_item.product_id;

      insert into public.stock_movements(product_id,movement_type,quantity_change,stock_before,stock_after,sale_id,reference_note,created_by)
      values(v_item.product_id,'return',v_item.quantity,v_product.stock_quantity,v_product.stock_quantity+v_item.quantity,p_sale_id,'Void '||v_sale.transaction_code||': '||trim(p_reason),auth.uid());
    end if;
  end loop;

  update public.sales
  set status = 'voided', void_reason = trim(p_reason), voided_by = auth.uid(), voided_at = now()
  where id = p_sale_id;
end;
$$;

revoke execute on function public.delete_product(uuid) from public, anon, authenticated;
grant execute on function public.delete_product(uuid) to authenticated;

drop policy if exists product_images_admin_delete on storage.objects;
create policy product_images_admin_delete on storage.objects
for delete to authenticated
using (
  bucket_id = 'product-images'
  and (select public.current_role()) in ('owner', 'admin')
);

comment on function public.delete_product(uuid)
  is 'Owner-only catalog deletion. Removes product and stock ledger while retaining immutable sale snapshots.';

comment on function public.void_sale(uuid, text)
  is 'Voids a sale and restores stock only for catalog products that still exist.';

notify pgrst, 'reload schema';
