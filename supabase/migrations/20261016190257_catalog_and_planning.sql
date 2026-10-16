-- Recipe catalog, per-person restrictions, reactions, stores, weekly plans and the job queue.
-- Catalog tables (ingredients, recipes, stores) are shared; everything else is household-scoped.
-- Catalog writes happen server-side with the service role (import pipeline, seeds).

-- Enums ---------------------------------------------------------------------

create type public.meal_type as enum ('breakfast', 'lunch', 'dinner');
create type public.allergen as enum (
  'peanut', 'tree_nut', 'dairy', 'egg', 'gluten', 'soy', 'fish', 'shellfish', 'sesame'
);
create type public.diet as enum ('vegetarian', 'vegan', 'pescatarian', 'gluten_free', 'dairy_free');
create type public.ingredient_category as enum (
  'produce', 'herbs', 'meat', 'poultry', 'fish', 'seafood', 'dairy', 'eggs', 'grains', 'legumes',
  'bakery', 'pantry', 'spices', 'condiments', 'oils', 'sweeteners', 'beverages', 'nuts_seeds', 'other'
);
create type public.base_unit as enum ('g', 'ml', 'unit');
create type public.ingredient_status as enum ('active', 'pending_review');
create type public.ingredient_role as enum ('core', 'accessory');
create type public.source_platform as enum ('tiktok', 'instagram', 'youtube', 'manual');
create type public.recipe_status as enum ('pending_review', 'approved', 'rejected');
create type public.recipe_visibility as enum ('public', 'household');
create type public.recipe_style as enum (
  'quick', 'high_protein', 'healthy', 'family', 'balanced', 'low_calorie', 'gut_friendly', 'one_pot'
);
create type public.kitchen_equipment as enum (
  'oven', 'stovetop', 'microwave', 'air_fryer', 'pressure_cooker', 'slow_cooker', 'blender', 'rice_cooker'
);
create type public.restriction_kind as enum ('allergy', 'dislike', 'diet');
create type public.reaction_kind as enum ('favorite', 'dislike', 'veto', 'cooked', 'replaced');
create type public.replace_reason as enum ('dislike', 'too_slow', 'too_expensive', 'repeated', 'not_today');
create type public.plan_meal_status as enum ('planned', 'cooked', 'replaced');
create type public.store_source as enum ('vtex', 'instaleap', 'manual');
create type public.job_status as enum ('queued', 'running', 'done', 'failed');

-- Household preferences now use the shared enums.
alter table public.households
  alter column equipment drop default,
  alter column styles drop default;
alter table public.households
  alter column equipment type public.kitchen_equipment[] using equipment::public.kitchen_equipment[],
  alter column styles type public.recipe_style[] using styles::public.recipe_style[];
alter table public.households
  alter column equipment set default '{}',
  alter column styles set default '{}',
  add column onboarded_at timestamptz;

-- Catalog: ingredients --------------------------------------------------------

create table public.ingredients (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null,
  category public.ingredient_category not null,
  base_unit public.base_unit not null,
  allergens public.allergen[] not null default '{}',
  aliases text[] not null default '{}',
  status public.ingredient_status not null default 'active',
  created_at timestamptz not null default now()
);

create index ingredients_aliases_idx on public.ingredients using gin (aliases);

-- Catalog: recipes ------------------------------------------------------------

create table public.recipes (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 160),
  source_platform public.source_platform not null,
  source_video_id text,
  source_url text,
  author_name text,
  author_handle text,
  author_url text,
  source_image_path text,
  servings smallint not null default 2 check (servings between 1 and 24),
  total_minutes smallint check (total_minutes between 1 and 1440),
  kcal_per_serving integer check (kcal_per_serving >= 0),
  protein_g numeric(6, 1) check (protein_g >= 0),
  carbs_g numeric(6, 1) check (carbs_g >= 0),
  fat_g numeric(6, 1) check (fat_g >= 0),
  nutrition_estimated boolean not null default true,
  meal_types public.meal_type[] not null check (cardinality(meal_types) > 0),
  styles public.recipe_style[] not null default '{}',
  equipment public.kitchen_equipment[] not null default '{}',
  visibility public.recipe_visibility not null default 'public',
  imported_by_household_id uuid references public.households (id) on delete set null,
  status public.recipe_status not null default 'pending_review',
  ai_confidence numeric(3, 2) check (ai_confidence between 0 and 1),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (source_platform, source_video_id)
);

create index recipes_status_idx on public.recipes (status);
create index recipes_meal_types_idx on public.recipes using gin (meal_types);
create index recipes_imported_by_idx on public.recipes (imported_by_household_id);

create trigger recipes_set_updated_at
before update on public.recipes
for each row execute function public.set_updated_at();

create table public.recipe_ingredients (
  recipe_id uuid not null references public.recipes (id) on delete cascade,
  position smallint not null,
  ingredient_id uuid not null references public.ingredients (id),
  quantity numeric(10, 2) check (quantity > 0),
  unit text,
  role public.ingredient_role not null default 'core',
  substitute_ids uuid[] not null default '{}',
  note text,
  primary key (recipe_id, position)
);

