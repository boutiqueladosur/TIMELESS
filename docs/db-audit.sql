-- TIMELESS · Auditoría SQL de solo lectura, noviembre 2026
-- Ejecutar en Supabase SQL Editor con un rol autorizado.
-- Devuelve conteos y nombres de controles, sin correos ni datos personales.
-- No contiene operaciones de escritura ni elimina integraciones.
with checks as (
 select 'Seguridad'::text section,'Tablas públicas sin RLS'::text control,
   (select count(*) from pg_tables where schemaname='public' and not rowsecurity)::bigint findings
 union all select 'Seguridad','Vistas públicas sin security_invoker',
   (select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace
     where n.nspname='public' and c.relkind='v'
     and not ('security_invoker=true'=any(coalesce(c.reloptions,array[]::text[]))))::bigint
 union all select 'Seguridad','Políticas de escritura abiertas al rol anónimo',
   (select count(*) from pg_policies p where schemaname='public' and cmd in ('INSERT','UPDATE','DELETE','ALL')
     and (roles @> array['anon']::name[] or roles @> array['public']::name[]))::bigint
 union all select 'Pedidos','Pedidos sin artículos',
   (select count(*) from public.orders o where not exists (select 1 from public.order_items i where i.order_id=o.id))::bigint
 union all select 'Pedidos','Subtotal distinto del detalle',
   (select count(*) from public.orders o where o.subtotal_clp <> coalesce(
    (select sum(i.line_total_clp) from public.order_items i where i.order_id=o.id),0))::bigint
 union all select 'Pedidos','Total incorrecto',
   (select count(*) from public.orders o where o.total_clp <> greatest(o.subtotal_clp+o.shipping_clp-o.discount_clp,0))::bigint
 union all select 'Pagos','Pagado distinto de pagos confirmados',
   (select count(*) from public.orders o where o.paid_amount_clp <> coalesce(
    (select sum(p.amount_clp) from public.order_payments p where p.order_id=o.id and p.status='confirmed'),0))::bigint
 union all select 'Pagos','Saldo distinto del total menos pagos',
   (select count(*) from public.orders o where
    o.balance_due_clp <> case when o.status in ('cancelled','refunded') then 0 else greatest(o.total_clp-o.paid_amount_clp,0) end)::bigint
 union all select 'Inventario','Stock físico negativo',
   (select count(*) from public.products where stock<0)::bigint
 union all select 'Inventario','Stock distinto del Kardex',
   (select count(*) from public.products p where p.stock <> coalesce(
    (select sum(m.quantity_delta) from public.inventory_movements m where m.product_id=p.id),0))::bigint
 union all select 'Inventario','Reservas activas que superan stock',
   (select count(*) from public.products p where p.stock < coalesce(
    (select sum(r.quantity) from public.inventory_reservations r where r.product_id=p.id and r.status='active'),0))::bigint
 union all select 'Devoluciones','Reembolsos completados sin nota de crédito',
   (select count(*) from public.order_returns r where r.refund_status='completed' and r.sales_document_id is null)::bigint
 union all select 'Documentos','Notas de crédito emitidas sin líneas',
   (select count(*) from public.sales_documents d where d.document_type='nota_credito' and d.status='issued'
     and not exists (select 1 from public.sales_document_items i where i.sales_document_id=d.id))::bigint
 union all select 'Catálogo','Productos activos sin imagen',
   (select count(*) from public.products p where p.is_active and not exists (
    select 1 from public.product_images i where i.product_id=p.id))::bigint
)
select section,control,findings,
 case when findings=0 then 'OK' else 'REVISAR' end as result
from checks order by section,control;
