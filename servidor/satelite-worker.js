// Seguimiento por satélite para «Abonado-Fertirrigación» (Cloudflare Worker, plan gratuito)
//
// Qué hace:
//   · /recinto  → busca la parcela en SIGPAC (por punto o por referencia) y devuelve su contorno, uso y superficie
//   · /serie    → vigor (NDVI) y humedad de la hoja (NDMI) de la parcela con Sentinel-2, quitando las nubes
//   · /imagen   → imagen de la parcela en una fecha: vigor, diferencias dentro de la parcela o color real
//
// Necesita DOS variables secretas en Cloudflare (Settings → Variables and Secrets):
//   CDSE_ID       → «client id» del cliente OAuth creado en Copernicus Data Space (Sentinel Hub)
//   CDSE_SECRET   → su «client secret»
// Las claves solo viven aquí, nunca en la app.
// Solo atiende a personas que han entrado en la app y que el administrador ha dado de alta.

const PROYECTO = 'fertirrigacion-cabezales';
const ORIGENES = ['https://abonado.github.io'];
const JWK_URL = 'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com';
const CDSE_TOKEN = 'https://identity.dataspace.copernicus.eu/auth/realms/CDSE/protocol/openid-connect/token';
const SH = 'https://sh.dataspace.copernicus.eu/api/v1';
const SIGPAC = 'https://sigpac-hubcloud.es/servicioconsultassigpac/query';

/* ---------- utilidades ---------- */
const te = new TextEncoder(), td = new TextDecoder();
const deB64u = s => Uint8Array.from(atob(String(s).replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((String(s).length + 3) % 4)), c => c.charCodeAt(0));
const b64 = buf => { const u = new Uint8Array(buf); let s = ''; for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000)); return btoa(s); };
const num = v => (typeof v === 'number' && isFinite(v) ? v : null);
const r3 = v => (v == null ? null : Math.round(v * 1000) / 1000);

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

/* ---------- geometría ---------- */
const R = 6378137;
const merc = ([lon, lat]) => [R * lon * Math.PI / 180, R * Math.log(Math.tan(Math.PI / 4 + lat * Math.PI / 360))];
// Polígono o multipolígono en WGS84 → lista de polígonos [[anillo exterior], [huecos]…]
function poligonos(g) {
  if (!g || !Array.isArray(g.coordinates)) return [];
  if (g.type === 'Polygon') return [g.coordinates];
  if (g.type === 'MultiPolygon') return g.coordinates;
  return [];
}
// Simplifica un anillo (Douglas-Peucker) para guardar poco y pedir rápido; tol en grados (~1 m)
function simplificar(pts, tol) {
  if (pts.length < 5) return pts;
  const d2 = (p, a, b) => { const dx = b[0] - a[0], dy = b[1] - a[1], l = dx * dx + dy * dy; let t = l ? ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / l : 0; t = Math.max(0, Math.min(1, t)); const x = a[0] + t * dx - p[0], y = a[1] + t * dy - p[1]; return x * x + y * y; };
  const keep = new Uint8Array(pts.length); keep[0] = keep[pts.length - 1] = 1;
  const pila = [[0, pts.length - 1]];
  while (pila.length) { const [i, j] = pila.pop(); let m = -1, md = 0; for (let k = i + 1; k < j; k++) { const d = d2(pts[k], pts[i], pts[j]); if (d > md) { md = d; m = k; } } if (m > 0 && md > tol * tol) { keep[m] = 1; pila.push([i, m], [m, j]); } }
  return pts.filter((_, i) => keep[i]);
}
function limpiarGeom(g) {
  const pols = poligonos(g).map(pol => pol.map(an => simplificar(an.map(p => [+(+p[0]).toFixed(6), +(+p[1]).toFixed(6)]), 0.000008)).filter(an => an.length >= 4)).filter(pol => pol.length);
  if (!pols.length) return null;
  return pols.length === 1 ? { type: 'Polygon', coordinates: pols[0] } : { type: 'MultiPolygon', coordinates: pols };
}
function aMerc(g) {
  const pols = poligonos(g).map(pol => pol.map(an => an.map(merc)));
  return pols.length === 1 ? { type: 'Polygon', coordinates: pols[0] } : { type: 'MultiPolygon', coordinates: pols };
}
function caja(gm) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const pol of poligonos(gm)) for (const [x, y] of pol[0]) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
  return [x0, y0, x1, y1];
}
function latMedia(g) { const p = poligonos(g)[0][0]; return p.reduce((s, q) => s + q[1], 0) / p.length; }
function validarGeom(b) {
  const g = typeof b.geom === 'string' ? JSON.parse(b.geom) : b.geom;
  const ok = g && poligonos(g).length && poligonos(g).every(pol => pol[0] && pol[0].length >= 4 && pol[0].every(p => Math.abs(p[0]) <= 180 && Math.abs(p[1]) <= 85));
  if (!ok) throw new Error('geom');
  const gm = aMerc(g), [x0, y0, x1, y1] = caja(gm), k = Math.cos(latMedia(g) * Math.PI / 180);
  const ancho = (x1 - x0) * k, alto = (y1 - y0) * k;   // metros reales
  if (ancho > 6000 || alto > 6000) throw new Error('grande');   // como mucho unos 6 km de lado
  return { g, gm, bbox: [x0, y0, x1, y1], k, ancho, alto };
}

