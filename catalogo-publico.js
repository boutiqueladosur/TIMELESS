(()=>{
'use strict';
const db=window.supabase?.createClient('https://nfphzvcwxyfkbucwwlcx.supabase.co','sb_publishable_DzvTmxOxVWY4LaKNqx2-xA_4RVK2TtS');
const $=id=>document.getElementById(id);
const money=v=>new Intl.NumberFormat('es-CL',{style:'currency',currency:'CLP',maximumFractionDigits:0}).format(Number(v)||0);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
const norm=s=>String(s??'').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
let products=[],selected='todos',whatsapp='56935707722',loadingError=false,modalProduct=null,modalImages=[],modalIndex=0,initialDeepLinkHandled=false,catalogLoading=true;
const itemPrice=p=>p.sale_price_clp==null?Number(p.price_clp)||0:Number(p.sale_price_clp);
const category=p=>{
 const raw=String(p.categories?.name||'').trim();
 const key=norm(raw);
 if(['bolso','bolsos','bolso hobo','bolsos hobo'].includes(key))return 'Bolsos';
 if(['cartera','carteras'].includes(key))return 'Carteras';
 if(['mochila','mochilas'].includes(key))return 'Mochilas';
 return raw||(/\bhobo\b/i.test(p.name||'')?'Bolsos':/\bmochila\b/i.test(p.name||'')?'Mochilas':'Carteras');
};
function variant(p,url,kind){const row=(p?.product_images||[]).find(r=>r.image_url===url);try{const u=new URL(row?.[kind+'_url']);return u.origin==='https://nfphzvcwxyfkbucwwlcx.supabase.co'&&u.pathname.startsWith('/storage/v1/object/public/product-images/')?u.href:url}catch{return url}}
function photos(p){
  const rows=[...(p.product_images||[])].sort((a,b)=>Number(b.is_primary)-Number(a.is_primary)||(Number(a.sort_order)||0)-(Number(b.sort_order)||0));
  const urls=rows.map(r=>{try{
    const u=new URL(r.image_url,location.href);
    // Las fotos ya están publicadas en GitHub Pages: cargarlas desde el mismo sitio
    // evita depender del host raw.githubusercontent.com para cada miniatura.
    if(u.hostname==='raw.githubusercontent.com'&&u.pathname.startsWith('/boutiqueladosur/TIMELESS/main/assets/')){
      return new URL(u.pathname.replace('/boutiqueladosur/TIMELESS/main/',''),new URL('.',location.href)).href;
    }
    return u.protocol==='https:'?u.href:'';
  }catch{return''}}).filter(Boolean);
  return urls.length?[...new Set(urls)]:['assets/logo-timeless-dorado-2026.svg'];
}
function messageLink(p){
  const lines=['Hola Timeless TCO, quisiera consultar por esta cartera:',p.name,'Código: '+(p.sku||'Sin código'),'Precio publicado: '+(itemPrice(p)>0?money(itemPrice(p)):'A consultar'),'Enlace: '+productLink(p),'¿Está disponible? ¿Cuánto cuesta el despacho a mi comuna y qué formas de pago aceptan?'];
  return 'https://wa.me/'+whatsapp+'?text='+encodeURIComponent(lines.join('\n'));
}
const PRODUCT_SLUGS=Object.freeze({"a80e2f3d-84ba-433b-b91a-ddff8a07cfc7":"bolso-con-flecos-espiritu-boho-camel","2856d071-b34f-4f33-8550-1222fa82fabc":"bolso-con-flecos-espiritu-boho-negro","baaeee94-c196-45bf-b816-aa211e332d28":"bolso-hobo-silueta-retro-azul","36a10d0c-5492-4c78-b2e9-dd0a8ba2cefc":"bolso-hobo-silueta-retro-beige","80cae2c2-4575-4125-ac19-e25500cfd7b1":"bolso-hobo-silueta-retro-verde-oliva","41d67770-4de5-4fca-a055-620874adf444":"cartera-animal-print-instinto-felino-leopardo","c5657ae2-973a-415c-b363-e24b17003d98":"cartera-borgona-clasica-burdeo","f15fe3ea-f773-4095-9065-0f1683b8f41b":"cartera-hobo-esencia-urbana-arena-crema","08dd9c3f-1a03-4018-af70-776b3104b02f":"cartera-hobo-esencia-urbana-cafe","c60f2032-5c47-4e2e-91b5-50f52f390ce1":"cartera-hobo-esencia-urbana-negro","2f5a2586-65a2-462c-bb83-0c5199637454":"cartera-misterio-felino-burdeo-chocolate","87fe22ae-005b-4f4b-845d-6186a6729acf":"cartera-misterio-felino-negro-animal-print","baff973e-736f-4b29-b6e4-e6a642b78f57":"cartera-mochila-pulso-urbano-burdeo","1c449152-a5ec-4bb3-9788-d2338bf0ab05":"cartera-mochila-pulso-urbano-negro"});
const seoPath=p=>PRODUCT_SLUGS[p.id]?'/producto/'+PRODUCT_SLUGS[p.id]+'/':'/?producto='+encodeURIComponent(p.id);
function productLink(p){return 'https://www.timelesstco.cl'+seoPath(p);}
function productById(id){return products.find(p=>String(p.id)===String(id));}
function photoAlt(p,url,index){const row=(p?.product_images||[]).find(r=>r.image_url===url);const custom=String(row?.alt_text||'').trim();return custom&&custom!==p?.name?custom:(p?.name||'Cartera Timeless TCO')+' — fotografía '+(index+1);}
function showImage(index){
 if(!modalImages.length)return;
 modalIndex=(index+modalImages.length)%modalImages.length;
 const photo=$('modal-photo');
 photo.src=variant(modalProduct,modalImages[modalIndex],'detail');photo.alt=photoAlt(modalProduct,modalImages[modalIndex],modalIndex);
 $('modal-count').textContent=modalImages.length>1?'Fotografía '+(modalIndex+1)+' de '+modalImages.length:'';
 $('modal-thumbs').querySelectorAll('[data-modal-index]').forEach(b=>b.classList.toggle('active',Number(b.dataset.modalIndex)===modalIndex));
}
function updateCatalogSchema(){
 const el=$('catalog-schema');if(!el)return;
 const items=products.map((p,i)=>{
  const item={"@type":"Product",name:p.name,description:p.description||p.name,image:photos(p).filter(u=>u.startsWith('https:')),sku:p.sku,brand:{"@type":"Brand",name:"Timeless TCO"},category:category(p),url:productLink(p)};
  if(p.color)item.color=p.color;if(p.material)item.material=p.material;
  const price=itemPrice(p);if(price>0)item.offers={"@type":"Offer",url:productLink(p),priceCurrency:"CLP",price:price,availability:Number(p.stock)>0?"https://schema.org/InStock":"https://schema.org/OutOfStock",seller:{"@type":"Organization",name:"Timeless TCO"}};
  return {"@type":"ListItem",position:i+1,item};
 });
 el.textContent=JSON.stringify({"@context":"https://schema.org","@type":"ItemList","@id":"https://www.timelesstco.cl/#coleccion-list",name:"Colección Timeless TCO",itemListElement:items});
}
function buildCategories(){
  const cats=[...new Set(products.map(category))].sort((a,b)=>a.localeCompare(b,'es'));
  const options=[['todos','Todos'],...cats.map(c=>[norm(c),c])];
  const existing=[...$('categories').querySelectorAll('[data-cat]')];
  if(existing.length===options.length&&existing.every((b,i)=>b.dataset.cat===options[i][0]&&b.textContent===options[i][1])){
    for(const b of existing){const active=b.dataset.cat===selected;b.classList.toggle('active',active);if(b.tagName==='BUTTON')b.setAttribute('aria-pressed',String(active));else if(active)b.setAttribute('aria-current','true');else b.removeAttribute('aria-current')}
    return;
  }
  const routes={bolsos:'/bolsos/',carteras:'/carteras/',mochilas:'/mochilas/'};
  $('categories').innerHTML=options.map(([id,label])=>routes[id]?'<a class="chip '+(selected===id?'active':'')+'" href="'+routes[id]+'" data-cat="'+esc(id)+'"'+(selected===id?' aria-current="true"':'')+'>'+esc(label)+'</a>':'<button class="chip '+(selected===id?'active':'')+'" type="button" data-cat="'+esc(id)+'" aria-pressed="'+String(selected===id)+'">'+esc(label)+'</button>').join('');
}
function filtered(){
  const search=norm($('search').value),sort=$('sort').value;
  const rows=products.filter(p=>(selected==='todos'||norm(category(p))===selected)&&(!search||norm([p.name,p.description,p.sku,p.color,p.material,category(p)].join(' ')).includes(search)));
  if(sort==='price-asc')rows.sort((a,b)=>itemPrice(a)-itemPrice(b));
  if(sort==='price-desc')rows.sort((a,b)=>itemPrice(b)-itemPrice(a));
  if(sort==='name')rows.sort((a,b)=>String(a.name).localeCompare(String(b.name),'es'));
  return rows;
}
function render(){
  if(catalogLoading||(loadingError&&$('grid').querySelector('.card')))return;
  const rows=filtered();
  const countLabel=rows.length+' producto'+(rows.length===1?'':'s');if($('count').textContent!==countLabel)$('count').textContent=countLabel;
  const filterLabel=selected==='todos'?'':'Filtro activo';if($('filter-label').textContent!==filterLabel)$('filter-label').textContent=filterLabel;
  // A matching static gallery is already rendered: do not parse or build any image nodes.
  if(syncExistingCards(rows))return;
  const markup=rows.map((p,index)=>{
    const list=photos(p),price=itemPrice(p),regular=Number(p.price_clp)||0,out=Number(p.stock||0)<=0;
    const discount=price>0&&regular>price?Math.round((1-price/regular)*100):0;
    const thumbs=list.length>1?'<div class="thumbs">'+list.map((url,i)=>'<button type="button" class="thumb '+(i===0?'active':'')+'" data-image="'+esc(variant(p,url,'catalog'))+'" data-alt="'+esc(photoAlt(p,url,i))+'" aria-label="Fotografía '+(i+1)+' de '+esc(p.name)+'"><img src="'+esc(variant(p,url,'thumb'))+'" width="200" height="200" alt="" loading="lazy" decoding="async"></button>').join('')+'</div>':'<div class="thumbs" aria-hidden="true"></div>';
    return '<article class="card '+(out?'stock-out':'')+'" data-product-id="'+esc(p.id)+'">'
      +'<div class="media">'+(out?'<span class="stock-label">Consultar stock</span>':(p.is_featured?'<span class="feature-label">Destacado</span>':''))
      +'<img class="main-img" src="'+esc(variant(p,list[0],'catalog'))+'" width="700" height="875" alt="'+esc(list[0]==='assets/logo-timeless-dorado-2026.svg'?'Fotografía pendiente':photoAlt(p,list[0],0))+'" loading="'+(index<2?'eager':'lazy')+'" fetchpriority="'+(index===0?'high':'auto')+'" decoding="async">'
      +(discount?'<span class="discount">-'+discount+'% oferta</span>':'')
      +'</div>'+thumbs
      +'<div class="body"><div class="category">'+esc(category(p))+'</div><h3>'+esc(p.name)+'</h3><div class="desc">'+esc(p.description||'Una pieza de nuestra colección Timeless TCO.')+'</div>'
      +'<div class="price">'+(regular>price&&price>0?'<span class="old">'+money(regular)+'</span>':'')+'<span class="current">'+(price>0?money(price):'Consultar')+'</span></div>'
      +'<div class="actions">'+(out?'<a class="add" href="'+esc(messageLink(p))+'" target="_blank" rel="noopener noreferrer">Consultar disponibilidad</a>':'<button type="button" class="add" data-cart-add="'+esc(p.id)+'">Agregar al carrito</button>')
      +'<a class="details" href="'+esc(productLink(p))+'" aria-label="Ver detalles de '+esc(p.name)+'">Ver detalles</a></div>'
      +'</div></article>';
  }).join('')||(loadingError?'<div class="loader catalog-error" style="grid-column:1/-1"><p>No pudimos conectar con el catálogo en este momento.</p><button type="button" class="details" id="retry-catalog">Volver a intentar</button></div>':'<div class="loader" style="grid-column:1/-1">No hay productos que coincidan.</div>');
  reconcileGrid(markup);
}
function syncExistingCards(rows){
  const grid=$('grid'),cards=[...grid.children];
  if(cards.length!==rows.length||!rows.length||!cards.every((c,i)=>c.dataset.productId===String(rows[i].id)))return false;
  // Compare all gallery URLs before touching any existing card.
  const plans=rows.map((p,i)=>{
    const card=cards[i],list=photos(p),thumbs=[...card.querySelectorAll('.thumb')],img=card.querySelector('.main-img');
    const equal=(a,b)=>{try{return new URL(a,location.href).href===new URL(b,location.href).href}catch{return false}};
    const same=img&&((list.length>1&&thumbs.length===list.length&&thumbs.every((b,k)=>equal(b.dataset.image,variant(p,list[k],'catalog'))&&equal(b.querySelector('img')?.getAttribute('src'),variant(p,list[k],'thumb'))))||(list.length===1&&!thumbs.length&&equal(img.getAttribute('src'),variant(p,list[0],'catalog'))));
    return {p,card,same};
  });
  if(plans.some(x=>!x.same))return false;
  for(const {p,card} of plans){
    const set=(selector,value)=>{const el=card.querySelector(selector);if(el&&el.textContent!==String(value))el.textContent=value};
    set('.category',category(p));set('h3',p.name);set('.desc',p.description||'Una pieza de nuestra colección Timeless TCO.');
    const price=itemPrice(p),regular=Number(p.price_clp)||0,out=Number(p.stock||0)<=0,discount=price>0&&regular>price?Math.round((1-price/regular)*100):0;
    set('.current',price>0?money(price):'Consultar');
    const old=card.querySelector('.old');if(regular>price&&price>0){if(old)set('.old',money(regular));else{const span=document.createElement('span');span.className='old';span.textContent=money(regular);card.querySelector('.price').prepend(span)}}else old?.remove();
    for(const [cls,label] of [['stock-label',out?'Consultar stock':''],['feature-label',!out&&p.is_featured?'Destacado':''],['discount',discount?'-'+discount+'% oferta':'']]){
      const node=card.querySelector('.'+cls);if(label){if(node){if(node.textContent!==label)node.textContent=label}else{const span=document.createElement('span');span.className=cls;span.textContent=label;card.querySelector('.media').append(span)}}else node?.remove();
    }
    const add=card.querySelector('.add');if(add&&(out?add.tagName!=='A':add.tagName!=='BUTTON')){const next=document.createElement(out?'a':'button');next.className='add';if(out){next.href=messageLink(p);next.target='_blank';next.rel='noopener noreferrer';next.textContent='Consultar disponibilidad'}else{next.type='button';next.dataset.cartAdd=p.id;next.textContent='Agregar al carrito'}add.replaceWith(next)}else if(out&&add&&add.href!==messageLink(p))add.href=messageLink(p);
    const link=card.querySelector('.details');if(link&&link.href!==productLink(p))link.href=productLink(p);
    card.classList.toggle('stock-out',out);
  }
  return true;
}
function reconcileGrid(markup){
  const grid=$('grid'),template=document.createElement('template');template.innerHTML=markup;
  const before=[...grid.children],next=[...template.content.children];
  const oldById=new Map(before.filter(el=>el.dataset.productId).map(el=>[el.dataset.productId,el]));
  const desired=next.map(fresh=>{
    const card=oldById.get(fresh.dataset.productId);if(!card)return fresh;
    // Keep loaded images and selected thumbnails when the gallery itself is unchanged.
    const oldThumbs=[...card.querySelectorAll('.thumb')],newThumbs=[...fresh.querySelectorAll('.thumb')];
    const oldImg=card.querySelector('.main-img'),newImg=fresh.querySelector('.main-img');
    const sameGallery=oldImg&&newImg&&oldThumbs.length===newThumbs.length&&oldThumbs.every((b,i)=>b.dataset.image===newThumbs[i].dataset.image&&b.querySelector('img')?.getAttribute('src')===newThumbs[i].querySelector('img')?.getAttribute('src'))&&(oldThumbs.length||oldImg.getAttribute('src')===newImg.getAttribute('src'));
    if(!sameGallery){
      // Never discard a visible image while its replacement is still downloading.
      const media=card.querySelector('.media'),thumbs=card.querySelector('.thumbs');
      const nextMedia=fresh.querySelector('.media'),nextThumbs=fresh.querySelector('.thumbs');
      const token=(card.galleryRevision||0)+1;card.galleryRevision=token;
      const candidates=[...nextMedia.querySelectorAll('img'),...nextThumbs.querySelectorAll('img')];
      const ready=img=>{const probe=new Image();probe.src=img.getAttribute('src');return typeof probe.decode==='function'?probe.decode():new Promise((resolve,reject)=>{if(probe.complete){probe.naturalWidth?resolve():reject(Error('image unavailable'));return}probe.onload=resolve;probe.onerror=reject})};
      Promise.all(candidates.map(ready)).then(()=>{
        if(card.galleryRevision!==token||!card.isConnected)return;
        if(media)media.replaceWith(nextMedia);if(thumbs)thumbs.replaceWith(nextThumbs);
      }).catch(()=>{/* Keep the last usable gallery on network failure. */});
    }
    else{
      card.galleryRevision=(card.galleryRevision||0)+1;
      for(const sel of ['.stock-label','.feature-label','.discount']){
        const a=card.querySelector(sel),b=fresh.querySelector(sel);
        if(a&&b){if(a.textContent!==b.textContent)a.textContent=b.textContent}
        else if(a)a.remove();else if(b)card.querySelector('.media').append(b.cloneNode(true));
      }
    }
    for(const sel of ['.category','h3','.desc','.price','.actions']){
      const a=card.querySelector(sel),b=fresh.querySelector(sel);
      if(a&&b){
        if(sel==='.price'||sel==='.actions'){
          // Relative and absolute links to the same page are equivalent.
          const normalize=node=>{const clone=node.cloneNode(true);for(const link of clone.querySelectorAll('a[href]'))link.setAttribute('href',link.href);for(const link of clone.querySelectorAll('.details'))link.removeAttribute('aria-label');return clone.innerHTML};
          if(normalize(a)!==normalize(b))a.replaceChildren(...b.childNodes);
        }else if(a.textContent!==b.textContent)a.textContent=b.textContent;
      }
    }
    if(card.className.trim()!==fresh.className.trim())card.className=fresh.className.trim();
    card.removeAttribute('data-static-card');
    return card;
  });
  const keep=new Set(desired);for(const el of before)if(!keep.has(el))el.remove();
  desired.forEach((el,i)=>{if(grid.children[i]!==el)grid.insertBefore(el,grid.children[i]||null)});
}
let lastModalFocus=null;
const homeTitle=document.title;const homeDescription=document.querySelector('meta[name="description"]')?.content||'';
function openDetail(id,updateUrl=true){
 const p=productById(id);
 if(!p)return;
 document.title=p.name+' | Timeless TCO';const descriptionTag=document.querySelector('meta[name="description"]');if(descriptionTag)descriptionTag.content=(p.description||p.name).slice(0,160);
 lastModalFocus=document.activeElement;
 modalProduct=p;modalImages=photos(p);modalIndex=0;
 const pics=modalImages,now=itemPrice(p),before=Number(p.price_clp)||0;
 const layer=$('product-modal');
 $('modal-title').textContent=p.name||'Modelo Timeless TCO';
 $('modal-category').textContent=category(p);
 $('modal-photo').src=variant(p,pics[0],'detail');
 $('modal-photo').alt=p.name||'Fotografía del producto';
 $('modal-prev').hidden=pics.length<2;$('modal-next').hidden=pics.length<2;
 $('modal-description').textContent=p.description||'Consulta por más información sobre este producto.';
 $('modal-price').textContent='';
 if(before>now&&now>0){
   const strike=document.createElement('del');strike.textContent=money(before);
   $('modal-price').append(strike,document.createTextNode(money(now)));
 }else $('modal-price').textContent=now>0?money(now):'Precio a consultar';
 $('modal-info').textContent='Código: '+(p.sku||'—')+' · '+(Number(p.stock||0)>0?'Consultar disponibilidad para comprar':'Confirmar reposición por WhatsApp');
 const specs=$('modal-specs');specs.replaceChildren();for(const [label,value] of [['Material',p.material],['Color',p.color],['Medidas',p.dimensions],['Compartimentos',p.compartments]]){if(!value||!String(value).trim())continue;const row=document.createElement('div'),dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=label;dd.textContent=value;row.append(dt,dd);specs.append(row)}specs.hidden=!specs.children.length;
 $('modal-whatsapp').href=messageLink(p);
 $('modal-cart-add').hidden=Number(p.stock||0)<=0;
 $('modal-cart-add').dataset.productId=p.id;
 $('modal-thumbs').innerHTML=pics.length>1?pics.map((src,i)=>'<button type="button" data-modal-index="'+i+'" class="'+(i===0?'active':'')+'" aria-label="Ver foto '+(i+1)+' de '+pics.length+'"><img src="'+esc(variant(p,src,'thumb'))+'" width="200" height="200" alt="" loading="lazy" decoding="async"></button>').join(''):'';
 showImage(0);$('modal-copy-status').textContent='';
 if(updateUrl){const url=new URL(location.href);url.searchParams.set('producto',p.id);history.pushState({producto:p.id},'',url.pathname+url.search+url.hash)}
 layer.hidden=false;
 document.body.classList.add('modal-open');
 $('modal-close').focus();
}
function closeDetail(updateUrl=true){
 const layer=$('product-modal');
 if(layer.hidden)return;
 layer.hidden=true;
 document.title=homeTitle;const descriptionTag=document.querySelector('meta[name="description"]');if(descriptionTag)descriptionTag.content=homeDescription;
 modalProduct=null;modalImages=[];
 if(updateUrl){const url=new URL(location.href);url.searchParams.delete('producto');history.replaceState(null,'',url.pathname+url.search+url.hash)}
 document.body.classList.remove('modal-open');
 if(lastModalFocus?.isConnected)lastModalFocus.focus();
}
async function loadContact(){
  try{
    const {data,error}=await db.from('store_settings').select('whatsapp_number').eq('id',1).single();
    if(error)throw error;
    const number=String(data?.whatsapp_number||'').replace(/\D/g,'');
    if(/^\d{8,15}$/.test(number))whatsapp=number;
  }catch(error){console.warn('Usando WhatsApp predeterminado',error)}
  for(const id of ['whatsapp-header','whatsapp-link','whatsapp-fab','whatsapp-footer']){const a=$(id);if(a)a.href='https://wa.me/'+whatsapp}
  if(!catalogLoading){render();renderCart()}
}
async function loadCatalog(){
  catalogLoading=true;const status=$('loader');if(status)status.textContent='Actualizando colección…';$('grid').setAttribute('aria-busy','true');
  const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),15000);
  try{
    const {data,error}=await db.from('products')
      .select('id,sku,name,description,price_clp,sale_price_clp,is_featured,is_active,stock,material,color,dimensions,compartments,category_id,categories(name),product_images(image_url,sort_order,is_primary,alt_text,thumb_url,catalog_url,detail_url)')
      .eq('is_active',true).is('archived_at',null).order('is_featured',{ascending:false}).order('name',{ascending:true}).abortSignal(controller.signal);
    if(error)throw error;
    // Preserve the server-rendered order regardless of database collation or response order.
    const initialRank=new Map([...$('grid').querySelectorAll('[data-product-id]')].map((el,i)=>[el.dataset.productId,i]));
    products=(data||[]).slice().sort((a,b)=>(initialRank.get(a.id)??Number.MAX_SAFE_INTEGER)-(initialRank.get(b.id)??Number.MAX_SAFE_INTEGER)||String(a.name).localeCompare(String(b.name),'es')||String(a.id).localeCompare(String(b.id)));loadingError=false;updateCatalogSchema();
    buildCategories();
    if(!initialDeepLinkHandled){initialDeepLinkHandled=true;const id=new URLSearchParams(location.search).get('producto');if(id&&productById(id))openDetail(id,false)}
  }catch(error){console.error('Catálogo Timeless TCO',error);loadingError=true}finally{clearTimeout(timeout);catalogLoading=false;$('grid').setAttribute('aria-busy','false');if(status)status.textContent=''}
  if(loadingError&&$('grid').querySelector('.card')){
    $('count').textContent='Colección disponible · consulta precios y stock por WhatsApp';
    if(status)status.textContent='No se pudo actualizar el inventario en línea.';
    if(!$('retry-catalog')){const retry=document.createElement('button');retry.type='button';retry.id='retry-catalog';retry.className='details';retry.textContent='Actualizar catálogo';$('count').after(retry);}
    return;
  }
  $('retry-catalog')?.remove();render();renderCart();
}
document.addEventListener('click',event=>{
  const add=event.target.closest('[data-cart-add]');if(add){if(catalogLoading){return}if(loadingError){const details=add.closest('.card')?.querySelector('.details');if(details)location.href=details.href;return}addCart(add.dataset.cartAdd);return}
  const qty=event.target.closest('[data-cart-qty]');if(qty){changeCart(qty.dataset.cartQty,Number(qty.dataset.delta));return}
  const remove=event.target.closest('[data-cart-remove]');if(remove){delete cart[remove.dataset.cartRemove];saveCart();renderCart();return}
  const retry=event.target.closest('#retry-catalog');if(retry){loadingError=false;loadCatalog();return}
  const c=event.target.closest('[data-cat]');if(c){if(catalogLoading||loadingError||event.ctrlKey||event.metaKey||event.shiftKey||event.altKey)return;event.preventDefault();selected=c.dataset.cat;buildCategories();render();return}
  const d=event.target.closest('[data-detail]');if(d){openDetail(d.dataset.detail);return}
  const m=event.target.closest('[data-modal-index]');if(m){showImage(Number(m.dataset.modalIndex));return}
  const t=event.target.closest('.thumb[data-image]');if(t){const card=t.closest('.card'),img=card?.querySelector('.main-img');if(img&&t.dataset.image){const url=t.dataset.image;if(img.getAttribute('src')===url)return;const token=(img.thumbRevision||0)+1;img.thumbRevision=token;const probe=new Image();probe.src=url;const commit=()=>{if(img.thumbRevision!==token||!img.isConnected)return;img.src=url;img.alt=t.dataset.alt||img.alt;card.querySelectorAll('.thumb').forEach(b=>b.classList.toggle('active',b===t))};if(probe.complete&&probe.naturalWidth)commit();else if(typeof probe.decode==='function')probe.decode().then(commit).catch(()=>{});else probe.onload=commit;}}
});
$('modal-prev').addEventListener('click',()=>showImage(modalIndex-1));
$('modal-next').addEventListener('click',()=>showImage(modalIndex+1));
$('modal-copy').addEventListener('click',async()=>{
 if(!modalProduct)return;
 const link=productLink(modalProduct);
 try{await navigator.clipboard.writeText(link);$('modal-copy-status').textContent='Enlace copiado';}
 catch(_){$('modal-copy-status').textContent='Copia esta dirección: '+link}
});
$('modal-close').addEventListener('click',()=>closeDetail());
$('product-modal').addEventListener('click',event=>{if(event.target===$('product-modal'))closeDetail()});
document.addEventListener('keydown',event=>{
 if($('product-modal').hidden)return;
 if(event.key==='Escape')closeDetail();
 if(event.key==='ArrowLeft'){showImage(modalIndex-1);return}
 if(event.key==='ArrowRight'){showImage(modalIndex+1);return}
 if(event.key==='Tab'){
  const controls=[...$('product-modal').querySelectorAll('button,a[href]')].filter(el=>el.getClientRects().length);
  if(!controls.length)return;
  const first=controls[0],last=controls[controls.length-1];
  if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus()}
  else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus()}
 }
});
let touchStartX=null;
$('modal-photo').addEventListener('touchstart',event=>{if(event.touches.length===1)touchStartX=event.touches[0].clientX},{passive:true});
$('modal-photo').addEventListener('touchend',event=>{
 if(touchStartX===null||event.changedTouches.length!==1)return;
 const difference=event.changedTouches[0].clientX-touchStartX;touchStartX=null;
 if(modalImages.length>1&&Math.abs(difference)>45)showImage(modalIndex+(difference<0?1:-1));
},{passive:true});
window.addEventListener('popstate',()=>{
 const id=new URLSearchParams(location.search).get('producto');
 if(id&&productById(id)){if(!modalProduct||modalProduct.id!==id)openDetail(id,false)}
 else if(!$('product-modal').hidden)closeDetail(false);
});
$('search').addEventListener('input',render);
$('sort').addEventListener('change',render);
$('year').textContent=new Date().getFullYear();