create index recipe_ingredients_ingredient_idx on public.recipe_ingredients (ingredient_id);

create table public.recipe_steps (
  recipe_id uuid not null references public.recipes (id) on delete cascade,
  position smallint not null,
  text text not null,
  video_start_seconds integer check (video_start_seconds >= 0),
  primary key (recipe_id, position)
);

create table public.household_recipe_overrides (
  household_id uuid not null references public.households (id) on delete cascade,
  recipe_id uuid not null references public.recipes (id) on delete cascade,
  cover_image_path text,
  updated_at timestamptz not null default now(),
  primary key (household_id, recipe_id)
);

-- Per-person restrictions ----------------------------------------------------

create table public.restrictions (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members (id) on delete cascade,
  kind public.restriction_kind not null,
  allergen public.allergen,
  ingredient_id uuid references public.ingredients (id) on delete cascade,
  ingredient_category public.ingredient_category,
  diet public.diet,
  created_at timestamptz not null default now(),
  -- allergy -> allergen; dislike -> ingredient or category; diet -> diet
  constraint restrictions_shape check (
    (kind = 'allergy' and allergen is not null and ingredient_id is null and ingredient_category is null and diet is null)
    or (kind = 'dislike' and allergen is null and diet is null and num_nonnulls(ingredient_id, ingredient_category) = 1)
    or (kind = 'diet' and diet is not null and allergen is null and ingredient_id is null and ingredient_category is null)
  )
);

alter table public.restrictions
  add constraint restrictions_unique unique nulls not distinct
  (member_id, kind, allergen, ingredient_id, ingredient_category, diet);

-- Reactions and learned preferences ------------------------------------------

create table public.reactions (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members (id) on delete cascade,
  recipe_id uuid not null references public.recipes (id) on delete cascade,
  kind public.reaction_kind not null,
  reason public.replace_reason,
  plan_meal_id uuid,
  created_at timestamptz not null default now(),
  constraint reactions_reason_only_on_replace check (reason is null or kind = 'replaced')
);

create index reactions_member_recipe_idx on public.reactions (member_id, recipe_id);
-- Favorites and vetoes are toggles: one active row per member and recipe.
create unique index reactions_toggle_unique_idx on public.reactions (member_id, recipe_id, kind)
  where kind in ('favorite', 'veto');

create table public.household_learned_prefs (
  household_id uuid primary key references public.households (id) on delete cascade,
  max_minutes_by_meal_type jsonb not null default '{}',
  price_sensitivity numeric(3, 2) not null default 0.5 check (price_sensitivity between 0 and 1),
  updated_at timestamptz not null default now()
);

-- Stores ---------------------------------------------------------------------

create table public.stores (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  source public.store_source not null,
  base_url text,
  api_path_prefix text,
  brand_color text not null default '#E8202A',
  logo_url text,
  sort_order smallint not null default 0
);

