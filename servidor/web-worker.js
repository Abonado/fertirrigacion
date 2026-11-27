// Solicitudes de la web pública de Agro Fly (Cloudflare Worker, plan gratuito)
// Recibe el formulario «Pide una demo» de la web, lo guarda y avisa al administrador por el servidor de avisos
// (notificación en el móvil y Telegram). El panel de Agro Fly lee las solicitudes con la sesión de un administrador.
//
// Necesita:
//   WEB             → (Bindings → KV namespace) espacio KV donde se guardan las solicitudes
//   ADMIN_EMAILS    → (variable) correos de los administradores, separados por comas: reciben el aviso y pueden leer la lista
//   AVISOS_SVC      → (Bindings → Service binding) enlace al worker abonado-avisos   (o AVISOS_URL con su dirección)
//   INTERNO_TOKEN   → (secreto) la misma clave que tiene el servidor de avisos
//   WEB_ORIGENES    → (variable, opcional) direcciones de la web separadas por comas, p. ej. https://agrofly.es
//                     Si no se pone, se acepta el formulario desde cualquier dirección (útil mientras no hay dominio).
//
// Rutas:
//   POST /solicitud      → desde la web, sin sesión. Campos: nombre, empresa, correo, telefono, mensaje, modulos[], plan, web (trampa: vacío)
//   POST /solicitudes    → desde el panel, con la sesión de Firebase de un administrador. Devuelve las últimas 200
//   POST /estado         → desde el panel: { id, estado: nueva|contactada|demo|piloto|cliente|descartada, nota }
//   GET  /               → comprobación: qué está configurado

const PROYECTO = 'fertirrigacion-cabezales';
const JWK_URL = 'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com';
const ESTADOS = ['nueva', 'contactada', 'demo', 'piloto', 'cliente', 'descartada'];
const POR_HORA = 5;   // solicitudes por hora desde una misma conexión

const te = new TextEncoder(), td = new TextDecoder();
const deB64u = s => Uint8Array.from(atob(String(s).replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((String(s).length + 3) % 4)), c => c.charCodeAt(0));
const corto = (s, n) => String(s == null ? '' : s).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '').trim().slice(0, n);
const lista = s => String(s || '').split(',').map(x => x.trim()).filter(Boolean);
const admins = env => lista(env.ADMIN_EMAILS).map(e => e.toLowerCase());

/* ---------- sesión de Firebase (igual que los otros servidores) ---------- */
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
  if (pay.email_verified === false) throw new Error('correo');
  return pay;
}

/* ---------- aviso al administrador (por el servidor de avisos, ruta «interno») ---------- */
async function avisar(env, s) {
  const para = admins(env).slice(0, 5);
  if (!(env.AVISOS_SVC || env.AVISOS_URL) || !env.INTERNO_TOKEN || !para.length) return { enviado: false, motivo: 'sin_avisos' };
  const quien = [s.nombre, s.empresa].filter(Boolean).join(' · ');
  const contacto = [s.correo, s.telefono].filter(Boolean).join(' · ');
  const cuerpoTg = [
    'Nueva solicitud de demo en la web',
    quien, contacto,
    s.modulos.length ? 'Módulos: ' + s.modulos.join(', ') : '',
    s.plan ? 'Plan: ' + s.plan : '',
    s.mensaje ? '«' + s.mensaje + '»' : ''
  ].filter(Boolean).join('\n');
  const init = { method: 'POST', headers: { 'content-type': 'application/json', authorization: 'Bearer ' + env.INTERNO_TOKEN },
    body: JSON.stringify({ para, titulo: 'Agro Fly · nueva solicitud', cuerpo: corto(quien + (contacto ? ' — ' + contacto : ''), 300), cuerpoTg, tag: 'solicitud-' + s.id }) };
  try {
    const r = env.AVISOS_SVC ? await env.AVISOS_SVC.fetch('https://abonado-avisos/interno', init) : await fetch(env.AVISOS_URL.replace(/\/+$/, '') + '/interno', init);
    return { enviado: r.ok, http: r.status };
  } catch (e) { return { enviado: false, motivo: 'red' }; }
}

