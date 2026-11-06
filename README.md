# TIMELESS — Tienda y editor de catálogo

Esta rama contiene **solo la tienda pública** y un panel protegido para administrar fotos, productos, descripciones, precios, ofertas, estado de publicación, WhatsApp y entradas o descuentos simples de unidades.

## Tienda
- La página pública usa `index.html` y `catalogo-publico.js`.
- Cada cartera permite consultar directamente por WhatsApp. **No genera un pedido, no reserva stock ni procesa pagos.**
- El número de WhatsApp se lee desde Supabase.

## Panel
- Abrir `admin.html`; iniciar sesión con cuenta `admin` y MFA de Supabase.
- Crear o editar un producto y subir imágenes a Storage.
- Ajustar stock del producto desde el editor. Los movimientos se guardan en `inventory_movements` para mantener la trazabilidad y actualizar el stock mediante el trigger existente.
- La base de datos se conserva compartida temporalmente con el ERP. Ningún dato se ha borrado.

## Pendientes para publicar
1. Aplicar `docs/CATALOG_PUBLIC_ACCESS.sql` **tras revisarlo**, para permitir a visitantes leer solo columnas comerciales de productos activos.
2. Probar acceso anónimo, acceso privado con MFA, subida de imágenes, ajustes de stock, producto agotado y enlaces WhatsApp.
3. No fusionar cambios antes de validar el catálogo y el panel de forma real.

## ERP separado
El ERP completo está guardado en `export/erp-independiente-20261106`, listo para trasladarlo a un repositorio distinto. No debe reutilizarse en la tienda. La separación de datos entre proyectos es una tarea posterior y diferente.

## Presentación editorial del catálogo

La tienda usa `catalogo-estilo.css` y `catalogo-publico.js` para una presentación de estilo boutique: fotografía principal 4:5, precio, descuento cuando corresponde, categorías, búsqueda, detalle con galería y contacto por WhatsApp. Las fotos y precios vienen de Supabase; no se duplican en el HTML.

Referencia visual solicitada: https://timelesstco.netlify.app/ . **No se ha podido verificar su contenido visual desde la herramienta de navegación**; el estilo implementado es una aproximación editorial, no una reproducción comprobada.

Los cambios están en una rama y un PR en borrador; **aún no se ha publicado en Netlify ni fusionado a GitHub Pages**. No hay conexión directa disponible con la cuenta Netlify para desplegar este sitio.
