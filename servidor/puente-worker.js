// Servidor puente de los sensores para «Abonado-Fertirrigación» (Cloudflare Worker, plan gratuito)
//
// Qué hace:
//   · /p    → recibe lo que manda la pasarela casera (diseño P del Taller): {"raw":"N4;id=1A2B3C;ta=24.1;…","rssi":-87,"snr":7.5,"gw":"…"}
//   · /ttn  → recibe los sensores LoRaWAN comprados desde The Things Network (webhook «Uplink message»)
//   · /clima → recibe lo que lee del controlador de clima el «Lector del clima» (extensión de Edge en el PC de la oficina):
//            {"cab":"gas","comp":[{"n":1,"ta":27.5,"hr":68,"vent":[98,98,100]},…]}. Se guarda como una placa por compartimento
//            (UC-GAS-1, UC-GAS-2…) y en UC-ESTADO la hora de la última lectura. Si en horario de trabajo lleva más de 90 min sin
//            llegar nada, avisa una vez al administrador.
//   Con cada dato: lo guarda en abonado_lecturas (un documento por placa y día, con todos los puntos) y pone el «último dato»
//   y la batería en su aparato de «Mis aparatos» (el que tenga ese número de placa).
//   · Cada 30 minutos (Cron): si un aparato con placa lleva más de 2 horas sin mandar nada, avisa al administrador
//     (a través del servidor de avisos, ruta «interno»). Avisa una sola vez hasta que vuelva a mandar.
//
// Necesita en Cloudflare (Settings → Variables and Secrets):
//   FIREBASE_SA     → el JSON de la cuenta de servicio de Firebase (el mismo de la copia de seguridad), como secreto
//   PUENTE_TOKEN    → una clave larga inventada; la misma se pone en la app (Ajustes → Sensores) para la pasarela casera
//   TTN_TOKEN       → otra clave larga; en The Things Network, webhook → «Additional headers»: Authorization = Bearer <TTN_TOKEN>
//   AVISOS_URL      → dirección del servidor de avisos (la misma de la app), sin barra final   (opcional: sin ella no avisa)
//   INTERNO_TOKEN   → clave compartida con el servidor de avisos (secreto con el mismo nombre allí)     (opcional)
//   ADMIN_EMAIL     → correo del administrador para los avisos                                       (opcional)
// Y un disparador Cron:  */30 * * * *
// Nada de esto vive en la app ni en GitHub: solo aquí.

const PROYECTO = 'fertirrigacion-cabezales';
const FS = `https://firestore.googleapis.com/v1/projects/${PROYECTO}/databases/(default)/documents`;
const SIN_DATOS_MIN = 120;

/* ---------- utilidades ---------- */
const te = new TextEncoder();
const b64u = u8 => { let s = ''; u8 = new Uint8Array(u8); for (let i = 0; i < u8.length; i++) s += String.fromCharCode(u8[i]); return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); };
const json = (o, s) => new Response(JSON.stringify(o), { status: s || 200, headers: { 'content-type': 'application/json' } });
const corto = (s, n) => String(s == null ? '' : s).slice(0, n);
const hoyMadrid = t => new Date(t).toLocaleDateString('sv-SE', { timeZone: 'Europe/Madrid' });   // AAAA-MM-DD

/* ---------- cuenta de servicio de Firebase → token de acceso ---------- */
let tokCache = null, tokHasta = 0;
async function token(env) {
  if (tokCache && Date.now() < tokHasta) return tokCache;
  const sa = JSON.parse(env.FIREBASE_SA), ahora = Math.floor(Date.now() / 1000);
  const cab = b64u(te.encode(JSON.stringify({ alg: 'RS256', typ: 'JWT' })));
  const cuerpo = b64u(te.encode(JSON.stringify({ iss: sa.client_email, scope: 'https://www.googleapis.com/auth/datastore', aud: 'https://oauth2.googleapis.com/token', iat: ahora, exp: ahora + 3600 })));
  const pem = sa.private_key.replace(/-----[^-]+-----/g, '').replace(/\s+/g, '');
  const clave = await crypto.subtle.importKey('pkcs8', Uint8Array.from(atob(pem), c => c.charCodeAt(0)), { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']);
  const firma = b64u(await crypto.subtle.sign('RSASSA-PKCS1-v1_5', clave, te.encode(cab + '.' + cuerpo)));
  const r = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: 'grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=' + cab + '.' + cuerpo + '.' + firma });
  const j = await r.json(); if (!j.access_token) throw new Error('token');
  tokCache = j.access_token; tokHasta = Date.now() + 50 * 60000; return tokCache;
}
async function fs(env, metodo, ruta, cuerpo) {
  const r = await fetch(ruta.startsWith('http') ? ruta : FS + ruta, { method: metodo, headers: { authorization: 'Bearer ' + await token(env), 'content-type': 'application/json' }, body: cuerpo ? JSON.stringify(cuerpo) : undefined });
  if (!r.ok) throw new Error('firestore ' + r.status + ' ' + (await r.text()).slice(0, 200));
  return r.json();
}
/* Valores de JS ↔ Firestore */
const aFS = v => v == null ? { nullValue: null } : typeof v === 'boolean' ? { booleanValue: v } : typeof v === 'number' ? (Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v })
  : typeof v === 'string' ? { stringValue: v } : Array.isArray(v) ? { arrayValue: { values: v.map(aFS) } } : { mapValue: { fields: Object.fromEntries(Object.entries(v).map(([k, x]) => [k, aFS(x)])) } };
