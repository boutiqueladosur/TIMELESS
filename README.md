# TIMELESS

Tienda online de accesorios desplegable en GitHub Pages.

## Arquitectura actual

- Frontend: HTML, CSS y JavaScript.
- Catálogo: Supabase (`products`, `categories`, `product_images`).
- Carrito: `localStorage` del navegador.
- Pedidos: la función `create-order` valida productos, disponibilidad y precios en Supabase antes de registrarlos; el cliente puede continuar la coordinación por WhatsApp después de recibir número de pedido.
- Tablas `orders`, `order_items` y reservas: utilizadas por el proceso de registro de pedidos.
- Hosting: GitHub Pages.
- Backend y base de datos: Supabase para catálogo, pedidos, disponibilidad, cobros manuales, auditoría y seguridad. Webpay no está integrado en el flujo actual; el repositorio conserva su adaptador desactivado.

## Seguridad

La documentación de seguridad está disponible en:

- `SECURITY.md`
- `docs/SECURITY-AUDIT.md`

Los cambios de endurecimiento se desarrollan en la rama `security-hardening` antes de ser revisados e incorporados a `main`.

## Regla principal

No almacenar contraseñas, tokens, `service_role`, claves API privadas ni otros secretos dentro del repositorio público. El frontend utiliza únicamente la publishable key de Supabase y el acceso a datos se controla con RLS.

## Auditoría y pruebas

- `docs/db-audit.sql`: consultas de solo lectura que detectan diferencias entre pedidos, saldos, stock y Kardex.
- `tests/preflight.test.cjs`: comprobaciones de regresión ejecutadas en GitHub Actions.
- Los pagos se registran en el módulo Pagos; un pedido confirmado comercialmente no acredita por sí solo el pago.
