-- Bind QR idempotency keys to their first payload and handle concurrent retries safely.
alter table public.orders add column if not exists idempotency_payload_hash text;

create or replace function public.qr_submit_order(
 p_session_hash text,p_idempotency_key text,p_items jsonb,p_notes text default null
)
returns jsonb language plpgsql security definer set search_path=''
as $$
declare
 v_restaurant_id uuid; v_table_id uuid; v_session_id uuid; v_order_id uuid; v_order_number bigint;
 v_total bigint:=0; v_line jsonb; v_item public.menu_items%rowtype; v_qty numeric;
 v_options jsonb; v_option jsonb; v_option_total bigint; v_unit bigint; v_line_total bigint;
 v_note text; v_payload_hash text;
begin
 if p_idempotency_key is null or length(p_idempotency_key)<16 or length(p_idempotency_key)>128 then
  raise exception 'invalid_idempotency_key' using errcode='22023';
 end if;
 if jsonb_typeof(p_items)<>'array' or jsonb_array_length(p_items)<1 or jsonb_array_length(p_items)>40 then
  raise exception 'invalid_order_items' using errcode='22023';
 end if;
 v_payload_hash:=encode(extensions.digest(convert_to(p_items::text||chr(31)||coalesce(p_notes,''),'UTF8'),'sha256'),'hex');
 select s.restaurant_id,q.table_id,s.id into v_restaurant_id,v_table_id,v_session_id
 from public.table_qr_sessions s join public.table_qr_codes q on q.id=s.qr_code_id
 join public.dining_tables t on t.id=q.table_id and t.qr_version=s.qr_version and t.qr_version=q.version
 join public.restaurants r on r.id=s.restaurant_id and r.status='active'
 where s.session_hash=p_session_hash and s.revoked_at is null and s.expires_at>now()
 and q.active and t.status in ('available','occupied') for update of s;
 if not found then raise exception 'table_session_invalid' using errcode='28000'; end if;
 insert into public.orders(restaurant_id,table_id,status,payment_status,subtotal_xof,total_xof,notes,idempotency_key,idempotency_payload_hash,qr_session_id)
 values(v_restaurant_id,v_table_id,'new','unpaid',0,0,nullif(left(coalesce(p_notes,''),1000),''),p_idempotency_key,v_payload_hash,v_session_id)
 on conflict (restaurant_id,idempotency_key) where idempotency_key is not null do nothing
 returning id,order_number into v_order_id,v_order_number;
 if v_order_id is null then
  select o.id,o.order_number into v_order_id,v_order_number from public.orders o
  where o.restaurant_id=v_restaurant_id and o.idempotency_key=p_idempotency_key
  and o.qr_session_id=v_session_id and o.idempotency_payload_hash=v_payload_hash;
  if not found then raise exception 'idempotency_key_conflict' using errcode='23505'; end if;
  return jsonb_build_object('order_id',v_order_id,'order_number',v_order_number,'duplicate',true);
 end if;
 for v_line in select value from jsonb_array_elements(p_items) loop
  if not (v_line ? 'item_id') or not (v_line ? 'quantity') then raise exception 'invalid_order_line' using errcode='22023'; end if;
  v_qty:=(v_line->>'quantity')::numeric;
  if v_qty<=0 or v_qty>50 or v_qty*4<>trunc(v_qty*4) then raise exception 'invalid_quantity' using errcode='22023'; end if;
  select * into v_item from public.menu_items i where i.id=(v_line->>'item_id')::uuid and i.restaurant_id=v_restaurant_id and i.is_available for share;
  if not found then raise exception 'menu_item_unavailable' using errcode='22023'; end if;
  v_options:=coalesce(v_line->'option_ids','[]'::jsonb);
  if jsonb_typeof(v_options)<>'array' or jsonb_array_length(v_options)>10 then raise exception 'invalid_options' using errcode='22023'; end if;
  v_option_total:=0; v_note:='';
  for v_option in select value from jsonb_array_elements(v_options) loop
   if not exists(select 1 from public.menu_options o where o.id=(v_option#>>'{}')::uuid and o.restaurant_id=v_restaurant_id and o.menu_item_id=v_item.id and o.is_available) then raise exception 'menu_option_unavailable' using errcode='22023'; end if;
   select v_option_total+o.price_delta_xof into v_option_total from public.menu_options o where o.id=(v_option#>>'{}')::uuid;
   v_note:=concat_ws(', ',nullif(v_note,''),(select o.name from public.menu_options o where o.id=(v_option#>>'{}')::uuid));
  end loop;
  v_unit:=v_item.price_xof+v_option_total; v_line_total:=round(v_unit*v_qty)::bigint; v_total:=v_total+v_line_total;
  insert into public.order_items(restaurant_id,order_id,menu_item_id,item_name_snapshot,quantity,unit_price_xof,line_total_xof,notes)
  values(v_restaurant_id,v_order_id,v_item.id,v_item.name,v_qty,v_unit,v_line_total,nullif(concat_ws(' · ',nullif(v_note,''),left(coalesce(v_line->>'notes',''),500)),''));
 end loop;
 if v_total<=0 then raise exception 'invalid_order_total' using errcode='22023'; end if;
 update public.orders set subtotal_xof=v_total,total_xof=v_total,updated_at=now() where id=v_order_id;
 insert into public.audit_logs(restaurant_id,action,entity_type,entity_id,details)
 values(v_restaurant_id,'customer_order.created','order',v_order_id::text,jsonb_build_object('channel','table_qr','table_id',v_table_id,'order_number',v_order_number));
 return jsonb_build_object('order_id',v_order_id,'order_number',v_order_number,'total_xof',v_total,'duplicate',false);
end $$;
revoke all on function public.qr_submit_order(text,text,jsonb,text) from public,anon,authenticated;
grant execute on function public.qr_submit_order(text,text,jsonb,text) to service_role;
