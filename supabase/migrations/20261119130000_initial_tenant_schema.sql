-- Resto'MAX Core: tenant foundation (PostgreSQL 17 / Supabase)
create extension if not exists pgcrypto;

create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.restaurants (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 2 and 100),
  city text not null check (char_length(trim(city)) between 2 and 80),
  currency text not null default 'XOF' check (currency = 'XOF'),
  timezone text not null default 'Africa/Abidjan' check (timezone = 'Africa/Abidjan'),
  status text not null default 'active' check (status in ('provisioning','active','suspended','deleted')),
  owner_user_id uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.restaurant_memberships (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete restrict,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner','manager','cashier','server','kitchen')),
  active boolean not null default true,
  permissions jsonb not null default '{}'::jsonb check (jsonb_typeof(permissions) = 'object'),
  created_at timestamptz not null default now(),
  unique (restaurant_id,user_id),
  unique (restaurant_id,id)
);

create index restaurant_memberships_user_active_idx on public.restaurant_memberships(user_id,active);
create index restaurant_memberships_restaurant_role_idx on public.restaurant_memberships(restaurant_id,role,active);

-- A platform administrator is identified only through server-managed app_metadata.
create or replace function private.is_platform_admin()
returns boolean language sql stable security definer set search_path = ''
as $$
  select coalesce((auth.jwt() -> 'app_metadata' ->> 'platform_role') = 'super_admin', false);
$$;

create or replace function private.has_restaurant_permission(p_restaurant_id uuid, p_permission text)
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1
    from public.restaurant_memberships m
    join public.restaurants r on r.id = m.restaurant_id
    where m.restaurant_id = p_restaurant_id
      and m.user_id = (select auth.uid())
      and m.active = true
      and r.status = 'active'
      and case m.role
        when 'owner' then p_permission = any(array[
          'orders.view','orders.create','orders.cancel','payments.collect','payments.refund',
          'menu.view','menu.manage','menu.price','tables.manage','reservations.manage',
          'kitchen.manage','inventory.view','inventory.manage','reports.view','finance.view',
          'finance.manage','staff.manage','settings.manage'
        ])
        when 'manager' then p_permission = any(array[
          'orders.view','orders.create','orders.cancel','payments.collect','payments.refund',
          'menu.view','menu.manage','menu.price','tables.manage','reservations.manage',
          'kitchen.manage','inventory.view','inventory.manage','reports.view','finance.view','staff.manage'
        ])
        when 'cashier' then p_permission = any(array[
          'orders.view','orders.create','payments.collect','payments.refund','menu.view','tables.manage','reservations.manage'
        ])
        when 'server' then p_permission = any(array[
          'orders.view','orders.create','menu.view','tables.manage','reservations.manage'
        ])
        when 'kitchen' then p_permission = any(array[
          'orders.view','menu.view','kitchen.manage','inventory.view'
        ])
        else false
      end
      and case
        when m.permissions ? p_permission then (m.permissions ->> p_permission) = 'true'
        when m.role in ('owner','manager') then true
        when m.role = 'cashier' then p_permission = any(array['orders.view','orders.create','payments.collect','menu.view'])
        when m.role = 'server' then p_permission = any(array['orders.view','orders.create','menu.view','tables.manage','reservations.manage'])
        when m.role = 'kitchen' then p_permission = any(array['orders.view','menu.view','kitchen.manage','inventory.view'])
        else false
      end
  );
$$;

revoke all on function private.has_restaurant_permission(uuid,text) from public, anon;
revoke all on function private.is_platform_admin() from public, anon;
grant execute on function private.has_restaurant_permission(uuid,text) to authenticated;
grant execute on function private.is_platform_admin() to authenticated;

