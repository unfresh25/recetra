begin;
create extension if not exists pgtap with schema extensions;
select no_plan();

insert into auth.users (id, email) values
  ('41000000-0000-0000-0000-00000000000a', 'a@manual.co'),
  ('41000000-0000-0000-0000-00000000000b', 'b@manual.co'),
  ('41000000-0000-0000-0000-00000000000c', 'c@manual.co');
insert into public.households (id, name) values
  ('61000000-0000-0000-0000-000000000001', 'Manual A'),
  ('61000000-0000-0000-0000-000000000002', 'Manual B');
insert into public.members (household_id, user_id, display_name, accent_color, role) values
  ('61000000-0000-0000-0000-000000000001', '41000000-0000-0000-0000-00000000000a', 'A', 'coral', 'owner'),
  ('61000000-0000-0000-0000-000000000002', '41000000-0000-0000-0000-00000000000b', 'B', 'coral', 'owner');
insert into public.recipes (id, title, source_platform, source_video_id, meal_types, status) values
  ('e4100000-0000-0000-0000-000000000001', 'Elegida', 'youtube', 'manual1', '{breakfast,lunch,dinner}', 'approved'),
  ('e4100000-0000-0000-0000-000000000002', 'Sugerida', 'youtube', 'manual2', '{breakfast,lunch,dinner}', 'approved');

create function pg_temp.login(p_user uuid) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', p_user, 'role', 'authenticated')::text, true);
$$;
set local role authenticated;
select pg_temp.login('41000000-0000-0000-0000-00000000000a');
select lives_ok($$ select public.ensure_week_plan('2026-10-26', 3::smallint) $$, 'ensure creates the week');
select set_config('test.manual_plan', public.ensure_week_plan('2026-10-26', 3::smallint)::text, true);
select is((select count(*)::int from public.plan_meals), 21, 'exactly 21 empty slots');
select is((select count(*)::int from public.plan_meals where recipe_id is null and adjustments = '{}' and status = 'planned' and servings = 3), 21, 'all slots start empty with household servings');
select is(public.ensure_week_plan('2026-10-26', 2::smallint)::text, current_setting('test.manual_plan'), 'ensure is idempotent and returns the same ID');
select is((select count(*)::int from public.plan_meals), 21, 'ensure does not duplicate slots');
select is((select min(servings)::int from public.plan_meals), 3, 'ensure does not change existing servings');
select throws_ok($$ select public.ensure_week_plan('2026-10-27', 2::smallint) $$, 'P0001', 'week_start_must_be_monday', 'non-Monday ensure rejected');
select throws_ok($$ select public.fill_empty_plan_meals('2026-10-27', '[]') $$, 'P0001', 'week_start_must_be_monday', 'non-Monday fill rejected');

select public.replace_plan_meal((select id from public.plan_meals where day = '2026-10-26' and meal_type = 'breakfast'), 'e4100000-0000-0000-0000-000000000001', null, '{"removed":[]}');
select lives_ok($$ select public.clear_plan_meal((select id from public.plan_meals where day = '2026-10-26' and meal_type = 'breakfast')) $$, 'clear succeeds');
select ok((select recipe_id is null and adjustments = '{}' and status = 'planned' from public.plan_meals where day = '2026-10-26' and meal_type = 'breakfast'), 'clear resets the slot');
select public.replace_plan_meal((select id from public.plan_meals where day = '2026-10-26' and meal_type = 'breakfast'), 'e4100000-0000-0000-0000-000000000001', null, '{"removed":[]}');
select public.replace_plan_meal((select id from public.plan_meals where day = '2026-10-26' and meal_type = 'lunch'), 'e4100000-0000-0000-0000-000000000001', null);
update public.plan_meals set status = 'cooked' where day = '2026-10-26' and meal_type = 'lunch';
select set_config('test.manual_meal', (select id::text from public.plan_meals where day = '2026-10-26' and meal_type = 'breakfast'), true);
select throws_ok($$ select public.clear_plan_meal((select id from public.plan_meals where day = '2026-10-26' and meal_type = 'lunch')) $$, 'P0001', 'meal_already_cooked', 'clear refuses a cooked meal');

