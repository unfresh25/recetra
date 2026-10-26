begin;
create extension if not exists pgtap with schema extensions;
select plan(13);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'a@test.co'),
  ('00000000-0000-0000-0000-00000000000b', 'b@test.co'),
  ('00000000-0000-0000-0000-00000000000c', 'c@test.co');

create function pg_temp.login(p_user uuid) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', p_user, 'role', 'authenticated')::text, true);
$$;

-- Avatar objects as if uploaded (storage writes are covered by the policies below).
insert into storage.objects (bucket_id, name, owner_id) values
  ('avatars', '00000000-0000-0000-0000-00000000000a/a.webp', '00000000-0000-0000-0000-00000000000a'),
  ('avatars', '00000000-0000-0000-0000-00000000000c/c.webp', '00000000-0000-0000-0000-00000000000c');

set local role authenticated;

-- A creates a household with a full profile.
select pg_temp.login('00000000-0000-0000-0000-00000000000a');
select throws_ok(
  $$ select public.create_household('Casa', 'Jorge', 'Jorge Borja', '00000000-0000-0000-0000-00000000000c/c.webp') $$,
  'P0001', 'invalid_avatar', 'A cannot claim someone else''s avatar'
);
select lives_ok(
  $$ select public.create_household('Casa', 'Jorge', 'Jorge Borja', '00000000-0000-0000-0000-00000000000a/a.webp') $$,
  'A creates a household with name and photo'
);
select is((select full_name from public.members), 'Jorge Borja', 'full name is stored');
select is((select avatar_path from public.members), '00000000-0000-0000-0000-00000000000a/a.webp', 'avatar path is stored');
select throws_ok(
  $$ update public.members set avatar_path = '00000000-0000-0000-0000-00000000000c/c.webp' $$,
  '23514', null, 'a direct update cannot point at another user''s folder'
);
select lives_ok($$ update public.members set full_name = 'Jorge E. Borja' $$, 'members can edit their full name');

-- Two-argument calls still work (full name and photo are optional).
select set_config('test.token', public.create_invitation(), true);
select pg_temp.login('00000000-0000-0000-0000-00000000000b');
select lives_ok($$ select public.accept_invitation(current_setting('test.token'), 'Pareja') $$, 'B joins without a profile');
select is((select full_name from public.members where display_name = 'Pareja'), null, 'B has no full name yet');

-- Avatar visibility.
select is(
  (select count(*)::int from storage.objects where bucket_id = 'avatars' and name like '00000000-0000-0000-0000-00000000000a/%'),
  1, 'B (housemate) can read A''s avatar'
);
select is(
  (select count(*)::int from storage.objects where bucket_id = 'avatars' and name like '00000000-0000-0000-0000-00000000000c/%'),
  0, 'B cannot read C''s avatar'
);
select pg_temp.login('00000000-0000-0000-0000-00000000000c');
select is(
  (select count(*)::int from storage.objects where bucket_id = 'avatars' and name like '00000000-0000-0000-0000-00000000000c/%'),
  1, 'C reads their own avatar before joining a household'
);
select is(
  (select count(*)::int from storage.objects where bucket_id = 'avatars' and name like '00000000-0000-0000-0000-00000000000a/%'),
  0, 'C cannot read A''s avatar'
);
select throws_ok(
  $$ insert into storage.objects (bucket_id, name, owner_id)
     values ('avatars', '00000000-0000-0000-0000-00000000000a/x.webp', '00000000-0000-0000-0000-00000000000c') $$,
  '42501', null, 'C cannot upload into A''s folder'
);

select * from finish();
rollback;
