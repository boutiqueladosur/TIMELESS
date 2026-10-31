# Auditoría técnica y de seguridad — TIMELESS

Fecha: 31 de octubre de 2026

## Resumen ejecutivo

TIMELESS es actualmente una tienda online de baja complejidad técnica: `index.html` concentra estructura, estilos y lógica de cliente; el catálogo está en proceso de migración desde Google Sheets a Supabase; el carrito se persiste en `localStorage`; y el cierre del pedido abre WhatsApp con los datos introducidos por el cliente.

La arquitectura objetivo usa Supabase como backend principal para categorías, productos, imágenes, pedidos y detalle de pedidos. No se observaron credenciales privadas, tokens o contraseñas embebidos en el código revisado.

## Hallazgos prioritarios

### 1. Migración del catálogo a Supabase — Prioridad alta

La versión original carga el catálogo desde Google Sheets mediante JSONP. La migración a Supabase elimina esa dependencia y permite trabajar con RLS, datos estructurados, stock y pedidos persistentes.

**Recomendación:** usar la Data API de Supabase con publishable key y RLS activo. Nunca exponer `service_role` ni secret keys en el frontend.

### 2. JavaScript y CSS embebidos en `index.html` — Riesgo medio / mantenibilidad alta

La mayor parte del sitio está concentrada en un único archivo. Esto dificulta una CSP estricta, pruebas, revisión de cambios y mantenimiento.

**Recomendación:** separar `styles.css` y `app.js`, luego endurecer la política CSP.

### 3. Dependencias CDN sin integridad — Riesgo medio

Font Awesome y fuentes externas se cargan desde terceros. El CSS de Font Awesome no usa Subresource Integrity (SRI).

**Recomendación:** fijar versión y hash SRI cuando corresponda o alojar localmente los recursos esenciales.

### 4. Imágenes externas — Riesgo bajo/medio

Las URLs de imágenes deben aceptar solo HTTPS y, cuando sea posible, restringirse a hosts conocidos o a Supabase Storage.

### 5. Datos del carrito en `localStorage` — Riesgo bajo

El carrito se guarda en el dispositivo del usuario. Debe contener únicamente datos no sensibles.

### 6. Datos personales enviados a WhatsApp — Riesgo de privacidad operativo

Nombre, dirección/ciudad, teléfono opcional y notas se incorporan al mensaje de WhatsApp cuando el usuario confirma el pedido.

**Recomendación:** limitar los campos a lo necesario y mantener coherencia con la política de privacidad.

### 7. Limitaciones de GitHub Pages

GitHub Pages no permite controlar libremente todos los encabezados HTTP de seguridad.

**Recomendación:** mantener controles defensivos en frontend y evaluar un hosting con control de headers si TIMELESS incorpora pagos, autenticación avanzada o un panel administrativo público.

## Controles positivos existentes

- Los datos del catálogo se escapan antes de insertarse en HTML.
- Las URLs externas usan `noopener` y, en el flujo de pedido, también `noreferrer`.
- Los precios se normalizan a valores numéricos no negativos.
- La política de privacidad explica el uso de almacenamiento local y WhatsApp.
- Supabase tiene RLS habilitado en `categories`, `products`, `product_images`, `orders` y `order_items`.
- Las políticas públicas permiten leer únicamente catálogo activo.
- La administración está restringida mediante rol `admin` en `app_metadata`.
- No se identificaron tokens, claves API privadas o contraseñas en los archivos revisados.

## Plan de endurecimiento recomendado

1. Mantener cambios en `security-hardening` hasta revisión.
2. Completar migración del catálogo a Supabase.
3. Separar CSS y JavaScript del HTML.
4. Añadir Content Security Policy compatible con la aplicación.
5. Restringir imágenes a HTTPS/Supabase Storage.
6. Añadir validación y límites de longitud a los campos del pedido.
7. Incorporar pruebas mínimas del catálogo, carrito y pedidos.
8. Revisar despliegue antes de fusionar a `main`.

## Riesgo global actual

**Moderado-bajo mientras TIMELESS opere sin pagos integrados.** La migración a Supabase mejora significativamente la base técnica y permite evolucionar hacia stock, pedidos, administración y autenticación con controles de acceso formales.
