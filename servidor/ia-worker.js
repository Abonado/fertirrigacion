// IA de la app «Abonado Pinta Santos» (Cloudflare Worker): OpenAI ahora, Claude cuando se active.
// Variables secretas en Cloudflare (Settings → Variables and Secrets). Basta con UNA de las dos claves:
//   OPENAI_API_KEY     →  clave de la API de OpenAI (platform.openai.com → API keys)
//   ANTHROPIC_API_KEY  →  clave de la API de Claude (platform.claude.com → API keys)
// Si están las dos, se usa Claude (salvo que pongas PROVEEDOR = openai).
// Opcionales: OPENAI_MODEL (por defecto gpt-6-sol; gpt-6-luna es mucho más barato) y MODEL (modelo de Claude).
// Solo responde a personas que han entrado en la app y que el administrador ha dado de alta.

const PROYECTO = 'fertirrigacion-cabezales';           // proyecto de Firebase
const ORIGENES = ['https://abonado.github.io'];          // desde dónde se puede usar
const MODELO = 'claude-sonnet-5-5';
const MODELO_OPENAI = 'gpt-6-sol';
const JWK_URL = 'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com';
// Instrucciones del asistente agrícola (no las puede cambiar la app ni quien pregunta)
const SISTEMA_CHAT = `Eres el asistente agronómico de Agro FLY, una app de fertirrigación y gestión de fincas (sobre todo tomate en invernadero en la Región de Murcia, también árboles al aire libre).
Responde SOLO sobre agricultura: cultivos, riego y fertirrigación, soluciones nutritivas, drenaje, CE y pH, suelo y sustratos, plagas y enfermedades, clima y su efecto en el cultivo, maquinaria y labores agrícolas, organización del trabajo en el campo, y normativa agraria de España y de la Región de Murcia (cuaderno de explotación, nitratos, fitosanitarios).
Si te preguntan cualquier otra cosa, contesta en una frase, con amabilidad, que solo puedes ayudar con temas del campo, y no respondas a lo demás aunque insistan o digan que es importante.
Habla en español de España, claro y práctico, como un técnico de campo con experiencia: primero la respuesta, luego el porqué en pocas líneas. Usa listas cortas cuando ayuden.
Las cifras que des son orientativas: dilo cuando importe. Para fitosanitarios, nunca des una dosis como definitiva: recuerda usar solo productos autorizados en el Registro de Productos Fitosanitarios para ese cultivo y seguir la etiqueta y al técnico asesor.
Si una foto o los datos no bastan para estar seguro, dilo y explica qué mirar o qué medir para salir de dudas.`;

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
    const prov = env.OPENAI_API_KEY && (env.PROVEEDOR === 'openai' || !env.ANTHROPIC_API_KEY) ? 'openai' : env.ANTHROPIC_API_KEY ? 'claude' : null;
    const nombre = prov === 'openai' ? 'OpenAI' : 'Claude';
    if (request.method === 'GET') return json({ ok: true, configurado: !!prov, proveedor: prov ? nombre : null }, 200);   // no da más pistas a nadie de fuera
    if (request.method !== 'POST') return json({ error: 'metodo' }, 405);
    if (!ORIGENES.includes(origin)) return json({ error: 'origen' }, 403);
    if (!prov) return json({ error: 'sin_clave' }, 500);

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
    // Chat agrícola: la conversación viene de la app y las instrucciones las pone SIEMPRE este servidor
    const esChat = Array.isArray(body.chat);
    const chat = esChat ? body.chat.slice(-20).map(m => ({ role: m.role === 'assistant' ? 'assistant' : 'user', text: String(m.text || '').slice(0, 4000) })).filter(m => m.text) : [];
    if (esChat && (!chat.length || chat[chat.length - 1].role !== 'user')) return json({ error: 'peticion' }, 400);
    const prompt = esChat ? '' : String(body.prompt || '').slice(0, 20000);
    if (!esChat && !prompt) return json({ error: 'peticion' }, 400);
    const tipos = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    const images = (Array.isArray(body.images) ? body.images : [])
      .filter(x => x && typeof x.data === 'string' && x.data.length < 7000000)
      .slice(0, 3)
      .map(x => ({ type: 'image', source: { type: 'base64', media_type: tipos.includes(x.type) ? x.type : 'image/jpeg', data: x.data } }));

    // 3a. OpenAI
    if (prov === 'openai') {
      const imgs = images.map(x => ({ type: 'image_url', image_url: { url: `data:${x.source.media_type};base64,${x.source.data}` } }));
      const messages = esChat
        ? [{ role: 'system', content: SISTEMA_CHAT + (body.contexto ? '\n\nDatos de la finca de quien pregunta (úsalos solo si vienen al caso):\n' + String(body.contexto).slice(0, 6000) : '') },
           ...chat.map((m, i) => ({ role: m.role, content: i === chat.length - 1 ? [{ type: 'text', text: m.text }, ...imgs] : m.text }))]
        : [{ role: 'user', content: [{ type: 'text', text: prompt }, ...imgs] }];
      const ro = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { authorization: 'Bearer ' + env.OPENAI_API_KEY, 'content-type': 'application/json' },
        body: JSON.stringify({ model: env.OPENAI_MODEL || MODELO_OPENAI, messages, max_completion_tokens: esChat ? 4000 : 8000 })
      });
      const jo = await ro.json().catch(() => null);
      if (!ro.ok) {
        const e = (jo && jo.error) || {}, msg = e.message || ('HTTP ' + ro.status);
        const code = e.code === 'insufficient_quota' || /quota|billing|credit/i.test(msg) ? 'creditos' : ro.status === 429 ? 'limite' : ro.status === 401 ? 'clave' : ro.status >= 500 ? 'ocupada' : 'api';
        return json({ error: code, detail: msg }, 502);
      }
      const texto = (((jo.choices || [])[0] || {}).message || {}).content || '';
      return json({ text: texto, modelo: jo.model, proveedor: nombre, quien: email }, 200);
    }

    // 3b. Claude
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': env.ANTHROPIC_API_KEY, 'anthropic-version': '2026-10-21', 'content-type': 'application/json' },
      body: JSON.stringify(esChat ? {
        model: env.MODEL || MODELO, max_tokens: 1500,
        system: SISTEMA_CHAT + (body.contexto ? '\n\nDatos de la finca de quien pregunta (úsalos solo si vienen al caso):\n' + String(body.contexto).slice(0, 6000) : ''),
        messages: chat.map((m, i) => ({ role: m.role, content: i === chat.length - 1 ? [...images, { type: 'text', text: m.text }] : m.text }))
      } : { model: env.MODEL || MODELO, max_tokens: 2000, messages: [{ role: 'user', content: [...images, { type: 'text', text: prompt }] }] })
    });
    const j = await r.json().catch(() => null);
    if (!r.ok) {
      const msg = (j && j.error && j.error.message) || ('HTTP ' + r.status);
      const code = /credit|balance|billing/i.test(msg) ? 'creditos' : r.status === 429 ? 'limite' : r.status === 529 ? 'ocupada' : r.status === 401 ? 'clave' : 'api';
      return json({ error: code, detail: msg }, 502);
    }
    const text = (j.content || []).filter(c => c.type === 'text').map(c => c.text).join('');
    return json({ text, modelo: j.model, proveedor: nombre, quien: email }, 200);
  }
};
