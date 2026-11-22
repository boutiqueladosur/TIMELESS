-- TIMELESS TCO: permisos públicos por columna, verificados en producción.
-- Requiere RLS habilitada y políticas de lectura de productos activos no archivados.
-- No otorga SELECT a nivel de tabla, escritura ni acceso a columnas internas.
GRANT SELECT (id,category_id,sku,name,description,price_clp,sale_price_clp,stock,is_active,is_featured,material,color,archived_at,dimensions,compartments) ON public.products TO anon;
GRANT SELECT (id,product_id,image_url,alt_text,sort_order,is_primary,thumb_url,catalog_url,detail_url) ON public.product_images TO anon;
GRANT SELECT (id,name,is_active,sort_order) ON public.categories TO anon;
GRANT SELECT (id,whatsapp_number) ON public.store_settings TO anon;
GRANT SELECT (id,content,updated_at) ON public.site_content TO anon;
-- Verificación: false, true, false, false.
SELECT has_table_privilege('anon','public.products','SELECT') AS table_wide_grant,
       has_column_privilege('anon','public.product_images','alt_text','SELECT') AS image_alt,
       has_column_privilege('anon','public.products','average_cost_clp','SELECT') AS private_cost,
       has_column_privilege('anon','public.products','supplier_id','SELECT') AS private_supplier;