/* ---------- solicitudes ---------- */
const kSol = id => 's:' + id;
function limpiar(b) {
  const modulos = (Array.isArray(b.modulos) ? b.modulos : []).map(m => corto(m, 60)).filter(Boolean).slice(0, 20);
  return {
    nombre: corto(b.nombre, 100), empresa: corto(b.empresa, 120), correo: corto(b.correo, 160).toLowerCase(),
    telefono: corto(b.telefono, 40), mensaje: corto(b.mensaje, 2000), modulos, plan: corto(b.plan, 40), pagina: corto(b.pagina, 200)
  };
}
function errorDe(s) {
  if (!s.nombre) return 'nombre';
  if (!s.correo && !s.telefono) return 'contacto';
  if (s.correo && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s.correo)) return 'correo';
  if (s.telefono && !/^[+\d][\d\s().-]{5,}$/.test(s.telefono)) return 'telefono';
  return '';
}
async function demasiadas(env, ip) {
  const k = 'ip:' + ip + ':' + Math.floor(Date.now() / 3600000);
  const n = +(await env.WEB.get(k)) || 0;
  if (n >= POR_HORA) return true;
  await env.WEB.put(k, String(n + 1), { expirationTtl: 7200 });
  return false;
}
async function todas(env) {
  const l = await env.WEB.list({ prefix: 's:', limit: 1000 });
  // los id empiezan por el momento al revés: las más nuevas salen primero
  const ks = l.keys.slice(0, 200);
  const r = await Promise.all(ks.map(k => env.WEB.get(k.name, 'json')));
  return r.filter(Boolean);
}

export default {
  async fetch(request, env, ctx) {
    const origin = request.headers.get('origin') || '';
    const ruta = new URL(request.url).pathname.replace(/\/+$/, '').split('/').pop();
    const permitidos = lista(env.WEB_ORIGENES);
    const okWeb = !permitidos.length || permitidos.includes(origin);
    const cors = { 'Access-Control-Allow-Origin': ruta === 'solicitud' ? (permitidos.length ? (okWeb ? origin : permitidos[0]) : '*') : (origin || '*'),
      'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'content-type, authorization', 'Access-Control-Max-Age': '86400', 'Vary': 'Origin' };
    const json = (o, s) => new Response(JSON.stringify(o), { status: s || 200, headers: { ...cors, 'content-type': 'application/json' } });
    if (request.method === 'OPTIONS') return new Response(null, { headers: cors });
    if (request.method === 'GET') return json({ ok: true, servicio: 'Web de Agro Fly', kv: !!env.WEB, admins: admins(env).length, avisos: !!((env.AVISOS_SVC || env.AVISOS_URL) && env.INTERNO_TOKEN), origenes: permitidos.length ? permitidos : 'todos' });
    if (request.method !== 'POST') return json({ error: 'metodo' }, 405);
    if (!env.WEB) return json({ error: 'sin_kv' }, 500);
    let b; try { b = await request.json(); } catch { return json({ error: 'peticion' }, 400); }
    if (!b || typeof b !== 'object') return json({ error: 'peticion' }, 400);

    if (ruta === 'solicitud') {
      if (!okWeb) return json({ error: 'origen' }, 403);
      if (b.web) return json({ ok: true });   // trampa para robots: una persona no ve ni rellena este campo
      const s = limpiar(b), err = errorDe(s);
      if (err) return json({ error: 'falta', campo: err }, 400);
      const ip = request.headers.get('cf-connecting-ip') || 'x';
      if (await demasiadas(env, ip)) return json({ error: 'demasiadas' }, 429);
      const ahora = Date.now();
      s.id = String(9999999999999 - ahora).padStart(13, '0') + '-' + Array.from(crypto.getRandomValues(new Uint8Array(4)), x => x.toString(16).padStart(2, '0')).join('');
      s.ts = ahora; s.estado = 'nueva'; s.historial = [];
      await env.WEB.put(kSol(s.id), JSON.stringify(s));
      ctx && ctx.waitUntil ? ctx.waitUntil(avisar(env, s)) : await avisar(env, s);
      return json({ ok: true, id: s.id });
    }

    /* desde aquí, solo administradores con sesión */
    const token = (request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
    let user; try { user = await verificarToken(token); } catch (e) { return json({ error: 'sesion' }, 401); }
    const yo = String(user.email || '').toLowerCase();
    if (!yo || !admins(env).includes(yo)) return json({ error: 'sin_acceso' }, 403);

    if (ruta === 'solicitudes') return json({ ok: true, solicitudes: await todas(env) });
    if (ruta === 'estado') {
      const id = corto(b.id, 40), estado = corto(b.estado, 20);
      if (!id || !ESTADOS.includes(estado)) return json({ error: 'peticion' }, 400);
      const s = await env.WEB.get(kSol(id), 'json'); if (!s) return json({ error: 'no_existe' }, 404);
      s.historial = (s.historial || []).concat({ ts: Date.now(), por: yo, de: s.estado, a: estado, nota: corto(b.nota, 500) }).slice(-50);
      s.estado = estado;
      await env.WEB.put(kSol(id), JSON.stringify(s));
      return json({ ok: true, solicitud: s });
    }
    return json({ error: 'ruta' }, 404);
  }
};
