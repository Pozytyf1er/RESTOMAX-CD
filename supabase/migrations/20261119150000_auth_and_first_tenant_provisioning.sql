-- Secure self-service first-restaurant provisioning.
create or replace function private.provision_first_restaurant(p_name text, p_city text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_restaurant_id uuid;
  v_name text := trim(coalesce(p_name,''));
  v_city text := trim(coalesce(p_city,''));
begin
  if v_user_id is null then
    raise exception 'authentication_required' using errcode = '28000';
  end if;
  if char_length(v_name) < 2 or char_length(v_name) > 100
     or char_length(v_city) < 2 or char_length(v_city) > 80 then
    raise exception 'invalid_restaurant_details' using errcode = '22023';
  end if;
  if exists (select 1 from public.restaurant_memberships m where m.user_id = v_user_id and m.active) then
    raise exception 'first_restaurant_already_provisioned' using errcode = '23505';
  end if;

  insert into public.restaurants(name,city,currency,timezone,status,owner_user_id)
  values (v_name,v_city,'XOF','Africa/Abidjan','active',v_user_id)
  returning id into v_restaurant_id;

  insert into public.restaurant_memberships(restaurant_id,user_id,role,active,permissions)
  values (v_restaurant_id,v_user_id,'owner',true,'{}'::jsonb);

  insert into public.audit_logs(restaurant_id,actor_user_id,action,entity_type,entity_id,details)
  values (v_restaurant_id,v_user_id,'restaurant.provisioned','restaurant',v_restaurant_id::text,
          jsonb_build_object('name',v_name,'city',v_city,'currency','XOF'));

  return v_restaurant_id;
end;
$$;

revoke all on function private.provision_first_restaurant(text,text) from public, anon;
grant execute on function private.provision_first_restaurant(text,text) to authenticated;

create or replace function public.provision_first_restaurant(p_name text, p_city text)
returns uuid
language sql
security invoker
set search_path = ''
as $$
  select private.provision_first_restaurant(p_name,p_city);
$$;
revoke all on function public.provision_first_restaurant(text,text) from public, anon;
grant execute on function public.provision_first_restaurant(text,text) to authenticated;

-- Profile creation is server-side; never trust user_metadata as authorization data.
create or replace function private.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles(id,display_name)
  values (new.id, nullif(trim(coalesce(new.raw_user_meta_data ->> 'full_name','')), ''))
  on conflict (id) do nothing;
  return new;
end;
$$;
revoke all on function private.handle_new_auth_user() from public, anon, authenticated;
drop trigger if exists on_auth_user_created_profile on auth.users;
create trigger on_auth_user_created_profile
after insert on auth.users
for each row execute function private.handle_new_auth_user();

-- Helper for authenticated users to inspect only their own memberships.
create or replace function public.get_my_restaurant_memberships()
returns table (restaurant_id uuid, restaurant_name text, role text, active boolean, restaurant_status text)
language sql
stable
security invoker
set search_path = ''
as $$
  select r.id,r.name,m.role,m.active,r.status
  from public.restaurant_memberships m
  join public.restaurants r on r.id=m.restaurant_id
  where m.user_id=(select auth.uid());
$$;
revoke all on function public.get_my_restaurant_memberships() from public, anon;
grant execute on function public.get_my_restaurant_memberships() to authenticated;
