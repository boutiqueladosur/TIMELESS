# Política de seguridad — TIMELESS

## Alcance

Este repositorio contiene una tienda estática desplegable en GitHub Pages. La aplicación carga el catálogo desde Supabase y registra pedidos en la Edge Function `create-order` antes de ofrecer la coordinación por WhatsApp.

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

El carrito se conserva localmente en el navegador. Al confirmar un pedido, nombre, teléfono, dirección, notas y artículos se transmiten a la Edge Function `create-order` para registrarlos en Supabase. El navegador usa una clave publicable; la clave de servicio permanece en el servidor. Los mismos datos pueden utilizarse para componer un mensaje dirigido a WhatsApp.

## Dependencias externas

La aplicación depende de servicios externos como Supabase, Google Fonts, Font Awesome, GitHub y WhatsApp. Toda nueva dependencia debe revisarse por necesidad, origen, permisos y riesgo de cadena de suministro.

## Desarrollo seguro

Los cambios relevantes deben realizarse en una rama separada y revisarse antes de incorporarse a `main`. Se recomienda mantener `main` como rama de producción y evitar commits experimentales directos.

## Verificaciones

Ejecutar regularmente `docs/db-audit.sql` con un rol autorizado y revisar las alertas de seguridad de Supabase. El archivo de auditoría es de solo lectura y no debe confundirse con una prueba integral de pagos o seguridad.
