-- Weekly plan persistence and the replace-with-reason learning loop.

-- Saves (or regenerates) the household's week atomically. Runs as the caller, so RLS applies.
create function public.save_week_plan(p_week_start date, p_meals jsonb)
returns uuid
language plpgsql security invoker set search_path = '' as $$
declare
  v_household_id uuid := public.current_household_id();
  v_plan_id uuid;
begin
  if v_household_id is null then
    raise exception 'not_in_household' using errcode = 'P0001';
  end if;

  select id into v_plan_id from public.meal_plans
  where household_id = v_household_id and week_start = p_week_start;
  if v_plan_id is null then
    insert into public.meal_plans (household_id, week_start)
    values (v_household_id, p_week_start)
    returning id into v_plan_id;
  end if;

  -- Keep meals already cooked this week; replace the rest.
  delete from public.plan_meals where meal_plan_id = v_plan_id and status <> 'cooked';

  insert into public.plan_meals (meal_plan_id, day, meal_type, recipe_id, servings, adjustments)
  select v_plan_id, (m->>'day')::date, (m->>'meal_type')::public.meal_type, nullif(m->>'recipe_id', '')::uuid,
         (m->>'servings')::smallint, coalesce(m->'adjustments', '{}'::jsonb)
  from jsonb_array_elements(p_meals) as m
  on conflict (meal_plan_id, day, meal_type) do nothing;

  return v_plan_id;
end;
$$;

-- Replaces one planned meal and learns from the reason (design doc §5).
create function public.replace_plan_meal(
  p_plan_meal_id uuid,
  p_recipe_id uuid,
  p_reason public.replace_reason,
  p_adjustments jsonb default '{}'
)
returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_household_id uuid := public.current_household_id();
  v_member_id uuid := public.current_member_id();
  v_meal public.plan_meals;
  v_old_minutes smallint;
  v_current_max integer;
begin
  select pm.* into v_meal
  from public.plan_meals pm
  join public.meal_plans mp on mp.id = pm.meal_plan_id
  where pm.id = p_plan_meal_id and mp.household_id = v_household_id
  for update of pm;
  if v_meal.id is null then
    raise exception 'plan_meal_not_found' using errcode = 'P0001';
  end if;
  if not public.can_read_recipe(p_recipe_id) then
    raise exception 'recipe_not_found' using errcode = 'P0001';
  end if;

  if v_meal.recipe_id is not null and p_reason is not null then
    insert into public.reactions (member_id, recipe_id, kind, reason, plan_meal_id)
    values (v_member_id, v_meal.recipe_id, 'replaced', p_reason, p_plan_meal_id);

    select total_minutes into v_old_minutes from public.recipes where id = v_meal.recipe_id;
    insert into public.household_learned_prefs (household_id) values (v_household_id) on conflict do nothing;

    if p_reason = 'too_slow' and v_old_minutes is not null then
      select (max_minutes_by_meal_type->>(v_meal.meal_type::text))::integer into v_current_max
      from public.household_learned_prefs where household_id = v_household_id;
      update public.household_learned_prefs
      set max_minutes_by_meal_type = max_minutes_by_meal_type
            || jsonb_build_object(v_meal.meal_type::text, greatest(10, least(coalesce(v_current_max, 1440), v_old_minutes - 10))),
          updated_at = now()
      where household_id = v_household_id;
    elsif p_reason = 'too_expensive' then
      update public.household_learned_prefs
      set price_sensitivity = least(1, price_sensitivity + 0.1), updated_at = now()
      where household_id = v_household_id;
    end if;
  end if;

  update public.plan_meals
  set recipe_id = p_recipe_id, adjustments = coalesce(p_adjustments, '{}'::jsonb), status = 'planned'
  where id = p_plan_meal_id;
end;
$$;

revoke execute on function public.save_week_plan(date, jsonb) from public, anon;
revoke execute on function public.replace_plan_meal(uuid, uuid, public.replace_reason, jsonb) from public, anon;
grant execute on function public.save_week_plan(date, jsonb) to authenticated;
grant execute on function public.replace_plan_meal(uuid, uuid, public.replace_reason, jsonb) to authenticated;
