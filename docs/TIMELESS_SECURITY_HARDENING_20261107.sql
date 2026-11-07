-- TIMELESS · Corrección de permisos y operaciones atómicas de fotografías.
-- Aplicado en el proyecto Supabase TIMELESS el 7 de noviembre de 2026.
-- Este archivo documenta el cambio desplegado; no es un script de instalación independiente.
-- Se preservan los roles autorizados, añadiendo la exigencia MFA AAL2.

alter policy managers_insert_product_images on storage.objects with check (
 bucket_id='product-images'
 and (select auth.jwt()->'app_metadata'->>'role') in ('owner','admin','manager')
 and (select auth.jwt()->>'aal')='aal2'
);
alter policy managers_update_product_images on storage.objects
 using (bucket_id='product-images'
 and (select auth.jwt()->'app_metadata'->>'role') in ('owner','admin','manager')
 and (select auth.jwt()->>'aal')='aal2')
 with check (bucket_id='product-images'
 and (select auth.jwt()->'app_metadata'->>'role') in ('owner','admin','manager')
 and (select auth.jwt()->>'aal')='aal2');
alter policy managers_delete_product_images on storage.objects
 using (bucket_id='product-images'
 and (select auth.jwt()->'app_metadata'->>'role') in ('owner','admin','manager')
 and (select auth.jwt()->>'aal')='aal2');

create or replace function public.set_product_primary_image(p_product_id uuid,p_image_id uuid)
returns void language plpgsql security invoker set search_path=''
as $$
begin
 if (select auth.jwt()->>'aal') is distinct from 'aal2'
    or (select auth.jwt()->'app_metadata'->>'role') not in ('owner','admin','manager')
 then raise exception 'Permiso administrativo y MFA requeridos' using errcode='42501';
 end if;
 perform 1 from public.products where id=p_product_id for update;
 if not found then raise exception 'Producto no encontrado' using errcode='22023';end if;
 perform 1 from public.product_images where product_id=p_product_id and id=p_image_id;
 if not found then raise exception 'Fotografía no pertenece al producto' using errcode='22023';end if;
 update public.product_images set is_primary=false where product_id=p_product_id and is_primary=true;
 update public.product_images set is_primary=true where product_id=p_product_id and id=p_image_id;
end $$;
revoke all on function public.set_product_primary_image(uuid,uuid) from public,anon;
grant execute on function public.set_product_primary_image(uuid,uuid) to authenticated;
