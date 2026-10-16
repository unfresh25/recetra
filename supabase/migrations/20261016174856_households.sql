-- Households, members and invitations.
-- Writes go through security-definer RPCs; direct inserts are blocked by RLS.

create extension if not exists pgcrypto with schema extensions;

create type public.member_role as enum ('owner', 'member');
create type public.member_accent as enum ('coral', 'teal');

create table public.households (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 60),
  city text not null default 'Barranquilla',
  weekly_budget_cop integer check (weekly_budget_cop > 0),
  servings_adults smallint not null default 2 check (servings_adults between 1 and 12),
  servings_kids smallint not null default 0 check (servings_kids between 0 and 12),
  equipment text[] not null default '{}',
  styles text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.members (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  -- One household per user for now.
  user_id uuid not null unique references auth.users (id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 40),
  accent_color public.member_accent not null,
  role public.member_role not null default 'member',
  created_at timestamptz not null default now()
);

create index members_household_id_idx on public.members (household_id);

create table public.invitations (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  token text not null unique,
  created_by uuid not null references public.members (id) on delete cascade,
  expires_at timestamptz not null default now() + interval '7 days',
  used_at timestamptz,
  used_by uuid references public.members (id) on delete set null,
  created_at timestamptz not null default now()
);

create index invitations_household_id_idx on public.invitations (household_id);

-- updated_at trigger
create function public.set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger households_set_updated_at
before update on public.households
for each row execute function public.set_updated_at();

-- Membership helper used by every household-scoped policy.
-- security definer avoids recursive RLS evaluation on members.
create function public.current_household_id() returns uuid
language sql stable security definer set search_path = '' as $$
  select m.household_id from public.members m where m.user_id = auth.uid();
$$;

create function public.is_household_member(p_household_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.members m
    where m.household_id = p_household_id and m.user_id = auth.uid()
  );
$$;

-- RLS
alter table public.households enable row level security;
alter table public.members enable row level security;
alter table public.invitations enable row level security;

create policy "members read their household"
  on public.households for select to authenticated
  using (public.is_household_member(id));

create policy "members update their household"
  on public.households for update to authenticated
  using (public.is_household_member(id))
  with check (public.is_household_member(id));

create policy "members read housemates"
  on public.members for select to authenticated
  using (household_id = public.current_household_id());

create policy "members update themselves"
  on public.members for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid() and household_id = public.current_household_id());

create policy "members read household invitations"
  on public.invitations for select to authenticated
  using (public.is_household_member(household_id));

-- Column-level guard: members may only change their own profile fields.
revoke update on public.members from authenticated;
grant update (display_name) on public.members to authenticated;

-- RPCs ---------------------------------------------------------------------

create function public.create_household(p_name text, p_display_name text)
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

  insert into public.members (household_id, user_id, display_name, accent_color, role)
  values (v_household_id, auth.uid(), trim(p_display_name), 'coral', 'owner');

  return v_household_id;
end;
$$;

create function public.create_invitation()
returns text
language plpgsql security definer set search_path = '' as $$
declare
  v_member public.members;
  v_token text;
begin
  select * into v_member from public.members where user_id = auth.uid();
  if v_member.id is null then
    raise exception 'not_in_household' using errcode = 'P0001';
  end if;

  -- 18 random bytes -> 24 url-safe chars
  v_token := translate(encode(extensions.gen_random_bytes(18), 'base64'), '+/', '-_');

  insert into public.invitations (household_id, token, created_by)
  values (v_member.household_id, v_token, v_member.id);

  return v_token;
end;
$$;

-- Lets an invitee (not yet a member) preview who invited them.
create function public.get_invitation(p_token text)
returns table (household_name text, inviter_name text, status text)
language sql stable security definer set search_path = '' as $$
  select
    h.name,
    m.display_name,
    case
      when i.used_at is not null then 'used'
      when i.expires_at < now() then 'expired'
      else 'valid'
    end
  from public.invitations i
  join public.households h on h.id = i.household_id
  join public.members m on m.id = i.created_by
  where i.token = p_token;
$$;

create function public.accept_invitation(p_token text, p_display_name text)
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

  insert into public.members (household_id, user_id, display_name, accent_color, role)
  values (v_invitation.household_id, auth.uid(), trim(p_display_name), v_accent, 'member')
  returning id into v_member_id;

  update public.invitations
  set used_at = now(), used_by = v_member_id
  where id = v_invitation.id;

  return v_invitation.household_id;
end;
$$;

revoke execute on function public.create_household(text, text) from public, anon;
revoke execute on function public.create_invitation() from public, anon;
revoke execute on function public.get_invitation(text) from public, anon;
revoke execute on function public.accept_invitation(text, text) from public, anon;
grant execute on function public.create_household(text, text) to authenticated;
grant execute on function public.create_invitation() to authenticated;
grant execute on function public.get_invitation(text) to authenticated;
grant execute on function public.accept_invitation(text, text) to authenticated;