-- Tenant-scoped operational tables. All monetary amounts use integer XOF.
create table public.menu_categories (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete restrict,
  name text not null check (char_length(trim(name)) between 1 and 80),
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (restaurant_id,id),
  foreign key (restaurant_id) references public.restaurants(id)
);
create table public.menu_items (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete restrict,
  category_id uuid,
  name text not null check (char_length(trim(name)) between 1 and 120),
  description text,
  price_xof bigint not null check (price_xof >= 0),
  is_available boolean not null default true,
  item_type text not null default 'food' check (item_type in ('food','drink','other')),
  image_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (restaurant_id,id),
  foreign key (restaurant_id,category_id) references public.menu_categories(restaurant_id,id)
);
create table public.menu_options (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete restrict,
  menu_item_id uuid not null,
  name text not null,
  price_delta_xof bigint not null default 0,
  is_available boolean not null default true,
  foreign key (restaurant_id,menu_item_id) references public.menu_items(restaurant_id,id),
  unique (restaurant_id,id)
);
create table public.dining_tables (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete restrict,
  label text not null,
  area text not null default 'salle',
  capacity integer not null default 2 check (capacity > 0),
  status text not null default 'available' check (status in ('available','occupied','reserved','inactive')),
  qr_version integer not null default 1 check (qr_version > 0),
  created_at timestamptz not null default now(),
  unique (restaurant_id,id),
  unique (restaurant_id,label)
);
create table public.customers (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete restrict,
  full_name text not null,
  phone text,
  email text,
  loyalty_points integer not null default 0 check (loyalty_points >= 0),
  created_at timestamptz not null default now(),
  unique (restaurant_id,id)
);
create table public.orders (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete restrict,
  table_id uuid,
  customer_id uuid,
  order_number bigint generated by default as identity,
  status text not null default 'new' check (status in ('new','accepted','preparing','ready','served','completed','cancelled')),
  payment_status text not null default 'unpaid' check (payment_status in ('unpaid','partial','paid','refunded')),
  subtotal_xof bigint not null default 0 check (subtotal_xof >= 0),
  total_xof bigint not null default 0 check (total_xof >= 0),
  notes text,
  idempotency_key text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (restaurant_id,id),
  unique (restaurant_id,idempotency_key),
  foreign key (restaurant_id,table_id) references public.dining_tables(restaurant_id,id),
  foreign key (restaurant_id,customer_id) references public.customers(restaurant_id,id)
);
create index orders_tenant_created_idx on public.orders(restaurant_id,created_at desc);
create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null,
  order_id uuid not null,
  menu_item_id uuid,
  item_name_snapshot text not null,
  quantity numeric(12,3) not null check (quantity > 0),
  unit_price_xof bigint not null check (unit_price_xof >= 0),
  line_total_xof bigint not null check (line_total_xof >= 0),
  notes text,
  preparation_status text not null default 'new' check (preparation_status in ('new','preparing','ready')),
  foreign key (restaurant_id,order_id) references public.orders(restaurant_id,id) on delete restrict,
  foreign key (restaurant_id,menu_item_id) references public.menu_items(restaurant_id,id)
);
create table public.inventory_items (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete restrict,
  name text not null,
  unit text not null,
  quantity numeric(14,3) not null default 0,
  minimum_quantity numeric(14,3) not null default 0,
  updated_at timestamptz not null default now(),
  unique (restaurant_id,id)
);
create table public.stock_movements (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null,
  inventory_item_id uuid not null,
  movement_type text not null check (movement_type in ('in','out','adjustment','reversal')),
  quantity numeric(14,3) not null check (quantity <> 0),
  reason text not null,
  reference_id uuid,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  foreign key (restaurant_id,inventory_item_id) references public.inventory_items(restaurant_id,id)
);
create table public.reservations (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete restrict,
  table_id uuid,
  customer_id uuid,
  guest_name text not null,
  guest_phone text,
  party_size integer not null check (party_size > 0),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status text not null default 'pending' check (status in ('pending','confirmed','seated','completed','cancelled','no_show')),
  notes text,
  created_at timestamptz not null default now(),
  check (ends_at > starts_at),
  foreign key (restaurant_id,table_id) references public.dining_tables(restaurant_id,id),
  foreign key (restaurant_id,customer_id) references public.customers(restaurant_id,id),
  unique (restaurant_id,id)
);
create table public.cash_sessions (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete restrict,
  opened_by uuid not null references auth.users(id),
  closed_by uuid references auth.users(id),
  opening_amount_xof bigint not null default 0 check (opening_amount_xof >= 0),
  expected_amount_xof bigint,
  counted_amount_xof bigint,
  status text not null default 'open' check (status in ('open','closed')),
  opened_at timestamptz not null default now(),
  closed_at timestamptz,
  unique (restaurant_id,id)
);
create table public.cash_movements (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null,
  cash_session_id uuid not null,
  movement_type text not null check (movement_type in ('sale','refund','expense','deposit','withdrawal')),
  amount_xof bigint not null check (amount_xof > 0),
  reference_id uuid,
  description text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  foreign key (restaurant_id,cash_session_id) references public.cash_sessions(restaurant_id,id)
);
create table public.refunds (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null,
  order_id uuid not null,
  amount_xof bigint not null check (amount_xof > 0),
  reason text not null,
  status text not null default 'requested' check (status in ('requested','approved','completed','rejected')),
  idempotency_key text not null,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  foreign key (restaurant_id,order_id) references public.orders(restaurant_id,id),
  unique (restaurant_id,idempotency_key)
);
create table public.audit_logs (
  id bigint generated always as identity primary key,
  restaurant_id uuid references public.restaurants(id) on delete restrict,
  actor_user_id uuid references auth.users(id),
  action text not null,
  entity_type text not null,
  entity_id text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- No client may self-assign a platform role or write membership rows.
alter table public.profiles enable row level security;
alter table public.restaurants enable row level security;
alter table public.restaurant_memberships enable row level security;
alter table public.menu_categories enable row level security;
alter table public.menu_items enable row level security;
alter table public.menu_options enable row level security;
alter table public.dining_tables enable row level security;
alter table public.customers enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.inventory_items enable row level security;
alter table public.stock_movements enable row level security;
alter table public.reservations enable row level security;
alter table public.cash_sessions enable row level security;
alter table public.cash_movements enable row level security;
alter table public.refunds enable row level security;
alter table public.audit_logs enable row level security;

create policy profiles_self_read on public.profiles for select to authenticated using (id = (select auth.uid()));
create policy profiles_self_insert on public.profiles for insert to authenticated with check (id = (select auth.uid()));
create policy profiles_self_update on public.profiles for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));

