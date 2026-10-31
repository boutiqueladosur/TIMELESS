# TIMELESS

Tienda online de accesorios desplegable en GitHub Pages.

## Arquitectura actual

- Frontend: HTML, CSS y JavaScript.
- Catálogo: Supabase (`products`, `categories`, `product_images`).
- Carrito: `localStorage` del navegador.
- Pedidos: Supabase (`orders`, `order_items`) y continuidad por WhatsApp.
- Hosting previsto: GitHub Pages.
- Backend y base de datos: Supabase.

## Seguridad

La documentación de seguridad está disponible en:

- `SECURITY.md`
- `docs/SECURITY-AUDIT.md`

Los cambios de endurecimiento se desarrollan en la rama `security-hardening` antes de ser revisados e incorporados a `main`.

## Regla principal

No almacenar contraseñas, tokens, `service_role`, claves API privadas ni otros secretos dentro del repositorio público. El frontend utiliza únicamente la publishable key de Supabase y el acceso a datos se controla con RLS.
