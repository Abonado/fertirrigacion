// Avisos con la app cerrada para «Abonado Pinta Santos» (Cloudflare Worker, plan gratuito)
// Necesita:
//   1. Un espacio KV enlazado con el nombre de variable  AVISOS
//   2. Un disparador Cron cada 5 minutos:  */5 * * * *
// Los envíos van por grupos (12 personas por vez) para no pasar el límite de 50 conexiones del plan gratuito.
// Solo atiende a personas que han entrado en la app y que el administrador ha dado de alta.

const PROYECTO = 'fertirrigacion-cabezales';
const ORIGENES = ['https://abonado.github.io'];
const SUB_VAPID = 'https://abonado.github.io/fertirrigacion/';
const VAPID_PUBLICA = 'BH8Jm5HP_bXDhFs4e9_lwXiJ7n9YcmHtWzkjqKSx15ySOHDuYFgU2NXji0kaft9Orq4aOHqCYnoLveltvsOcc0I';
const VAPID_PRIVADA_EN_CODIGO = '';   // la clave privada; también vale como secreto VAPID_PRIVADA
const JWK_URL = 'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com';

/* ---------- utilidades ---------- */
const te = new TextEncoder(), td = new TextDecoder();
const b64u = u8 => { let s = ''; u8 = new Uint8Array(u8); for (let i = 0; i < u8.length; i++) s += String.fromCharCode(u8[i]); return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); };
const deB64u = s => Uint8Array.from(atob(String(s).replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((String(s).length + 3) % 4)), c => c.charCodeAt(0));
const unir = (...as) => { const n = as.reduce((s, a) => s + a.length, 0), o = new Uint8Array(n); let p = 0; for (const a of as) { o.set(a, p); p += a.length; } return o; };
const corto = (s, n) => String(s || '').slice(0, n);

/* ---------- sesión de Firebase (igual que el servidor de IA) ---------- */
let jwkCache = null, jwkHasta = 0;
async function claves() {
  if (jwkCache && Date.now() < jwkHasta) return jwkCache;
  const r = await fetch(JWK_URL); const j = await r.json();
  const m = /max-age=(\d+)/.exec(r.headers.get('cache-control') || '');
  jwkCache = j.keys || []; jwkHasta = Date.now() + (m ? +m[1] * 1000 : 3600000); return jwkCache;
}
async function verificarToken(token) {
  const p = String(token || '').split('.'); if (p.length !== 3) throw new Error('token');
  const head = JSON.parse(td.decode(deB64u(p[0]))), pay = JSON.parse(td.decode(deB64u(p[1])));
  if (head.alg !== 'RS256') throw new Error('alg');
  const jwk = (await claves()).find(k => k.kid === head.kid); if (!jwk) throw new Error('kid');
  const key = await crypto.subtle.importKey('jwk', jwk, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']);
  if (!(await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, deB64u(p[2]), te.encode(p[0] + '.' + p[1])))) throw new Error('firma');
  const ahora = Math.floor(Date.now() / 1000);
  if (pay.aud !== PROYECTO || pay.iss !== 'https://securetoken.google.com/' + PROYECTO) throw new Error('proyecto');
  if (!(pay.exp > ahora) || !(pay.iat <= ahora + 300) || !pay.sub) throw new Error('caducado');
  return pay;
}
const autCache = new Map();
async function autorizado(token, email) {
  const c = autCache.get(email); if (c && c > Date.now()) return true;
  const u = `https://firestore.googleapis.com/v1/projects/${PROYECTO}/databases/(default)/documents/abonado_acceso/usuarios`;
  const r = await fetch(u, { headers: { authorization: 'Bearer ' + token } }); if (!r.ok) return false;
  const j = await r.json();
  const vals = (((j.fields || {}).emails || {}).arrayValue || {}).values || [];
  const ok = vals.some(v => String(v.stringValue || '').toLowerCase() === email);
  if (ok) autCache.set(email, Date.now() + 600000);
  return ok;
}

