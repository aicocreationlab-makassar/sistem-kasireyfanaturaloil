-- Behavioural database tests. Run after `supabase start` using `supabase test db`.
begin;
create extension if not exists pgtap with schema extensions;
select plan(16);

insert into auth.users(id, email, encrypted_password, email_confirmed_at, aud, role)
values
  ('11111111-1111-1111-1111-111111111111','owner-test@eyfa.local','',now(),'authenticated','authenticated'),
  ('22222222-2222-2222-2222-222222222222','cashier-test@eyfa.local','',now(),'authenticated','authenticated');
update public.profiles set role='owner', full_name='Owner Test' where id='11111111-1111-1111-1111-111111111111';
update public.profiles set role='cashier', full_name='Cashier Test' where id='22222222-2222-2222-2222-222222222222';

set local role authenticated;
set local request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';

select lives_ok($$
  select public.create_product('Test Murni 60 ml','Murni',60,'TEST-MURNI-60',55000,25000,10,5,'/products/minyak-kemirimurni.png','TEST-QR-1','qr')
$$, 'owner can create product with auditable initial stock');
select is((select stock_quantity from public.products where sku='TEST-MURNI-60'),10,'initial stock is authoritative');
select is((select count(*)::integer from public.stock_movements where movement_type='initial' and product_id=(select id from public.products where sku='TEST-MURNI-60')),1,'initial movement is recorded');

select lives_ok($$
  select * from public.create_sale(
    jsonb_build_array(jsonb_build_object('product_id',(select id from public.products where sku='TEST-MURNI-60'),'quantity',2)),
    'cash','first sale','33333333-3333-3333-3333-333333333333')
$$, 'single-product sale commits');
select is((select stock_quantity from public.products where sku='TEST-MURNI-60'),8,'sale decreases stock');
select is((select count(*)::integer from public.sales where idempotency_key='33333333-3333-3333-3333-333333333333'),1,'sale header created once');
select is((select unit_selling_price from public.sale_items where sale_id=(select id from public.sales where idempotency_key='33333333-3333-3333-3333-333333333333')),55000::numeric,'selling price snapshot retained');
select is((select unit_hpp from public.sale_items where sale_id=(select id from public.sales where idempotency_key='33333333-3333-3333-3333-333333333333')),25000::numeric,'HPP snapshot retained');

select lives_ok($$
  select * from public.create_sale(
    jsonb_build_array(jsonb_build_object('product_id',(select id from public.products where sku='TEST-MURNI-60'),'quantity',2)),
    'cash','retry','33333333-3333-3333-3333-333333333333')
$$, 'idempotent retry returns existing sale');
select is((select stock_quantity from public.products where sku='TEST-MURNI-60'),8,'idempotent retry does not decrease stock twice');

select public.update_product((select id from public.products where sku='TEST-MURNI-60'),'Test Murni 60 ml','Murni',60,'TEST-MURNI-60',70000,30000,5,'/products/minyak-kemirimurni.png','TEST-QR-1','qr');
select is((select unit_selling_price from public.sale_items where sale_id=(select id from public.sales where idempotency_key='33333333-3333-3333-3333-333333333333')),55000::numeric,'current price change does not alter history');
select is((select unit_hpp from public.sale_items where sale_id=(select id from public.sales where idempotency_key='33333333-3333-3333-3333-333333333333')),25000::numeric,'current HPP change does not alter history');

select throws_ok($$
  select * from public.create_sale(
    jsonb_build_array(jsonb_build_object('product_id',(select id from public.products where sku='TEST-MURNI-60'),'quantity',99)),
    'cash',null,'44444444-4444-4444-4444-444444444444')
$$,'P0001',null,'insufficient stock is rejected');

select public.void_sale((select id from public.sales where idempotency_key='33333333-3333-3333-3333-333333333333'),'Kasir salah input');
select is((select stock_quantity from public.products where sku='TEST-MURNI-60'),10,'void restores stock exactly once');
select is((select status::text from public.sales where idempotency_key='33333333-3333-3333-3333-333333333333'),'voided','void preserves and marks sale');
select throws_ok($$select public.void_sale((select id from public.sales where idempotency_key='33333333-3333-3333-3333-333333333333'),'Ulang')$$,'P0001',null,'double void is rejected');

set local request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
select throws_ok($$select public.adjust_stock((select id from public.products where sku='TEST-MURNI-60'),1,'cashier attempt')$$,'42501',null,'cashier cannot adjust stock');

select * from finish();
rollback;