select lives_ok($$ select public.fill_empty_plan_meals('2026-10-26', '[
  {"day":"2026-10-26","meal_type":"breakfast","recipe_id":"e4100000-0000-0000-0000-000000000002","servings":2},
  {"day":"2026-10-26","meal_type":"lunch","recipe_id":"e4100000-0000-0000-0000-000000000002","servings":2},
  {"day":"2026-10-26","meal_type":"dinner","recipe_id":"e4100000-0000-0000-0000-000000000002","servings":2},
  {"day":"2026-10-27","meal_type":"dinner","recipe_id":"","servings":2,"adjustments":{"empty_reason":"Sin opciones"}}
]') $$, 'fill accepts a generated batch');
select is((select recipe_id::text from public.plan_meals where day = '2026-10-26' and meal_type = 'breakfast'), 'e4100000-0000-0000-0000-000000000001', 'fill preserves a placed recipe');
select ok((select adjustments = '{"removed":[]}' and servings = 3 from public.plan_meals where day = '2026-10-26' and meal_type = 'breakfast'), 'fill preserves placed adjustments and servings');
select ok((select recipe_id = 'e4100000-0000-0000-0000-000000000001' and status = 'cooked' from public.plan_meals where day = '2026-10-26' and meal_type = 'lunch'), 'fill preserves a cooked recipe and its status');
select is((select recipe_id::text from public.plan_meals where day = '2026-10-26' and meal_type = 'dinner'), 'e4100000-0000-0000-0000-000000000002', 'fill populates an empty slot');
select is((select adjustments->>'empty_reason' from public.plan_meals where day = '2026-10-27' and meal_type = 'dinner'), 'Sin opciones', 'unfillable slots retain the reason');
update public.plan_meals set status = 'cooked' where day = '2026-10-28' and meal_type = 'dinner';
select public.fill_empty_plan_meals('2026-10-26', '[{"day":"2026-10-28","meal_type":"dinner","recipe_id":"e4100000-0000-0000-0000-000000000002","servings":2}]');
select ok((select recipe_id is null and status = 'cooked' from public.plan_meals where day = '2026-10-28' and meal_type = 'dinner'), 'even a cooked slot without a recipe is preserved');
select throws_ok($$ select public.fill_empty_plan_meals('2026-10-26', '[{"day":"2026-11-02","meal_type":"dinner","recipe_id":"","servings":2}]') $$, 'P0001', 'day_outside_week', 'fill cannot address a different week');

select pg_temp.login('41000000-0000-0000-0000-00000000000b');
select throws_ok($$ select public.clear_plan_meal(current_setting('test.manual_meal')::uuid) $$, 'P0001', 'plan_meal_not_found', 'another household cannot clear A');
select isnt(public.ensure_week_plan('2026-10-26', 2::smallint)::text, current_setting('test.manual_plan'), 'another household can only ensure its own week');
select public.fill_empty_plan_meals('2026-10-26', '[{"day":"2026-10-26","meal_type":"breakfast","recipe_id":"e4100000-0000-0000-0000-000000000002","servings":2}]');
select is((select count(*)::int from public.meal_plans where id::text = current_setting('test.manual_plan')), 0, 'B cannot read A plan');
select pg_temp.login('41000000-0000-0000-0000-00000000000a');
select is((select recipe_id::text from public.plan_meals where id::text = current_setting('test.manual_meal')), 'e4100000-0000-0000-0000-000000000001', 'B fill did not change A recipe');

select pg_temp.login('41000000-0000-0000-0000-00000000000c');
select throws_ok($$ select public.ensure_week_plan('2026-10-26', 2::smallint) $$, 'P0001', 'not_in_household', 'non-member cannot ensure a week');
select throws_ok($$ select public.fill_empty_plan_meals('2026-10-26', '[]') $$, 'P0001', 'not_in_household', 'non-member cannot fill a week');
select throws_ok($$ select public.clear_plan_meal(current_setting('test.manual_meal')::uuid) $$, 'P0001', 'plan_meal_not_found', 'non-member cannot clear a slot');

select * from finish();
rollback;