/* ---------- Web Push (RFC 8291 + VAPID) ---------- */
let vapidKey = null;
async function claveVapid(env) {
  if (vapidKey) return vapidKey;
  const pub = deB64u(VAPID_PUBLICA), d = env.VAPID_PRIVADA || VAPID_PRIVADA_EN_CODIGO;
  if (!d) throw new Error('sin_vapid');
  vapidKey = await crypto.subtle.importKey('jwk', { kty: 'EC', crv: 'P-256', x: b64u(pub.slice(1, 33)), y: b64u(pub.slice(33, 65)), d, ext: true }, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
  return vapidKey;
}
async function jwtVapid(env, aud) {
  const h = b64u(te.encode(JSON.stringify({ typ: 'JWT', alg: 'ES256' })));
  const p = b64u(te.encode(JSON.stringify({ aud, exp: Math.floor(Date.now() / 1000) + 12 * 3600, sub: SUB_VAPID })));
  const firma = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, await claveVapid(env), te.encode(h + '.' + p));
  return h + '.' + p + '.' + b64u(firma);
}
async function hkdf(salt, ikm, info, bytes) {
  const k = await crypto.subtle.importKey('raw', ikm, 'HKDF', false, ['deriveBits']);
  return new Uint8Array(await crypto.subtle.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt, info }, k, bytes * 8));
}
async function cifrar(sub, texto) {
  const uaPub = deB64u(sub.keys.p256dh), auth = deB64u(sub.keys.auth);
  const local = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']);
  const asPub = new Uint8Array(await crypto.subtle.exportKey('raw', local.publicKey));
  const uaKey = await crypto.subtle.importKey('raw', uaPub, { name: 'ECDH', namedCurve: 'P-256' }, false, []);
  const ecdh = new Uint8Array(await crypto.subtle.deriveBits({ name: 'ECDH', public: uaKey }, local.privateKey, 256));
  const ikm = await hkdf(auth, ecdh, unir(te.encode('WebPush: info\0'), uaPub, asPub), 32);
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const cek = await hkdf(salt, ikm, te.encode('Content-Encoding: aes128gcm\0'), 16);
  const nonce = await hkdf(salt, ikm, te.encode('Content-Encoding: nonce\0'), 12);
  const k = await crypto.subtle.importKey('raw', cek, 'AES-GCM', false, ['encrypt']);
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, k, unir(te.encode(texto), new Uint8Array([2]))));
  const cab = new Uint8Array(21); cab.set(salt, 0); new DataView(cab.buffer).setUint32(16, 4096); cab[20] = 65;
  return unir(cab, asPub, ct);
}
async function empujar(env, sub, datos, urgente) {
  const url = new URL(sub.endpoint);
  const jwt = await jwtVapid(env, url.origin);
  const cuerpo = await cifrar(sub, JSON.stringify(datos));
  const r = await fetch(sub.endpoint, {
    method: 'POST', body: cuerpo,
    headers: { authorization: `vapid t=${jwt}, k=${VAPID_PUBLICA}`, 'content-encoding': 'aes128gcm', 'content-type': 'application/octet-stream', ttl: '86400', urgency: urgente ? 'high' : 'normal' }
  });
  return r.status;
}

/* ---------- Suscripciones guardadas en KV: s:<email> → [{sub, disp, ts}] ---------- */
const kSub = e => 's:' + e;
async function subsDe(env, email) { return (await env.AVISOS.get(kSub(email), 'json')) || []; }
async function enviarA(env, emails, datos, urgente) {
  let ok = 0, fallos = 0, sinDispositivo = 0;
  for (const email of [...new Set(emails)].slice(0, 12)) {
    const l = await subsDe(env, email); if (!l.length) { sinDispositivo++; continue; }
    const vivas = [];
    for (const s of l) {
      let st = 0; try { st = await empujar(env, s.sub, datos, urgente); } catch (e) { st = 0; }
      if (st === 404 || st === 410) continue;          // el dispositivo ya no existe: se borra
      vivas.push(s); if (st >= 200 && st < 300) ok++; else fallos++;
    }
    if (vivas.length !== l.length) vivas.length ? await env.AVISOS.put(kSub(email), JSON.stringify(vivas)) : await env.AVISOS.delete(kSub(email));
  }
  return { enviados: ok, fallos, sinDispositivo };
}
const datosDe = b => ({ t: corto(b.titulo, 120) || 'Abonado Pinta Santos', b: corto(b.cuerpo, 300), tag: corto(b.tag, 80), tab: corto(b.tab, 60) });

