-- Households review low-confidence product matches: read them, then confirm or reject.

drop policy "signed-in users read usable matches" on public.product_matches;
create policy "signed-in users read matches" on public.product_matches for select to authenticated
  using (status <> 'rejected');

create function public.review_product_match(p_match_id uuid, p_approve boolean) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if public.current_household_id() is null then
    raise exception 'not a household member' using errcode = '42501';
  end if;
  update public.product_matches
    set status = case when p_approve then 'confirmed'::public.match_status else 'rejected'::public.match_status end
    where id = p_match_id and status = 'pending_review';
  if not found then
    raise exception 'match not pending' using errcode = 'P0002';
  end if;
end;
$$;

revoke all on function public.review_product_match(uuid, boolean) from public, anon;
grant execute on function public.review_product_match(uuid, boolean) to authenticated;
