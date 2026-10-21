import pathlib, json
from PIL import Image, ImageDraw
src = pathlib.Path('abonado-pinta-santos.html').read_text()
out = pathlib.Path('netlify/abonado')
out.mkdir(parents=True, exist_ok=True)
def rep(s, a, b):
    assert s.count(a)==1, a[:60]
    return s.replace(a, b)
s = src
s = rep(s, """<div><h3>Datos</h3><div class="sub">Recetas y ajustes iniciales</div></div>""", """<div><h3>Datos</h3><div class="sub">Copia de seguridad, recetas y ajustes</div></div>
    <div class="row"><button class="btn pri" data-act="backup">Descargar copia de seguridad</button><label class="btn" for="restore">Restaurar copia</label><input type="file" id="restore" accept="application/json,.json" hidden></div>""")
s = rep(s, "else if(t.dataset.act==='save-reg')saveReg();", "else if(t.dataset.act==='backup')backup();\n  else if(t.dataset.act==='save-reg')saveReg();")
s = rep(s, "/* ---------- Arranque ---------- */", r"""/* ---------- Copia de seguridad ---------- */
async function backup(){toast('Preparando copia…');if(Store.mode==='fb'){try{const x=await NUBE.exportAll();await saveBlob(new Blob([JSON.stringify({app:'abonado-pinta-santos',v:2,exportado:new Date().toISOString(),ls:x.ls,adjuntos:x.adjuntos})],{type:'application/json'}),'abonado-copia-'+hoy()+'.json');toast('Copia descargada: '+x.dias+' días y '+Object.keys(x.adjuntos).length+' adjuntos')}catch(e){toast('Necesitas conexión para descargar la copia')}return}
  const ls={};try{for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);if(k&&k.startsWith('abono.'))ls[k]=localStorage.getItem(k)}}catch(e){}
  const data={app:'abonado-pinta-santos',v:2,exportado:new Date().toISOString(),ls,adjuntos:{}};
  const docs=[...(Store.lsGet('abono.msgs')||[]),...(Store.lsGet('abono.almacen')||[]),...(Store.lsGet('abono.diagnosticos')||[])];
  for(const m of docs)for(const a of m.adjuntos||[]){if(!a.local)continue;const bl=await Adj.idbGet(a.id).catch(()=>null);if(bl)data.adjuntos[a.id]=await new Promise(r=>{const fr=new FileReader();fr.onload=()=>r(fr.result);fr.readAsDataURL(bl)})}
  const regs=Object.keys(ls).filter(k=>k.startsWith('abono.reg.')).length;
  await saveBlob(new Blob([JSON.stringify(data)],{type:'application/json'}),'abonado-copia-'+hoy()+'.json');
  toast('Copia descargada: '+regs+' días y '+Object.keys(data.adjuntos).length+' adjuntos')}
document.addEventListener('change',e=>{if(e.target.id!=='restore'||!e.target.files[0])return;const fr=new FileReader();fr.onload=async()=>{try{const d=JSON.parse(fr.result);if(d.app!=='abonado-pinta-santos')throw 0;
  if(d.ls){for(const[k,v]of Object.entries(d.ls))if(k.startsWith('abono.'))localStorage.setItem(k,v)}
  else{if(d.config)Store.lsSet('abono.config',d.config);for(const r of d.registros||[])if(r&&r.fecha)await Store.setReg(r.fecha,r);if(Array.isArray(d.cambios))Store.lsSet('abono.cambios',d.cambios);if(Array.isArray(d.mensajes))Store.lsSet('abono.msgs',d.mensajes)}
  for(const[id,u]of Object.entries(d.adjuntos||{})){try{const bl=await (await fetch(u)).blob();await Adj.idbPut(id,bl)}catch(_){}}
  if(window.NUBE&&NUBE.user){toast('Subiendo la copia a la nube…');await NUBE.subirLocal(true)}
  toast('Copia restaurada');setTimeout(()=>location.reload(),900)}catch(err){toast('Ese archivo no es una copia de esta app')}};fr.readAsText(e.target.files[0]);e.target.value=''});

/* ---------- Arranque ---------- */""")
import os
fbcfg = pathlib.Path(os.environ.get('FBCFG','firebase-config.json'))
nube = fbcfg.exists()
if nube:
    cfg = json.loads(fbcfg.read_text())
    ns = pathlib.Path('nube.src.js').read_text().replace('__FIREBASE_CONFIG__', json.dumps(cfg['config'])).replace('__ADMIN__', json.dumps(cfg['admin'])).replace('__RECAPTCHA__', json.dumps(cfg.get('recaptcha','')))
    (out/'nube.js').write_text(ns)
    V='10.14.1'
    tags = ''.join(f'<script src="https://www.gstatic.com/firebasejs/{V}/firebase-{m}-compat.js"></script>\n' for m in ('app','auth','firestore')) + '<script src="nube.js"></script>\n'
    i = s.index('<script>')
    s = s[:i] + tags + s[i:]
