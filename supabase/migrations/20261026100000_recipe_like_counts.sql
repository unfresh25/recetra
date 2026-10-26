-- Aggregate only public recipes; private reaction rows remain protected by RLS.
create function public.recipe_like_counts(p_recipe_ids uuid[])
returns table (recipe_id uuid, likes integer)
language sql stable security definer set search_path = ''
as $$
  select r.id, count(distinct reaction.member_id)::integer
  from public.recipes r
  left join public.reactions reaction on reaction.recipe_id = r.id and reaction.kind = 'favorite'
  where r.id = any(p_recipe_ids) and r.visibility = 'public'
  group by r.id;
$$;
revoke all on function public.recipe_like_counts(uuid[]) from public, anon;
grant execute on function public.recipe_like_counts(uuid[]) to authenticated;

-- Resolve the member from the session, never from caller-supplied household data.
create function public.toggle_recipe_reaction(p_recipe_id uuid, p_kind public.reaction_kind)
returns boolean
language plpgsql security definer set search_path = ''
as $$
declare
  v_member_id uuid := public.current_member_id();
begin
  if v_member_id is null or not public.can_read_recipe(p_recipe_id) then
    raise exception 'Recipe unavailable' using errcode = '42501';
  end if;
  if p_kind is null or p_kind not in ('favorite', 'dislike', 'veto') then
    raise exception 'Invalid toggle kind' using errcode = '22023';
  end if;
  -- Serialize this member's toggles, including dislike (which has no unique index).
  perform 1 from public.members where id = v_member_id for update;
  delete from public.reactions
    where member_id = v_member_id and recipe_id = p_recipe_id and kind = p_kind;
  if found then return false; end if;
  insert into public.reactions (member_id, recipe_id, kind) values (v_member_id, p_recipe_id, p_kind);
  return true;
end;
$$;
revoke all on function public.toggle_recipe_reaction(uuid, public.reaction_kind) from public, anon;
grant execute on function public.toggle_recipe_reaction(uuid, public.reaction_kind) to authenticated;
