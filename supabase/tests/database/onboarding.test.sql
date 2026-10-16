begin;
create extension if not exists pgtap with schema extensions;
select plan(10);

insert into auth.users (id, email) values
  ('20000000-0000-0000-0000-00000000000a', 'a@onb.co'),
  ('20000000-0000-0000-0000-00000000000b', 'b@onb.co');

insert into public.households (id, name) values ('33333333-3333-3333-3333-333333333333', 'H');
insert into public.members (id, household_id, user_id, display_name, accent_color, role) values
  ('a1000000-0000-0000-0000-00000000000a', '33333333-3333-3333-3333-333333333333', '20000000-0000-0000-0000-00000000000a', 'A', 'coral', 'owner'),
  ('b1000000-0000-0000-0000-00000000000b', '33333333-3333-3333-3333-333333333333', '20000000-0000-0000-0000-00000000000b', 'B', 'teal', 'member');

create function pg_temp.login(p_user uuid) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', p_user, 'role', 'authenticated')::text, true);
$$;

set local role authenticated;
select pg_temp.login('20000000-0000-0000-0000-00000000000a');

-- Stores
select lives_ok(
  $$ select public.replace_household_stores(array(select id from public.stores where slug in ('d1', 'olimpica', 'ara'))) $$,
  'A selects three stores');
select is((select count(*)::int from public.household_stores), 3, 'three stores saved');
select lives_ok(
  $$ select public.replace_household_stores(array(select id from public.stores where slug in ('d1', 'exito'))) $$,
  'A replaces the selection');
select is(
  (select array_agg(s.slug order by s.slug) from public.household_stores hs join public.stores s on s.id = hs.store_id),
  array['d1', 'exito'], 'selection replaced, not appended');
select throws_ok($$ select public.replace_household_stores('{}') $$, 'P0001', 'stores_required', 'at least one store');

-- Restrictions
select lives_ok(
  $$ select public.replace_my_restrictions('dislike',
       p_ingredient_ids => array(select id from public.ingredients where slug = 'cilantro'),
       p_categories => '{seafood}') $$,
  'A dislikes cilantro and seafood');
select is((select count(*)::int from public.restrictions where kind = 'dislike'), 2, 'two dislikes saved');
select lives_ok($$ select public.replace_my_restrictions('dislike') $$, 'clearing dislikes works');
select is((select count(*)::int from public.restrictions where kind = 'dislike'), 0, 'dislikes cleared');

-- Members can mark themselves onboarded but not others.
select pg_temp.login('20000000-0000-0000-0000-00000000000b');
update public.members set onboarded_at = now() where id = 'a1000000-0000-0000-0000-00000000000a';
select is((select onboarded_at from public.members where id = 'a1000000-0000-0000-0000-00000000000a'), null, 'B cannot mark A as onboarded');

select * from finish();
rollback;