/* ---------- Copernicus (Sentinel Hub) ---------- */
let tok = null, tokHasta = 0;
// Las claves se limpian de espacios y saltos de línea que se cuelan al pegarlas
const idDe = env => String(env.CDSE_ID || '').trim(), secDe = env => String(env.CDSE_SECRET || '').trim();
let ultErr = null;   // último fallo de Copernicus, para la página de diagnóstico (sin claves)
async function token(env) {
  if (tok && Date.now() < tokHasta) return tok;
  if (!idDe(env) || !secDe(env)) throw new Error('sin_copernicus');
  const r = await fetch(CDSE_TOKEN, { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ grant_type: 'client_credentials', client_id: idDe(env), client_secret: secDe(env) }) });
  if (!r.ok) { const t = await r.text().catch(() => ''); ultErr = { paso: 'clave', estado: r.status, detalle: t.slice(0, 300), cuando: new Date().toISOString() }; throw new Error(r.status === 401 || r.status === 400 ? 'copernicus_clave' : 'copernicus_' + r.status); }
  const j = await r.json(); tok = j.access_token; tokHasta = Date.now() + Math.max(60, (j.expires_in || 600) - 60) * 1000; return tok;
}
// Diagnóstico: abre la dirección del servidor con ?probar en el navegador
let diagCache = null, diagHasta = 0;
async function diagnostico(env) {
  if (diagCache && Date.now() < diagHasta) return diagCache;
  const id = idDe(env), o = { claves: !!(id && secDe(env)), id_empieza_por: id.slice(0, 3), id_largo: id.length, secreto_largo: secDe(env).length };
  if (o.claves) {
    tok = null;
    try { await token(env); o.clave = 'ok'; } catch (e) { o.clave = 'error'; o.detalle = ultErr; }
    if (o.clave === 'ok') {
      const r = await fetch(SH + '/catalog/1.0.0/search', { method: 'POST', headers: { authorization: 'Bearer ' + tok, 'content-type': 'application/json' }, body: JSON.stringify({ collections: ['sentinel-2-l2a'], bbox: [-1.61, 37.39, -1.60, 37.40], datetime: new Date(Date.now() - 20 * 864e5).toISOString() + '/' + new Date().toISOString(), limit: 3 }) }).catch(e => null);
      o.sentinel = r && r.ok ? 'ok' : 'error ' + (r ? r.status : 'red');
      if (r && !r.ok) o.sentinel_detalle = (await r.text().catch(() => '')).slice(0, 300);
      else if (r) o.imagenes_ultimos_20_dias = ((await r.json().catch(() => ({}))).features || []).map(f => String((f.properties || {}).datetime || '').slice(0, 10));
    }
  }
  diagCache = o; diagHasta = Date.now() + 60000; return o;
}
async function sh(env, ruta, cuerpo, accept) {
  const r = await fetch(SH + ruta, { method: 'POST', headers: { authorization: 'Bearer ' + (await token(env)), 'content-type': 'application/json', accept: accept || 'application/json' }, body: JSON.stringify(cuerpo) });
  if (r.status === 401 || r.status === 403) { const t = await r.text().catch(() => ''); ultErr = { paso: 'sentinel', estado: r.status, detalle: t.slice(0, 300), cuando: new Date().toISOString() }; }
  if (r.status === 401) { tok = null; throw new Error('copernicus_sentinel_401'); }
  if (r.status === 403) throw new Error('copernicus_permiso');
  if (r.status === 429) throw new Error('copernicus_cupo');
  if (!r.ok) { const t = await r.text().catch(() => ''); console.log('SH', ruta, r.status, t.slice(0, 400)); throw new Error('copernicus_' + r.status); }
  return r;
}
const CRS = 'http://www.opengis.net/def/crs/EPSG/0/3857';
const NUBES = '[0,1,3,8,9,10,11]';   // SCL: sin dato, saturado, sombra de nube, nubes media/alta, cirros, nieve

