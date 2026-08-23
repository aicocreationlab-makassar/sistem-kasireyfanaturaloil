-- Dedicated, positive-quantity stock decrease RPC.
-- The product update and audit ledger insert are committed atomically.

create or replace function public.decrease_stock(
  p_product_id uuid,
  p_quantity integer,
  p_reason text
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_before integer;
  v_after integer;
begin
  perform public.require_admin();

  if p_product_id is null then
    raise exception 'Produk wajib dipilih' using errcode = '22023';
  end if;
  if p_quantity is null or p_quantity <= 0 then
    raise exception 'Jumlah pengurangan harus lebih dari 0' using errcode = '22023';
  end if;
  if length(trim(coalesce(p_reason, ''))) < 3 then
    raise exception 'Alasan pengurangan minimal 3 karakter' using errcode = '22023';
  end if;

  select product.stock_quantity
  into v_before
  from public.products as product
  where product.id = p_product_id
  for update;

  if not found then
    raise exception 'Produk tidak ditemukan' using errcode = 'P0002';
  end if;
  if p_quantity > v_before then
    raise exception 'Stok tidak mencukupi. Stok tersedia: %', v_before using errcode = '23514';
  end if;

  v_after := v_before - p_quantity;

  update public.products
  set stock_quantity = v_after
  where id = p_product_id;

  insert into public.stock_movements(
    product_id,
    movement_type,
    quantity_change,
    stock_before,
    stock_after,
    reference_note,
    created_by
  ) values (
    p_product_id,
    'adjustment_out',
    -p_quantity,
    v_before,
    v_after,
    trim(p_reason),
    auth.uid()
  );

  return v_after;
end;
$$;

revoke execute on function public.decrease_stock(uuid, integer, text) from public, anon;
grant execute on function public.decrease_stock(uuid, integer, text) to authenticated;

comment on function public.decrease_stock(uuid, integer, text)
  is 'Atomically subtracts a positive quantity and records an adjustment_out ledger entry.';

notify pgrst, 'reload schema';
