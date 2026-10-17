begin;
create extension if not exists pgtap with schema extensions;
select plan(8);

insert into auth.users (id, email) values
  ('40000000-0000-0000-0000-00000000000a', 'a@branches.co'),
  ('40000000-0000-0000-0000-00000000000c', 'c@branches.co');
insert into public.households (id, name) values
  ('41111111-1111-1111-1111-111111111111', 'H1'),
  ('42222222-2222-2222-2222-222222222222', 'H2');
insert into public.members (id, household_id, user_id, display_name, accent_color, role) values
  ('4a000000-0000-0000-0000-00000000000a', '41111111-1111-1111-1111-111111111111', '40000000-0000-0000-0000-00000000000a', 'A', 'coral', 'owner'),
  ('4c000000-0000-0000-0000-00000000000c', '42222222-2222-2222-2222-222222222222', '40000000-0000-0000-0000-00000000000c', 'C', 'coral', 'owner');
insert into public.branches (store_id, name, lat, lng, source, osm_id)
select id, 'Olímpica Calle 72', 11.0, -74.8, 'osm', 'node/1' from public.stores where slug = 'olimpica';

create function pg_temp.login(p_user uuid) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', p_user, 'role', 'authenticated')::text, true);
$$;

set local role authenticated;
select pg_temp.login('40000000-0000-0000-0000-00000000000a');
select is((select count(*)::int from public.branches where osm_id = 'node/1'), 1, 'OSM branches are readable');
select throws_ok(
  $$ insert into public.branches (store_id, name, lat, lng, source, osm_id) select id, 'X', 1, 1, 'osm', 'node/2' from public.stores limit 1 $$,
  '42501', null, 'users cannot write branches directly');
select lives_ok(
  $$ select public.add_branch((select id from public.stores where slug = 'ara'), ' Ara de mi barrio ', 11.01, -74.81) $$,
  'A adds a manual branch');
select is((select name from public.branches where source = 'manual'), 'Ara de mi barrio', 'the manual branch is trimmed and readable');

select pg_temp.login('40000000-0000-0000-0000-00000000000c');
select is((select count(*)::int from public.branches where source = 'manual'), 0, 'other households do not see it');
select throws_ok(
  format('select public.remove_branch(%L)', (select id from public.branches where name = 'Olímpica Calle 72')),
  'P0002', null, 'OSM branches cannot be removed');

select pg_temp.login('40000000-0000-0000-0000-00000000000a');
select lives_ok(
  format('select public.remove_branch(%L)', (select id from public.branches where source = 'manual')),
  'A removes its own branch');
select is((select count(*)::int from public.branches where source = 'manual'), 0, 'the branch is gone');

select * from finish();
rollback;
