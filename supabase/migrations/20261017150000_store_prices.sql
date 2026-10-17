-- Phase 2: store products, ingredient matches, price history and pinned brands.

-- How each ingredient is bought, so recipe amounts ("2 cdas", "1 diente") become package math.
alter table public.ingredients
  add column purchase_unit public.base_unit,
  add column unit_weight_g numeric(8, 2) check (unit_weight_g > 0),
  add column density_g_ml numeric(5, 3) check (density_g_ml > 0),
  add column pantry_staple boolean not null default false,
  add column search_terms text[] not null default '{}';

comment on column public.ingredients.purchase_unit is 'Dimension stores sell it in (g, ml or unit). Null until enriched.';
comment on column public.ingredients.unit_weight_g is 'Grams of one piece (an egg, a garlic clove, an onion).';
comment on column public.ingredients.density_g_ml is 'Grams per ml, to turn cups and spoons into grams.';
comment on column public.ingredients.pantry_staple is 'Salt, oil, spices: listed without quantity, assumed at home.';
comment on column public.ingredients.search_terms is 'Store search queries, most specific first. Empty means use the name.';

update public.stores set base_url = 'https://www.d1.com.co' where slug = 'd1';

create type public.match_status as enum ('auto', 'pending_review', 'confirmed', 'rejected');
create type public.price_source as enum ('api', 'receipt');

create table public.products (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores (id) on delete cascade,
  sku text not null,
  name text not null,
  brand text,
  package_qty numeric(10, 2) not null check (package_qty > 0),
  package_unit public.base_unit not null,
  url text,
  image_url text,
  available boolean not null default true,
  last_seen_at timestamptz not null default now(),
  unique (store_id, sku)
);

create table public.product_matches (
  id uuid primary key default gen_random_uuid(),
  ingredient_id uuid not null references public.ingredients (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete cascade,
  confidence numeric(3, 2) not null check (confidence between 0 and 1),
  status public.match_status not null default 'auto',
  created_at timestamptz not null default now(),
  unique (ingredient_id, product_id)
);

create index product_matches_ingredient_idx on public.product_matches (ingredient_id) where status in ('auto', 'confirmed');

create table public.prices (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  price_cop integer not null check (price_cop > 0),
  list_price_cop integer check (list_price_cop > 0),
  source public.price_source not null default 'api',
  captured_at timestamptz not null default now()
);

create index prices_product_captured_idx on public.prices (product_id, captured_at desc);

-- Latest price per product: what the shopping list reads.
create view public.current_prices with (security_invoker = true) as
select distinct on (product_id) product_id, price_cop, list_price_cop, captured_at
from public.prices
order by product_id, captured_at desc;

-- Tracks which (ingredient, store) pairs were searched, so empty results aren't retried every night.
create table public.match_runs (
  ingredient_id uuid not null references public.ingredients (id) on delete cascade,
  store_id uuid not null references public.stores (id) on delete cascade,
  searched_at timestamptz not null default now(),
  found integer not null default 0,
  primary key (ingredient_id, store_id)
);

create table public.pinned_brands (
  household_id uuid not null references public.households (id) on delete cascade,
  ingredient_id uuid not null references public.ingredients (id) on delete cascade,
  brand text not null check (char_length(brand) between 1 and 80),
  created_at timestamptz not null default now(),
  primary key (household_id, ingredient_id)
);

alter table public.products enable row level security;
alter table public.product_matches enable row level security;
alter table public.prices enable row level security;
alter table public.match_runs enable row level security;
alter table public.pinned_brands enable row level security;

-- Store data is a shared catalog: read-only for users, written by the service role.
create policy "signed-in users read products" on public.products for select to authenticated using (true);
create policy "signed-in users read usable matches" on public.product_matches for select to authenticated
  using (status in ('auto', 'confirmed'));
create policy "signed-in users read prices" on public.prices for select to authenticated using (true);

create policy "household reads pinned brands" on public.pinned_brands for select to authenticated
  using (household_id = public.current_household_id());

create function public.pin_brand(p_ingredient_id uuid, p_brand text) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_household uuid := public.current_household_id();
begin
  if v_household is null then
    raise exception 'not a household member' using errcode = '42501';
  end if;
  if p_brand is null or btrim(p_brand) = '' then
    delete from public.pinned_brands where household_id = v_household and ingredient_id = p_ingredient_id;
    return;
  end if;
  insert into public.pinned_brands (household_id, ingredient_id, brand)
  values (v_household, p_ingredient_id, btrim(p_brand))
  on conflict (household_id, ingredient_id) do update set brand = excluded.brand, created_at = now();
end;
$$;

revoke all on function public.pin_brand(uuid, text) from public, anon;
grant execute on function public.pin_brand(uuid, text) to authenticated;

-- Folds a duplicate ingredient (created by an import) into an existing one. Service role only.
create function public.merge_ingredient(p_from uuid, p_into uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if p_from = p_into then
    raise exception 'cannot merge an ingredient into itself';
  end if;
  update public.recipe_ingredients set ingredient_id = p_into where ingredient_id = p_from;
  update public.recipe_ingredients set substitute_ids = array_remove(array_replace(substitute_ids, p_from, p_into), ingredient_id)
    where p_from = any (substitute_ids);
  -- A member may already dislike the target: drop the duplicate restriction instead of colliding.
  delete from public.restrictions r using public.restrictions t
    where r.ingredient_id = p_from and t.ingredient_id = p_into and t.member_id = r.member_id and t.kind = r.kind;
  update public.restrictions set ingredient_id = p_into where ingredient_id = p_from;
  update public.plan_meals set adjustments = replace(adjustments::text, p_from::text, p_into::text)::jsonb
    where adjustments::text like '%' || p_from::text || '%';
  delete from public.pinned_brands where ingredient_id = p_from;
  delete from public.ingredients where id = p_from;
end;
$$;

revoke all on function public.merge_ingredient(uuid, uuid) from public, anon, authenticated;
