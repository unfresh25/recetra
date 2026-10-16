-- Onboarding: per-member completion flag and atomic "replace the whole set" helpers.
-- The helpers run as the caller (security invoker), so RLS still decides what they may touch.

alter table public.members add column onboarded_at timestamptz;

revoke update on public.members from authenticated;
grant update (display_name, onboarded_at) on public.members to authenticated;

create function public.replace_household_stores(p_store_ids uuid[])
returns void
language plpgsql security invoker set search_path = '' as $$
declare
  v_household_id uuid := public.current_household_id();
begin
  if v_household_id is null then
    raise exception 'not_in_household' using errcode = 'P0001';
  end if;
  if coalesce(cardinality(p_store_ids), 0) = 0 then
    raise exception 'stores_required' using errcode = 'P0001';
  end if;

  delete from public.household_stores
  where household_id = v_household_id and store_id <> all (p_store_ids);

  insert into public.household_stores (household_id, store_id)
  select v_household_id, unnest(p_store_ids)
  on conflict do nothing;
end;
$$;

-- Replaces every restriction of one kind for the calling member.
create function public.replace_my_restrictions(
  p_kind public.restriction_kind,
  p_allergens public.allergen[] default '{}',
  p_ingredient_ids uuid[] default '{}',
  p_categories public.ingredient_category[] default '{}',
  p_diets public.diet[] default '{}'
)
returns void
language plpgsql security invoker set search_path = '' as $$
declare
  v_member_id uuid := public.current_member_id();
begin
  if v_member_id is null then
    raise exception 'not_in_household' using errcode = 'P0001';
  end if;

  delete from public.restrictions where member_id = v_member_id and kind = p_kind;

  if p_kind = 'allergy' then
    insert into public.restrictions (member_id, kind, allergen)
    select v_member_id, 'allergy', a from unnest(p_allergens) as a;
  elsif p_kind = 'dislike' then
    insert into public.restrictions (member_id, kind, ingredient_id)
    select v_member_id, 'dislike', i from unnest(p_ingredient_ids) as i;
    insert into public.restrictions (member_id, kind, ingredient_category)
    select v_member_id, 'dislike', c from unnest(p_categories) as c;
  else
    insert into public.restrictions (member_id, kind, diet)
    select v_member_id, 'diet', d from unnest(p_diets) as d;
  end if;
end;
$$;

revoke execute on function public.replace_household_stores(uuid[]) from public, anon;
revoke execute on function public.replace_my_restrictions(public.restriction_kind, public.allergen[], uuid[], public.ingredient_category[], public.diet[]) from public, anon;
grant execute on function public.replace_household_stores(uuid[]) to authenticated;
grant execute on function public.replace_my_restrictions(public.restriction_kind, public.allergen[], uuid[], public.ingredient_category[], public.diet[]) to authenticated;

-- Store logos are served from /public/stores. Stores without a sharp logo use a brand-color monogram.
update public.stores set logo_url = case slug
  when 'olimpica' then '/stores/olimpica.png'
  when 'd1' then '/stores/d1.png'
  when 'megatiendas' then '/stores/megatiendas.png'
  when 'ara' then '/stores/ara.png'
  when 'jumbo' then '/stores/jumbo.png'
  else null
end;
