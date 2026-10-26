begin;
create extension if not exists pgtap with schema extensions;
select plan(2);

insert into auth.users (id, email) values
  ('20000000-0000-0000-0000-00000000000a', 'a@diets.co'),
  ('20000000-0000-0000-0000-00000000000b', 'b@diets.co');
insert into public.households (id, name) values
  ('33333333-3333-3333-3333-333333333333', 'H');
insert into public.members (id, household_id, user_id, display_name, accent_color, role) values
  ('a1000000-0000-0000-0000-00000000000a', '33333333-3333-3333-3333-333333333333', '20000000-0000-0000-0000-00000000000a', 'A', 'coral', 'owner'),
  ('b1000000-0000-0000-0000-00000000000b', '33333333-3333-3333-3333-333333333333', '20000000-0000-0000-0000-00000000000b', 'B', 'teal', 'member');

create function pg_temp.login(p_user uuid) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', p_user, 'role', 'authenticated')::text, true);
$$;

set local role authenticated;
select pg_temp.login('20000000-0000-0000-0000-00000000000b');

select lives_ok(
  $$ select public.replace_my_restrictions('diet', p_diets => '{keto}') $$,
  'a member can save keto through the restrictions RPC');
select is(
  (select array_agg(diet::text) from public.restrictions
   where member_id = 'b1000000-0000-0000-0000-00000000000b' and kind = 'diet'),
  array['keto'], 'keto is saved for the calling member');

select * from finish();
rollback;
