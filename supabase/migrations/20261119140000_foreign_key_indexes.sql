-- Supporting indexes for tenant joins and high-volume foreign keys.
alter table public.menu_categories drop constraint if exists menu_categories_restaurant_id_fkey1;

create index if not exists audit_logs_actor_user_id_idx on public.audit_logs(actor_user_id);
create index if not exists audit_logs_restaurant_id_idx on public.audit_logs(restaurant_id);
create index if not exists cash_movements_created_by_idx on public.cash_movements(created_by);
create index if not exists cash_movements_session_idx on public.cash_movements(restaurant_id,cash_session_id);
create index if not exists cash_sessions_closed_by_idx on public.cash_sessions(closed_by);
create index if not exists cash_sessions_opened_by_idx on public.cash_sessions(opened_by);
create index if not exists menu_items_category_idx on public.menu_items(restaurant_id,category_id);
create index if not exists menu_options_item_idx on public.menu_options(restaurant_id,menu_item_id);
create index if not exists order_items_menu_item_idx on public.order_items(restaurant_id,menu_item_id);
create index if not exists order_items_order_idx on public.order_items(restaurant_id,order_id);
create index if not exists orders_created_by_idx on public.orders(created_by);
create index if not exists orders_customer_idx on public.orders(restaurant_id,customer_id);
create index if not exists orders_table_idx on public.orders(restaurant_id,table_id);
create index if not exists refunds_created_by_idx on public.refunds(created_by);
create index if not exists refunds_order_idx on public.refunds(restaurant_id,order_id);
create index if not exists reservations_customer_idx on public.reservations(restaurant_id,customer_id);
create index if not exists reservations_table_idx on public.reservations(restaurant_id,table_id);
create index if not exists restaurants_owner_user_id_idx on public.restaurants(owner_user_id);
create index if not exists stock_movements_created_by_idx on public.stock_movements(created_by);
create index if not exists stock_movements_item_idx on public.stock_movements(restaurant_id,inventory_item_id);
