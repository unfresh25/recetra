begin;
create extension if not exists pgtap with schema extensions;
select plan(22);

-- Fixtures: household H1 (users a, b) and H2 (user c).
insert into auth.users (id, email) values
  ('10000000-0000-0000-0000-00000000000a', 'a@cat.co'),
  ('10000000-0000-0000-0000-00000000000b', 'b@cat.co'),
  ('10000000-0000-0000-0000-00000000000c', 'c@cat.co');

insert into public.households (id, name) values
  ('11111111-1111-1111-1111-111111111111', 'H1'),
  ('22222222-2222-2222-2222-222222222222', 'H2');

insert into public.members (id, household_id, user_id, display_name, accent_color, role) values
  ('a0000000-0000-0000-0000-00000000000a', '11111111-1111-1111-1111-111111111111', '10000000-0000-0000-0000-00000000000a', 'A', 'coral', 'owner'),
  ('b0000000-0000-0000-0000-00000000000b', '11111111-1111-1111-1111-111111111111', '10000000-0000-0000-0000-00000000000b', 'B', 'teal', 'member'),
  ('c0000000-0000-0000-0000-00000000000c', '22222222-2222-2222-2222-222222222222', '10000000-0000-0000-0000-00000000000c', 'C', 'coral', 'owner');

insert into public.recipes (id, title, source_platform, source_video_id, meal_types, status, visibility, imported_by_household_id) values
  ('e0000000-0000-0000-0000-000000000001', 'Huevos pericos', 'youtube', 'v1', '{breakfast}', 'approved', 'public', '22222222-2222-2222-2222-222222222222'),
  ('e0000000-0000-0000-0000-000000000002', 'Borrador de H1', 'tiktok', 'v2', '{lunch}', 'pending_review', 'public', '11111111-1111-1111-1111-111111111111'),
  ('e0000000-0000-0000-0000-000000000003', 'Receta de la abuela', 'manual', null, '{dinner}', 'approved', 'household', '11111111-1111-1111-1111-111111111111');

insert into public.recipe_ingredients (recipe_id, position, ingredient_id, quantity, unit)
select 'e0000000-0000-0000-0000-000000000002', 1, id, 2, 'unit' from public.ingredients where slug = 'huevo';

create function pg_temp.login(p_user uuid) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', p_user, 'role', 'authenticated')::text, true);
$$;

set local role authenticated;

-- Catalog reads
select pg_temp.login('10000000-0000-0000-0000-00000000000c');
select ok((select count(*) from public.ingredients) > 150, 'ingredients catalog is readable');
select is((select count(*)::int from public.stores), 9, 'stores are readable');
select is((select count(*)::int from public.recipes), 1, 'C sees only the approved public recipe (its own import)');
select is((select count(*)::int from public.recipe_ingredients), 0, 'C cannot read ingredients of H1 draft');
select throws_ok(
  $$ insert into public.ingredients (slug, name, category, base_unit) values ('x', 'X', 'other', 'g') $$,
  '42501', null, 'users cannot write the ingredient catalog');

select pg_temp.login('10000000-0000-0000-0000-00000000000a');
select is((select count(*)::int from public.recipes), 3, 'A sees public recipes plus own drafts and private recipes');
select is((select count(*)::int from public.recipe_ingredients), 1, 'A reads ingredients of own draft');
update public.recipes set status = 'approved' where id = 'e0000000-0000-0000-0000-000000000002';
select is(
  (select status::text from public.recipes where id = 'e0000000-0000-0000-0000-000000000002'),
  'pending_review', 'users cannot approve recipes directly (RLS filters the update)');

-- Restrictions
select lives_ok(
  $$ insert into public.restrictions (member_id, kind, ingredient_id)
     select 'a0000000-0000-0000-0000-00000000000a', 'dislike', id from public.ingredients where slug = 'cilantro' $$,
  'A adds own dislike (cilantro)');
select throws_ok(
  $$ insert into public.restrictions (member_id, kind, allergen) values ('b0000000-0000-0000-0000-00000000000b', 'allergy', 'shellfish') $$,
  '42501', null, 'A cannot add restrictions for B');
select throws_ok(
  $$ insert into public.restrictions (member_id, kind, allergen, diet) values ('a0000000-0000-0000-0000-00000000000a', 'allergy', 'peanut', 'vegan') $$,
  '23514', null, 'restriction shape is enforced');

select pg_temp.login('10000000-0000-0000-0000-00000000000b');
select lives_ok(
  $$ insert into public.restrictions (member_id, kind, allergen) values ('b0000000-0000-0000-0000-00000000000b', 'allergy', 'shellfish') $$,
  'B adds own shellfish allergy');
select is((select count(*)::int from public.restrictions), 2, 'housemates read each other''s restrictions');

select pg_temp.login('10000000-0000-0000-0000-00000000000c');
select is((select count(*)::int from public.restrictions), 0, 'other households cannot read restrictions');

-- Reactions
select pg_temp.login('10000000-0000-0000-0000-00000000000a');
select lives_ok(
  $$ insert into public.reactions (member_id, recipe_id, kind) values ('a0000000-0000-0000-0000-00000000000a', 'e0000000-0000-0000-0000-000000000001', 'favorite') $$,
  'A favorites a public recipe');
select throws_ok(
  $$ insert into public.reactions (member_id, recipe_id, kind, reason) values ('a0000000-0000-0000-0000-00000000000a', 'e0000000-0000-0000-0000-000000000001', 'favorite', 'too_slow') $$,
  '23514', null, 'reasons only apply to replacements');

select pg_temp.login('10000000-0000-0000-0000-00000000000c');
select is((select count(*)::int from public.reactions), 0, 'other households cannot read reactions');
select throws_ok(
  $$ insert into public.reactions (member_id, recipe_id, kind) values ('c0000000-0000-0000-0000-00000000000c', 'e0000000-0000-0000-0000-000000000003', 'favorite') $$,
  '42501', null, 'cannot react to a recipe you cannot read');

-- Plans and stores
select pg_temp.login('10000000-0000-0000-0000-00000000000a');
select lives_ok(
  $$ insert into public.meal_plans (id, household_id, week_start) values ('f0000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', '2026-10-19') $$,
  'A creates a weekly plan');
select lives_ok(
  $$ insert into public.household_stores (household_id, store_id) select '11111111-1111-1111-1111-111111111111', id from public.stores $$,
  'A selects every store (no limit)');

select pg_temp.login('10000000-0000-0000-0000-00000000000c');
select throws_ok(
  $$ insert into public.plan_meals (meal_plan_id, day, meal_type, servings) values ('f0000000-0000-0000-0000-000000000001', '2026-10-19', 'breakfast', 2) $$,
  '42501', null, 'C cannot add meals to H1 plan');
select is((select count(*)::int from public.household_stores), 0, 'C cannot read H1 stores');

select * from finish();
rollback;
