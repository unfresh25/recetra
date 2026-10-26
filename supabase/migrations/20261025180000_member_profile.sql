-- Member profile for the Mise onboarding ("Cuéntanos acerca de ti"):
-- full name next to the display name ("¿Cómo deberíamos decirte?") and an optional photo.

alter table public.members
  add column full_name text check (char_length(full_name) between 1 and 80),
  -- Object path inside the private "avatars" bucket: <user_id>/<file>.
  add column avatar_path text check (avatar_path ~ '^[0-9a-f-]{36}/[A-Za-z0-9._-]+$'),
  -- Also enforced on direct updates: a member can only point at files in their own folder.
  add constraint members_avatar_in_own_folder
    check (avatar_path is null or split_part(avatar_path, '/', 1) = user_id::text);

grant update (display_name, onboarded_at, full_name, avatar_path) on public.members to authenticated;

-- Private bucket: each user writes only under their own folder; housemates can read.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', false, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "users upload own avatar"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "users replace own avatar"
  on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "users delete own avatar"
  on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

-- Readable by the owner (also before joining a household) and by housemates.
create policy "users and housemates read avatars"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'avatars'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or exists (
        select 1 from public.members m
        where m.user_id::text = (storage.foldername(name))[1]
          and m.household_id = public.current_household_id()
      )
    )
  );

-- An avatar path is only accepted if it lives in the caller's own folder.
create function public.own_avatar_path(p_path text) returns text
language plpgsql stable set search_path = '' as $$
begin
  if p_path is null or p_path = '' then
    return null;
  end if;
  if split_part(p_path, '/', 1) <> auth.uid()::text then
    raise exception 'invalid_avatar' using errcode = 'P0001';
  end if;
  return p_path;
end;
$$;

-- RPCs gain the profile fields. Old two-argument versions are replaced, not overloaded.
drop function public.create_household(text, text);
drop function public.accept_invitation(text, text);

create function public.create_household(
  p_name text,
  p_display_name text,
  p_full_name text default null,
  p_avatar_path text default null
)
returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_household_id uuid;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;
  if exists (select 1 from public.members where user_id = auth.uid()) then
    raise exception 'already_in_household' using errcode = 'P0001';
  end if;

  insert into public.households (name) values (trim(p_name))
  returning id into v_household_id;

  insert into public.members (household_id, user_id, display_name, full_name, avatar_path, accent_color, role)
  values (
    v_household_id, auth.uid(), trim(p_display_name), nullif(trim(p_full_name), ''),
    public.own_avatar_path(p_avatar_path), 'coral', 'owner'
  );

  return v_household_id;
end;
$$;

create function public.accept_invitation(
  p_token text,
  p_display_name text,
  p_full_name text default null,
  p_avatar_path text default null
)
returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_invitation public.invitations;
  v_member_id uuid;
  v_taken_accents public.member_accent[];
  v_accent public.member_accent;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;
  if exists (select 1 from public.members where user_id = auth.uid()) then
    raise exception 'already_in_household' using errcode = 'P0001';
  end if;

  select * into v_invitation from public.invitations
  where token = p_token
  for update;

  if v_invitation.id is null then
    raise exception 'invitation_not_found' using errcode = 'P0001';
  end if;
  if v_invitation.used_at is not null then
    raise exception 'invitation_used' using errcode = 'P0001';
  end if;
  if v_invitation.expires_at < now() then
    raise exception 'invitation_expired' using errcode = 'P0001';
  end if;

  select array_agg(accent_color) into v_taken_accents
  from public.members where household_id = v_invitation.household_id;

  v_accent := case when 'teal' = any (coalesce(v_taken_accents, '{}')) then 'coral' else 'teal' end;

  insert into public.members (household_id, user_id, display_name, full_name, avatar_path, accent_color, role)
  values (
    v_invitation.household_id, auth.uid(), trim(p_display_name), nullif(trim(p_full_name), ''),
    public.own_avatar_path(p_avatar_path), v_accent, 'member'
  )
  returning id into v_member_id;

  update public.invitations
  set used_at = now(), used_by = v_member_id
  where id = v_invitation.id;

  return v_invitation.household_id;
end;
$$;

revoke execute on function public.create_household(text, text, text, text) from public, anon;
revoke execute on function public.accept_invitation(text, text, text, text) from public, anon;
grant execute on function public.create_household(text, text, text, text) to authenticated;
grant execute on function public.accept_invitation(text, text, text, text) to authenticated;
-- Internal helper for the RPCs above; not callable through the API.
revoke execute on function public.own_avatar_path(text) from public, anon, authenticated;
