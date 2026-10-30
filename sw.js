const C='abonado-v152';
const FILES=['./','./index.html','./manifest.webmanifest','./icon-192.png','./icon-512.png','./apple-touch-icon.png','./badge-96.png','./pdf-lib.min.js','./parte-tpl.js','./parte-tpl-p.js','./nube.js'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(C).then(c=>c.addAll(FILES.map(f=>new Request(f,{cache:'reload'})))));self.skipWaiting()});   // siempre de la red, nunca de la caché del navegador
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==C).map(k=>caches.delete(k)))));self.clients.claim()});
self.addEventListener('fetch',e=>{if(e.request.method!=='GET')return;const u=new URL(e.request.url);if(u.origin!==location.origin&&!u.hostname.startsWith('fonts.g')&&!u.pathname.startsWith('/firebasejs/'))return;
  const same=u.origin===location.origin;
  const nav=e.request.mode==='navigate';   // Safari no deja reutilizar una petición de navegación con opciones: se pide por su dirección
  e.respondWith((nav?fetch(e.request.url,{cache:'no-cache',credentials:'same-origin'}):fetch(e.request,same?{cache:'no-cache'}:undefined)).then(r=>{const cp=r.clone();caches.open(C).then(c=>c.put(e.request,cp));return r})
    .catch(()=>caches.match(e.request).then(r=>r||caches.match('./index.html'))))});
/* Avisos con la app cerrada */
self.addEventListener('push',e=>{let d={};try{d=e.data?e.data.json():{}}catch(_){d={b:e.data?e.data.text():''}}
  e.waitUntil(self.registration.showNotification(d.t||'Abonado-Fertirrigación',{body:d.b||'',icon:'icon-192.png',badge:'badge-96.png',tag:d.tag||undefined,renotify:!!d.tag,vibrate:[120,60,120],data:{tab:d.tab||''}}))});
self.addEventListener('notificationclick',e=>{e.notification.close();const tab=(e.notification.data||{}).tab||'';
  e.waitUntil(self.clients.matchAll({type:'window',includeUncontrolled:true}).then(cs=>{for(const c of cs){if(c.url.startsWith(self.registration.scope)&&'focus' in c){c.postMessage({abrir:tab});return c.focus()}}
    return self.clients.openWindow('./'+(tab?'#ir='+tab:''))}))});
