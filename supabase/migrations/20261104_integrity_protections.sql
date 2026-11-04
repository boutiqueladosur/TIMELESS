-- TIMELESS: Snapshot of tested integrity protections applied on 2026-11-04.

-- Incremental migration for databases with existing orders, deliveries and payments.

-- Never execute on production without review and backup.

alter table public.order_deliveries add column if not exists request_id uuid;

create unique index if not exists uq_order_delivery_request_id on public.order_deliveries(request_id) where request_id is not null;

CREATE OR REPLACE FUNCTION private.prevent_reversal_of_refunded_payments()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_order_id uuid; v_refunded bigint; v_remaining bigint; v_total bigint; v_order_status text; v_shipping text;
begin
 if old.status<>'confirmed' then
  if tg_op='DELETE' then return old; else return new; end if;
 end if;
 if tg_op='UPDATE' and new.status='confirmed' and new.amount_clp=old.amount_clp and new.order_id=old.order_id then return new; end if;
 v_order_id:=old.order_id;
 select total_clp,status,shipping_status into v_total,v_order_status,v_shipping
 from public.orders where id=v_order_id for update;
 select coalesce(sum(refund_amount_clp),0) into v_refunded
 from public.order_returns where order_id=v_order_id and refund_status='completed';
 select coalesce(sum(amount_clp),0) into v_remaining
 from public.order_payments where order_id=v_order_id and status='confirmed' and id<>old.id;
 if tg_op='UPDATE' and new.status='confirmed' and new.order_id=v_order_id
 then v_remaining:=v_remaining+new.amount_clp; end if;
 if v_remaining<v_refunded then
  raise exception 'PAGO_RESPALDA_REEMBOLSO: quedan % confirmados y % reembolsados',v_remaining,v_refunded using errcode='23514';
 end if;
 if (v_order_status in ('preparing','shipped','delivered') or v_shipping in ('ready','dispatched','in_transit','delivered'))
 and v_remaining<v_total then
  raise exception 'PAGO_COMPLETO_REQUERIDO: no se pueden reducir pagos de pedidos en preparación, despacho o entregados' using errcode='23514';
 end if;
 if tg_op='DELETE' then return old; else return new; end if;
end $function$
;

CREATE OR REPLACE FUNCTION public.record_order_delivery_once(p_request_id uuid, p_order_id uuid, p_items jsonb, p_carrier text DEFAULT NULL::text, p_tracking text DEFAULT NULL::text, p_notes text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_id uuid; v_old_order uuid; v_existing jsonb; v_requested jsonb; v_result jsonb; v_remaining int;
begin
 if auth.uid() is null or (auth.jwt()->>'aal')<>'aal2'
 or (auth.jwt()->'app_metadata'->>'role') not in ('admin','owner')
 then raise exception 'Permiso administrativo y MFA requeridos' using errcode='42501'; end if;
 if p_request_id is null or p_order_id is null then raise exception 'Identificador de solicitud obligatorio'; end if;
 perform 1 from public.orders where id=p_order_id for update;
 select d.id,d.order_id into v_id,v_old_order from public.order_deliveries d where d.request_id=p_request_id;
 if v_id is not null then
  select coalesce(jsonb_agg(jsonb_build_object('order_item_id',x.order_item_id,'quantity',x.quantity) order by x.order_item_id),'[]'::jsonb)
  into v_existing
  from (select l.order_item_id,sum(l.quantity)::int quantity from public.delivery_lines l where l.delivery_id=v_id group by l.order_item_id) x;
  select coalesce(jsonb_agg(jsonb_build_object('order_item_id',x.order_item_id,'quantity',x.quantity) order by x.order_item_id),'[]'::jsonb)
  into v_requested
  from (select z.order_item_id,sum(z.quantity)::int quantity from jsonb_to_recordset(p_items) z(order_item_id uuid,quantity int) group by z.order_item_id) x;
  if v_old_order is distinct from p_order_id or v_existing is distinct from v_requested
  then raise exception 'DELIVERY_REQUEST_REUSED_WITH_DIFFERENT_ITEMS'; end if;
  select coalesce(sum(oi.quantity-coalesce((select sum(l.quantity) from public.delivery_lines l join public.order_deliveries d on d.id=l.delivery_id where d.order_id=p_order_id and l.order_item_id=oi.id),0)),0)::int
  into v_remaining from public.order_items oi where oi.order_id=p_order_id;
  return jsonb_build_object('delivery_id',v_id,'delivery_number',(select delivery_number from public.order_deliveries where id=v_id),'remaining_units',v_remaining,'complete',v_remaining=0,'duplicate',true);
 end if;
 v_result:=public.record_order_delivery(p_order_id,p_items,p_carrier,p_tracking,p_notes);
 update public.order_deliveries set request_id=p_request_id where id=(v_result->>'delivery_id')::uuid;
 return v_result||jsonb_build_object('duplicate',false);
end $function$
;

CREATE OR REPLACE FUNCTION private.require_full_payment_before_fulfillment()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
 v_confirmed bigint;
begin
 if new.status in ('preparing','shipped','delivered')
    or new.shipping_status in ('ready','dispatched','in_transit','delivered')
 then
   select coalesce(sum(p.amount_clp),0) into v_confirmed
   from public.order_payments p where p.order_id=new.id and p.status='confirmed';
   if v_confirmed < new.total_clp then
     raise exception 'PAGO_COMPLETO_REQUERIDO: pagado $%, total $%, pendiente $%',
       v_confirmed,new.total_clp,greatest(new.total_clp-v_confirmed,0)
       using errcode='23514';
   end if;
 end if;
 return new;
end;
$function$
;

drop trigger if exists trg_orders_require_full_payment on public.orders;

drop trigger if exists trg_y_full_payment_fulfillment on public.orders;

create trigger trg_y_full_payment_fulfillment before update of status,shipping_status,total_clp on public.orders for each row execute function private.require_full_payment_before_fulfillment();

drop trigger if exists trg_prevent_reversal_of_refunded_payments on public.order_payments;

create trigger trg_prevent_reversal_of_refunded_payments before update or delete on public.order_payments for each row execute function private.prevent_reversal_of_refunded_payments();

revoke all on function public.record_order_delivery(uuid,jsonb,text,text,text) from public,anon,authenticated;

revoke all on function public.record_order_delivery_once(uuid,uuid,jsonb,text,text,text) from public,anon;

grant execute on function public.record_order_delivery_once(uuid,uuid,jsonb,text,text,text) to authenticated;

revoke insert on public.order_deliveries,public.delivery_lines from authenticated;