const deFS = f => f == null ? null : 'stringValue' in f ? f.stringValue : 'integerValue' in f ? +f.integerValue : 'doubleValue' in f ? f.doubleValue : 'booleanValue' in f ? f.booleanValue
  : 'nullValue' in f ? null : 'mapValue' in f ? Object.fromEntries(Object.entries(f.mapValue.fields || {}).map(([k, x]) => [k, deFS(x)])) : 'arrayValue' in f ? (f.arrayValue.values || []).map(deFS) : null;

/* ---------- lo que mandan las placas ---------- */
// «N4;id=1A2B3C;ta=24.1;hr=71;th=22.8;bat=3.98» → {nodo:'N4', id:'1A2B3C', v:{ta:24.1, hr:71, th:22.8}, bat:3.98}
function leerRaw(raw) {
  const p = corto(raw, 300).split(';'), nodo = corto(p.shift(), 12), v = {}; let id = '', bat = null;
  for (const kv of p) { const i = kv.indexOf('='); if (i < 1) continue; const k = corto(kv.slice(0, i), 12), x = kv.slice(i + 1), n = parseFloat(x);
    if (k === 'id') id = corto(x, 20).toUpperCase(); else if (k === 'bat') bat = isFinite(n) ? n : null; else v[k] = isFinite(n) && /^-?[\d.]+$/.test(x) ? n : corto(x, 20); }
  return { nodo, id, v, bat };
}
const TXT = {
  N1: v => `${v.pct} % · ${v.cm} cm`, N2: v => `humedad ${v.hum} %`, N4: v => `${fmt(v.ta)} °C · ${v.hr} % · hoja ${fmt(v.th)} °C`, N5: v => `${fmt(v.t)} °C`,
  N6: v => `${v.pul} pulsos · ${fmt(v.valor)}`, N7: v => `${fmt(v.valor)} ${v.u || ''} · ${fmt(v.ma)} mA`, N8: v => `${v.co2} ppm · ${fmt(v.ta)} °C`, N9: v => `${fmt(v.amp)} A · ${v.marcha ? 'en marcha' : 'parada'}`,
  P: v => `pasarela · ${v.up} min encendida`, PING: v => `prueba de cobertura ${v.n}`
};
function fmt(n) { return typeof n === 'number' ? String(Math.round(n * 10) / 10).replace('.', ',') : '—'; }
const texto = (nodo, v) => { try { return (TXT[nodo] || (x => Object.entries(x).map(([k, y]) => k + ' ' + (typeof y === 'number' ? fmt(y) : y)).join(' · ')))(v); } catch (e) { return ''; } };

/* Número de placa → aparato (se recuerda 10 minutos para no preguntar en cada dato) */
const mapa = new Map();
async function aparatoDe(env, dev) {
  const c = mapa.get(dev); if (c && Date.now() - c.t < 600000) return c.id;
  const r = await fs(env, 'POST', ':runQuery', { structuredQuery: { from: [{ collectionId: 'abonado_aparatos' }], where: { fieldFilter: { field: { fieldPath: 'dev' }, op: 'EQUAL', value: { stringValue: dev } } }, limit: 1 } });
  const d = (r.find(x => x.document) || {}).document, id = d ? d.name.split('/').pop() : null;
  mapa.set(dev, { id, t: Date.now() }); return id;
}
async function registrar(env, { nodo, id, v, bat, rssi, snr, gw }) {
  if (!/^[0-9A-F]{4,20}$/.test(id)) return { error: 'id' };
  const t = Date.now(), fecha = hoyMadrid(t), doc = `abonado_lecturas/${id}_${fecha}`;
  const punto = { t, v, ...(bat != null ? { bat } : {}), ...(rssi != null ? { rssi } : {}), ...(snr != null ? { snr } : {}) };
  await fs(env, 'POST', ':commit', { writes: [{
    update: { name: `projects/${PROYECTO}/databases/(default)/documents/${doc}`, fields: { dev: aFS(id), nodo: aFS(nodo), fecha: aFS(fecha), ts: aFS(new Date(t).toISOString()), ...(gw ? { gw: aFS(gw) } : {}) } },
    updateMask: { fieldPaths: ['dev', 'nodo', 'fecha', 'ts', ...(gw ? ['gw'] : [])] },
    updateTransforms: [{ fieldPath: 'p', appendMissingElements: { values: [aFS(punto)] } }] }] });
  const ap = await aparatoDe(env, id);
  if (ap && nodo !== 'PING') await fs(env, 'PATCH', `/abonado_aparatos/${ap}?updateMask.fieldPaths=dato&updateMask.fieldPaths=sinDatosAvisado`,
    { fields: { dato: aFS({ ts: new Date(t).toISOString(), txt: texto(nodo, v), bat: bat != null ? Math.round(bat * 100) / 100 : null, v, nodo, auto: true }), sinDatosAvisado: aFS(false) } });
  return { ok: true, aparato: ap || null };
}