create table public.household_stores (
  household_id uuid not null references public.households (id) on delete cascade,
  store_id uuid not null references public.stores (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (household_id, store_id)
);

-- Weekly plans ---------------------------------------------------------------

create table public.meal_plans (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  week_start date not null check (extract(isodow from week_start) = 1),
  generated_at timestamptz not null default now(),
  unique (household_id, week_start)
);

create table public.plan_meals (
  id uuid primary key default gen_random_uuid(),
  meal_plan_id uuid not null references public.meal_plans (id) on delete cascade,
  day date not null,
  meal_type public.meal_type not null,
  recipe_id uuid references public.recipes (id) on delete set null,
  servings smallint not null check (servings between 1 and 24),
  status public.plan_meal_status not null default 'planned',
  adjustments jsonb not null default '{}',
  created_at timestamptz not null default now(),
  unique (meal_plan_id, day, meal_type)
);

alter table public.reactions
  add constraint reactions_plan_meal_fk foreign key (plan_meal_id)
  references public.plan_meals (id) on delete set null;

-- Job queue ------------------------------------------------------------------

create table public.jobs (
  id uuid primary key default gen_random_uuid(),
  kind text not null,
  household_id uuid references public.households (id) on delete cascade,
  payload jsonb not null default '{}',
  status public.job_status not null default 'queued',
  attempts smallint not null default 0,
  run_after timestamptz not null default now(),
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index jobs_ready_idx on public.jobs (run_after) where status = 'queued';

create trigger jobs_set_updated_at
before update on public.jobs
for each row execute function public.set_updated_at();

-- Helpers --------------------------------------------------------------------

create function public.current_member_id() returns uuid
language sql stable security definer set search_path = '' as $$
  select m.id from public.members m where m.user_id = auth.uid();
$$;

create function public.can_read_recipe(p_recipe_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.recipes r
    where r.id = p_recipe_id
      and (
        (r.status = 'approved' and r.visibility = 'public')
        or r.imported_by_household_id = public.current_household_id()
      )
  );
$$;

-- RLS ------------------------------------------------------------------------

alter table public.ingredients enable row level security;
alter table public.recipes enable row level security;
alter table public.recipe_ingredients enable row level security;
alter table public.recipe_steps enable row level security;
alter table public.household_recipe_overrides enable row level security;
alter table public.restrictions enable row level security;
alter table public.reactions enable row level security;
alter table public.household_learned_prefs enable row level security;
alter table public.stores enable row level security;
alter table public.household_stores enable row level security;
alter table public.meal_plans enable row level security;
alter table public.plan_meals enable row level security;
alter table public.jobs enable row level security;

-- Catalog: readable by any signed-in user; written by the service role only.
create policy "signed-in users read active ingredients"
  on public.ingredients for select to authenticated
  using (status = 'active');

create policy "signed-in users read stores"
  on public.stores for select to authenticated
  using (true);

create policy "read approved public recipes or own imports"
  on public.recipes for select to authenticated
  using (
    (status = 'approved' and visibility = 'public')
    or imported_by_household_id = public.current_household_id()
  );

create policy "read ingredients of readable recipes"
  on public.recipe_ingredients for select to authenticated
  using (public.can_read_recipe(recipe_id));

create policy "read steps of readable recipes"
  on public.recipe_steps for select to authenticated
  using (public.can_read_recipe(recipe_id));

-- Household-scoped tables.
create policy "household reads overrides"
  on public.household_recipe_overrides for select to authenticated
  using (household_id = public.current_household_id());
create policy "household writes overrides"
  on public.household_recipe_overrides for insert to authenticated
  with check (household_id = public.current_household_id() and public.can_read_recipe(recipe_id));
create policy "household updates overrides"
  on public.household_recipe_overrides for update to authenticated
  using (household_id = public.current_household_id())
  with check (household_id = public.current_household_id());
create policy "household deletes overrides"
  on public.household_recipe_overrides for delete to authenticated
  using (household_id = public.current_household_id());

-- Restrictions: housemates can read each other's (the plan needs both); each member edits their own.
create policy "household reads restrictions"
  on public.restrictions for select to authenticated
  using (member_id in (select id from public.members where household_id = public.current_household_id()));
create policy "members add own restrictions"
  on public.restrictions for insert to authenticated
  with check (member_id = public.current_member_id());
create policy "members delete own restrictions"
  on public.restrictions for delete to authenticated
  using (member_id = public.current_member_id());

create policy "household reads reactions"
  on public.reactions for select to authenticated
  using (member_id in (select id from public.members where household_id = public.current_household_id()));
create policy "members add own reactions"
  on public.reactions for insert to authenticated
  with check (member_id = public.current_member_id() and public.can_read_recipe(recipe_id));
create policy "members delete own reactions"
  on public.reactions for delete to authenticated
  using (member_id = public.current_member_id());

create policy "household reads learned prefs"
  on public.household_learned_prefs for select to authenticated
  using (household_id = public.current_household_id());

create policy "household reads its stores"
  on public.household_stores for select to authenticated
  using (household_id = public.current_household_id());
create policy "household adds stores"
  on public.household_stores for insert to authenticated
  with check (household_id = public.current_household_id());
create policy "household removes stores"
  on public.household_stores for delete to authenticated
  using (household_id = public.current_household_id());

create policy "household reads plans"
  on public.meal_plans for select to authenticated
  using (household_id = public.current_household_id());
create policy "household creates plans"
  on public.meal_plans for insert to authenticated
  with check (household_id = public.current_household_id());
create policy "household deletes plans"
  on public.meal_plans for delete to authenticated
  using (household_id = public.current_household_id());

create policy "household reads plan meals"
  on public.plan_meals for select to authenticated
  using (meal_plan_id in (select id from public.meal_plans where household_id = public.current_household_id()));
create policy "household writes plan meals"
  on public.plan_meals for insert to authenticated
  with check (meal_plan_id in (select id from public.meal_plans where household_id = public.current_household_id()));
create policy "household updates plan meals"
  on public.plan_meals for update to authenticated
  using (meal_plan_id in (select id from public.meal_plans where household_id = public.current_household_id()))
  with check (meal_plan_id in (select id from public.meal_plans where household_id = public.current_household_id()));
create policy "household deletes plan meals"
  on public.plan_meals for delete to authenticated
  using (meal_plan_id in (select id from public.meal_plans where household_id = public.current_household_id()));

-- Jobs: households can follow their own jobs; only the service role writes.
create policy "household reads its jobs"
  on public.jobs for select to authenticated
  using (household_id = public.current_household_id());

-- Members may update household preferences directly (name, budget, servings, equipment, styles).
revoke update on public.households from authenticated;
grant update (name, city, weekly_budget_cop, servings_adults, servings_kids, equipment, styles, onboarded_at)
  on public.households to authenticated;
