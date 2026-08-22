-- Faster RLS evaluation plus persisted cash tender/change for re-printable receipts.

alter table public.sales
  add column amount_received numeric(14,2),
  add column change_amount numeric(14,2),
  add constraint sales_amount_received_nonnegative
    check (amount_received is null or amount_received >= 0),
  add constraint sales_change_amount_nonnegative
    check (change_amount is null or change_amount >= 0),
  add constraint sales_cash_tender_consistency
    check (
      (amount_received is null and change_amount is null)
      or
      (payment_method = 'cash' and amount_received is not null and change_amount is not null)
    );

comment on column public.sales.amount_received is 'Cash tendered by the customer; null for non-cash or legacy sales.';
comment on column public.sales.change_amount is 'Authoritative change computed from amount_received minus the sale total.';

-- Inventory history is read globally by newest-first order.
create index stock_movements_created_idx
  on public.stock_movements(created_at desc);

-- These functions are constant for one statement/user. Wrapping them in SELECT
-- lets Postgres evaluate each once as an initPlan instead of once per row.
drop policy profiles_self_read on public.profiles;
create policy profiles_self_read on public.profiles for select to authenticated
using (
  id = (select auth.uid())
  or (select public.current_role()) in ('owner', 'admin')
);

drop policy products_read on public.products;
create policy products_read on public.products for select to authenticated
using (
  is_active
  or (select public.current_role()) in ('owner', 'admin')
);

drop policy sales_read on public.sales;
create policy sales_read on public.sales for select to authenticated
using (
  (select public.current_role()) in ('owner', 'admin')
  or cashier_id = (select auth.uid())
);

drop policy sale_items_read on public.sale_items;
create policy sale_items_read on public.sale_items for select to authenticated
using (
  exists (
    select 1
    from public.sales s
    where s.id = sale_id
      and (
        (select public.current_role()) in ('owner', 'admin')
        or s.cashier_id = (select auth.uid())
      )
  )
);

drop policy stock_movements_admin_read on public.stock_movements;
create policy stock_movements_admin_read on public.stock_movements for select to authenticated
using ((select public.current_role()) in ('owner', 'admin'));

-- Keep the original create_sale RPC unchanged for backwards compatibility.
-- This wrapper remains one database transaction: if tender validation fails,
-- create_sale and all stock changes are rolled back with it.
create or replace function public.create_sale_with_payment(
  p_items jsonb,
  p_payment_method text default 'cash',
  p_note text default null,
  p_idempotency_key uuid default gen_random_uuid(),
  p_amount_received numeric default null
)
returns table(
  sale_id uuid,
  transaction_code text,
  total numeric,
  amount_received numeric,
  change_amount numeric
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sale_id uuid;
  v_transaction_code text;
  v_total numeric;
  v_requested_payment text := coalesce(p_payment_method, 'cash');
  v_saved_payment text;
  v_saved_received numeric;
  v_saved_change numeric;
begin
  if v_requested_payment not in ('cash', 'transfer', 'qris', 'other') then
    raise exception 'Metode pembayaran tidak valid';
  end if;

  if v_requested_payment = 'cash' then
    if p_amount_received is null then
      raise exception 'Uang diterima wajib diisi untuk pembayaran tunai';
    end if;
    if p_amount_received < 0 then
      raise exception 'Uang diterima tidak boleh negatif';
    end if;
  elsif p_amount_received is not null then
    raise exception 'Uang diterima hanya digunakan untuk pembayaran tunai';
  end if;

  select created.sale_id, created.transaction_code, created.total
  into v_sale_id, v_transaction_code, v_total
  from public.create_sale(
    p_items,
    v_requested_payment,
    p_note,
    p_idempotency_key
  ) as created;

  select s.payment_method::text, s.amount_received, s.change_amount
  into v_saved_payment, v_saved_received, v_saved_change
  from public.sales s
  where s.id = v_sale_id
  for update;

  if v_saved_payment is distinct from v_requested_payment then
    raise exception 'Kunci transaksi telah digunakan dengan metode pembayaran berbeda';
  end if;

  if v_requested_payment = 'cash' then
    if p_amount_received < v_total then
      raise exception 'Uang diterima kurang dari total transaksi';
    end if;
    if v_saved_received is not null and v_saved_received <> p_amount_received then
      raise exception 'Kunci transaksi telah digunakan dengan nominal tunai berbeda';
    end if;

    update public.sales s
    set
      amount_received = p_amount_received,
      change_amount = p_amount_received - v_total
    where s.id = v_sale_id;
  end if;

  return query
  select
    s.id,
    s.transaction_code,
    s.total_amount,
    s.amount_received,
    s.change_amount
  from public.sales s
  where s.id = v_sale_id;
end;
$$;

revoke execute on function public.create_sale_with_payment(jsonb,text,text,uuid,numeric)
  from public, anon;
grant execute on function public.create_sale_with_payment(jsonb,text,text,uuid,numeric)
  to authenticated;

