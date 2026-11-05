# TIMELESS — Recepciones parciales de órdenes de compra

Estado: **pendiente de implementar** (2026-11-04). No habilitar la interfaz sin haber aplicado y verificado primero la migración de Supabase.

## Diagnóstico verificado
- `purchases-admin.js` actualmente cambia `purchase_orders.status` a `received`.
- El trigger `trg_purchase_orders_receive_inventory` invoca `private.receive_purchase_order_to_inventory()` y agrega todas las líneas de la OC a `inventory_movements` de una sola vez.
- No existen actualmente `public.purchase_receipts` ni la función `public.record_purchase_receipt(uuid,uuid,jsonb,text)` (consulta realizada el 2026-11-04).
- Existen órdenes históricas con `inventory_received_at` establecido: **no se deben duplicar ni migrar como entradas nuevas**.

## Contrato funcional
1. Botón `Recepcionar artículos` en cada OC con pendientes, en el módulo Compras.
2. Mostrar por línea: solicitado, recibido acumulado, pendiente, costo unitario histórico; indicar cantidad recibida en esta operación (entero entre 0 y pendiente).
3. Una OC admite varias recepciones. Cada una conserva ID único de solicitud, fecha, usuario, notas y sus líneas.
4. Cada recepción agrega únicamente las unidades recibidas a `inventory_movements` y actualiza el costo promedio ponderado **dentro de una misma transacción**.
5. Una vez recibidas todas las cantidades, marcar OC como `received`; mientras haya saldo pendiente, mantener estado no finalizado.
6. Reintentos con el mismo identificador deben devolver el resultado previo, sin volver a incrementar stock.
7. Bloquear sobre-recepción, cantidades negativas, línea que pertenece a otra OC, alteraciones de líneas ya recibidas, cancelación posterior a la recepción y escritura directa no autorizada de recibos.
8. Los cambios deben protegerse en Postgres con control de rol y MFA, bloqueo de fila de la OC, comprobaciones y operación atómica. No confiar únicamente en validación JavaScript.
9. **No modificar** el ingreso manual existente en Inventario ni el diseño aprobado de Pedidos.
10. Órdenes ya recepcionadas mediante el disparador anterior: conservar como históricas completas sin recrear movimientos.

## Migración propuesta
- Tablas `purchase_receipts` y `purchase_receipt_lines`, con RLS de lectura para personal MFA y escrituras solo mediante RPC autorizada.
- RPC transaccional `record_purchase_receipt(request_id, purchase_order_id, items, notes)` que valida pendientes, registra líneas, actualiza costo y Kardex.
- Reemplazar ingreso automático total al cambiar `status` por una guarda que exija el procedimiento de recepción.
- Bloquear la alteración de cantidades o costes en OCs con recepciones registradas.
- Versionar la migración y ejecutar pruebas en transacciones con ROLLBACK: primera recepción, segunda recepción, completitud, reintento idéntico, intento de sobre-recepción, concurrencia, rol no autorizado, OC cerrada, stock y costos.

## Bloqueo actual
La solicitud de migración a Supabase fue bloqueada por controles de seguridad antes de aplicarse. La comprobación posterior confirmó que ambas estructuras propuestas siguen ausentes. **No publicar controles de recepción parcial hasta resolver y verificar esta dependencia.**
