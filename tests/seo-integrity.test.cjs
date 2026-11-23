'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const BASE='https://www.timelesstco.cl/';
const sitemap=fs.readFileSync('sitemap.xml','utf8');
const urls=[...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(x=>x[1]);
const commercial=fs.readdirSync('producto',{withFileTypes:true})
  .filter(x=>x.isDirectory()&&!/^[0-9a-f]{8}-[0-9a-f-]{27,}$/.test(x.name))
  .map(x=>'producto/'+x.name+'/index.html').filter(x=>fs.existsSync(x)).sort();
test('Sitemap identifies canonical HTTPS host and all commercial pages',()=>{
  assert.ok(urls.includes(BASE));
  assert.equal(new Set(urls).size,urls.length,'Duplicate URL in sitemap');
  for(const url of urls){
    assert.ok(url.startsWith(BASE),'Unexpected domain '+url);
    const rel=decodeURIComponent(url.slice(BASE.length));
    const local=rel?rel.endsWith('/')?rel+'index.html':rel:'index.html';
    assert.ok(fs.existsSync(local),'Sitemap target is missing: '+local);
  }
  for(const file of commercial)assert.ok(urls.includes(BASE+file.replace(/index\.html$/,'')),'Product absent from sitemap: '+file);
});
test('All commercial products have unique canonical and coherent structured data',()=>{
  assert.equal(commercial.length,14,'Review expected public product count after catalog changes');
  for(const file of commercial){
    const html=fs.readFileSync(file,'utf8');
    const canonical=BASE+file.replace(/index\.html$/,'');
    assert.ok(html.includes('<link rel="canonical" href="'+canonical+'">'),file+' canonical');
    assert.match(html,/<meta name="description" content="[^"]{30,}"/,file+' description');
    const scripts=[...html.matchAll(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)]
      .map(x=>JSON.parse(x[1]));
    const product=scripts.find(s=>s['@type']==='Product');
    const breadcrumbs=scripts.find(s=>s['@type']==='BreadcrumbList');
    assert.ok(product,file+' missing Product');
    assert.ok(breadcrumbs,file+' missing BreadcrumbList');
    assert.equal(product.url,canonical,file+' Product url');
    assert.equal(breadcrumbs.itemListElement.length,3,file+' breadcrumbs count');
    assert.equal(breadcrumbs.itemListElement[0].item,BASE);
    assert.equal(breadcrumbs.itemListElement[2].item,canonical);
    assert.ok(product.image?.length>0,file+' missing images');
  }
});
test('Legacy UUID product URLs remain noindex and canonical to named page',()=>{
  for(const dir of fs.readdirSync('producto',{withFileTypes:true})){
    if(!dir.isDirectory()||!/^[0-9a-f]{8}-[0-9a-f-]{27,}$/.test(dir.name))continue;
    const file=path.join('producto',dir.name,'index.html');
    if(!fs.existsSync(file))continue;
    const html=fs.readFileSync(file,'utf8');
    assert.match(html,/<meta name="robots" content="noindex,follow">/,file);
    assert.match(html,/<link rel="canonical" href="https:\/\/www\.timelesstco\.cl\/producto\//,file);
  }
});
