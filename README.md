# TIMELESS TCO — tienda pública + panel administrativo

## Tienda para clientes
- `index.html` muestra la colección de carteras y accesorios con búsqueda, filtros, ofertas y fotografías.
- Carrito con varios artículos, control de cantidad y subtotal según precios publicados.
- El cliente envía el pedido por WhatsApp para acordar disponibilidad, despacho y pago.
- **No existe pago en línea automatizado ni se confirma el pedido/reserva inventario al enviar el mensaje.**
- El catálogo y el número de WhatsApp se leen desde Supabase con permisos mínimos de solo lectura para visitantes.
- `privacidad.html` explica el tratamiento de información y el flujo de compra asistida.

## Panel privado
- `admin.html` requiere correo, contraseña, rol administrador y MFA TOTP.
- Permite crear/editar productos, gestionar fotografías, ofertas, precios, publicación, existencias y número de WhatsApp.
- Cierre por inactividad en `security-admin.js`.
- Los permisos en Postgres se controlan con RLS y permisos de columnas; no se publica la llave secreta de servicio.

## Sitios
- Tienda: https://www.timelesstco.cl/
- Administración: https://www.timelesstco.cl/admin.html

## Pruebas y límites
Las consultas públicas y administrativas deben auditarse al cambiar las políticas RLS.
El flujo final en WhatsApp requiere intervención de TIMELESS para confirmar el pedido y el pago.
Antes de ofrecer pagos automáticos, se debe integrar una pasarela oficial con validaciones del lado servidor.

## Documentación legal · revisión 12-11-2026
- Política de privacidad: `privacidad.html` (Ley 19.628; adaptación a Ley 21.719, con vigencia programada 01-12-2026 y proyecto de prórroga N.º 18.623-07 todavía en tramitación).
- Términos de compra: `terminos.html` (Ley 19.496, Decreto 6, derechos del consumidor).
- Referencias legales desde la tienda: pie de página, información de compra y carrito.
- **Antes de comenzar ventas reales es obligatorio completar la identificación veraz del proveedor:** nombre completo de la persona natural vendedora, RUT/RUN, domicilio legal y contacto. TIMELESS no es una sociedad constituida ni requiere indicar un representante legal de empresa.
- Confirmar y documentar operativamente: política de atención a derechos ARCO/portabilidad, plazos de conservación, encargados y transferencias internacionales, notificaciones de incidentes, información de despacho y confirmación escrita de compras.
- La actualización textual no sustituye la revisión jurídica profesional ni el cumplimiento técnico y organizativo.

## Forma de operación
TIMELESS TCO es un emprendimiento de una persona natural, sin sociedad constituida. Ello no exime de derechos del consumidor ni de obligaciones tributarias. Si se venden bienes habitualmente, corresponde verificar el inicio de actividades ante el SII y la emisión de boletas electrónicas que procedan. No completar la identidad comercial con datos inventados ni publicar información privada no autorizada.
