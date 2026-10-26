begin;
create extension if not exists pgtap with schema extensions;
select plan(5);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'a@test.co'),
  ('00000000-0000-0000-0000-00000000000b', 'b@test.co');

create function pg_temp.login(p_user uuid) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', p_user, 'role', 'authenticated')::text, true);
$$;

set local role authenticated;

select pg_temp.login('00000000-0000-0000-0000-00000000000a');
select public.create_household('Casa', 'Jorge');
select set_config('test.token', public.create_invitation(), true);
select pg_temp.login('00000000-0000-0000-0000-00000000000b');
select public.accept_invitation(current_setting('test.token'), 'Pareja');

select is(
  (select measurement_system::text || '/' || temperature_unit::text from public.members where display_name = 'Pareja'),
  'metric/celsius', 'new members default to metric and Celsius'
);

select lives_ok(
  $$ update public.members set measurement_system = 'imperial', temperature_unit = 'fahrenheit'
     where user_id = '00000000-0000-0000-0000-00000000000b' $$,
  'B changes their own units'
);
select is(
  (select measurement_system::text from public.members where display_name = 'Pareja'),
  'imperial', 'B''s units are saved'
);

-- RLS: updating a housemate's row affects nothing.
update public.members set temperature_unit = 'fahrenheit' where display_name = 'Jorge';
select is(
  (select temperature_unit::text from public.members where display_name = 'Jorge'),
  'celsius', 'B cannot change A''s units'
);

select throws_ok(
  $$ update public.members set measurement_system = 'cups' where display_name = 'Pareja' $$,
  '22P02', null, 'only known measurement systems are accepted'
);

select * from finish();
rollback;
