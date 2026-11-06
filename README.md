# TIMELESS · Tienda y editor de catálogo simplificado

Versión preparada en la rama `refactor/catalogo-simple-20261106`.

## Editor reducido

`admin.html` permite iniciar sesión con la cuenta administradora y administrar **fotografías, productos, nombres, SKU, descripciones, categorías, precios, ofertas, visibilidad, destacados y WhatsApp**.

Se eliminó la carga de la consola ERP y sus módulos (compras, pagos, despachos, Kardex, CRM, auditoría y gerencia). La sesión conserva control de rol, puerta MFA mediante `security-admin.js` y cierre por inactividad mediante `session-idle.js`.

## Tienda

`index.html` y `checkout.js` permanecen sin cambios funcionales: el catálogo, carrito y registro de pedidos siguen utilizando Supabase. No se ha convertido el checkout a WhatsApp directo ni se han alterado los pedidos o stock de producción.

## Stock y arquitectura

El stock sigue siendo **solo lectura** en el editor, porque es mantenido por los movimientos del sistema de inventario y no puede modificarse sin conciliación. Su gestión operativa queda en el ERP separado. La base de datos de Supabase sigue siendo compartida con el ERP, por lo que no se puede afirmar independencia de datos.

## Seguridad

- Esta rama no modifica datos, migraciones, políticas RLS, usuarios ni despliegues.
- Las credenciales de la cuenta administradora y MFA siguen siendo necesarias.
- Si se despliega por GitHub Pages, verificar funcionamiento de sesión, edición de imágenes, gestión de precios y compras mediante pruebas reales.
- La tienda no debe convertirse en un simple catálogo sin antes decidir si el checkout actual será conservado.

## ERP extraído

El panel completo fue aislado en la rama `export/erp-independiente-20261106`, lista para trasladar a otro repositorio y desplegar separadamente.
