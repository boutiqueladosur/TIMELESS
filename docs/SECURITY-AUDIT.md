# Auditoría técnica y de seguridad — ROSEWOOD / TIMELESS

Fecha: 31 de octubre de 2026

## Resumen ejecutivo

ROSEWOOD es actualmente una tienda estática de baja complejidad técnica: `index.html` concentra estructura, estilos y lógica de cliente; el catálogo se obtiene desde Google Sheets mediante JSONP; el carrito se persiste en `localStorage`; y el cierre del pedido abre WhatsApp con los datos introducidos por el cliente.

No se observaron credenciales privadas, tokens o contraseñas embebidos en el código revisado. Sí existe un identificador público de Google Sheets y un número de WhatsApp visibles en cliente, lo que es esperable para el funcionamiento actual.

## Hallazgos prioritarios

### 1. JSONP para cargar el catálogo — Riesgo medio

El catálogo se carga insertando dinámicamente un `<script>` desde `docs.google.com`. JSONP ejecuta JavaScript de un origen externo dentro del contexto de la página. Aunque el origen utilizado es Google y la respuesta esperada es controlada, esta arquitectura amplía la superficie de ataque frente a una carga de datos con `fetch`/JSON desde un endpoint controlado.

**Recomendación:** migrar gradualmente a una API/endpoint de solo lectura que devuelva JSON y aplicar una política CSP estricta.

### 2. JavaScript y CSS embebidos en `index.html` — Riesgo medio / mantenibilidad alta

La mayor parte del sitio está concentrada en un único archivo. Esto dificulta una CSP estricta, pruebas, revisión de cambios y mantenimiento.

**Recomendación:** separar `styles.css` y `app.js`, luego eliminar `unsafe-inline` de la política CSP.

### 3. Dependencias CDN sin integridad — Riesgo medio

Font Awesome y fuentes externas se cargan desde terceros. El CSS de Font Awesome no usa Subresource Integrity (SRI).

**Recomendación:** fijar versión y hash SRI cuando corresponda o alojar localmente los recursos esenciales.

### 4. Imágenes controladas desde el catálogo — Riesgo bajo/medio

Las URLs de imágenes llegan desde Google Sheets y actualmente se aceptan por `http:` o `https:`. Permitir HTTP puede generar contenido mixto o filtración de información de navegación.

**Recomendación:** aceptar solamente HTTPS y, si la operación lo permite, restringir a hosts conocidos.

### 5. Datos del carrito en `localStorage` — Riesgo bajo

El carrito se guarda en el dispositivo del usuario. No contiene por diseño credenciales ni información de pago, pero cualquier JavaScript ejecutado en el origen podría leerlo.

**Recomendación:** mantener allí solo información no sensible y no almacenar nombre, dirección, teléfono ni datos de pago.

### 6. Datos personales enviados a WhatsApp — Riesgo de privacidad operativo

Nombre, dirección/ciudad, teléfono opcional y notas se incorporan al mensaje de WhatsApp cuando el usuario confirma el pedido.

**Recomendación:** limitar los campos a lo estrictamente necesario, informar claramente el flujo y mantener coherencia con la política de privacidad.

### 7. Falta de controles de seguridad HTTP administrables desde GitHub Pages — Limitación de plataforma

GitHub Pages no permite configurar libremente todos los encabezados HTTP de seguridad como lo haría un servidor propio o CDN configurable.

**Recomendación:** usar metaetiquetas defensivas donde tengan efecto y, si el proyecto crece, considerar Cloudflare Pages, Netlify, Vercel u otro hosting con control de encabezados.

## Controles positivos existentes

- Los datos del catálogo se escapan antes de insertarse en las plantillas HTML mediante una función de escape.
- Las URLs externas abiertas por la interfaz usan `noopener` y, en el flujo de pedido, también `noreferrer`.
- El precio recibido desde el catálogo se normaliza y se fuerza a un valor numérico no negativo.
- La política de privacidad explica el uso de almacenamiento local y el flujo por WhatsApp.
- No se identificaron tokens, claves API privadas o contraseñas en los archivos revisados.

## Plan de endurecimiento recomendado

1. Mantener todos los cambios en `security-hardening` hasta revisión.
2. Separar CSS y JavaScript del HTML.
3. Añadir una Content Security Policy compatible con la aplicación.
4. Restringir imágenes a HTTPS.
5. Añadir validación y límites de longitud a los campos del pedido.
6. Revisar o autoalojar dependencias externas críticas.
7. Incorporar pruebas mínimas del catálogo, carrito y generación del pedido.
8. Revisar el despliegue antes de fusionar a `main`.

## Riesgo global actual

**Moderado-bajo para una tienda estática sin pagos integrados ni autenticación.** El principal riesgo no es una credencial expuesta, sino la dependencia de contenido/script externo, la arquitectura monolítica y la falta de controles de navegador más estrictos.
