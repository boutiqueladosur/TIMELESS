# TIMELESS

Tienda online de accesorios desplegable en GitHub Pages.

## Arquitectura actual

- Frontend: HTML, CSS y JavaScript.
- Catálogo: Supabase (`products`, `categories`, `product_images`).
- Carrito: `localStorage` del navegador.
- Pedidos: el cliente arma el pedido en el navegador y lo confirma por WhatsApp.
- Tablas `orders` y `order_items`: disponibles en Supabase para una etapa posterior de persistencia server-side.
- Hosting previsto: GitHub Pages.
- Backend y base de datos: Supabase para catálogo, seguridad y futura persistencia de pedidos.

## Seguridad

La documentación de seguridad está disponible en:

- `SECURITY.md`
- `docs/SECURITY-AUDIT.md`

Los cambios de endurecimiento se desarrollan en la rama `security-hardening` antes de ser revisados e incorporados a `main`.

## Regla principal

No almacenar contraseñas, tokens, `service_role`, claves API privadas ni otros secretos dentro del repositorio público. El frontend utiliza únicamente la publishable key de Supabase y el acceso a datos se controla con RLS.
