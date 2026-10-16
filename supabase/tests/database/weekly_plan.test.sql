begin;
create extension if not exists pgtap with schema extensions;
select plan(9);

insert into auth.users (id, email) values
  ('40000000-0000-0000-0000-00000000000a', 'a@plan.co'),
  ('40000000-0000-0000-0000-00000000000c', 'c@plan.co');
insert into public.households (id, name) values
  ('66666666-6666-6666-6666-666666666666', 'H1'),
  ('77777777-7777-7777-7777-777777777777', 'H2');
insert into public.members (id, household_id, user_id, display_name, accent_color, role) values
  ('a4000000-0000-0000-0000-00000000000a', '66666666-6666-6666-6666-666666666666', '40000000-0000-0000-0000-00000000000a', 'A', 'coral', 'owner'),
  ('c4000000-0000-0000-0000-00000000000c', '77777777-7777-7777-7777-777777777777', '40000000-0000-0000-0000-00000000000c', 'C', 'coral', 'owner');
insert into public.recipes (id, title, source_platform, source_video_id, meal_types, status, total_minutes) values
  ('e4000000-0000-0000-0000-000000000001', 'Sancocho', 'youtube', 'p1', '{lunch}', 'approved', 120),
  ('e4000000-0000-0000-0000-000000000002', 'Arroz con pollo', 'youtube', 'p2', '{lunch}', 'approved', 45);

create function pg_temp.login(p_user uuid) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', p_user, 'role', 'authenticated')::text, true);
$$;
set local role authenticated;
select pg_temp.login('40000000-0000-0000-0000-00000000000a');

select lives_ok(
  $$ select public.save_week_plan('2026-10-19', '[
       {"day":"2026-10-19","meal_type":"lunch","recipe_id":"e4000000-0000-0000-0000-000000000001","servings":2},
       {"day":"2026-10-19","meal_type":"dinner","recipe_id":"","servings":2}
     ]') $$,
  'A saves a week plan');
select is((select count(*)::int from public.plan_meals), 2, 'two slots saved, one empty');

select lives_ok(
  $$ select public.save_week_plan('2026-10-19', '[
       {"day":"2026-10-19","meal_type":"lunch","recipe_id":"e4000000-0000-0000-0000-000000000002","servings":2}
     ]') $$,
  'regenerating the same week replaces it');
select is((select count(*)::int from public.plan_meals), 1, 'old slots removed');

select lives_ok(
  $$ select public.replace_plan_meal(
       (select id from public.plan_meals limit 1), 'e4000000-0000-0000-0000-000000000001', 'too_slow') $$,
  'A replaces lunch because it was too slow');
select is((select reason::text from public.reactions where kind = 'replaced'), 'too_slow', 'replacement reason recorded');
select is(
  (select (max_minutes_by_meal_type->>'lunch')::int from public.household_learned_prefs),
  35, 'learned a 35-minute lunch limit (45 - 10)');

select pg_temp.login('40000000-0000-0000-0000-00000000000c');
select throws_ok(
  $$ select public.replace_plan_meal(
       (select pm.id from public.plan_meals pm limit 1), 'e4000000-0000-0000-0000-000000000002', 'dislike') $$,
  'P0001', 'plan_meal_not_found', 'other households cannot touch the plan');
select is((select count(*)::int from public.plan_meals), 0, 'other households cannot read the plan');

select * from finish();
rollback;
