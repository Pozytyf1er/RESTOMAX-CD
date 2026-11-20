-- Transactional RLS isolation test. All fixtures are rolled back.
begin;
do $$
declare
  user_a uuid := 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  user_b uuid := 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
  tenant_a uuid;
  tenant_b uuid;
  visible_count integer;
begin
  insert into auth.users(id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data)
  values
    (user_a,'authenticated','authenticated','rls-a@example.invalid','',now(),'{}'::jsonb,'{}'::jsonb),
    (user_b,'authenticated','authenticated','rls-b@example.invalid','',now(),'{}'::jsonb,'{}'::jsonb)
  on conflict (id) do nothing;

  insert into public.restaurants(name,city,owner_user_id)
  values ('Tenant Isolation A','Abidjan',user_a) returning id into tenant_a;
  insert into public.restaurants(name,city,owner_user_id)
  values ('Tenant Isolation B','Yamoussoukro',user_b) returning id into tenant_b;

  insert into public.restaurant_memberships(restaurant_id,user_id,role)
  values (tenant_a,user_a,'owner'),(tenant_b,user_b,'owner');

  insert into public.orders(restaurant_id,subtotal_xof,total_xof,created_by)
  values (tenant_a,1000,1000,user_a),(tenant_b,2000,2000,user_b);

  execute 'set local role authenticated';
  perform set_config('request.jwt.claim.sub',user_a::text,true);
  select count(*) into visible_count from public.orders;
  if visible_count <> 1 then raise exception 'tenant A isolation failed: saw % orders',visible_count; end if;
  if exists (select 1 from public.restaurants where id=tenant_b) then
    raise exception 'tenant A can read tenant B restaurant';
  end if;
  if exists (select 1 from public.orders where restaurant_id=tenant_b) then
    raise exception 'tenant A can read tenant B order';
  end if;

  perform set_config('request.jwt.claim.sub',user_b::text,true);
  select count(*) into visible_count from public.orders;
  if visible_count <> 1 then raise exception 'tenant B isolation failed: saw % orders',visible_count; end if;
  if exists (select 1 from public.restaurants where id=tenant_a) then
    raise exception 'tenant B can read tenant A restaurant';
  end if;
  if exists (select 1 from public.orders where restaurant_id=tenant_a) then
    raise exception 'tenant B can read tenant A order';
  end if;
end $$;
rollback;