/* ---------- Avisos programados (llenado de depósitos y recordatorios de las notas): clave única "prog" ----------
   Un recordatorio que se repite trae «serie»: las siguientes horas de aviso. Al enviar uno, pasa al siguiente. */
function siguiente(a, ahora) { const l = (a.serie || []).filter(t => t > ahora); if (!l.length) return false; a.cuando = l[0]; a.serie = l.slice(1); a.enviado = 0; delete a.pend; return true; }
async function revisarProgramados(env) {
  const prog = (await env.AVISOS.get('prog', 'json')) || {};
  const ahora = Date.now(); let cambios = false, cupo = 12;   // como mucho 12 personas por pasada; el resto en la siguiente (5 min)
  for (const [id, a] of Object.entries(prog)) {
    if (a.enviado) { if (ahora - a.enviado > 30 * 86400000) { delete prog[id]; cambios = true; } continue; }
    if (!(a.cuando <= ahora)) continue;
    if (ahora - a.cuando > 2 * 86400000) { if (!siguiente(a, ahora)) a.enviado = ahora; cambios = true; continue; }
    if (!a.pend) a.pend = [...(a.para || [])];
    if (cupo <= 0) break;
    const lote = a.pend.splice(0, cupo); cupo -= lote.length;
    if (lote.length) await enviarA(env, lote, datosDe(a), true);
    if (!a.pend.length) { delete a.pend; if (!siguiente(a, ahora)) a.enviado = ahora; }
    cambios = true;
  }
  if (cambios) await env.AVISOS.put('prog', JSON.stringify(prog));
}