const EVAL_SERIE = `//VERSION=3
function setup(){return{input:[{bands:["B04","B08","B8A","B11","SCL","dataMask"]}],output:[{id:"ndvi",bands:1,sampleType:"FLOAT32"},{id:"ndmi",bands:1,sampleType:"FLOAT32"},{id:"dataMask",bands:1}]}}
const NUBES=${NUBES};
function evaluatePixel(s){const a=s.B08+s.B04,b=s.B8A+s.B11;const ok=s.dataMask===1&&NUBES.indexOf(s.SCL)<0&&a>0&&b>0?1:0;
  return{ndvi:[ok?(s.B08-s.B04)/a:0],ndmi:[ok?(s.B8A-s.B11)/b:0],dataMask:[ok]}}`;

async function serie(env, b) {
  const v = validarGeom(b);
  const hasta = /^\d{4}-\d{2}-\d{2}$/.test(b.hasta || '') ? b.hasta : new Date().toISOString().slice(0, 10);
  let desde = /^\d{4}-\d{2}-\d{2}$/.test(b.desde || '') ? b.desde : new Date(Date.now() - 365 * 864e5).toISOString().slice(0, 10);
  if (Date.parse(hasta) - Date.parse(desde) > 400 * 864e5) desde = new Date(Date.parse(hasta) - 400 * 864e5).toISOString().slice(0, 10);
  const res = 10 / v.k;   // 10 m reales en metros de Mercator
  const cuerpo = {
    input: { bounds: { geometry: v.gm, properties: { crs: CRS } }, data: [{ type: 'sentinel-2-l2a', dataFilter: { mosaickingOrder: 'leastCC', maxCloudCoverage: 80 } }] },
    aggregation: { timeRange: { from: desde + 'T00:00:00Z', to: new Date(Date.parse(hasta) + 864e5).toISOString().slice(0, 10) + 'T00:00:00Z' }, aggregationInterval: { of: 'P1D' }, evalscript: EVAL_SERIE, resx: res, resy: res, lastIntervalBehavior: 'SHORTEN' },
    calculations: { default: { statistics: { default: { percentiles: { k: [10, 50, 90] } } } } }
  };
  const j = await (await sh(env, '/statistics', cuerpo)).json();
  const puntos = [];
  for (const d of j.data || []) {
    if (d.error || !d.outputs) continue;
    const sn = (((d.outputs.ndvi || {}).bands || {}).B0 || {}).stats || {}, sw = (((d.outputs.ndmi || {}).bands || {}).B0 || {}).stats || {};
    const n = num(sn.sampleCount), nd = num(sn.noDataCount);
    if (!n || nd == null) continue;
    const cub = (n - nd) / n;   // parte de la parcela vista sin nubes
    if (cub < 0.6 || num(sn.mean) == null) continue;
    const pc = sn.percentiles || {}, g = k => num(pc[k] ?? pc[k + '.0']);
    puntos.push({ f: String(d.interval.from).slice(0, 10), n: r3(sn.mean), p10: r3(g(10)), p50: r3(g(50)), p90: r3(g(90)), w: r3(num(sw.mean)), c: Math.round(cub * 100) / 100 });
  }
  return { puntos, desde, hasta };
}

function evalImagen(tipo, lo, hi) {
  return `//VERSION=3
function setup(){return{input:["B02","B03","B04","B08","SCL","dataMask"],output:{bands:4}}}
const T=${JSON.stringify(tipo)},LO=${+lo || 0},HI=${+hi || 1},NUBES=${NUBES};
const ABS=[[0.0,[0.65,0.55,0.45]],[0.2,[0.85,0.75,0.45]],[0.35,[0.95,0.9,0.35]],[0.5,[0.65,0.85,0.3]],[0.65,[0.3,0.7,0.2]],[0.8,[0.1,0.45,0.12]]];
const REL=[[0.0,[0.84,0.19,0.15]],[0.25,[0.96,0.55,0.2]],[0.5,[1.0,0.9,0.4]],[0.75,[0.55,0.8,0.35]],[1.0,[0.1,0.55,0.2]]];
function rampa(v,r){if(v<=r[0][0])return r[0][1];for(let i=1;i<r.length;i++)if(v<=r[i][0]){const a=r[i-1],b=r[i],t=(v-a[0])/(b[0]-a[0]);return[0,1,2].map(k=>a[1][k]+(b[1][k]-a[1][k])*t)}return r[r.length-1][1]}
function evaluatePixel(s){if(!s.dataMask)return[0,0,0,0];
  if(T==="color"){const g=2.8;return[Math.min(1,g*s.B04),Math.min(1,g*s.B03),Math.min(1,g*s.B02),1]}
  if(NUBES.indexOf(s.SCL)>=0)return[0.8,0.8,0.82,0.85];
  const a=s.B08+s.B04,n=a>0?(s.B08-s.B04)/a:0;
  const c=T==="rel"?rampa(HI>LO?(n-LO)/(HI-LO):0.5,REL):rampa(n,ABS);return[c[0],c[1],c[2],1]}`;
}
async function imagen(env, b) {
  const v = validarGeom(b);
  const f = /^\d{4}-\d{2}-\d{2}$/.test(b.fecha || '') ? b.fecha : null; if (!f) throw new Error('peticion');
  const tipo = ['ndvi', 'rel', 'color'].includes(b.tipo) ? b.tipo : 'ndvi';
  const px = Math.max(v.ancho, v.alto) / 10, esc = px > 400 ? 400 / px : 1;   // ~10 m por píxel, máximo 400 píxeles de lado
  const w = Math.max(8, Math.round(v.ancho / 10 * esc)), h = Math.max(8, Math.round(v.alto / 10 * esc));
  const cuerpo = {
    input: { bounds: { geometry: v.gm, properties: { crs: CRS } }, data: [{ type: 'sentinel-2-l2a', dataFilter: { timeRange: { from: f + 'T00:00:00Z', to: new Date(Date.parse(f) + 864e5).toISOString().slice(0, 10) + 'T00:00:00Z' }, mosaickingOrder: 'leastCC' } }] },
    output: { width: w, height: h, responses: [{ identifier: 'default', format: { type: 'image/png' } }] },
    evalscript: evalImagen(tipo, b.lo, b.hi)
  };
  const r = await sh(env, '/process', cuerpo, 'image/png');
  return { png: b64(await r.arrayBuffer()), w, h, bbox: v.bbox, fecha: f, tipo };
}

