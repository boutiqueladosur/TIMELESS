# ROSEWOOD / TIMELESS

Tienda estática de accesorios desplegable en GitHub Pages.

## Arquitectura actual

- Frontend: HTML, CSS y JavaScript sin framework.
- Catálogo: Google Sheets mediante Google Visualization / JSONP.
- Carrito: `localStorage` del navegador.
- Pedidos: generación de mensaje y apertura de WhatsApp.
- Hosting previsto: GitHub Pages.

## Seguridad

La documentación de seguridad está disponible en:

- `SECURITY.md`
- `docs/SECURITY-AUDIT.md`

Los cambios de endurecimiento se desarrollan en la rama `security-hardening` antes de ser revisados e incorporados a `main`.

## Regla principal

No almacenar contraseñas, tokens, claves API privadas ni otros secretos dentro del repositorio público.
