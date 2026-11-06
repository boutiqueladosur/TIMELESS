# TIMELESS ERP — Proyecto independiente

Este proyecto contiene el **panel administrativo completo** que se extrajo de TIMELESS el 6 de noviembre de 2026. No incluye la tienda pública.

## Alcance

Incluye Gerencia, Pedidos, Clientes, Pagos, Despachos, Inventario, Kardex, Compras, Proveedores, Gastos, Alertas, Auditoría, Seguridad y el editor de Productos. Conserva el diseño de Pedidos y la corrección de recepciones parciales de Compras en la rama de estabilización de origen.

## Ejecutar

Publicar estos archivos estáticos desde un servidor HTTPS o GitHub Pages y abrir `index.html` o `admin.html`. No requiere compilación. El cliente usa Supabase JS desde CDN.

## Importante

- **Código separado, datos todavía compartidos:** apunta al Supabase de TIMELESS. No ejecutar operaciones reales sin coordinar la migración y crear una copia de seguridad.
- No se han extraído los datos, migrado servicios ni configurado un dominio propio. La base de datos y las Edge Functions siguen siendo las compartidas con la tienda.
- El backend de compras, movimientos de inventario, pagos y reservas necesita validación funcional con cuenta MFA AAL2 en entorno de pruebas.
- La base tiene muchas migraciones no presentes en el repositorio: el archivo SQL incluido no recrea una instancia completa desde cero.
- No desplegar como ERP listo para producción sin pruebas integrales. Las pruebas automáticas estáticas no sustituyen pruebas con Supabase.
- Nunca poner claves secretas Supabase en estos archivos públicos. El acceso depende de RLS, autorización de roles y MFA.

## Relación con la tienda

Tienda principal: https://github.com/boutiqueladosur/TIMELESS

Se conserva esta exportación en la rama `export/erp-independiente-20261106`; puede importarse como nuevo repositorio usando esta rama como fuente, sin arrastrar la tienda pública.
