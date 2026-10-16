// IA de incidencias para «Abonado Pinta Santos» con Claude (Cloudflare Worker)
// Solo hay que crear UNA variable secreta en Cloudflare (Settings → Variables and Secrets):
//   ANTHROPIC_API_KEY  →  tu clave de la API de Claude (platform.claude.com → API keys)
// Solo responde a personas que han entrado en la app y que el administrador ha dado de alta.

const PROYECTO = 'fertirrigacion-cabezales';           // proyecto de Firebase
const ORIGENES = ['https://abonado.github.io'];          // desde dónde se puede usar
const MODELO = 'claude-sonnet-5-5';
const JWK_URL = 'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com';

let jwkCache = null, jwkHasta = 0;
const b64url = s => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4)), c => c.charCodeAt(0));
const txt = u => new TextDecoder().decode(u);

async function claves(fetchFn) {
  if (jwkCache && Date.now() < jwkHasta) return jwkCache;
  const r = await fetchFn(JWK_URL);
  const j = await r.json();
  const m = /max-age=(\d+)/.exec(r.headers.get('cache-control') || '');
  jwkCache = j.keys || []; jwkHasta = Date.now() + (m ? +m[1] * 1000 : 3600000);
  return jwkCache;
}

// Comprueba que el token de Firebase es auténtico, de este proyecto y no ha caducado
async function verificarToken(token, proyecto, keys) {
  const p = String(token || '').split('.');
  if (p.length !== 3) throw new Error('token');
  const head = JSON.parse(txt(b64url(p[0]))), pay = JSON.parse(txt(b64url(p[1])));
  if (head.alg !== 'RS256') throw new Error('alg');
  const jwk = keys.find(k => k.kid === head.kid);
  if (!jwk) throw new Error('kid');
  const key = await crypto.subtle.importKey('jwk', jwk, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']);
  const ok = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, b64url(p[2]), new TextEncoder().encode(p[0] + '.' + p[1]));
  if (!ok) throw new Error('firma');
  const ahora = Math.floor(Date.now() / 1000);
  if (pay.aud !== proyecto || pay.iss !== 'https://securetoken.google.com/' + proyecto) throw new Error('proyecto');
  if (!(pay.exp > ahora) || !(pay.iat <= ahora + 300) || !pay.sub) throw new Error('caducado');
  return pay;
}

// Lee la lista de personas con acceso usando el propio token del usuario (las reglas de Firestore lo permiten)
async function autorizado(token, email, fetchFn) {
  const u = `https://firestore.googleapis.com/v1/projects/${PROYECTO}/databases/(default)/documents/abonado_acceso/usuarios`;
  const r = await fetchFn(u, { headers: { authorization: 'Bearer ' + token } });
  if (!r.ok) return false;
  const j = await r.json();
  const vals = (((j.fields || {}).emails || {}).arrayValue || {}).values || [];
  return vals.some(v => String(v.stringValue || '').toLowerCase() === email);
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get('origin') || '';
    const cors = {
      'Access-Control-Allow-Origin': ORIGENES.includes(origin) ? origin : ORIGENES[0],
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'content-type, authorization',
      'Access-Control-Max-Age': '86400',
      'Vary': 'Origin'
    };
    const json = (obj, status) => new Response(JSON.stringify(obj), { status, headers: { ...cors, 'content-type': 'application/json' } });

    if (request.method === 'OPTIONS') return new Response(null, { headers: cors });
    if (request.method === 'GET') return json({ ok: true, servicio: 'IA de incidencias', configurado: !!env.ANTHROPIC_API_KEY }, 200);
    if (request.method !== 'POST') return json({ error: 'metodo' }, 405);
    if (!ORIGENES.includes(origin)) return json({ error: 'origen' }, 403);
    if (!env.ANTHROPIC_API_KEY) return json({ error: 'sin_clave' }, 500);

    // 1. ¿Quién es? (sesión de la app)
    const token = (request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
    let user;
    try { user = await verificarToken(token, PROYECTO, await claves(fetch)); }
    catch (e) { return json({ error: 'sesion' }, 401); }
    const email = String(user.email || '').toLowerCase();
    if (!email || !(await autorizado(token, email, fetch))) return json({ error: 'sin_acceso' }, 403);

    // 2. Petición
    let body;
    try { body = await request.json(); } catch { return json({ error: 'peticion' }, 400); }
    const prompt = String(body.prompt || '').slice(0, 20000);
    if (!prompt) return json({ error: 'peticion' }, 400);
    const tipos = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    const images = (Array.isArray(body.images) ? body.images : [])
      .filter(x => x && typeof x.data === 'string' && x.data.length < 7000000)
      .slice(0, 3)
      .map(x => ({ type: 'image', source: { type: 'base64', media_type: tipos.includes(x.type) ? x.type : 'image/jpeg', data: x.data } }));

    // 3. Claude
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({ model: env.MODEL || MODELO, max_tokens: 2000, messages: [{ role: 'user', content: [...images, { type: 'text', text: prompt }] }] })
    });
    const j = await r.json().catch(() => null);
    if (!r.ok) {
      const msg = (j && j.error && j.error.message) || ('HTTP ' + r.status);
      const code = /credit|balance|billing/i.test(msg) ? 'creditos' : r.status === 429 ? 'limite' : r.status === 529 ? 'ocupada' : r.status === 401 ? 'clave' : 'api';
      return json({ error: code, detail: msg }, 502);
    }
    const text = (j.content || []).filter(c => c.type === 'text').map(c => c.text).join('');
    return json({ text, modelo: j.model, quien: email }, 200);
  }
};
