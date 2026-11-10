# TIMELESS — Panel privado de catálogo y WhatsApp

TIMELESS funciona exclusivamente como panel de administración conectado a Supabase.
La ruta principal `index.html` redirige al panel `admin.html`. La tienda pública fue retirada.

## Funciones disponibles
- Inicio de sesión con correo, contraseña, rol `admin` y segundo factor TOTP (MFA).
- Editar el número de WhatsApp de contacto.
- Crear y editar productos, precios, descuentos, descripciones y categorías asignadas.
- Subir, eliminar y definir la imagen principal de productos.
- Activar u ocultar productos sin eliminarlos.
- Ajustar stock mediante movimientos auditables.
- Cierre de sesión y cierre por inactividad.

## Seguridad y alcance
- El navegador utiliza únicamente la clave `sb_publishable` de Supabase; no debe incorporar claves secretas ni de servicio.
- El servidor PostgreSQL valida autorización y MFA mediante políticas RLS restrictivas.
- Las funciones comerciales de pedidos/checkout y el catálogo público no forman parte de esta interfaz.
- Los datos históricos de pedidos y pagos permanecen en la base de datos para conservación; sus permisos de API de usuario final están revocados.
- El almacenamiento `product-images` contiene imágenes comerciales del catálogo.

## Acceso
- [Panel TIMELESS](https://boutiqueladosur.github.io/TIMELESS/admin.html)
- [Entrada principal](https://boutiqueladosur.github.io/TIMELESS/)

No introducir contraseñas, códigos TOTP ni claves `service_role` en el repositorio.
