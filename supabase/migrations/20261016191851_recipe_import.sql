-- Recipe import: image bucket, job results, and review RPCs for the "por confirmar" inbox.

alter table public.jobs add column result jsonb;

-- Public bucket: recipe thumbnails (written by the service role) and household covers.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('recipe-images', 'recipe-images', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Households may manage their own covers under covers/<household_id>/...
create policy "households upload own covers"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'recipe-images'
    and (storage.foldername(name))[1] = 'covers'
    and (storage.foldername(name))[2] = public.current_household_id()::text
  );

create policy "households replace own covers"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'recipe-images'
    and (storage.foldername(name))[1] = 'covers'
    and (storage.foldername(name))[2] = public.current_household_id()::text
  );

create policy "households delete own covers"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'recipe-images'
    and (storage.foldername(name))[1] = 'covers'
    and (storage.foldername(name))[2] = public.current_household_id()::text
  );

-- Review RPCs: only the importing household can approve or reject its drafts.
create function public.review_recipe(
  p_recipe_id uuid,
  p_approve boolean,
  p_meal_types public.meal_type[] default null
)
returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_recipe public.recipes;
begin
  select * into v_recipe from public.recipes where id = p_recipe_id for update;
  if v_recipe.id is null or v_recipe.imported_by_household_id is distinct from public.current_household_id() then
    raise exception 'recipe_not_found' using errcode = 'P0001';
  end if;
  if v_recipe.status <> 'pending_review' then
    raise exception 'recipe_already_reviewed' using errcode = 'P0001';
  end if;
  if p_approve and p_meal_types is not null and cardinality(p_meal_types) = 0 then
    raise exception 'meal_types_required' using errcode = 'P0001';
  end if;

  update public.recipes
  set status = case when p_approve then 'approved'::public.recipe_status else 'rejected'::public.recipe_status end,
      meal_types = coalesce(p_meal_types, meal_types)
  where id = p_recipe_id;
end;
$$;

-- Lets a household fix the core/accessory flag of an ingredient while reviewing.
create function public.set_recipe_ingredient_role(
  p_recipe_id uuid,
  p_position smallint,
  p_role public.ingredient_role
)
returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not exists (
    select 1 from public.recipes
    where id = p_recipe_id and imported_by_household_id = public.current_household_id()
  ) then
    raise exception 'recipe_not_found' using errcode = 'P0001';
  end if;
  update public.recipe_ingredients set role = p_role where recipe_id = p_recipe_id and position = p_position;
end;
$$;

revoke execute on function public.review_recipe(uuid, boolean, public.meal_type[]) from public, anon;
revoke execute on function public.set_recipe_ingredient_role(uuid, smallint, public.ingredient_role) from public, anon;
grant execute on function public.review_recipe(uuid, boolean, public.meal_type[]) to authenticated;
grant execute on function public.set_recipe_ingredient_role(uuid, smallint, public.ingredient_role) to authenticated;
