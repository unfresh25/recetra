-- Manual planning: stable slots, with completion restricted to empty meals.
create function public.ensure_week_plan(p_week_start date, p_servings smallint)
returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_household_id uuid := public.current_household_id();
  v_plan_id uuid;
begin
  if v_household_id is null then
    raise exception 'not_in_household' using errcode = 'P0001';
  end if;
  if p_week_start is null or extract(isodow from p_week_start) <> 1 then
    raise exception 'week_start_must_be_monday' using errcode = 'P0001';
  end if;
  if p_servings is null or p_servings not between 1 and 24 then
    raise exception 'invalid_servings' using errcode = 'P0001';
  end if;

  insert into public.meal_plans (household_id, week_start)
  values (v_household_id, p_week_start)
  on conflict (household_id, week_start) do update set week_start = excluded.week_start
  returning id into v_plan_id;

  insert into public.plan_meals (meal_plan_id, day, meal_type, servings, adjustments)
  select v_plan_id, p_week_start + d, m, p_servings, '{}'::jsonb
  from generate_series(0, 6) as d
  cross join unnest(enum_range(null::public.meal_type)) as m
  on conflict (meal_plan_id, day, meal_type) do nothing;
  return v_plan_id;
end;
$$;

create function public.clear_plan_meal(p_plan_meal_id uuid)
returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_meal public.plan_meals;
begin
  select pm.* into v_meal
  from public.plan_meals pm
  join public.meal_plans mp on mp.id = pm.meal_plan_id
  where pm.id = p_plan_meal_id and mp.household_id = public.current_household_id()
  for update of pm;
  if v_meal.id is null then
    raise exception 'plan_meal_not_found' using errcode = 'P0001';
  end if;
  if v_meal.status = 'cooked' then
    raise exception 'meal_already_cooked' using errcode = 'P0001';
  end if;
  update public.plan_meals
  set recipe_id = null, adjustments = '{}', status = 'planned'
  where id = v_meal.id;
end;
$$;

create function public.fill_empty_plan_meals(p_week_start date, p_meals jsonb)
returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_plan_id uuid;
  v_meal jsonb;
  v_day date;
  v_recipe_id uuid;
begin
  v_plan_id := public.ensure_week_plan(p_week_start, coalesce((p_meals->0->>'servings')::smallint, 2::smallint));
  for v_meal in select * from jsonb_array_elements(p_meals) loop
    v_day := (v_meal->>'day')::date;
    if v_day is null or v_day < p_week_start or v_day > p_week_start + 6 then
      raise exception 'day_outside_week' using errcode = 'P0001';
    end if;
    v_recipe_id := nullif(v_meal->>'recipe_id', '')::uuid;
    if v_recipe_id is not null and not public.can_read_recipe(v_recipe_id) then
      raise exception 'recipe_not_found' using errcode = 'P0001';
    end if;
    update public.plan_meals
    set recipe_id = v_recipe_id,
        servings = (v_meal->>'servings')::smallint,
        adjustments = coalesce(v_meal->'adjustments', '{}'::jsonb)
    where meal_plan_id = v_plan_id and day = v_day
      and meal_type = (v_meal->>'meal_type')::public.meal_type
      and recipe_id is null and status <> 'cooked';
  end loop;
  return v_plan_id;
end;
$$;

revoke execute on function public.ensure_week_plan(date, smallint) from public, anon;
revoke execute on function public.clear_plan_meal(uuid) from public, anon;
revoke execute on function public.fill_empty_plan_meals(date, jsonb) from public, anon;
grant execute on function public.ensure_week_plan(date, smallint) to authenticated;
grant execute on function public.clear_plan_meal(uuid) to authenticated;
grant execute on function public.fill_empty_plan_meals(date, jsonb) to authenticated;
