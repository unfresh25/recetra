begin;
create extension if not exists pgtap with schema extensions;
select plan(8);

insert into auth.users (id, email) values
  ('30000000-0000-0000-0000-00000000000a', 'a@imp.co'),
  ('30000000-0000-0000-0000-00000000000c', 'c@imp.co');
insert into public.households (id, name) values
  ('44444444-4444-4444-4444-444444444444', 'H1'),
  ('55555555-5555-5555-5555-555555555555', 'H2');
insert into public.members (household_id, user_id, display_name, accent_color, role) values
  ('44444444-4444-4444-4444-444444444444', '30000000-0000-0000-0000-00000000000a', 'A', 'coral', 'owner'),
  ('55555555-5555-5555-5555-555555555555', '30000000-0000-0000-0000-00000000000c', 'C', 'coral', 'owner');
insert into public.recipes (id, title, source_platform, source_video_id, meal_types, imported_by_household_id) values
  ('e1000000-0000-0000-0000-000000000001', 'Arroz con todo', 'tiktok', 'x1', '{breakfast}', '44444444-4444-4444-4444-444444444444'),
  ('e1000000-0000-0000-0000-000000000002', 'Changua', 'youtube', 'x2', '{breakfast}', '44444444-4444-4444-4444-444444444444');

create function pg_temp.login(p_user uuid) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', p_user, 'role', 'authenticated')::text, true);
$$;
set local role authenticated;

select pg_temp.login('30000000-0000-0000-0000-00000000000c');
select throws_ok(
  $$ select public.review_recipe('e1000000-0000-0000-0000-000000000001', true) $$,
  'P0001', 'recipe_not_found', 'other households cannot review a draft');

select pg_temp.login('30000000-0000-0000-0000-00000000000a');
select lives_ok(
  $$ select public.review_recipe('e1000000-0000-0000-0000-000000000001', true, '{lunch}') $$,
  'A approves its import and fixes the meal type');
select is(
  (select meal_types::text[] from public.recipes where id = 'e1000000-0000-0000-0000-000000000001'),
  array['lunch'], 'meal type corrected to lunch');
select is(
  (select status::text from public.recipes where id = 'e1000000-0000-0000-0000-000000000001'),
  'approved', 'recipe approved');
select throws_ok(
  $$ select public.review_recipe('e1000000-0000-0000-0000-000000000001', false) $$,
  'P0001', 'recipe_already_reviewed', 'cannot review twice');
select throws_ok(
  $$ select public.review_recipe('e1000000-0000-0000-0000-000000000002', true, '{}') $$,
  'P0001', 'meal_types_required', 'approval needs a meal type');
select lives_ok(
  $$ select public.review_recipe('e1000000-0000-0000-0000-000000000002', false) $$,
  'A rejects the other draft');

select pg_temp.login('30000000-0000-0000-0000-00000000000c');
select is(
  (select count(*)::int from public.recipes where id = 'e1000000-0000-0000-0000-000000000001'),
  1, 'approved public recipe now visible to other households');

select * from finish();
rollback;
