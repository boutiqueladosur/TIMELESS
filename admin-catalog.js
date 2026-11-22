
(()=>{
'use strict';
const SUPABASE_URL='https://nfphzvcwxyfkbucwwlcx.supabase.co';
const SUPABASE_PUBLISHABLE_KEY='sb_publishable_DzvTmxOxVWY4LaKNqx2-xA_4RVK2TtS';
const BUCKET='product-images';
const db=window.supabase.createClient(SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY);
const $=id=>document.getElementById(id);
let products=[],categories=[],editing=null,toastTimer,saving=false;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
const money=v=>new Intl.NumberFormat('es-CL',{style:'currency',currency:'CLP',maximumFractionDigits:0}).format(Number(v)||0);
const slugify=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,100);
function toast(msg){$('toast').textContent=msg;$('toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('show'),2400)}
function syncDiscountFromPercent(){const normal=Number($('price').value),pct=Number($('discount-percent').value);if(!$('discount-percent').value){$('discount-help').textContent='Opcional · se calcula automáticamente.';return}if(!Number.isFinite(normal)||normal<=0){$('discount-help').textContent='Ingresa primero el precio normal.';return}if(!Number.isFinite(pct)||pct<0||pct>100){$('discount-help').textContent='El descuento debe estar entre 0% y 100%.';return}const sale=Math.round(normal*(1-pct/100));$('sale-price').value=sale;$('discount-help').textContent=`Precio oferta: ${money(sale)} · Ahorras ${money(normal-sale)}`}
function syncDiscountFromPrice(){const normal=Number($('price').value),raw=$('sale-price').value,sale=Number(raw);if(!raw||!Number.isFinite(normal)||normal<=0||!Number.isFinite(sale)||sale<0||sale>normal){if(!raw)$('discount-percent').value='';return}const pct=Math.round((1-sale/normal)*100);$('discount-percent').value=pct;$('discount-help').textContent=pct>0?`Descuento aplicado: ${pct}% · Ahorras ${money(normal-sale)}`:'Sin descuento aplicado.'}
function adminRole(user){return user?.app_metadata?.role==='admin'}
async function requireMfa(){const {data,error}=await db.auth.mfa.getAuthenticatorAssuranceLevel();if(error)throw error;if(data?.currentLevel!=='aal2')throw new Error('Confirma el segundo factor de seguridad antes de modificar productos.')}
async function ensureAdmin(){
 const {data:{session},error:sessionError}=await db.auth.getSession();
 if(sessionError)throw sessionError;
 if(!session){showLogin();return false}
 const {data:{user},error}=await db.auth.getUser();
 if(error||!adminRole(user)){await db.auth.signOut();showLogin('Esta cuenta no tiene permisos de administrador.');return false}
 const {data:aal,error:aalError}=await db.auth.mfa.getAuthenticatorAssuranceLevel();
 if(aalError)throw aalError;
 if(aal?.currentLevel!=='aal2'){$('login-view').classList.add('hidden');$('app-view').classList.add('hidden');return false}
 $('admin-email').textContent=user.email||'Administrador';
 $('login-view').classList.add('hidden');$('app-view').classList.remove('hidden');
 await loadAll();return true
}
function showLogin(msg=''){$('app-view').classList.add('hidden');$('login-view').classList.remove('hidden');$('login-error').classList.toggle('hidden',!msg);$('login-error').textContent=msg}
async function loadAll(){
 try{
  const [pc,cc,sc]=await Promise.all([
   db.from('products').select('id,category_id,sku,slug,name,description,price_clp,sale_price_clp,stock,low_stock_threshold,is_active,is_featured,material,color,dimensions,compartments,product_images(id,image_url,sort_order,is_primary,thumb_url,catalog_url,detail_url)').is('archived_at',null).order('created_at',{ascending:false}),
   db.from('categories').select('id,name,is_active,sort_order').order('sort_order'),
   db.from('store_settings').select('whatsapp_number').eq('id',1).single()
  ]);
  if(pc.error)throw pc.error;if(cc.error)throw cc.error;if(sc.error)throw sc.error;
  products=pc.data||[];categories=cc.data||[];$('whatsapp-number').value=sc.data?.whatsapp_number||'';
  $('admin-retry').classList.add('hidden');renderCategories();renderProducts();
 }catch(error){console.error('Cargar panel',error);$('admin-retry').classList.remove('hidden');toast('Error al cargar datos. Presiona Reintentar.');throw error}
}
function renderCategories(){$('category').innerHTML='<option value="">Sin categoría</option>'+categories.filter(c=>c.is_active).map(c=>`<option value="${esc(c.id)}">${esc(c.name)}</option>`).join('')}
function filtered(){const q=$('search').value.toLowerCase().trim(),f=$('filter').value;return products.filter(p=>{const text=`${p.name} ${p.sku}`.toLowerCase();const low=(p.stock??0)<=(p.low_stock_threshold??3);return(!q||text.includes(q))&&(f==='all'||(f==='active'&&p.is_active)||(f==='inactive'&&!p.is_active)||(f==='low'&&low))})}
function primaryImage(p){const imgs=[...(p.product_images||[])].sort((a,b)=>(Number(b.is_primary)-Number(a.is_primary))||((a.sort_order||0)-(b.sort_order||0)));return imgs[0]?.image_url||'assets/timeless-mariposa.svg'}
function renderProducts(){const list=filtered();$('stat-products').textContent=products.length;$('stat-active').textContent=products.filter(p=>p.is_active).length;$('stat-stock').textContent=products.reduce((s,p)=>s+(Number(p.stock)||0),0);$('stat-low').textContent=products.filter(p=>(p.stock??0)<=(p.low_stock_threshold??3)).length;$('products').innerHTML=list.length?list.map(p=>`<article class="row"><img class="thumb" src="${esc(primaryImage(p))}" alt=""><div><strong>${esc(p.name)}</strong><div class="muted small">${esc(p.sku)}</div></div><div>${money(p.sale_price_clp??p.price_clp)}${p.sale_price_clp?`<div class="muted small"><s>${money(p.price_clp)}</s></div>`:''}</div><div>Stock: <strong>${Number(p.stock)||0}</strong></div><div><span class="pill ${p.is_active?'ok':'off'}">${p.is_active?'Activo':'Inactivo'}</span></div><div class="actions"><button class="icon" data-edit="${esc(p.id)}">Editar</button><button class="icon" data-toggle="${esc(p.id)}">${p.is_active?'Ocultar':'Activar'}</button></div></article>`).join(''):'<div class="empty">No hay productos que coincidan.</div>'}
const photoInputs=Array.from({length:4},(_,i)=>$('photo-'+(i+1)));
function pendingFiles(){return photoInputs.flatMap(input=>Array.from(input.files||[]))}
function renderPendingImages(){const count=editing?.product_images?.length||0;$('pending-images').textContent=count+' guardadas · '+pendingFiles().length+' nuevas · máximo 4';photoInputs.forEach((input,i)=>{input.disabled=i>=Math.max(0,4-count);$('clear-photo-'+(i+1)).disabled=input.disabled})}
photoInputs.forEach((input,i)=>{input.addEventListener('change',()=>{try{validateImageFiles(pendingFiles())}catch(e){input.value='';toast(e.message)}renderPendingImages()});$('clear-photo-'+(i+1)).addEventListener('click',()=>{input.value='';renderPendingImages()})});
function openEditor(p=null){photoInputs.forEach(input=>input.value='');editing=p;$('editor-title').textContent=p?'Editar producto':'Nuevo producto';$('product-id').value=p?.id||'';$('name').value=p?.name||'';$('sku').value=p?.sku||'';$('category').value=p?.category_id||'';$('stock').value=p?.stock??0;$('price').value=p?.price_clp??'';$('sale-price').value=p?.sale_price_clp??'';$('discount-percent').value=(p?.sale_price_clp!=null&&Number(p.price_clp)>0)?Math.round((1-Number(p.sale_price_clp)/Number(p.price_clp))*100):'';$('material').value=p?.material||'';$('color').value=p?.color||'';$('dimensions').value=p?.dimensions||'';$('compartments').value=p?.compartments||'';$('description').value=p?.description||'';$('is-active').checked=p?.is_active??true;$('is-featured').checked=p?.is_featured??false;$('low-threshold').value=p?.low_stock_threshold??3;$('discount-help').textContent=$('discount-percent').value?`Descuento aplicado: ${$('discount-percent').value}%`:'Opcional · se calcula automáticamente.';renderImages(p);renderPendingImages();$('stock-adjustment').classList.toggle('hidden',!p);$('editor').classList.remove('hidden')}
function closeEditor(){$('editor').classList.add('hidden');editing=null}
function renderImages(p){const imgs=[...(p?.product_images||[])].sort((a,b)=>(Number(b.is_primary)-Number(a.is_primary))||((a.sort_order||0)-(b.sort_order||0)));$('existing-images').innerHTML=imgs.map(img=>`<div class="img-card"><img src="${esc(img.image_url)}" alt=""><div class="img-actions">${img.is_primary?'<span class="pill ok">Principal</span>':`<button type="button" class="btn secondary small" data-primary="${esc(img.id)}">Hacer principal</button>`}<button type="button" class="btn danger small" data-delete-image="${esc(img.id)}">Eliminar imagen</button></div></div>`).join('')}
function storagePathFromUrl(url){
 try{
  const parsed=new URL(url);const origin=new URL(SUPABASE_URL);
  const prefix='/storage/v1/object/public/'+BUCKET+'/';
  if(parsed.origin!==origin.origin||!parsed.pathname.startsWith(prefix))return null;
  const path=decodeURIComponent(parsed.pathname.slice(prefix.length));
  return /^[0-9a-f-]{36}\/[0-9a-f-]{36}\.(jpg|jpeg|png|webp|avif)$/i.test(path)?path:null;
 }catch{return null}
}

function validateImageFiles(files){
 for(const file of files){
  if(file.size<=0||file.size>10*1024*1024)throw new Error(file.name+': el tamaño debe estar entre 1 byte y 10 MB.');
  if(!['image/jpeg','image/png','image/webp','image/avif'].includes(file.type))throw new Error(file.name+': formato no permitido.');
 }
}
async function optimizeProductImage(file){
 const bmp=await createImageBitmap(file);
 try{
  const canvas=document.createElement('canvas');
  const scale=Math.min(1,1400/Math.max(bmp.width,bmp.height));
  canvas.width=Math.max(1,Math.round(bmp.width*scale));canvas.height=Math.max(1,Math.round(bmp.height*scale));
  const ctx=canvas.getContext('2d');if(!ctx)throw new Error('No se pudo procesar la fotografía');
  ctx.drawImage(bmp,0,0,canvas.width,canvas.height);
  let blob=null;
  for(const q of [.88,.82,.76,.7]){
   blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/webp',q));
   if(!blob||blob.type!=='image/webp')throw new Error('No se pudo convertir la fotografía a WebP.');
   if(blob.size<=250*1024)break;
  }
  if(!blob||blob.type!=='image/webp'||blob.size>10*1024*1024)throw new Error('La fotografía no se pudo optimizar.');
  return new File([blob],file.name.replace(/\.[^.]+$/,'')+'.webp',{type:'image/webp'});
 }finally{bmp.close()}
}
async function rollbackUploadedImages(productId,created){
 for(const record of created.slice().reverse()){
  if(record.id){const {error}=await db.from('product_images').delete().eq('id',record.id).eq('product_id',productId);if(error)console.error('Limpieza de foto incompleta',error)}
  const {error}=await db.storage.from(BUCKET).remove([record.path,...(record.variants||[])]);if(error)console.error('Limpieza de archivo incompleta',error);
 }
}
async function makeResponsiveVariants(productId,imageId,source){
 const bitmap=await createImageBitmap(source);const uploaded=[];const patch={};
 try{
 for(const [field,max,qualities,target] of [['thumb_url',200,[.82,.74,.65],25],['catalog_url',700,[.87,.80,.73],120],['detail_url',1400,[.90,.84,.78],250]]){
 const canvas=document.createElement('canvas');const scale=Math.min(1,max/Math.max(bitmap.width,bitmap.height));canvas.width=Math.max(1,Math.round(bitmap.width*scale));canvas.height=Math.max(1,Math.round(bitmap.height*scale));canvas.getContext('2d').drawImage(bitmap,0,0,canvas.width,canvas.height);
 let blob;for(const quality of qualities){blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/webp',quality));if(!blob||blob.type!=='image/webp')throw Error('WebP no disponible');if(blob.size<=target*1024)break}
 const path=productId+'/'+crypto.randomUUID()+'.webp';const {error}=await db.storage.from(BUCKET).upload(path,blob,{cacheControl:'31536000',contentType:'image/webp',upsert:false});if(error)throw error;uploaded.push(path);patch[field]=db.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
 }
 const {data,error}=await db.from('product_images').update(patch).eq('id',imageId).eq('product_id',productId).select('id').single();if(error||!data)throw error||Error('No se guardaron variantes');return uploaded;
 }catch(e){if(uploaded.length)await db.storage.from(BUCKET).remove(uploaded);throw e}finally{bitmap.close()}
}
async function optimizeExistingPhotos(){
 const btn=$('optimize-existing'),status=$('optimize-status');btn.disabled=true;
 try{await requireMfa();const {data,error}=await db.from('product_images').select('id,product_id,image_url,thumb_url,catalog_url,detail_url');if(error)throw error;const ids=new Set(products.filter(p=>p.is_active).map(p=>p.id));const pending=data.filter(r=>ids.has(r.product_id)&&!(r.thumb_url&&r.catalog_url&&r.detail_url));let ok=0,failed=0;
 for(let i=0;i<pending.length;i++){const row=pending[i];status.textContent='Procesando '+(i+1)+' de '+pending.length+'…';try{const u=new URL(row.image_url);if(u.origin!==new URL(SUPABASE_URL).origin||!u.pathname.startsWith('/storage/v1/object/public/product-images/'))throw Error('Origen no permitido');const response=await fetch(u.href);if(!response.ok)throw Error('No se pudo descargar');await makeResponsiveVariants(row.product_id,row.id,await response.blob());ok++}catch(e){failed++;console.warn('Optimización pendiente',row.id,e)}}
 status.textContent='Optimizadas: '+ok+' · Pendientes por error: '+failed+'. Las demás ya estaban optimizadas.';await loadAll();
 }catch(e){console.error('Optimización',e);status.textContent='No se pudo completar la optimización.'}finally{btn.disabled=false}
}
async function uploadImages(productId,files){
 const current=products.find(p=>p.id===productId)?.product_images||[];
 const created=[];
 let order=current.length;
 try{
  for(const original of files){
   const file=await optimizeProductImage(original);
   const ext=({'image/jpeg':'jpg','image/png':'png','image/webp':'webp','image/avif':'avif'})[file.type];
   const path=productId+'/'+crypto.randomUUID()+'.'+ext;
   const {error:upErr}=await db.storage.from(BUCKET).upload(path,file,{cacheControl:'31536000',upsert:false,contentType:file.type});
   if(upErr)throw upErr;
   const record={path,id:null};created.push(record);
   const {data:urlData}=db.storage.from(BUCKET).getPublicUrl(path);
   const {data:row,error:rowErr}=await db.from('product_images').insert({product_id:productId,image_url:urlData.publicUrl,sort_order:order,is_primary:false,alt_text:$('name').value.trim()}).select('id').single();
   if(rowErr)throw rowErr;
   record.id=row.id;order++;try{record.variants=await makeResponsiveVariants(productId,row.id,original)}catch(e){console.warn('Variantes pendientes',e)}
  }
  if(!current.length&&created.length){
   const {error:primaryError}=await db.rpc('set_product_primary_image',{p_product_id:productId,p_image_id:created[0].id});
   if(primaryError)throw primaryError;
  }
  return created;
 }catch(error){
  await rollbackUploadedImages(productId,created);
  throw error;
 }
}
async function saveProduct(e){
 e.preventDefault();
 if(saving)return;
 const name=$('name').value.trim(),sku=$('sku').value.trim();
 const rawPrice=$('price').value,rawSale=$('sale-price').value;
 const price=Number(rawPrice),sale=rawSale===''?null:Number(rawSale);
 const files=pendingFiles();
 try{
  if(!name||!sku||rawPrice===''||!Number.isSafeInteger(price)||price<0||price>999999999)throw new Error('Nombre, código y precio entero válido son obligatorios.');
  if(sale!==null&&(!Number.isSafeInteger(sale)||sale<0||sale>price))throw new Error('El precio de oferta debe ser un entero entre cero y el precio normal.');
  validateImageFiles(files);if(files.length+(editing?.product_images?.length||0)>4)throw new Error('Máximo 4 fotografías por producto.');await requireMfa();
  const threshold=Math.max(0,Math.min(1000000,Math.round(Number($('low-threshold').value)||0)));
  const payload={name,sku,slug:slugify(name)+'-'+slugify(sku),category_id:$('category').value||null,description:$('description').value.trim()||null,price_clp:price,sale_price_clp:sale,low_stock_threshold:threshold,is_active:$('is-active').checked,is_featured:$('is-featured').checked,material:$('material').value.trim()||null,color:$('color').value.trim()||null,dimensions:$('dimensions').value.trim()||null,compartments:$('compartments').value.trim()||null,updated_at:new Date().toISOString()};
  saving=true;$('save-product').disabled=true;
  let productId=editing?.id||null,createdNew=false,metadataUpdated=false,createdImages=[];
  try{
   if(!productId){
    const {data,error}=await db.from('products').insert({...payload,is_active:false}).select('id').single();
    if(error)throw error;
    productId=data.id;createdNew=true;
   }
   if(files.length)createdImages=await uploadImages(productId,files);
   const {error}=await db.from('products').update(payload).eq('id',productId);
   if(error)throw error;
   metadataUpdated=true;
   await loadAll();
   closeEditor();
   toast('Producto guardado correctamente.');
  }catch(error){
   console.error('Guardar producto',error);
   if(!metadataUpdated&&createdImages.length)await rollbackUploadedImages(productId,createdImages);
   try{await loadAll()}catch(_){}
   if(createdNew)toast('No se completó la publicación. El producto nuevo permanece como borrador inactivo.');
   else if(metadataUpdated)toast('Producto guardado, pero hubo un error al recargar el listado.');
   else toast('No se completó el guardado. Revisa los datos e inténtalo nuevamente.');
  }finally{saving=false;$('save-product').disabled=false}
 }catch(error){console.warn('Validación del producto',error);toast(error.message||'Revisa los datos del producto')}
}
async function setPrimary(imageId){
 if(!editing||!editing.product_images?.some(img=>img.id===imageId))return toast('Selecciona una imagen de este producto.');
 try{
  await requireMfa();
  const productId=editing.id;
  const {error}=await db.rpc('set_product_primary_image',{p_product_id:productId,p_image_id:imageId});
  if(error)throw error;
  await loadAll();editing=products.find(p=>p.id===productId)||null;renderImages(editing);
  toast('Fotografía principal actualizada.');
 }catch(err){console.error('Imagen principal',err);toast('No se pudo cambiar la imagen principal. Inténtalo nuevamente.')}
}
async function deleteImage(imageId){if(!editing)return;const img=(editing.product_images||[]).find(x=>x.id===imageId);if(!img||!confirm('¿Eliminar esta imagen?'))return;try{await requireMfa();const path=storagePathFromUrl(img.image_url);const paths=[path,...[img.thumb_url,img.catalog_url,img.detail_url].map(storagePathFromUrl)].filter(Boolean);const {error}=await db.from('product_images').delete().eq('id',imageId).eq('product_id',editing.id);if(error)throw error;if(paths.length){const {error:se}=await db.storage.from(BUCKET).remove(paths);if(se)console.warn(se)}await loadAll();editing=products.find(p=>p.id===editing.id);if(editing&&editing.product_images?.length&&!editing.product_images.some(x=>x.is_primary)){const first=[...editing.product_images].sort((a,b)=>(a.sort_order||0)-(b.sort_order||0))[0];const {error:prErr}=await db.rpc('set_product_primary_image',{p_product_id:editing.id,p_image_id:first.id});if(prErr)throw prErr;await loadAll();editing=products.find(p=>p.id===editing.id)}renderImages(editing);renderPendingImages();toast('Imagen eliminada.')}catch(err){console.error(err);toast('No se pudo eliminar la imagen.')}}
async function toggleProduct(id){const p=products.find(x=>x.id===id);if(!p)return;try{await requireMfa();const {error}=await db.from('products').update({is_active:!p.is_active,updated_at:new Date().toISOString()}).eq('id',id);if(error)throw error;await loadAll();toast(p.is_active?'Producto ocultado.':'Producto activado.')}catch(err){console.error('Estado de producto',err);toast(err.message||'No se pudo actualizar el producto.')}}
async function adjustStock(){const product=editing;if(!product?.id)return toast('Guarda el producto antes de cargar existencias.');const raw=$('stock-quantity').value,quantity=Number(raw);if(!/^[0-9]+$/.test(raw)||!Number.isSafeInteger(quantity)||quantity<1||quantity>10000)return toast('Ingresa una cantidad entera entre 1 y 10.000.');const movement_type=$('stock-operation').value;if(!['entry','unavailable'].includes(movement_type))return toast('Operación inválida.');if(movement_type==='unavailable'&&quantity>Number(product.stock||0))return toast('No puedes descontar más unidades que las existentes.');const button=$('apply-stock');button.disabled=true;try{const {data:aal,error:aalError}=await db.auth.mfa.getAuthenticatorAssuranceLevel();if(aalError)throw aalError;if(aal?.currentLevel!=='aal2')throw new Error('Verifica tu segundo factor antes de modificar el stock.');const {error}=await db.from('inventory_movements').insert({product_id:product.id,movement_type,quantity_delta:movement_type==='entry'?quantity:-quantity,note:'Ajuste manual desde editor Timeless TCO'});if(error)throw error;await loadAll();editing=products.find(p=>p.id===product.id)||null;if(editing){$('stock').value=editing.stock??0;$('stock-quantity').value='1';renderImages(editing)}toast('Stock actualizado.')}catch(error){console.error('Stock',error);toast(error.message||'No se pudo modificar el stock.')}finally{button.disabled=false}}
async function saveWhatsapp(){const number=String($('whatsapp-number').value||'').replace(/\D/g,'');if(!/^\d{8,15}$/.test(number))return toast('Ingresa un número válido con código de país.');$('save-whatsapp').disabled=true;try{await requireMfa();const {error}=await db.from('store_settings').update({whatsapp_number:number,updated_at:new Date().toISOString()}).eq('id',1);if(error)throw error;$('whatsapp-number').value=number;toast('WhatsApp actualizado.')}catch(err){console.error(err);toast(err.message||'No se pudo actualizar WhatsApp.')}finally{$('save-whatsapp').disabled=false}}
$('login-form').addEventListener('submit',async e=>{e.preventDefault();$('login-error').classList.add('hidden');const {error}=await db.auth.signInWithPassword({email:$('login-email').value.trim(),password:$('login-password').value});if(error)return showLogin('Email o contraseña incorrectos.');await ensureAdmin()});
$('logout').addEventListener('click',async()=>{await db.auth.signOut();showLogin()});$('save-whatsapp').addEventListener('click',saveWhatsapp);$('retry-load').addEventListener('click',()=>loadAll().catch(()=>{}));$('apply-stock').addEventListener('click',adjustStock);$('new-product').addEventListener('click',()=>openEditor());$('close-editor').addEventListener('click',closeEditor);$('cancel-editor').addEventListener('click',closeEditor);$('product-form').addEventListener('submit',saveProduct);$('search').addEventListener('input',renderProducts);$('filter').addEventListener('change',renderProducts);$('discount-percent').addEventListener('input',syncDiscountFromPercent);$('sale-price').addEventListener('input',syncDiscountFromPrice);$('price').addEventListener('input',()=>{if($('discount-percent').value)syncDiscountFromPercent();else syncDiscountFromPrice()});
document.addEventListener('click',e=>{const edit=e.target.closest('[data-edit]');if(edit)return openEditor(products.find(p=>p.id===edit.dataset.edit));const tog=e.target.closest('[data-toggle]');if(tog)return toggleProduct(tog.dataset.toggle);const pri=e.target.closest('[data-primary]');if(pri)return setPrimary(pri.dataset.primary);const del=e.target.closest('[data-delete-image]');if(del)return deleteImage(del.dataset.deleteImage)});
$('editor').addEventListener('click',e=>{if(e.target===$('editor'))closeEditor()});
$('optimize-existing').addEventListener('click',optimizeExistingPhotos);
$('clean-unused').addEventListener('click',async()=>{
 const btn=$('clean-unused'),status=$('clean-unused-status');btn.disabled=true;
 try{
 await requireMfa();
 const {data,error}=await db.from('product_images').select('image_url,thumb_url,catalog_url,detail_url');if(error)throw error;
 const refs=new Set(data.flatMap(row=>[row.image_url,row.thumb_url,row.catalog_url,row.detail_url]).filter(Boolean).map(storagePathFromUrl).filter(Boolean));
 const paths=["9418d6d0-8335-46b8-8d17-264250ada776/28b6ea1f-8f66-4bbd-9a1b-fa47dda5ad6a.png","bcbba5f6-34d4-46f1-96b6-5624508c3b1e/cb5e9600-12ec-4ee7-abcb-d067f1d221b1.png","31f1a2fd-ab0c-458a-8b85-0bed7d7d6df4/0d5320b7-8d7e-42d2-a59d-960420b67e1d.png"].filter(path=>!refs.has(path));
 if(!paths.length){status.textContent='No hay archivos sobrantes para eliminar.';return}
 const {data:removed,error:removeError}=await db.storage.from(BUCKET).remove(paths);if(removeError)throw removeError;
 status.textContent='Archivos eliminados: '+(removed?.length||0)+'. Las fotografías vinculadas se conservaron.';
 }catch(e){console.error('Limpieza',e);status.textContent='No se pudo completar la limpieza.'}finally{btn.disabled=false}
});
ensureAdmin().catch(err=>{console.error(err);showLogin('No se pudo conectar con Supabase.')});
})();
