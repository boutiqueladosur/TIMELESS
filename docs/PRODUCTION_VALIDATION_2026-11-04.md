# TIMELESS — Estado de validación (4 noviembre 2026)

## Bloqueos corregidos y comprobados
- Pedidos y descuentos de stock se ejecutan en la base mediante operaciones controladas.
- Pagos confirmados no pueden reducirse por debajo de los reembolsos completados, ni por debajo del total de pedidos en preparación, despachados o entregados.
- La transición a preparación, despacho o entrega exige pago completo en la base. La interfaz de Pedidos indica pago pendiente en el botón de avance.
- Las entregas parciales usan `record_order_delivery_once` con clave UUID de idempotencia; repetir la misma clave devuelve el mismo registro, sin nueva salida de stock. Una clave repetida con cantidades diferentes se rechaza.
- El RPC anterior de entregas ya no es ejecutable por usuarios `authenticated` ni `anon`. Los insert directos en tablas de entregas están revocados.
- En Despachos se ha conectado el formulario de entregas parciales. El diseño aprobado de las tarjetas y el acordeón en Pedidos se conserva.
- Historial de Pedidos: lotes de 100 y botón «Cargar más pedidos» sin alterar la estructura de tarjetas. Los filtros del navegador actúan sobre los registros cargados; cargar más amplía el conjunto consultable.
- El endpoint `create-order` traduce las solicitudes repetidas con información modificada a HTTP 409.
- Las reglas críticas están documentadas en `supabase/migrations/20261104_integrity_protections.sql`.
- Las pruebas estáticas de CI comprueban estos puntos para detectar regresiones.

## Validación pendiente que NO debe darse por superada
- Pruebas automáticas reales de navegador, con sesión admin MFA y dispositivos móviles.
- 10 transacciones confirmadas verdaderamente concurrentes compitiendo por las últimas cinco unidades en una base aislada.
- Restitución desde una copia de seguridad y pruebas de rendimiento con miles de pedidos.
- Integración real de Webpay: **actualmente desactivada** en `store_settings`; los archivos fuente Webpay no deben desplegarse ni habilitarse sin transacciones de certificación, idempotencia de confirmaciones, conciliación atómica y control de errores. La única Edge Function desplegada observada era `create-order`.
- Revisión del aviso Supabase sobre `get_public_product_availability()` como SECURITY DEFINER accesible públicamente. La función actualmente solo devuelve el ID y las existencias disponibles de productos activos; evaluar cualquier cambio con una prueba de catálogo público.
- Habilitar la protección de contraseñas filtradas desde Supabase Auth, si está disponible para el plan.

## Política para nuevas modificaciones
1. Nunca cambiar el diseño de las tarjetas, selector o acordeón de Pedidos sin aprobación explícita.
2. Cada corrección financiera o logística requiere un test que falle antes de corregir y pase después.
3. Las pruebas deben ser reversibles o ejecutarse en un clon; no generar ventas ficticias definitivas en la base actual.
4. Verificar GitHub CI, despliegue, permisos MFA, consistencia de stock, pagos y devoluciones.
5. No confundir una prueba SQL con una prueba de navegador o con una prueba de carga concurrente con transacciones confirmadas.
