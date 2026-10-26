begin;
create extension if not exists pgtap with schema extensions;
select plan(15);

insert into auth.users (id, email) values
  ('10000000-0000-0000-0000-00000000000a', 'a@likes.co'),
  ('10000000-0000-0000-0000-00000000000b', 'b@likes.co');
insert into public.households (id, name) values
  ('11111111-1111-1111-1111-111111111111', 'H1'),
  ('22222222-2222-2222-2222-222222222222', 'H2');
insert into public.members (id, household_id, user_id, display_name, accent_color, role) values
  ('a0000000-0000-0000-0000-00000000000a', '11111111-1111-1111-1111-111111111111', '10000000-0000-0000-0000-00000000000a', 'A', 'coral', 'owner'),
  ('b0000000-0000-0000-0000-00000000000b', '22222222-2222-2222-2222-222222222222', '10000000-0000-0000-0000-00000000000b', 'B', 'teal', 'owner');
insert into public.recipes (id, title, source_platform, meal_types, status, visibility, imported_by_household_id) values
  ('e0000000-0000-0000-0000-000000000001', 'Public', 'manual', '{lunch}', 'approved', 'public', null),
  ('e0000000-0000-0000-0000-000000000002', 'Private', 'manual', '{dinner}', 'approved', 'household', '22222222-2222-2222-2222-222222222222'),
  ('e0000000-0000-0000-0000-000000000003', 'No likes', 'manual', '{breakfast}', 'approved', 'public', null);
insert into public.reactions (member_id, recipe_id, kind) values
  ('a0000000-0000-0000-0000-00000000000a', 'e0000000-0000-0000-0000-000000000001', 'favorite'),
  ('b0000000-0000-0000-0000-00000000000b', 'e0000000-0000-0000-0000-000000000001', 'favorite'),
  ('a0000000-0000-0000-0000-00000000000a', 'e0000000-0000-0000-0000-000000000001', 'dislike'),
  ('b0000000-0000-0000-0000-00000000000b', 'e0000000-0000-0000-0000-000000000001', 'veto'),
  ('b0000000-0000-0000-0000-00000000000b', 'e0000000-0000-0000-0000-000000000002', 'favorite'),
  ('a0000000-0000-0000-0000-00000000000a', 'e0000000-0000-0000-0000-000000000003', 'cooked');

create function pg_temp.login(p_user uuid) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', p_user, 'role', 'authenticated')::text, true);
$$;
set local role authenticated;
select pg_temp.login('10000000-0000-0000-0000-00000000000a');
select is((select count(*)::int from public.reactions where kind = 'favorite'), 1, 'raw favorites remain household private');
select is((select likes from public.recipe_like_counts('{e0000000-0000-0000-0000-000000000001}')), 2, 'counts distinct favorites across households, ignoring other kinds');
select is((select count(*)::int from public.recipe_like_counts('{e0000000-0000-0000-0000-000000000002}')), 0, 'never exposes household recipes');
select is((select likes from public.recipe_like_counts('{e0000000-0000-0000-0000-000000000003}')), 0, 'non-favorite reactions count as zero');
select is((select count(*)::int from public.recipe_like_counts('{}')), 0, 'empty request returns no rows');
select is((select count(*)::int from public.recipe_like_counts('{e0000000-0000-0000-0000-000000000001,e0000000-0000-0000-0000-000000000001}')), 1, 'repeated ids do not duplicate counts');
select is(public.toggle_recipe_reaction('e0000000-0000-0000-0000-000000000001', 'favorite'), false, 'toggle removes own favorite');
select is((select likes from public.recipe_like_counts('{e0000000-0000-0000-0000-000000000001}')), 1, 'other household favorite is preserved');
select is(public.toggle_recipe_reaction('e0000000-0000-0000-0000-000000000001', 'favorite'), true, 'toggle adds own favorite');
select throws_ok($$ select public.toggle_recipe_reaction('e0000000-0000-0000-0000-000000000002', 'favorite') $$, '42501', null, 'cannot react to another household recipe');
select throws_ok($$ select public.toggle_recipe_reaction('e0000000-0000-0000-0000-000000000001', 'cooked') $$, '22023', null, 'RPC only accepts toggle kinds');
select is(public.toggle_recipe_reaction('e0000000-0000-0000-0000-000000000001', 'dislike'), false, 'dislike toggles off');
select is(public.toggle_recipe_reaction('e0000000-0000-0000-0000-000000000001', 'veto'), true, 'veto toggles on');
set local role anon;
select throws_ok($$ select * from public.recipe_like_counts('{e0000000-0000-0000-0000-000000000001}') $$, '42501', null, 'anon cannot execute counts');
select throws_ok($$ select public.toggle_recipe_reaction('e0000000-0000-0000-0000-000000000001', 'favorite') $$, '42501', null, 'anon cannot toggle reactions');
select * from finish();
rollback;
