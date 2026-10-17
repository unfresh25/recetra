-- Phase 3: store branches from OpenStreetMap (shared) plus branches a household adds by hand.

create type public.branch_source as enum ('osm', 'manual');

create table public.branches (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  address text,
  lat double precision not null check (lat between -90 and 90),
  lng double precision not null check (lng between -180 and 180),
  source public.branch_source not null,
  osm_id text unique,
  household_id uuid references public.households (id) on delete cascade,
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint branches_source_shape check (
    (source = 'osm' and osm_id is not null and household_id is null)
    or (source = 'manual' and osm_id is null and household_id is not null)
  )
);

create index branches_store_idx on public.branches (store_id);

alter table public.branches enable row level security;

create policy "read shared branches and own manual ones" on public.branches for select to authenticated
  using (household_id is null or household_id = public.current_household_id());

create function public.add_branch(p_store_id uuid, p_name text, p_lat double precision, p_lng double precision, p_address text default null)
returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_household uuid := public.current_household_id();
  v_id uuid;
begin
  if v_household is null then
    raise exception 'not a household member' using errcode = '42501';
  end if;
  insert into public.branches (store_id, name, address, lat, lng, source, household_id)
  values (p_store_id, btrim(p_name), nullif(btrim(coalesce(p_address, '')), ''), p_lat, p_lng, 'manual', v_household)
  returning id into v_id;
  return v_id;
end;
$$;

create function public.remove_branch(p_branch_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  delete from public.branches
  where id = p_branch_id and source = 'manual' and household_id = public.current_household_id();
  if not found then
    raise exception 'branch not found' using errcode = 'P0002';
  end if;
end;
$$;

revoke all on function public.add_branch(uuid, text, double precision, double precision, text) from public, anon;
grant execute on function public.add_branch(uuid, text, double precision, double precision, text) to authenticated;
revoke all on function public.remove_branch(uuid) from public, anon;
grant execute on function public.remove_branch(uuid) to authenticated;
