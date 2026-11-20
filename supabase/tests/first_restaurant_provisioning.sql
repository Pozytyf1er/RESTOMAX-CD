-- Transactional provisioning test. All fixtures are rolled back.
begin;
insert into auth.users(id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data)
values ('cccccccc-cccc-4ccc-8ccc-cccccccccccc','authenticated','authenticated','provision-test@example.invalid','',now(),'{}'::jsonb,'{}'::jsonb)
on conflict (id) do nothing;
set local role authenticated;
select set_config('request.jwt.claim.sub','cccccccc-cccc-4ccc-8ccc-cccccccccccc',true);
do $$
declare
  tenant_id uuid;
  membership_role text;
begin
  tenant_id := public.provision_first_restaurant('Resto Test','Abidjan');
  select role into membership_role
  from public.restaurant_memberships
  where restaurant_id=tenant_id and user_id=auth.uid() and active;
  if membership_role <> 'owner' then raise exception 'first user was not provisioned as owner'; end if;
  if not exists(select 1 from public.restaurants where id=tenant_id and currency='XOF' and timezone='Africa/Abidjan' and status='active') then
    raise exception 'restaurant defaults are incorrect';
  end if;
  begin
    perform public.provision_first_restaurant('Second Tenant','Abidjan');
    raise exception 'duplicate first-tenant provisioning unexpectedly succeeded';
  exception when unique_violation then
    null;
  end;
  begin
    perform public.provision_first_restaurant('X','Abidjan');
    raise exception 'invalid tenant name unexpectedly accepted';
  exception when invalid_parameter_value then
    null;
  end;
end $$;
rollback;