/* ---------- controlador de clima: lo manda el lector del PC ---------- */
const numR = (x, a, b) => typeof x === 'number' && isFinite(x) && x >= a && x <= b ? Math.round(x * 10) / 10 : null;
const docFS = d => `projects/${PROYECTO}/databases/(default)/documents/abonado_lecturas/${d}`;
async function registrarClima(env, b) {
  const cab = corto(b.cab, 12).replace(/[^a-z0-9]/gi, '').toLowerCase(); if (!cab) return { error: 'cab' };
  const C = (Array.isArray(b.comp) ? b.comp : []).slice(0, 20).map(c => ({ n: Math.round(+(c && c.n)), ta: numR(c && c.ta, -20, 60), hr: numR(c && c.hr, 0, 100),
    vent: (Array.isArray(c && c.vent) ? c.vent : []).slice(0, 6).map(v => numR(v, 0, 100)).filter(v => v != null) })).filter(c => c.n >= 1 && c.n <= 20 && (c.ta != null || c.hr != null));
  if (!C.length) return { error: 'sin_datos' };
  const t = Date.now(), fecha = hoyMadrid(t), iso = new Date(t).toISOString(), writes = [];
  for (const c of C) { const dev = `UC-${cab.toUpperCase()}-${c.n}`, v = { ...(c.ta != null ? { ta: c.ta } : {}), ...(c.hr != null ? { hr: c.hr } : {}), ...(c.vent.length ? { vent: c.vent } : {}) };
    writes.push({ update: { name: docFS(`${dev}_${fecha}`), fields: { dev: aFS(dev), nodo: aFS('UC'), cab: aFS(cab), comp: aFS(c.n), fecha: aFS(fecha), ts: aFS(iso) } },
      updateMask: { fieldPaths: ['dev', 'nodo', 'cab', 'comp', 'fecha', 'ts'] }, updateTransforms: [{ fieldPath: 'p', appendMissingElements: { values: [aFS({ t, v })] } }] }); }
  writes.push({ update: { name: docFS('UC-ESTADO'), fields: { dev: aFS('UC-ESTADO'), nodo: aFS('UC'), cab: aFS(cab), ts: aFS(iso), n: aFS(C.length), avisado: aFS(false) } } });
  await fs(env, 'POST', ':commit', { writes });
  return { ok: true, n: C.length };
}
async function revisarClima(env) {
  if (!env.AVISOS_URL || !env.INTERNO_TOKEN || !env.ADMIN_EMAIL) return;
  let d; try { d = await fs(env, 'GET', '/abonado_lecturas/UC-ESTADO'); } catch (e) { return; }
  const f = d.fields || {}, ts = Date.parse(deFS(f.ts) || ''); if (!ts || deFS(f.avisado)) return;
  const h = +new Date().toLocaleString('en-GB', { timeZone: 'Europe/Madrid', hour: '2-digit', hour12: false }); if (h < 8 || h >= 20) return;
  const min = (Date.now() - ts) / 60000; if (min < 90) return;
  await fetch(env.AVISOS_URL + '/interno', { method: 'POST', headers: { 'content-type': 'application/json', authorization: 'Bearer ' + env.INTERNO_TOKEN },
    body: JSON.stringify({ para: [env.ADMIN_EMAIL], titulo: 'El lector del clima no manda', cuerpo: `Lleva ${Math.round(min / 60 * 10) / 10} h sin leer el controlador. Mira que el ordenador esté encendido con Edge abierto.`, tag: 'clima-lector', tab: 'estres' }) }).catch(() => {});
  await fs(env, 'PATCH', '/abonado_lecturas/UC-ESTADO?updateMask.fieldPaths=avisado', { fields: { avisado: aFS(true) } });
}

