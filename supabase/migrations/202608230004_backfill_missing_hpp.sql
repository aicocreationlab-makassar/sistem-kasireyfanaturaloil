-- Fill only missing historical HPP snapshots from the matching product's current
-- HPP. Existing snapshots are immutable and are never overwritten.

update public.sale_items as item
set
  unit_hpp = product.hpp,
  line_cogs = product.hpp * item.quantity,
  line_gross_profit = item.line_revenue - (product.hpp * item.quantity)
from public.products as product
where item.product_id = product.id
  and item.unit_hpp is null
  and product.hpp is not null;

update public.sales as sale
set
  total_cogs = totals.total_cogs,
  gross_profit = sale.total_amount - totals.total_cogs
from (
  select item.sale_id, sum(item.line_cogs) as total_cogs
  from public.sale_items as item
  group by item.sale_id
  having bool_and(item.line_cogs is not null)
) as totals
where sale.id = totals.sale_id
  and (sale.total_cogs is null or sale.gross_profit is null);

create or replace function public.backfill_missing_sale_hpp()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.hpp is null then return new; end if;

  with affected as (
    update public.sale_items as item
    set
      unit_hpp = new.hpp,
      line_cogs = new.hpp * item.quantity,
      line_gross_profit = item.line_revenue - (new.hpp * item.quantity)
    where item.product_id = new.id
      and item.unit_hpp is null
    returning item.sale_id
  ), recalculated as (
    select item.sale_id, sum(item.line_cogs) as total_cogs
    from public.sale_items as item
    where item.sale_id in (select affected.sale_id from affected)
    group by item.sale_id
    having bool_and(item.line_cogs is not null)
  )
  update public.sales as sale
  set
    total_cogs = recalculated.total_cogs,
    gross_profit = sale.total_amount - recalculated.total_cogs
  from recalculated
  where sale.id = recalculated.sale_id;

  return new;
end;
$$;

drop trigger if exists products_backfill_missing_sale_hpp on public.products;
create trigger products_backfill_missing_sale_hpp
after update of hpp on public.products
for each row
when (new.hpp is not null)
execute function public.backfill_missing_sale_hpp();

revoke execute on function public.backfill_missing_sale_hpp() from public, anon, authenticated;

notify pgrst, 'reload schema';