export default {
  async fetch(request, env, ctx) {
    const origin = request.headers.get('origin') || '';
    const cors = { 'Access-Control-Allow-Origin': ORIGENES.includes(origin) ? origin : ORIGENES[0], 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'content-type, authorization', 'Access-Control-Max-Age': '86400', 'Vary': 'Origin' };
    const json = (o, s) => new Response(JSON.stringify(o), { status: s || 200, headers: { ...cors, 'content-type': 'application/json' } });
    if (request.method === 'OPTIONS') return new Response(null, { headers: cors });
    if (request.method === 'GET') return json({ ok: true, servicio: 'Avisos de Abonado', kv: !!env.AVISOS, vapid: !!(env.VAPID_PRIVADA || VAPID_PRIVADA_EN_CODIGO) });
    if (request.method !== 'POST') return json({ error: 'metodo' }, 405);
    /* Aviso desde otro servidor nuestro (el puente de los sensores), con la clave compartida INTERNO_TOKEN: no viene de la app */
    if (new URL(request.url).pathname.replace(/\/+$/, '').endsWith('/interno')) {
      const tk = (request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
      if (!env.INTERNO_TOKEN || !env.AVISOS || tk.length !== env.INTERNO_TOKEN.length || tk !== env.INTERNO_TOKEN) return json({ error: 'clave' }, 401);
      let b; try { b = await request.json(); } catch { return json({ error: 'peticion' }, 400); }
      const para = (Array.isArray(b.para) ? b.para : []).map(e => String(e || '').toLowerCase()).filter(e => /^\S+@\S+$/.test(e)).slice(0, 5);
      if (!para.length) return json({ ok: true, enviados: 0 });
      return json({ ok: true, ...(await enviarA(env, para, datosDe(b), true)) });
    }
    if (!ORIGENES.includes(origin)) return json({ error: 'origen' }, 403);
    if (!env.AVISOS) return json({ error: 'sin_kv' }, 500);

    const token = (request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
    let user; try { user = await verificarToken(token); } catch (e) { return json({ error: 'sesion' }, 401); }
    const yo = String(user.email || '').toLowerCase();
    if (!yo || !(await autorizado(token, yo))) return json({ error: 'sin_acceso' }, 403);
    let b; try { b = await request.json(); } catch { return json({ error: 'peticion' }, 400); }
    const ruta = new URL(request.url).pathname.replace(/\/+$/, '').split('/').pop();
    const emails = l => (Array.isArray(l) ? l : []).map(e => String(e || '').toLowerCase()).filter(e => /^\S+@\S+$/.test(e)).slice(0, 200);

    if (ruta === 'suscribir') {
      const s = b.sub || {};
      if (!/^https:\/\//.test(s.endpoint || '') || !s.keys || !s.keys.p256dh || !s.keys.auth) return json({ error: 'peticion' }, 400);
      const l = (await subsDe(env, yo)).filter(x => x.sub.endpoint !== s.endpoint);
      l.unshift({ sub: { endpoint: s.endpoint, keys: { p256dh: s.keys.p256dh, auth: s.keys.auth } }, disp: corto(b.disp, 120), ts: Date.now() });
      await env.AVISOS.put(kSub(yo), JSON.stringify(l.slice(0, 3)));   // como mucho 3 móviles por persona
      return json({ ok: true, dispositivos: Math.min(3, l.length) });
    }
    if (ruta === 'baja') {
      const l = await subsDe(env, yo), r = l.filter(x => x.sub.endpoint !== b.endpoint);
      if (r.length !== l.length) r.length ? await env.AVISOS.put(kSub(yo), JSON.stringify(r)) : await env.AVISOS.delete(kSub(yo));
      return json({ ok: true });
    }
    if (ruta === 'enviar') {
      if (b.prueba) {
        const datos = { t: 'Abonado Pinta Santos', b: 'Los avisos con la app cerrada funcionan en este dispositivo', tag: 'prueba', tab: '' };
        const espera = Math.min(20, Math.max(0, +b.retraso || 0)) * 1000;
        if (espera) { ctx.waitUntil(new Promise(r => setTimeout(r, espera)).then(() => enviarA(env, [yo], datos, true))); return json({ ok: true, programado: espera / 1000 }); }
        return json({ ok: true, ...(await enviarA(env, [yo], datos, true)) });
      }
      const para = emails(b.para).filter(e => e !== yo).slice(0, 12); if (!para.length) return json({ ok: true, enviados: 0 });
      if (b.unico) { const k = 'u:' + corto(b.unico, 200); if (await env.AVISOS.get(k)) return json({ ok: true, repetido: true }); await env.AVISOS.put(k, '1', { expirationTtl: 172800 }); }
      return json({ ok: true, ...(await enviarA(env, para, datosDe(b), b.urgente !== false)) });
    }
    if (ruta === 'programar') {
      const id = corto(b.id, 80); if (!id) return json({ error: 'peticion' }, 400);
      const prog = (await env.AVISOS.get('prog', 'json')) || {}, ant = prog[id];
      if (ant && ant.por && ant.por !== yo && id.startsWith('nota-')) return json({ error: 'sin_acceso' }, 403);
      if (b.borrar) { if (!ant) return json({ ok: true }); delete prog[id]; }
      else {
        const ref = corto(b.ref, 80), cuando = +b.cuando;
        if (!(cuando > 0)) return json({ error: 'peticion' }, 400);
        if (ant && ant.enviado && ant.ref === ref) return json({ ok: true, yaAvisado: true });   // ya se avisó en este llenado
        const serie = (Array.isArray(b.serie) ? b.serie : []).map(Number).filter(t => t > cuando).sort((x, y) => x - y).slice(0, 60);
        if (id.startsWith('nota-') && emails(b.para).some(e => e !== yo)) return json({ error: 'peticion' }, 400);   // las notas son privadas: solo para uno mismo
        prog[id] = { ...datosDe(b), titulo: corto(b.titulo, 120), cuerpo: corto(b.cuerpo, 300), para: emails(b.para), cuando, ref, por: yo, enviado: 0, ...(serie.length ? { serie } : {}) };   // sin «pend»: se reparte al enviar
      }
      await env.AVISOS.put('prog', JSON.stringify(prog));
      return json({ ok: true });
    }
    return json({ error: 'ruta' }, 404);
  },
  async scheduled(event, env, ctx) { if (env.AVISOS) ctx.waitUntil(revisarProgramados(env)); }
};