else:
    (out/'nube.js').unlink(missing_ok=True)
s = s.replace('</script>', """
if('serviceWorker' in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('sw.js').catch(()=>{}));
try{navigator.storage&&navigator.storage.persist&&navigator.storage.persist()}catch(e){}
</script>""")
head = """<!doctype html>
<html lang="es"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="theme-color" content="#1b2f4a">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-title" content="Abonado">
<meta name="application-name" content="Abonado-Fertirrigación">
<link rel="manifest" href="manifest.webmanifest">
<link rel="apple-touch-icon" href="apple-touch-icon.png">
<link rel="icon" type="image/png" href="icon-192.png">
<style>:root{padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}body{margin:0}img{max-width:100%}[hidden]{display:none!important}</style>
</head><body>
"""
(out/'index.html').write_text(head + s + "\n</body></html>\n")
(out/'manifest.webmanifest').write_text(json.dumps({
 "name":"Abonado-Fertirrigación","short_name":"Abonado","lang":"es","start_url":"./","scope":"./","display":"standalone",
 "background_color":"#eef2ef","theme_color":"#1b2f4a",
 "icons":[{"src":"icon-192.png","sizes":"192x192","type":"image/png","purpose":"any maskable"},
          {"src":"icon-512.png","sizes":"512x512","type":"image/png","purpose":"any maskable"}]},ensure_ascii=False,indent=1))
(out/'sw.js').write_text("""const C='abonado-v93';
const FILES=['./','./index.html','./manifest.webmanifest','./icon-192.png','./icon-512.png','./apple-touch-icon.png','./badge-96.png','./pdf-lib.min.js','./parte-tpl.js','./parte-tpl-p.js'"""+(",'./nube.js'" if nube else '')+"""];
self.addEventListener('install',e=>{e.waitUntil(caches.open(C).then(c=>c.addAll(FILES)));self.skipWaiting()});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==C).map(k=>caches.delete(k)))));self.clients.claim()});
self.addEventListener('fetch',e=>{if(e.request.method!=='GET')return;const u=new URL(e.request.url);if(u.origin!==location.origin&&!u.hostname.startsWith('fonts.g')&&!u.pathname.startsWith('/firebasejs/'))return;
  const same=u.origin===location.origin;
  e.respondWith(fetch(e.request,same?{cache:'no-cache'}:undefined).then(r=>{const cp=r.clone();caches.open(C).then(c=>c.put(e.request,cp));return r})
    .catch(()=>caches.match(e.request).then(r=>r||caches.match('./index.html'))))});
/* Avisos con la app cerrada */
self.addEventListener('push',e=>{let d={};try{d=e.data?e.data.json():{}}catch(_){d={b:e.data?e.data.text():''}}
  e.waitUntil(self.registration.showNotification(d.t||'Abonado-Fertirrigación',{body:d.b||'',icon:'icon-192.png',badge:'badge-96.png',tag:d.tag||undefined,renotify:!!d.tag,vibrate:[120,60,120],data:{tab:d.tab||''}}))});
self.addEventListener('notificationclick',e=>{e.notification.close();const tab=(e.notification.data||{}).tab||'';
  e.waitUntil(self.clients.matchAll({type:'window',includeUncontrolled:true}).then(cs=>{for(const c of cs){if(c.url.startsWith(self.registration.scope)&&'focus' in c){c.postMessage({abrir:tab});return c.focus()}}
    return self.clients.openWindow('./'+(tab?'#ir='+tab:''))}))});
""")
(out/'_headers').write_text("/sw.js\n  Cache-Control: no-cache\n/index.html\n  Cache-Control: no-cache\n")
import shutil
shutil.copy('libs/pdf-lib.min.js', out/'pdf-lib.min.js')
shutil.copy('plantilla/parte-tpl.js', out/'parte-tpl.js')
shutil.copy('plantilla2/parte-tpl-p.js', out/'parte-tpl-p.js')
shutil.copytree('fincas', out/'fincas', dirs_exist_ok=True)
print('ok')
for f in ('icon-192.png', 'icon-512.png', 'apple-touch-icon.png', 'badge-96.png'):
    if pathlib.Path('iconos-app/' + f).exists(): shutil.copy('iconos-app/' + f, out / f)
