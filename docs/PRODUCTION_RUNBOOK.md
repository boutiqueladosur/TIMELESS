# TIMELESS — Runbook de producción

## Alcance actual

El flujo productivo activo contempla catálogo, pedidos, inventario, reservas, compras, proveedores, CRM, pagos manuales, conciliación, devoluciones, despachos, gastos, alertas, dashboard gerencial y auditoría.

SII/DTE y Webpay quedan fuera del alcance operativo por decisión actual del negocio.

## Reglas críticas

- Nunca exponer `service_role` ni secretos de servidor en archivos públicos.
- Todo cambio de producción debe entrar por Pull Request y pasar `TIMELESS CI`.
- No editar stock directamente: usar movimientos de inventario.
- El stock vendible es `físico - reservado`.
- Un pedido pendiente reserva stock por 24 horas; al pasar a pagado/preparando/enviado la reserva queda vigente sin vencimiento.
- Cancelar o reembolsar libera la reserva.
- Entregar consume la reserva y genera la salida real de inventario.
- El costo histórico de cada venta queda almacenado en `order_items.unit_cost_clp`.
- Los pagos confirmados alimentan el saldo del pedido; una reversa conserva el registro histórico y recalcula el saldo.

## Checklist diario

1. Revisar Alertas.
2. Revisar pagos pendientes de conciliación.
3. Revisar pedidos pendientes/preparando.
4. Revisar stock disponible bajo.
5. Revisar despachos vencidos o con excepción.
6. Revisar Auditoría ante cualquier cambio inesperado.

## Respaldo

El proyecto usa Supabase Free. Mantener además un respaldo externo periódico de:

- base PostgreSQL;
- archivos del bucket `product-images`;
- repositorio GitHub;
- documentación de variables/secretos sin almacenar sus valores en el repositorio.

Frecuencia recomendada mientras esté en Free: exportación semanal y antes de cambios estructurales importantes.

## Restauración

Una restauración debe probarse en un proyecto separado antes de tocar producción. Validar después de restaurar:

- productos y categorías;
- imágenes;
- pedidos e ítems;
- clientes;
- pagos y conciliaciones;
- inventario y kardex;
- reservas activas;
- proveedores y compras;
- gastos;
- auditoría.

Luego ejecutar controles de integridad: stock no negativo, stock = suma de movimientos, pedidos con totales correctos, pagos con saldo correcto y pedidos entregados con salida de inventario.

## Incidente de seguridad

1. Cerrar sesiones administrativas afectadas.
2. Cambiar la contraseña comprometida.
3. Revisar `audit_log` por cambios no autorizados.
4. Revisar productos, pedidos, pagos, inventario y configuración.
5. Rotar cualquier secreto de servidor que pudiera haberse expuesto.
6. No rotar la publishable key solo por estar visible en el frontend; está diseñada para ser pública y la autorización depende de RLS.

## Despliegue

1. Crear rama desde `main`.
2. Aplicar cambios.
3. Abrir PR.
4. Esperar `TIMELESS CI` en verde.
5. Revisar cambios.
6. Fusionar a `main`.
7. Validar tienda y panel después del despliegue.

## Pruebas mínimas de producción

- Crear pedido válido.
- Reintentar el mismo pedido y comprobar idempotencia.
- Intentar pedir más unidades que las disponibles y esperar conflicto de stock.
- Cancelar pedido y comprobar liberación de reserva.
- Registrar pago parcial y total.
- Reversar un pago y comprobar recálculo de saldo.
- Marcar pedido como preparando/enviado/entregado y comprobar sincronización logística.
- Entregar y comprobar salida de inventario y consumo de reserva.
- Registrar recepción de compra y comprobar entrada de inventario/costo promedio.
- Confirmar que Auditoría registra los cambios sensibles.
