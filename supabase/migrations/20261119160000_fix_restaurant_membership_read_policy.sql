-- Correct tenant membership predicate in restaurant visibility policy.
-- Keep the permission check and the explicit active-membership fallback aligned.
drop policy if exists restaurants_member_read on public.restaurants;
create policy restaurants_member_read on public.restaurants
for select to authenticated
using (
  private.has_restaurant_permission(id, 'settings.manage')
  or exists (
    select 1
    from public.restaurant_memberships m
    where m.restaurant_id = restaurants.id
      and m.user_id = (select auth.uid())
      and m.active = true
  )
);