/* ---------- SIGPAC ---------- */
async function recinto(b) {
  let url;
  if (Array.isArray(b.ref)) {
    const r = b.ref.map(x => parseInt(x, 10));
    if (r.length !== 7 || r.some(x => !(x >= 0) || x > 99999)) throw new Error('peticion');
    url = `${SIGPAC}/recinfo/${r.join('/')}.geojson`;
  } else {
    const lat = +b.lat, lon = +b.lon;
    if (!(Math.abs(lat) <= 90 && Math.abs(lon) <= 180)) throw new Error('peticion');
    url = `${SIGPAC}/recinfobypoint/4326/${lon}/${lat}.geojson`;
  }
  const r = await fetch(url, { headers: { accept: 'application/json' } });
  if (!r.ok) throw new Error('sigpac_' + r.status);
  const j = await r.json().catch(() => null);
  const ft = j && (j.features || [])[0];
  if (!ft || !ft.geometry) return { encontrado: false };
  const p = ft.properties || {}, geom = limpiarGeom(ft.geometry);
  if (!geom) return { encontrado: false };
  return { encontrado: true, ref: [p.provincia, p.municipio, p.agregado, p.zona, p.poligono, p.parcela, p.recinto].map(x => x ?? 0), uso: p.uso_sigpac || '', sup: num(p.superficie), alt: num(p.altitud), pend: num(p.pendiente_media), regadio: num(p.coef_regadio), geom };
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get('origin') || '';
    const cors = { 'Access-Control-Allow-Origin': ORIGENES.includes(origin) ? origin : ORIGENES[0], 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'content-type, authorization', 'Access-Control-Max-Age': '86400', 'Vary': 'Origin' };
    const json = (o, s) => new Response(JSON.stringify(o), { status: s || 200, headers: { ...cors, 'content-type': 'application/json' } });
    if (request.method === 'OPTIONS') return new Response(null, { headers: cors });
    if (request.method === 'GET') {
      if (new URL(request.url).searchParams.has('probar')) return json({ servicio: 'Satélite de Abonado', ...(await diagnostico(env)) });
      return json({ ok: true, servicio: 'Satélite de Abonado', copernicus: !!(idDe(env) && secDe(env)), version: 2 });
    }
    if (request.method !== 'POST') return json({ error: 'metodo' }, 405);
    if (!ORIGENES.includes(origin)) return json({ error: 'origen' }, 403);
    const tk = (request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
    let user; try { user = await verificarToken(tk); } catch (e) { return json({ error: 'sesion' }, 401); }
    const yo = String(user.email || '').toLowerCase();
    if (!yo || !(await autorizado(tk, yo))) return json({ error: 'sin_acceso' }, 403);
    let b; try { b = await request.json(); } catch { return json({ error: 'peticion' }, 400); }
    const ruta = new URL(request.url).pathname.replace(/\/+$/, '').split('/').pop();
    try {
      if (ruta === 'recinto') return json({ ok: true, ...(await recinto(b)) });
      if (ruta === 'serie') return json({ ok: true, ...(await serie(env, b)) });
      if (ruta === 'imagen') return json({ ok: true, ...(await imagen(env, b)) });
      return json({ error: 'ruta' }, 404);
    } catch (e) {
      const m = String(e && e.message || e);
      const s = m === 'peticion' || m === 'geom' || m === 'grande' ? 400 : m === 'sin_copernicus' ? 503 : 502;
      return json({ error: m }, s);
    }
  }
};