const CART_STORAGE_KEY='timeless_cart_v1';
let cart={};
try{
 const stored=JSON.parse(localStorage.getItem(CART_STORAGE_KEY)||'{}');
 if(stored&&typeof stored==='object'&&!Array.isArray(stored)){
  for(const [id,qty] of Object.entries(stored)){
   if(/^[0-9a-f-]{36}$/i.test(id)&&Number.isSafeInteger(qty)&&qty>0&&qty<=99)cart[id]=qty;
  }
 }
}catch(_){}
function saveCart(){try{localStorage.setItem(CART_STORAGE_KEY,JSON.stringify(cart))}catch(_){}}
function cartRows(){
 return Object.entries(cart).map(([id,qty])=>{
  const p=productById(id);
  if(!p||!p.is_active)return null;
  const stock=Math.max(0,Math.floor(Number(p.stock)||0));
  if(stock<1)return null;
  return {p,quantity:Math.min(qty,stock),price:itemPrice(p),stock};
 }).filter(Boolean);
}
function renderCart(){
 const rows=cartRows();
 const total=rows.reduce((sum,r)=>sum+r.quantity*r.price,0);
 const count=rows.reduce((sum,r)=>sum+r.quantity,0);
 $('cart-count').textContent=String(count);
 $('cart-total').textContent=money(total);
 $('cart-items').innerHTML=rows.length?rows.map(({p,quantity,price,stock})=>
  '<article class="cart-line"><img loading="lazy" src="'+esc(variant(p,photos(p)[0],'thumb'))+'" alt="">'
  +'<div class="cart-line-body"><strong>'+esc(p.name)+'</strong><small>'+esc(p.sku||'')+' · '+money(price)+' c/u</small>'
  +'<div class="cart-qty"><button type="button" data-cart-qty="'+esc(p.id)+'" data-delta="-1" aria-label="Quitar una unidad de '+esc(p.name)+'">−</button>'
  +'<span>'+quantity+'</span><button type="button" data-cart-qty="'+esc(p.id)+'" data-delta="1" '+(quantity>=stock?'disabled':'')+' aria-label="Agregar una unidad de '+esc(p.name)+'">+</button>'
  +'<button class="cart-remove" type="button" data-cart-remove="'+esc(p.id)+'">Eliminar</button></div></div>'
  +'<strong>'+money(quantity*price)+'</strong></article>').join(''):'<p class="cart-empty">Tu carrito está vacío. Explora nuestra colección y agrega tus favoritas.</p>';
 const msg=['Hola Timeless TCO, quiero realizar este pedido:'];
 rows.forEach(({p,quantity,price},i)=>msg.push((i+1)+'. '+p.name+' ('+(p.sku||'Sin código')+') x'+quantity+' — '+money(price*quantity)));
 msg.push('Subtotal referencial: '+money(total),'Por favor, confirmen disponibilidad, despacho a mi comuna y medios de pago. Entiendo que la compra se confirma cuando acordemos el pago y entrega.');
 const a=$('cart-checkout');
 a.href=rows.length?'https://wa.me/'+whatsapp+'?text='+encodeURIComponent(msg.join('\n')):'#';
 a.setAttribute('aria-disabled',rows.length?'false':'true');
 a.classList.toggle('disabled',!rows.length);
}
function openCart(){renderCart();$('cart-panel').hidden=false;document.body.classList.add('cart-open');$('cart-close').focus()}
function closeCart(){$('cart-panel').hidden=true;document.body.classList.remove('cart-open')}
function addCart(id){
 const p=productById(id);
 if(!p||!p.is_active)return;
 const stock=Math.max(0,Math.floor(Number(p.stock)||0));
 if(stock<1)return;
 if((cart[id]||0)>=stock){openCart();return}
 cart[id]=Math.min(stock,99,(cart[id]||0)+1);
 saveCart();openCart();
}
function changeCart(id,delta){
 const p=productById(id);
 if(!p)return;
 const next=Math.min(99,Math.max(0,Math.min(Math.floor(Number(p.stock)||0),(cart[id]||0)+delta)));
 if(next<1)delete cart[id];else cart[id]=next;
 saveCart();renderCart();
}
$('cart-open').addEventListener('click',openCart);
$('cart-close').addEventListener('click',closeCart);
$('cart-panel').addEventListener('click',event=>{if(event.target===$('cart-panel'))closeCart()});
$('modal-cart-add').addEventListener('click',()=>{const id=$('modal-cart-add').dataset.productId;if(id){closeDetail();addCart(id)}});
$('cart-checkout').addEventListener('click',event=>{if(!cartRows().length){event.preventDefault();return}closeCart()});
document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!$('cart-panel').hidden)closeCart()});

loadContact();loadCatalog();
})();