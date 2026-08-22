-- Run with `supabase test db` in a linked/local Supabase environment.
begin;
select plan(8);
select has_table('public','products','products exists');
select has_table('public','sales','sales exists');
select has_table('public','sale_items','sale items exists');
select has_table('public','stock_movements','stock ledger exists');
select has_function('public','create_sale',array['jsonb','text','text','uuid'],'atomic sale RPC exists');
select has_function('public','add_stock',array['uuid','integer','text','numeric','boolean'],'stock-in RPC exists');
select has_function('public','adjust_stock',array['uuid','integer','text'],'adjustment RPC exists');
select has_function('public','void_sale',array['uuid','text'],'void RPC exists');
select * from finish();
rollback;
