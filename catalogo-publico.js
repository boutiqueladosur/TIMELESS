(()=>{
'use strict';
const db=window.supabase.createClient('https://nfphzvcwxyfkbucwwlcx.supabase.co','sb_publishable_DzvTmxOxVWY4LaKNqx2-xA_4RVK2TtS');
const $=id=>document.getElementById(id);
const money=v=>new Intl.NumberFormat('es-CL',{style:'currency',currency:'CLP',maximumFractionDigits:0}).format(Number(v)||0);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
const norm=s=>String(s??'').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
let products=[],selected='todos',whatsapp='56935707722',loadingError=false,modalProduct=null,modalImages=[],modalIndex=0,initialDeepLinkHandled=false;
const itemPrice=p=>p.sale_price_clp==null?Number(p.price_clp)||0:Number(p.sale_price_clp);
const category=p=>p.categories?.name||'Colección';
function photos(p){
  const rows=[...(p.product_images||[])].sort((a,b)=>Number(b.is_primary)-Number(a.is_primary)||(Number(a.sort_order)||0)-(Number(b.sort_order)||0));
  const urls=rows.map(r=>{try{const u=new URL(r.image_url,location.href);return u.protocol==='https:'?u.href:''}catch{return''}}).filter(Boolean);
  return urls.length?[...new Set(urls)]:['cartera1234.png'];
}
function messageLink(p){
  const lines=['Hola TIMELESS, quisiera consultar por esta cartera:',p.name,'Código: '+(p.sku||'Sin código'),'Precio publicado: '+(itemPrice(p)>0?money(itemPrice(p)):'A consultar'),'Enlace: '+productLink(p),'¿Está disponible? ¿Cuánto cuesta el despacho a mi comuna y qué formas de pago aceptan?'];
  return 'https://wa.me/'+whatsapp+'?text='+encodeURIComponent(lines.join('\n'));
}
function productLink(p){const url=new URL(location.href);url.hash='';url.searchParams.delete('producto');url.searchParams.set('producto',p.id);return url.href;}
function productById(id){return products.find(p=>String(p.id)===String(id));}
function showImage(index){
 if(!modalImages.length)return;
 modalIndex=(index+modalImages.length)%modalImages.length;
 const photo=$('modal-photo');
 photo.src=modalImages[modalIndex];photo.alt='Fotografía '+(modalIndex+1)+' de '+modalImages.length+' de '+(modalProduct?.name||'la cartera');
 $('modal-count').textContent=modalImages.length>1?'Fotografía '+(modalIndex+1)+' de '+modalImages.length:'';
 $('modal-thumbs').querySelectorAll('[data-modal-index]').forEach(b=>b.classList.toggle('active',Number(b.dataset.modalIndex)===modalIndex));
}
function buildCategories(){
  const cats=[...new Set(products.map(category))].sort((a,b)=>a.localeCompare(b,'es'));
  $('categories').innerHTML=[['todos','Todos'],...cats.map(c=>[norm(c),c])].map(([id,label])=>'<button class="chip '+(selected===id?'active':'')+'" type="button" data-cat="'+esc(id)+'">'+esc(label)+'</button>').join('');
}
function filtered(){
  const search=norm($('search').value),sort=$('sort').value;
  const rows=products.filter(p=>(selected==='todos'||norm(category(p))===selected)&&(!search||norm([p.name,p.description,p.sku,category(p)].join(' ')).includes(search)));
  if(sort==='price-asc')rows.sort((a,b)=>itemPrice(a)-itemPrice(b));
  if(sort==='price-desc')rows.sort((a,b)=>itemPrice(b)-itemPrice(a));
  if(sort==='name')rows.sort((a,b)=>String(a.name).localeCompare(String(b.name),'es'));
  return rows;
}
function render(){
  const rows=filtered();
  $('count').textContent=rows.length+' producto'+(rows.length===1?'':'s');
  $('filter-label').textContent=selected==='todos'?'':'Filtro activo';
  $('grid').innerHTML=rows.map(p=>{
    const list=photos(p),price=itemPrice(p),regular=Number(p.price_clp)||0,out=Number(p.stock||0)<=0;
    const discount=price>0&&regular>price?Math.round((1-price/regular)*100):0;
    const thumbs=list.length>1?'<div class="thumbs">'+list.map((url,i)=>'<button type="button" class="thumb '+(i===0?'active':'')+'" data-image="'+esc(url)+'" aria-label="Fotografía '+(i+1)+'"><img src="'+esc(url)+'" alt=""></button>').join('')+'</div>':'<div class="thumbs" aria-hidden="true"></div>';
    return '<article class="card '+(out?'stock-out':'')+'">'
      +'<div class="media">'+(out?'<span class="stock-label">Consultar stock</span>':(p.is_featured?'<span class="feature-label">Destacado</span>':''))
      +'<img class="main-img" src="'+esc(list[0])+'" alt="'+esc(p.name)+'" loading="lazy">'
      +(discount?'<span class="discount">-'+discount+'% oferta</span>':'')
      +'</div>'+thumbs
      +'<div class="body"><div class="category">'+esc(category(p))+'</div><h3>'+esc(p.name)+'</h3><div class="desc">'+esc(p.description||'Una pieza de nuestra colección TIMELESS.')+'</div>'
      +'<div class="price">'+(regular>price&&price>0?'<span class="old">'+money(regular)+'</span>':'')+'<span class="current">'+(price>0?money(price):'Consultar')+'</span></div>'
      +'<div class="actions"><a class="add" href="'+esc(messageLink(p))+'" target="_blank" rel="noopener noreferrer">'+(out?'Consultar disponibilidad':'Consultar por WhatsApp')+'</a>'
      +'<button type="button" class="details" data-detail="'+esc(p.id)+'" aria-label="Ver fotografías y detalles de '+esc(p.name)+'">Ver fotos y detalles</button></div>'
      +'</div></article>';
  }).join('')||(loadingError?'<div class="loader catalog-error" style="grid-column:1/-1"><p>No pudimos conectar con el catálogo en este momento.</p><button type="button" class="details" id="retry-catalog">Volver a intentar</button></div>':'<div class="loader" style="grid-column:1/-1">No hay productos que coincidan.</div>');
}
let lastModalFocus=null;
function openDetail(id,updateUrl=true){
 const p=productById(id);
 if(!p)return;
 lastModalFocus=document.activeElement;
 modalProduct=p;modalImages=photos(p);modalIndex=0;
 const pics=modalImages,now=itemPrice(p),before=Number(p.price_clp)||0;
 const layer=$('product-modal');
 $('modal-title').textContent=p.name||'Modelo TIMELESS';
 $('modal-category').textContent=category(p);
 $('modal-photo').src=pics[0];
 $('modal-photo').alt=p.name||'Fotografía del producto';
 $('modal-prev').hidden=pics.length<2;$('modal-next').hidden=pics.length<2;
 $('modal-description').textContent=p.description||'Consulta por más información sobre este producto.';
 $('modal-price').textContent='';
 if(before>now&&now>0){
   const strike=document.createElement('del');strike.textContent=money(before);
   $('modal-price').append(strike,document.createTextNode(money(now)));
 }else $('modal-price').textContent=now>0?money(now):'Precio a consultar';
 $('modal-info').textContent='Código: '+(p.sku||'—')+' · '+(Number(p.stock||0)>0?'Consultar disponibilidad para comprar':'Confirmar reposición por WhatsApp');
 $('modal-whatsapp').href=messageLink(p);
 $('modal-thumbs').innerHTML=pics.length>1?pics.map((src,i)=>'<button type="button" data-modal-index="'+i+'" class="'+(i===0?'active':'')+'" aria-label="Ver foto '+(i+1)+'"><img src="'+esc(src)+'" alt=""></button>').join(''):'';
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
  render();
}
async function loadCatalog(){
  try{
    const {data,error}=await db.from('products')
      .select('id,sku,name,description,price_clp,sale_price_clp,is_featured,is_active,stock,category_id,categories(name),product_images(image_url,sort_order,is_primary)')
      .eq('is_active',true).order('is_featured',{ascending:false}).order('name',{ascending:true});
    if(error)throw error;
    products=data||[];loadingError=false;
    buildCategories();
    if(!initialDeepLinkHandled){initialDeepLinkHandled=true;const id=new URLSearchParams(location.search).get('producto');if(id&&productById(id))openDetail(id,false)}
  }catch(error){console.error('Catálogo TIMELESS',error);loadingError=true}
  $('loader')?.remove();render();
}
document.addEventListener('click',event=>{
  const retry=event.target.closest('#retry-catalog');if(retry){loadingError=false;$('loader')?.remove();$('grid').innerHTML='<div class="loader" role="status">Reconectando con el catálogo…</div>';loadCatalog();return}
  const c=event.target.closest('[data-cat]');if(c){selected=c.dataset.cat;buildCategories();render();return}
  const d=event.target.closest('[data-detail]');if(d){openDetail(d.dataset.detail);return}
  const m=event.target.closest('[data-modal-index]');if(m){showImage(Number(m.dataset.modalIndex));return}
  const t=event.target.closest('.thumb[data-image]');if(t){const card=t.closest('.card'),img=card?.querySelector('.main-img');if(img)img.src=t.dataset.image;card?.querySelectorAll('.thumb').forEach(b=>b.classList.toggle('active',b===t))}
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
loadContact();loadCatalog();
})();