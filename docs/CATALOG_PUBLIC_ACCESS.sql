-- TIMELESS: permiso mínimo para que el catálogo público pueda consultar productos activos.
-- REVISAR Y APLICAR SOLO AL PUBLICAR LA TIENDA SIMPLIFICADA.
-- No expone costos, precio de compra, proveedor, márgenes ni datos privados.
-- RLS existente: public_read_active_products restringe a is_active=true.
-- SELECT de columnas específicas: evitar GRANT SELECT ON TABLE que expone todas.
GRANT SELECT (id, sku, name, description, price_clp, sale_price_clp,
              is_featured, is_active, stock, category_id)
  ON public.products TO anon;

-- Validación post-aplicación:
-- SELECT has_table_privilege('anon','public.products','SELECT') AS table_wide_grant,
--        has_column_privilege('anon','public.products','name','SELECT') AS public_name,
--        has_column_privilege('anon','public.products','average_cost_clp','SELECT') AS private_cost;
-- Se espera false, true, false respectivamente.