create policy restaurants_member_read on public.restaurants for select to authenticated
using (private.has_restaurant_permission(id,'settings.manage') or exists (
  select 1 from public.restaurant_memberships m where m.restaurant_id = id and m.user_id = (select auth.uid()) and m.active
));
create policy memberships_self_or_owner_read on public.restaurant_memberships for select to authenticated
using (user_id = (select auth.uid()) or private.has_restaurant_permission(restaurant_id,'staff.manage'));
-- Membership creation, role changes, suspension and tenant deletion are server-only.

create policy menu_categories_read on public.menu_categories for select to authenticated using (private.has_restaurant_permission(restaurant_id,'menu.view'));
create policy menu_items_read on public.menu_items for select to authenticated using (private.has_restaurant_permission(restaurant_id,'menu.view'));
create policy menu_options_read on public.menu_options for select to authenticated using (private.has_restaurant_permission(restaurant_id,'menu.view'));
create policy tables_read on public.dining_tables for select to authenticated using (private.has_restaurant_permission(restaurant_id,'tables.manage'));
create policy customers_read on public.customers for select to authenticated using (private.has_restaurant_permission(restaurant_id,'orders.view'));
create policy orders_read on public.orders for select to authenticated using (private.has_restaurant_permission(restaurant_id,'orders.view'));
create policy order_items_read on public.order_items for select to authenticated using (private.has_restaurant_permission(restaurant_id,'orders.view'));
create policy inventory_read on public.inventory_items for select to authenticated using (private.has_restaurant_permission(restaurant_id,'inventory.view'));
create policy stock_movements_read on public.stock_movements for select to authenticated using (private.has_restaurant_permission(restaurant_id,'inventory.view'));
create policy reservations_read on public.reservations for select to authenticated using (private.has_restaurant_permission(restaurant_id,'reservations.manage'));
create policy cash_sessions_read on public.cash_sessions for select to authenticated using (private.has_restaurant_permission(restaurant_id,'finance.view'));
create policy cash_movements_read on public.cash_movements for select to authenticated using (private.has_restaurant_permission(restaurant_id,'finance.view'));
create policy refunds_read on public.refunds for select to authenticated using (private.has_restaurant_permission(restaurant_id,'finance.view'));
create policy audit_logs_read on public.audit_logs for select to authenticated using (private.has_restaurant_permission(restaurant_id,'settings.manage'));

-- Frontend roles receive no direct business-table writes in this foundation.
revoke all on all tables in schema public from anon, authenticated;
grant select on public.restaurants, public.restaurant_memberships, public.menu_categories, public.menu_items,
  public.menu_options, public.dining_tables, public.customers, public.orders, public.order_items,
  public.inventory_items, public.stock_movements, public.reservations, public.cash_sessions,
  public.cash_movements, public.refunds, public.audit_logs to authenticated;
grant select, insert, update on public.profiles to authenticated;
revoke all on all tables in schema public from anon;
