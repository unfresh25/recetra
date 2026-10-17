begin;
create extension if not exists pgtap with schema extensions;
select plan(17);

insert into auth.users (id, email) values
  ('30000000-0000-0000-0000-00000000000a', 'a@prices.co'),
  ('30000000-0000-0000-0000-00000000000c', 'c@prices.co');
insert into public.households (id, name) values
  ('31111111-1111-1111-1111-111111111111', 'H1'),
  ('32222222-2222-2222-2222-222222222222', 'H2');
insert into public.members (id, household_id, user_id, display_name, accent_color, role) values
  ('3a000000-0000-0000-0000-00000000000a', '31111111-1111-1111-1111-111111111111', '30000000-0000-0000-0000-00000000000a', 'A', 'coral', 'owner'),
  ('3c000000-0000-0000-0000-00000000000c', '32222222-2222-2222-2222-222222222222', '30000000-0000-0000-0000-00000000000c', 'C', 'coral', 'owner');

insert into public.products (id, store_id, sku, name, package_qty, package_unit)
select '3f000000-0000-0000-0000-000000000001', id, 'sku-1', 'Arroz 500 g', 500, 'g' from public.stores where slug = 'd1';
insert into public.product_matches (ingredient_id, product_id, confidence, status)
select id, '3f000000-0000-0000-0000-000000000001', 0.9, 'auto' from public.ingredients where slug = 'arroz-blanco';
insert into public.product_matches (ingredient_id, product_id, confidence, status)
select id, '3f000000-0000-0000-0000-000000000001', 0.4, 'rejected' from public.ingredients where slug = 'huevo';
insert into public.prices (product_id, price_cop, captured_at) values
  ('3f000000-0000-0000-0000-000000000001', 2000, now() - interval '2 days'),
  ('3f000000-0000-0000-0000-000000000001', 1800, now());

create function pg_temp.login(p_user uuid) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', p_user, 'role', 'authenticated')::text, true);
$$;

set local role authenticated;
select pg_temp.login('30000000-0000-0000-0000-00000000000a');

select is((select count(*)::int from public.products where sku = 'sku-1'), 1, 'products are readable');
select is((select count(*)::int from public.product_matches where product_id = '3f000000-0000-0000-0000-000000000001'), 1, 'rejected matches are hidden');
select is((select price_cop from public.current_prices where product_id = '3f000000-0000-0000-0000-000000000001'), 1800, 'current_prices returns the latest price');
select throws_ok(
  $$ insert into public.prices (product_id, price_cop) values ('3f000000-0000-0000-0000-000000000001', 1) $$,
  '42501', null, 'users cannot write prices');
select throws_ok(
  $$ insert into public.products (store_id, sku, name, package_qty, package_unit) select id, 'x', 'X', 1, 'g' from public.stores limit 1 $$,
  '42501', null, 'users cannot write products');
select throws_ok(
  $$ insert into public.pinned_brands (household_id, ingredient_id, brand) select '31111111-1111-1111-1111-111111111111', id, 'Diana' from public.ingredients where slug = 'arroz-blanco' $$,
  '42501', null, 'pinned brands are written only through pin_brand');

select lives_ok($$ select public.pin_brand((select id from public.ingredients where slug = 'arroz-blanco'), ' Diana ') $$, 'A pins a brand');
select is((select brand from public.pinned_brands), 'Diana', 'the brand is trimmed and readable by its household');

select pg_temp.login('30000000-0000-0000-0000-00000000000c');
select is((select count(*)::int from public.pinned_brands), 0, 'other households cannot read pinned brands');

select pg_temp.login('30000000-0000-0000-0000-00000000000a');
select lives_ok($$ select public.pin_brand((select id from public.ingredients where slug = 'arroz-blanco'), '') $$, 'an empty brand unpins');
select is((select count(*)::int from public.pinned_brands), 0, 'the pin is gone');

select throws_ok(
  $$ select public.merge_ingredient((select id from public.ingredients where slug = 'huevo'), (select id from public.ingredients where slug = 'arroz-blanco')) $$,
  '42501', null, 'users cannot merge ingredients');

reset role;
insert into public.ingredients (id, slug, name, category, base_unit, status) values
  ('3e000000-0000-0000-0000-000000000001', 'arroz-de-mesa', 'Arroz de mesa', 'grains', 'g', 'pending_review');
insert into public.recipes (id, title, source_platform, source_video_id, meal_types, status) values
  ('3d000000-0000-0000-0000-000000000001', 'Arroz', 'youtube', 'merge-1', '{lunch}', 'approved');
insert into public.recipe_ingredients (recipe_id, position, ingredient_id, quantity, unit) values
  ('3d000000-0000-0000-0000-000000000001', 1, '3e000000-0000-0000-0000-000000000001', 200, 'g');
select public.merge_ingredient('3e000000-0000-0000-0000-000000000001', (select id from public.ingredients where slug = 'arroz-blanco'));
select is(
  (select i.slug from public.recipe_ingredients ri join public.ingredients i on i.id = ri.ingredient_id where ri.recipe_id = '3d000000-0000-0000-0000-000000000001'),
  'arroz-blanco', 'merge points recipe lines at the surviving ingredient');
select is((select count(*)::int from public.ingredients where slug = 'arroz-de-mesa'), 0, 'merge deletes the duplicate');

-- Review of a pending match
insert into public.product_matches (id, ingredient_id, product_id, confidence, status)
select '3b000000-0000-0000-0000-000000000001', id, '3f000000-0000-0000-0000-000000000001', 0.5, 'pending_review' from public.ingredients where slug = 'leche';
set local role authenticated;
select pg_temp.login('30000000-0000-0000-0000-00000000000a');
select lives_ok($$ select public.review_product_match('3b000000-0000-0000-0000-000000000001', true) $$, 'a member confirms a pending match');
select is((select status::text from public.product_matches where id = '3b000000-0000-0000-0000-000000000001'), 'confirmed', 'the match is confirmed');
select throws_ok($$ select public.review_product_match('3b000000-0000-0000-0000-000000000001', false) $$, 'P0002', null, 'only pending matches can be reviewed');

select * from finish();
rollback;
