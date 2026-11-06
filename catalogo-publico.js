(()=>{
'use strict';
const db=window.supabase.createClient('https://nfphzvcwxyfkbucwwlcx.supabase.co','sb_publishable_DzvTmxOxVWY4LaKNqx2-xA_4RVK2TtS');
const $=id=>document.getElementById(id);
const money=v=>new Intl.NumberFormat('es-CL',{style:'currency',currency:'CLP',maximumFractionDigits:0}).format(Number(v)||0);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
const norm=s=>String(s??'').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
let products=[],selected='todos',whatsapp='56935707722',loadingError=false;
const itemPrice=p=>p.sale_price_clp==null?Number(p.price_clp)||0:Number(p.sale_price_clp);
const category=p=>p.categories?.name||'Colección';
function photos(p){
  const rows=[...(p.product_images||[])].sort((a,b)=>Number(b.is_primary)-Number(a.is_primary)||(Number(a.sort_order)||0)-(Number(b.sort_order)||0));
  const urls=rows.map(r=>{try{const u=new URL(r.image_url,location.href);return u.protocol==='https:'?u.href:''}catch{return''}}).filter(Boolean);
  return urls.length?[...new Set(urls)]:['cartera1234.png'];
}
function messageLink(p){
  const lines=['Hola TIMELESS, quisiera consultar por esta cartera:',p.name,'Código: '+(p.sku||'Sin código'),'Precio publicado: '+(itemPrice(p)>0?money(itemPrice(p)):'A consultar'),'¿Está disponible y cómo coordinamos la entrega?'];
  return 'https://wa.me/'+whatsapp+'?text='+encodeURIComponent(lines.join('\n'));
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
      +'<div class="media">'+(out?'<span class="stock-label">CONSULTAR STOCK</span>':'')
      +'<img class="main-img" src="'+esc(list[0])+'" alt="'+esc(p.name)+'" loading="lazy">'
      +'<span class="tag">'+esc(category(p))+'</span>'
      +(discount?'<span class="discount">-'+discount+'%</span>':'')
      +'</div>'+thumbs
      +'<div class="body"><h3>'+esc(p.name)+'</h3><div class="desc">'+esc(p.description||'Una pieza de nuestra colección TIMELESS.')+'</div>'
      +'<div class="price">'+(regular>price&&price>0?'<span class="old">'+money(regular)+'</span>':'')+'<span class="current">'+(price>0?money(price):'Consultar')+'</span></div>'
      +'<a class="add" href="'+esc(messageLink(p))+'" target="_blank" rel="noopener noreferrer"><i class="fa-brands fa-whatsapp" aria-hidden="true"></i> '+(out?'Consultar disponibilidad':'Consultar por WhatsApp')+'</a>'
      +'</div></article>';
  }).join('')||(loadingError?'<div class="loader" style="grid-column:1/-1">No fue posible cargar los productos. Recarga la página.</div>':'<div class="loader" style="grid-column:1/-1">No hay productos que coincidan.</div>');
}
async function loadContact(){
  try{
    const {data,error}=await db.from('store_settings').select('whatsapp_number').eq('id',1).single();
    if(error)throw error;
    const number=String(data?.whatsapp_number||'').replace(/\D/g,'');
    if(/^\d{8,15}$/.test(number))whatsapp=number;
  }catch(error){console.warn('Usando WhatsApp predeterminado',error)}
  for(const id of ['whatsapp-header','whatsapp-link','whatsapp-fab']){const a=$(id);if(a)a.href='https://wa.me/'+whatsapp}
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
  }catch(error){console.error('Catálogo TIMELESS',error);loadingError=true}
  $('loader')?.remove();render();
}
document.addEventListener('click',event=>{
  const c=event.target.closest('[data-cat]');if(c){selected=c.dataset.cat;buildCategories();render();return}
  const t=event.target.closest('.thumb[data-image]');if(t){const card=t.closest('.card'),img=card?.querySelector('.main-img');if(img)img.src=t.dataset.image;card?.querySelectorAll('.thumb').forEach(b=>b.classList.toggle('active',b===t))}
});
$('search').addEventListener('input',render);
$('sort').addEventListener('change',render);
$('year').textContent=new Date().getFullYear();
loadContact();loadCatalog();
})();