begin;
create extension if not exists pgtap with schema extensions;
select plan(16);

-- Fixtures: three users.
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'a@test.co'),
  ('00000000-0000-0000-0000-00000000000b', 'b@test.co'),
  ('00000000-0000-0000-0000-00000000000c', 'c@test.co');

create function pg_temp.login(p_user uuid) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', p_user, 'role', 'authenticated')::text, true);
$$;

set local role authenticated;

-- A creates a household.
select pg_temp.login('00000000-0000-0000-0000-00000000000a');
select lives_ok($$ select public.create_household('Casa', 'Jorge') $$, 'A creates a household');
select throws_ok($$ select public.create_household('Otra', 'Jorge') $$, 'P0001', 'already_in_household', 'A cannot create a second household');
select is((select count(*)::int from public.members), 1, 'A sees one member');
select is((select role::text from public.members), 'owner', 'A is owner');

-- Direct inserts are blocked.
select throws_ok(
  $$ insert into public.members (household_id, user_id, display_name, accent_color)
     values (public.current_household_id(), '00000000-0000-0000-0000-00000000000c', 'X', 'teal') $$,
  '42501', null, 'members cannot be inserted directly');

-- A invites.
select set_config('test.token', public.create_invitation(), true);

-- B previews and joins; C cannot see anything.
select pg_temp.login('00000000-0000-0000-0000-00000000000b');
select is((select count(*)::int from public.households), 0, 'B sees no household before joining');
select is((select status from public.get_invitation(current_setting('test.token'))), 'valid', 'B previews a valid invitation');
select is((select inviter_name from public.get_invitation(current_setting('test.token'))), 'Jorge', 'preview shows inviter');
select lives_ok($$ select public.accept_invitation(current_setting('test.token'), 'Pareja') $$, 'B accepts the invitation');
select is((select count(*)::int from public.members), 2, 'B sees both members');
select is((select accent_color::text from public.members where display_name = 'Pareja'), 'teal', 'B gets the teal accent');

select pg_temp.login('00000000-0000-0000-0000-00000000000c');
select throws_ok($$ select public.accept_invitation(current_setting('test.token'), 'C') $$, 'P0001', 'invitation_used', 'used invitation is rejected');
select is((select count(*)::int from public.households), 0, 'C cannot read the household');
select is((select count(*)::int from public.members), 0, 'C cannot read members');

-- Expired invitations are rejected.
reset role;
insert into public.invitations (household_id, token, created_by, expires_at)
select household_id, 'expired-token', id, now() - interval '1 day'
from public.members where user_id = '00000000-0000-0000-0000-00000000000a';
set local role authenticated;
select pg_temp.login('00000000-0000-0000-0000-00000000000c');
select throws_ok($$ select public.accept_invitation('expired-token', 'C') $$, 'P0001', 'invitation_expired', 'expired invitation is rejected');

-- Members can rename themselves but not change role.
select pg_temp.login('00000000-0000-0000-0000-00000000000b');
select throws_ok($$ update public.members set role = 'owner' where display_name = 'Pareja' $$, '42501', null, 'members cannot change their role');

select * from finish();
rollback;
