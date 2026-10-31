# Política de seguridad — TIMELESS

## Alcance

Este repositorio contiene una tienda estática desplegable en GitHub Pages. La aplicación carga el catálogo desde Supabase y genera pedidos que el cliente confirma mediante WhatsApp.

## Reporte de vulnerabilidades

No publiques vulnerabilidades, credenciales, tokens ni datos personales en Issues públicos.

Para reportar un problema de seguridad, contacta al propietario del repositorio mediante un canal privado y proporciona:

- descripción del problema;
- pasos mínimos para reproducirlo;
- impacto observado o potencial;
- archivos o rutas afectadas;
- propuesta de corrección, si existe.

## Manejo de secretos

- No almacenar contraseñas, `service_role`, secret keys, tokens privados ni otras credenciales dentro de HTML, JavaScript, commits, Issues o documentación pública.
- La publishable key de Supabase puede utilizarse en el frontend siempre que las tablas expuestas estén protegidas mediante RLS y políticas correctas.
- Los secretos de servidor deben mantenerse exclusivamente en variables de entorno o en el gestor de secretos del proveedor.
- Si un secreto se publica accidentalmente, debe revocarse y rotarse; eliminarlo del último commit no es suficiente.

## Datos personales

El carrito se conserva localmente en el navegador. Los datos introducidos para confirmar un pedido se utilizan para construir el mensaje de WhatsApp y actualmente no se guardan en las tablas `orders` u `order_items` desde el frontend.

## Dependencias externas

La aplicación depende de servicios externos como Supabase, Google Fonts, Font Awesome, GitHub y WhatsApp. Toda nueva dependencia debe revisarse por necesidad, origen, permisos y riesgo de cadena de suministro.

## Desarrollo seguro

Los cambios relevantes deben realizarse en una rama separada y revisarse antes de incorporarse a `main`. Se recomienda mantener `main` como rama de producción y evitar commits experimentales directos.