/* ---------- aviso de aparatos que dejan de mandar ---------- */
async function revisar(env) {
  if (!env.AVISOS_URL || !env.INTERNO_TOKEN || !env.ADMIN_EMAIL) return;
  const r = await fs(env, 'POST', ':runQuery', { structuredQuery: { from: [{ collectionId: 'abonado_aparatos' }], where: { fieldFilter: { field: { fieldPath: 'estado' }, op: 'EQUAL', value: { stringValue: 'activo' } } }, limit: 500 } });
  for (const x of r) { if (!x.document) continue; const f = x.document.fields || {}, dev = deFS(f.dev), dato = deFS(f.dato) || {}, nombre = deFS(f.nombre) || 'Aparato';
    if (!dev || !dato.ts || deFS(f.sinDatosAvisado)) continue;
    const min = (Date.now() - Date.parse(dato.ts)) / 60000; if (min < SIN_DATOS_MIN) continue;
    const id = x.document.name.split('/').pop();
    await fetch(env.AVISOS_URL + '/interno', { method: 'POST', headers: { 'content-type': 'application/json', authorization: 'Bearer ' + env.INTERNO_TOKEN },
      body: JSON.stringify({ para: [env.ADMIN_EMAIL], titulo: 'Sin datos: ' + nombre, cuerpo: `Lleva ${Math.round(min / 60)} h sin mandar. Mira la batería, la antena y la pasarela.`, tag: 'sindatos-' + id, tab: 'aparatos' }) }).catch(() => {});
    await fs(env, 'PATCH', `/abonado_aparatos/${id}?updateMask.fieldPaths=sinDatosAvisado`, { fields: { sinDatosAvisado: aFS(true) } });
  }
}

/* ---------- entradas ---------- */
const igual = (a, b) => { a = te.encode(String(a || '')); b = te.encode(String(b || '')); if (a.length !== b.length) return false; let d = 0; for (let i = 0; i < a.length; i++) d |= a[i] ^ b[i]; return d === 0; };
export default {
  async fetch(request, env) {
    if (request.method !== 'POST') return json({ error: 'metodo' }, 405);
    const ruta = new URL(request.url).pathname.replace(/\/+$/, '').split('/').pop(), tk = (request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
    let b; try { b = await request.json(); } catch { return json({ error: 'peticion' }, 400); }
    try {
      if (ruta === 'p') {
        if (!env.PUENTE_TOKEN || !igual(tk, env.PUENTE_TOKEN)) return json({ error: 'clave' }, 401);
        const L = leerRaw(b.raw); if (!L.id) return json({ error: 'sin_id' }, 400);
        return json(await registrar(env, { ...L, rssi: typeof b.rssi === 'number' ? b.rssi : null, snr: typeof b.snr === 'number' ? b.snr : null, gw: corto(b.gw, 20) }));
      }
      if (ruta === 'clima') {
        if (!env.PUENTE_TOKEN || !igual(tk, env.PUENTE_TOKEN)) return json({ error: 'clave' }, 401);
        return json(await registrarClima(env, b));
      }
      if (ruta === 'ttn') {
        if (!env.TTN_TOKEN || !igual(tk, env.TTN_TOKEN)) return json({ error: 'clave' }, 401);
        const u = b.uplink_message || {}, dev = corto((b.end_device_ids || {}).dev_eui, 20).toUpperCase(); if (!dev) return json({ ok: true, ignorado: true });
        const dp = u.decoded_payload || {}, v = {}; let bat = null;
        for (const [k, x] of Object.entries(dp)) { if (/^(bat|batv|battery|bat_v)$/i.test(k) && typeof x === 'number') bat = x > 100 ? x / 1000 : x; else if (typeof x === 'number' || typeof x === 'string') v[corto(k, 20)] = typeof x === 'string' ? corto(x, 20) : x; }
        const m = (u.rx_metadata || [])[0] || {};
        return json(await registrar(env, { nodo: 'lora', id: dev, v, bat, rssi: typeof m.rssi === 'number' ? m.rssi : null, snr: typeof m.snr === 'number' ? m.snr : null, gw: corto((m.gateway_ids || {}).gateway_id, 30) }));
      }
    } catch (e) { return json({ error: 'servidor', detalle: corto(e.message, 200) }, 500); }
    return json({ error: 'ruta' }, 404);
  },
  async scheduled(event, env, ctx) { ctx.waitUntil(Promise.all([revisar(env).catch(() => {}), revisarClima(env).catch(() => {})])); }
};
