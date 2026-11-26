// Servidor puente de los sensores para «Abonado-Fertirrigación» (Cloudflare Worker, plan gratuito)
//
// Qué hace:
//   · /p    → recibe lo que manda la pasarela casera (diseño P del Taller): {"raw":"N4;id=1A2B3C;ta=24.1;…","rssi":-87,"snr":7.5,"gw":"…"}
//   · /ttn  → recibe los sensores LoRaWAN comprados desde The Things Network (webhook «Uplink message»)
//   · N10 (por /p, directo por wifi o por radio a la pasarela): válvulas que abre una máquina de riego antigua y pulsos del contador.
//            Al abrir una válvula avisa al móvil como el uCrop, con el sector que diga la app (abonado_config/finca → valv).
//   · /clima → recibe lo que lee del controlador de clima el «Lector del clima» (extensión de Edge en el PC de la oficina):
//            {"cab":"gas","comp":[{"n":1,"ta":27.5,"hr":68,"vent":[98,98,100]},…]}. Se guarda como una placa por compartimento
//            (UC-GAS-1, UC-GAS-2…) y en UC-ESTADO la hora de la última lectura. Si en horario de trabajo lleva más de 90 min sin
//            llegar nada, avisa una vez al administrador.
//   · /riego → lo que lee el mismo lector en la página de riego del uCrop (Estado del cabezal): por cada drenaje, riegos (activaciones),
//            % de drenaje, litros regados y drenados, pulsos, radiación de corte, anterior y corrección; y de arriba la radiación
//            acumulada del día, ET0, CE de entrada y salida y pH. Se guarda en UCR-FRA_<fecha> (una lectura cada vez).
//            Con «estado» (qué programa riega ahora) y «empieza» (el lector ha visto empezar un riego): avisa al móvil de quien diga
//            la app (Ajuste del riego → Avisos de riego; si no hay nada puesto, al administrador).
//   Con cada dato: lo guarda en abonado_lecturas (un documento por placa y día, con todos los puntos) y pone el «último dato»
//   y la batería en su aparato de «Mis aparatos» (el que tenga ese número de placa).
//   · /resumen → prueba a mano del resumen diario (POST con Authorization: Bearer <PUENTE_TOKEN>; cuerpo {} = solo al administrador, {"todos":true} = a todos).
//   · Resumen diario (Cron, a las 10:00 hora de Madrid; se puede cambiar en la app): las cuentas y los drenajes de cada cabezal, a encargados y administrador,
//     por el servidor de avisos (notificación y Telegram). Cada persona ve solo sus fincas y zonas.
//   · Cada 30 minutos (Cron): si un aparato con placa lleva más de 2 horas sin mandar nada, avisa al administrador
//     (a través del servidor de avisos, ruta «interno»). Avisa una sola vez hasta que vuelva a mandar.
//
// Necesita en Cloudflare (Settings → Variables and Secrets):
//   FIREBASE_SA     → el JSON de la cuenta de servicio de Firebase (el mismo de la copia de seguridad), como secreto
//   PUENTE_TOKEN    → una clave larga inventada; la misma se pone en la app (Ajustes → Sensores) para la pasarela casera
//   TTN_TOKEN       → otra clave larga; en The Things Network, webhook → «Additional headers»: Authorization = Bearer <TTN_TOKEN>
//   AVISOS_URL      → dirección del servidor de avisos (la misma de la app), sin barra final   (opcional: sin ella no avisa)
//   AVISOS_SVC      → (Bindings → Service binding) enlace al worker abonado-avisos. NECESARIO si los dos están en la misma cuenta:
//                     Cloudflare bloquea la llamada por la dirección .workers.dev (error 1042)
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
  N10: v => v.ev === 1 ? `abre la válvula ${v.c}` : v.ev === 2 ? `cierra la válvula ${v.c} · ${Math.round((v.dur || 0) / 60)} min · ${fmt(v.pul)} pulsos` : String(v.on || 0) === '0' ? 'sin regar' : `regando: válvula ${String(v.on).split('+').join(' y ')}`,
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
const docU = d => `projects/${PROYECTO}/databases/(default)/documents/abonado_ucrop/${d}`;

/* ---------- control del uCrop: órdenes que salen de la app y aplica el lector del PC ----------
   La app deja en abonado_ucrop un documento {cab, estado:'pendiente', campo, valor, idx, nombre, modo}.
   Aquí solo se pasan al lector y se guarda lo que contesta. El lector es quien abre la pantalla del uCrop y, en modo
   'real', pulsa Guardar; en 'prueba' solo mira. Nada se decide en el servidor. */
async function ordenesPendientes(env, cab) {
  let d; try {
    d = await fs(env, 'POST', ':runQuery', { structuredQuery: { from: [{ collectionId: 'abonado_ucrop' }], limit: 6,
      where: { compositeFilter: { op: 'AND', filters: [
        { fieldFilter: { field: { fieldPath: 'cab' }, op: 'EQUAL', value: { stringValue: cab } } },
        { fieldFilter: { field: { fieldPath: 'estado' }, op: 'EQUAL', value: { stringValue: 'pendiente' } } }] } } } });
  } catch (e) { ordenesPendientes.err = String(e && e.message || e).slice(0, 160); return []; }
  ordenesPendientes.err = null;
  const out = [];
  for (const row of (Array.isArray(d) ? d : [])) { const doc = row.document; if (!doc) continue; const f = doc.fields || {};
    out.push({ id: doc.name.split('/').pop(), campo: deFS(f.campo), valor: deFS(f.valor), idx: deFS(f.idx), nombre: deFS(f.nombre), modo: deFS(f.modo) || 'prueba',
      ...(deFS(f.modo) === 'cambio' ? { valorAntes: deFS(f.valorAntes), confirmado: deFS(f.confirmado) === true, ts: deFS(f.ts) } : {}) }); }
  return out;
}
/* Lo que lee el lector de la pantalla de un programa o drenaje: solo claves simples y valores cortos, como mucho 40 */
function limpiarSnap(x) {
  if (!x || typeof x !== 'object' || Array.isArray(x)) return null;
  const out = {}; for (const [k, v] of Object.entries(x).slice(0, 40)) { if (!/^\w{1,30}$/.test(k)) continue;
    if (typeof v === 'number' && isFinite(v)) out[k] = v; else if (typeof v === 'boolean') out[k] = v ? 1 : 0; else if (typeof v === 'string') out[k] = v.slice(0, 12); }
  return Object.keys(out).length ? out : null;
}
async function guardarHechos(env, hechos) {
  const writes = [];
  for (const h of (Array.isArray(hechos) ? hechos : []).slice(0, 12)) {
    const id = corto(h && h.id, 60).replace(/[^A-Za-z0-9_-]/g, ''); if (!id) continue;
    const est = ['probado', 'hecho', 'fallo'].includes(h.estado) ? h.estado : 'fallo';
    const campos = { estado: aFS(est), hechoTs: aFS(new Date().toISOString()),
      visto: aFS(corto(h.nombre, 60)), vistoValor: aFS(typeof h.valor === 'number' ? h.valor : null), motivo: aFS(corto(h.motivo, 160)) };
    const snap = limpiarSnap(h.snap); if (snap) campos.snap = aFS(snap);   // lo relevante de la pantalla del uCrop (horario, días, riegos, CE/pH…)
    writes.push({ update: { name: docU(id), fields: campos }, updateMask: { fieldPaths: Object.keys(campos) }, currentDocument: { exists: true } });
  }
  if (writes.length) try { await fs(env, 'POST', ':commit', { writes }); } catch (e) {}
  return writes.length;
}
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
/* ---------- riego del uCrop: lo manda el lector del PC de cada cabezal ---------- */
async function registrarRiego(env, b) {
  const cab = corto(b.cab, 12).replace(/[^a-z0-9]/gi, '').toLowerCase(); if (!cab) return { error: 'cab' };
  // el lector puede mandar solo el resultado de las órdenes que ha aplicado (sin lectura de drenajes)
  const hechos = b.hechos ? await guardarHechos(env, b.hechos) : 0;
  if (hechos && !(Array.isArray(b.dren) && b.dren.length)) { const o = await ordenesPendientes(env, cab); return { ok: true, hechos, ordenes: o, ord: { n: o.length, err: ordenesPendientes.err } }; }
  const N = (x, a, z) => typeof x === 'number' && isFinite(x) && x >= a && x <= z ? Math.round(x * 100) / 100 : null;
  const D = (Array.isArray(b.dren) ? b.dren : []).slice(0, 24).map(d => d && ({ n: Math.round(+d.n), act: N(d.act, 0, 500), dU: N(d.dU, 0, 100), dH: N(d.dH, 0, 100),
    rU: N(d.rU, 0, 1e5), rH: N(d.rH, 0, 1e5), drU: N(d.drU, 0, 1e5), drH: N(d.drH, 0, 1e5), pU: N(d.pU, 0, 1e5), pH: N(d.pH, 0, 1e5),
    racc: N(d.racc, -1e5, 1e5), corte: N(d.corte, -1e5, 1e5), ant: N(d.ant, -1e5, 1e5), corr: N(d.corr, -1e5, 1e5) })).filter(d => d && d.n >= 1 && d.n <= 24);
  if (!D.length) return { error: 'sin_datos' };
  const e = b.ext && typeof b.ext === 'object' ? b.ext : {}, ext = {};
  for (const [k, a, z] of [['racc', 0, 1e5], ['rad', 0, 2000], ['eto', 0, 30], ['ta', -20, 60], ['hr', 0, 100], ['viento', 0, 300], ['ceE', 0, 30], ['ceS', 0, 30], ['ceI', 0, 30], ['ph', 0, 14]]) { const v = N(e[k], a, z); if (v != null) ext[k] = v; }
  const t = Date.now(), fecha = hoyMadrid(t), iso = new Date(t).toISOString(), dev = `UCR-${cab.toUpperCase()}`;
  const s0 = b.estado && typeof b.estado === 'object' ? b.estado : null, S = (x, n) => (x == null ? null : corto(String(x), n || 40));
  const estado = s0 ? Object.fromEntries(Object.entries({ prog: S(s0.prog), fase: S(s0.fase, 24), agr: S(s0.agr), valv: S(s0.valv), act: N(s0.act, 0, 1000), t: S(s0.t, 10), tt: S(s0.tt, 10), espera: S(s0.espera, 80), regando: !!s0.regando }).filter(([, x]) => x != null)) : null;
  const v = { dren: D.map(d => Object.fromEntries(Object.entries(d).filter(([, x]) => x != null))), ext, ...(estado ? { estado } : {}) };
  await fs(env, 'POST', ':commit', { writes: [{ update: { name: docFS(`${dev}_${fecha}`), fields: { dev: aFS(dev), nodo: aFS('UCR'), cab: aFS(cab), fecha: aFS(fecha), ts: aFS(iso) } },
    updateMask: { fieldPaths: ['dev', 'nodo', 'cab', 'fecha', 'ts'] }, updateTransforms: [{ fieldPath: 'p', appendMissingElements: { values: [aFS({ t, v })] } }] }] });
  let aviso = null; if (b.empieza && estado && estado.regando) aviso = await avisarRiego(env, cab, estado).catch(e => ({ error: corto(e.message, 80) }));
  const ordenes = await ordenesPendientes(env, cab);
  return { ok: true, n: D.length, ord: { n: ordenes.length, err: ordenesPendientes.err }, ...(hechos ? { hechos } : {}), ...(ordenes.length ? { ordenes } : {}), ...(aviso ? { aviso } : {}) };
}
/* Aviso de que empieza un riego: a quien diga la app (abonado_config/finca → avisoRiego {on, para:[correos], cabs:[…]}); sin nada, al
   administrador. El aviso de cada cabezal sustituye al anterior en el móvil (mismo «tag»), así no se amontonan. */
const CAB_N = { gas: 'Gasolinera', pla: 'Planos', fra: 'Franco' };
const nombreProg = p => { const m = /^SE[O0]?(\d+)\s*(.*)$/i.exec(p || ''), k = /^METAL\S*?\s*(\d+)$/i.exec(p || ''); return m ? `Sector ${+m[1]}${m[2] ? ' · ' + m[2] : ''}` : k ? `Metálicos ${+k[1]}` : (p || 'un sector'); };
/* Cloudflare no deja que un worker llame a otro worker de la misma cuenta por su dirección .workers.dev (error 1042).
   Por eso se usa un enlace de servicio: puente-sensores → Settings → Bindings → Service binding, nombre AVISOS_SVC → abonado-avisos. */
function avisosFetch(env, init) {
  return env.AVISOS_SVC ? env.AVISOS_SVC.fetch('https://abonado-avisos/interno', init) : fetch(env.AVISOS_URL + '/interno', init);
}
async function avisarRiego(env, cab, e) {
  if (!(env.AVISOS_SVC || env.AVISOS_URL) || !env.INTERNO_TOKEN) return { enviado: false, motivo: 'sin_avisos' };
  let cfg = {}; try { const d = await fs(env, 'GET', '/abonado_config/finca?mask.fieldPaths=avisoRiego'); cfg = deFS((d.fields || {}).avisoRiego) || {}; } catch (x) {}
  if (cfg.on === false || (Array.isArray(cfg.cabs) && cfg.cabs.length && !cfg.cabs.includes(cab))) return { enviado: false, motivo: 'apagado' };
  const para = (Array.isArray(cfg.para) && cfg.para.length ? cfg.para : [env.ADMIN_EMAIL]).filter(Boolean).slice(0, 5); if (!para.length) return { enviado: false, motivo: 'sin_destino' };
  const cuerpo = [CAB_N[cab] || cab, e.prog, e.valv, e.tt ? e.tt.replace(/^00:/, '') + ' min' : null].filter(Boolean).join(' · ');
  const r = await avisosFetch(env, { method: 'POST', headers: { 'content-type': 'application/json', authorization: 'Bearer ' + env.INTERNO_TOKEN },
    body: JSON.stringify({ para, titulo: 'Regando: ' + nombreProg(e.prog), cuerpo, tag: 'riego-' + cab, tab: 'ajriego' }) });
  if (r.ok) { const j = await r.json().catch(() => ({})); return { enviado: true, para, enviados: j.enviados ?? null, fallos: j.fallos ?? null, sinDispositivo: j.sinDispositivo ?? null }; }
  // por qué no: 401 = INTERNO_TOKEN distinto en los dos servidores (o falta el KV AVISOS); 404 con «error code: 1042» = falta el enlace AVISOS_SVC
  return { enviado: false, http: r.status, detalle: corto(await r.text().catch(() => ''), 120), via: env.AVISOS_SVC ? 'enlace' : 'url' };
}
/* N10 · válvulas del cabezal de una máquina antigua (sin web): al abrirse una válvula, el mismo aviso que con el uCrop.
   El cabezal y el nombre de cada válvula los pone la app (Ajustes → Válvulas del cabezal) en abonado_config/finca → valv[<placa>]. */
async function avisarValvula(env, id, c) {
  let cfg = {}; try { const d = await fs(env, 'GET', '/abonado_config/finca?mask.fieldPaths=valv'); cfg = (deFS((d.fields || {}).valv) || {})[id] || {}; } catch (x) {}
  if (!cfg.cab) return { enviado: false, motivo: 'sin_config' };
  const k = (cfg.can || {})[String(c)] || {};
  return avisarRiego(env, cfg.cab, { prog: k.n || 'Válvula ' + c, valv: 'Válvula ' + c, regando: true });
}
async function revisarClima(env) {
  if (!(env.AVISOS_SVC || env.AVISOS_URL) || !env.INTERNO_TOKEN || !env.ADMIN_EMAIL) return;
  let d; try { d = await fs(env, 'GET', '/abonado_lecturas/UC-ESTADO'); } catch (e) { return; }
  const f = d.fields || {}, ts = Date.parse(deFS(f.ts) || ''); if (!ts || deFS(f.avisado)) return;
  const h = +new Date().toLocaleString('en-GB', { timeZone: 'Europe/Madrid', hour: '2-digit', hour12: false }); if (h < 8 || h >= 20) return;
  const min = (Date.now() - ts) / 60000; if (min < 90) return;
  await avisosFetch(env, { method: 'POST', headers: { 'content-type': 'application/json', authorization: 'Bearer ' + env.INTERNO_TOKEN },
    body: JSON.stringify({ para: [env.ADMIN_EMAIL], titulo: 'El lector del clima no manda', cuerpo: `Lleva ${Math.round(min / 60 * 10) / 10} h sin leer el controlador. Mira que el ordenador esté encendido con Edge abierto.`, tag: 'clima-lector', tab: 'estres' }) }).catch(() => {});
  await fs(env, 'PATCH', '/abonado_lecturas/UC-ESTADO?updateMask.fieldPaths=avisado', { fields: { avisado: aFS(true) } });
}

/* ---------- aviso de aparatos que dejan de mandar ---------- */
async function revisar(env) {
  if (!(env.AVISOS_SVC || env.AVISOS_URL) || !env.INTERNO_TOKEN || !env.ADMIN_EMAIL) return;
  const r = await fs(env, 'POST', ':runQuery', { structuredQuery: { from: [{ collectionId: 'abonado_aparatos' }], where: { fieldFilter: { field: { fieldPath: 'estado' }, op: 'EQUAL', value: { stringValue: 'activo' } } }, limit: 500 } });
  for (const x of r) { if (!x.document) continue; const f = x.document.fields || {}, dev = deFS(f.dev), dato = deFS(f.dato) || {}, nombre = deFS(f.nombre) || 'Aparato';
    if (!dev || !dato.ts || deFS(f.sinDatosAvisado)) continue;
    const min = (Date.now() - Date.parse(dato.ts)) / 60000; if (min < SIN_DATOS_MIN) continue;
    const id = x.document.name.split('/').pop();
    await avisosFetch(env, { method: 'POST', headers: { 'content-type': 'application/json', authorization: 'Bearer ' + env.INTERNO_TOKEN },
      body: JSON.stringify({ para: [env.ADMIN_EMAIL], titulo: 'Sin datos: ' + nombre, cuerpo: `Lleva ${Math.round(min / 60)} h sin mandar. Mira la batería, la antena y la pasarela.`, tag: 'sindatos-' + id, tab: 'aparatos' }) }).catch(() => {});
    await fs(env, 'PATCH', `/abonado_aparatos/${id}?updateMask.fieldPaths=sinDatosAvisado`, { fields: { sinDatosAvisado: aFS(true) } });
  }
}

/* ---------- resumen diario de las cuentas y los drenajes (a las 10:00, a encargados y administrador) ----------
   Lee lo que la app ya calculó y guardó en el registro del día (registros/<fecha> → resumen[cabezal]): riego, % de drenaje, CE y pH de entrada y
   de drenaje, y cuántos productos quedaron fuera de ±10 % de la dosis. Si hoy aún no hay nada de un cabezal, enseña lo de ayer (lo dice).
   Ajuste en la app: abonado_config/finca → resumen {on, hora}. Sin nada puesto: activo, a las 10:00.
   Estado (para no repetir): abonado_lecturas/RESUMEN-ESTADO {dia, n, ok}. Se reintenta hasta 3 veces el mismo día si no sale a nadie. */
const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const num = (v, d) => v == null || !isFinite(v) ? '—' : (Math.round(v * 10 ** d) / 10 ** d).toFixed(d).replace('.', ',');
const us = v => v == null || !isFinite(v) ? '—' : String(Math.round(v * 1000));
const fechaCorta = f => { const m = /^\d{4}-(\d\d)-(\d\d)$/.exec(f || ''); return m ? `${+m[2]} ${MESES[+m[1] - 1]}` : f; };
const conDatos = z => !!z && typeof z === 'object' && ['m3', 'drenaje', 'ceD', 'phD', 'ceE', 'phE'].some(k => z[k] != null);
function cabsVisibles(cfg, inf, esAdmin) {
  const todos = (cfg.cabezales || []).map(c => c && c.id).filter(Boolean);
  if (esAdmin) return todos;
  const fincas = Array.isArray(cfg.fincas) ? cfg.fincas : [];
  if (!fincas.length) return todos;
  const enFinca = new Set(fincas.flatMap(f => f.cabezales || [])), out = new Set(todos.filter(c => !enFinca.has(c)));
  const fl = Array.isArray(inf.fincas) ? fincas.filter(f => inf.fincas.includes(f.id)) : fincas, zonas = Array.isArray(inf.cabs) ? inf.cabs : [];
  for (const f of fl) { const lista = (f.cabezales || []).filter(c => todos.includes(c)), sel = lista.filter(c => zonas.includes(c)); (sel.length ? sel : lista).forEach(c => out.add(c)); }
  return todos.filter(c => out.has(c));
}
/* Texto del resumen para una lista de cabezales: {titulo, cuerpo (corto, para el móvil), cuerpoTg (completo), avisos} */
function textoResumen(cfg, ids, hoyReg, ayerReg, hoy, hora) {
  const al = { ceMax: 4, phMin: 5.5, phMax: 7, ...(cfg.alertas || {}) }, nom = id => ((cfg.cabezales || []).find(c => c && c.id === id) || {}).nombre || id;
  const avisos = [], bloques = [];
  for (const id of ids) {
    const zh = ((hoyReg || {}).resumen || {})[id], za = ((ayerReg || {}).resumen || {})[id], esHoy = conDatos(zh), z = esHoy ? zh : conDatos(za) ? za : null, n = nom(id);
    if (!z) { avisos.push(`${n}: sin registro hoy ni ayer`); bloques.push(`${n}\nSin registro hoy ni ayer`); continue; }
    const L = [], cab = esHoy ? n : `${n} (datos de ayer)`;
    if (z.m3 != null || z.drenaje != null) L.push([z.m3 != null ? `Riego ${num(z.m3, 1)} m³` : null, z.drenaje != null ? `drenaje ${num(z.drenaje, 0)} %` : null].filter(Boolean).join(' · '));
    if (z.ceE != null || z.phE != null) L.push(`Entrada: CE ${us(z.ceE)} µS/cm · pH ${num(z.phE, 1)}`);
    if (z.ceD != null || z.phD != null) L.push(`Drenaje: CE ${us(z.ceD)} µS/cm · pH ${num(z.phD, 1)}`);
    if (z.total > 0) L.push(z.fuera > 0 ? `Dosis: ${z.fuera} de ${z.total} productos fuera de ±10 %` : `Dosis: todo dentro de ±10 %`);
    if (z.ceD != null && z.ceD > al.ceMax) { avisos.push(`CE de drenaje alta en ${n} (${us(z.ceD)} µS/cm)`); L.push('⚠ CE de drenaje por encima del límite'); }
    if (z.phD != null && (z.phD < al.phMin || z.phD > al.phMax)) { avisos.push(`pH de drenaje fuera de rango en ${n} (${num(z.phD, 1)})`); L.push('⚠ pH de drenaje fuera de rango'); }
    if (z.fuera > 0) avisos.push(`Dosis fuera de ±10 % en ${n}`);
    bloques.push(`${cab}\n${L.join('\n')}`);
  }
  return { titulo: `Resumen de las ${hora}:00 · ${fechaCorta(hoy)}`, avisos,
    cuerpo: corto(avisos.length ? '⚠ ' + avisos.join(' · ') : 'Sin avisos. Toca para ver las cuentas.', 280),
    cuerpoTg: corto(bloques.join('\n\n') + (avisos.length ? '' : '\n\nSin avisos.'), 1700) };
}
async function leerDoc(env, ruta, mask) {
  try { const d = await fs(env, 'GET', ruta + (mask ? '?' + mask.map(k => 'mask.fieldPaths=' + k).join('&') : '')); return Object.fromEntries(Object.entries(d.fields || {}).map(([k, x]) => [k, deFS(x)])); }
  catch (e) { return /firestore 404/.test(e.message) ? null : Promise.reject(e); }
}
/* A quién va un aviso de grupo: administrador + encargados con la cuenta activa; cada uno ve solo sus fincas y zonas, así que se agrupan los que ven lo mismo.
   Devuelve Map «cabezales» → {ids, para:[correos]}; vacío si no hay nadie. */
async function gruposDestino(env, cfg, soloAdmin) {
  const acc = await leerDoc(env, '/abonado_acceso/usuarios', ['emails', 'info']) || {}, info = acc.info || {}, lista = Array.isArray(acc.emails) ? acc.emails.map(e => String(e).toLowerCase()) : [];
  const admin = String(env.ADMIN_EMAIL || '').toLowerCase(), esAdm = e => e === admin || !!(info[e] || {}).admin;
  let dest = [...new Set([...(admin ? [admin] : []), ...lista])].filter(e => (e === admin || lista.includes(e)) && (esAdm(e) || !!(info[e] || {}).encargado));
  if (soloAdmin) dest = dest.filter(e => e === admin);
  const grupos = new Map();
  for (const e of dest) { const ids = cabsVisibles(cfg, info[e] || {}, esAdm(e)); if (!ids.length) continue; const k = ids.join('|'); if (!grupos.has(k)) grupos.set(k, { ids, para: [] }); grupos.get(k).para.push(e); }
  return grupos;
}
/* opc: {forzar: sin mirar hora ni repetición, soloAdmin: solo al administrador (prueba), ahora: reloj para pruebas} */
async function resumenDiario(env, opc) {
  opc = opc || {};
  if (!(env.AVISOS_SVC || env.AVISOS_URL) || !env.INTERNO_TOKEN) return { enviado: false, motivo: 'sin_avisos' };
  const t = opc.ahora || Date.now(), hoy = hoyMadrid(t), ayer = hoyMadrid(t - 864e5), h = +new Date(t).toLocaleString('en-GB', { timeZone: 'Europe/Madrid', hour: '2-digit', hour12: false }) % 24;
  const cfg = await leerDoc(env, '/abonado_config/finca', ['resumen', 'alertas', 'cabezales', 'fincas']) || {}, ajuste = cfg.resumen || {};
  if (ajuste.on === false && !opc.forzar) return { enviado: false, motivo: 'apagado' };
  const hora = Number.isInteger(ajuste.hora) && ajuste.hora >= 0 && ajuste.hora <= 20 ? ajuste.hora : 10;
  if (!opc.forzar && (h < hora || h >= hora + 4)) return { enviado: false, motivo: 'fuera_de_hora' };
  const est = await leerDoc(env, '/abonado_lecturas/RESUMEN-ESTADO') || {}, mismoDia = est.dia === hoy;
  if (!opc.forzar && mismoDia && (est.ok || (est.n || 0) >= 3)) return { enviado: false, motivo: est.ok ? 'ya_enviado' : 'demasiados_intentos' };
  const [rh, ra, grupos] = await Promise.all([leerDoc(env, '/abonado_registros/' + hoy).catch(() => null), leerDoc(env, '/abonado_registros/' + ayer).catch(() => null), gruposDestino(env, cfg, opc.soloAdmin)]);
  if (!grupos.size) return { enviado: false, motivo: 'sin_destinatarios' };
  if (!opc.forzar) await fs(env, 'PATCH', '/abonado_lecturas/RESUMEN-ESTADO?updateMask.fieldPaths=dia&updateMask.fieldPaths=n&updateMask.fieldPaths=ok', { fields: { dia: aFS(hoy), n: aFS((mismoDia ? est.n || 0 : 0) + 1), ok: aFS(false) } });
  let llamadas = 0, buenas = 0, personas = 0, enviados = 0, errores = [];
  for (const g of grupos.values()) {
    const x = textoResumen(cfg, g.ids, rh, ra, hoy, hora);
    for (let i = 0; i < g.para.length && llamadas < 20; i += 5) {
      const para = g.para.slice(i, i + 5); llamadas++;
      try {
        const r = await avisosFetch(env, { method: 'POST', headers: { 'content-type': 'application/json', authorization: 'Bearer ' + env.INTERNO_TOKEN },
          body: JSON.stringify({ para, titulo: x.titulo, cuerpo: x.cuerpo, cuerpoTg: x.cuerpoTg, tag: 'resumen-diario', tab: 'cuentas' }) });
        if (r.ok) { const j = await r.json().catch(() => ({})); buenas++; personas += para.length; enviados += j.enviados || 0; } else errores.push(r.status);
      } catch (e) { errores.push('red'); }
    }
  }
  if (!opc.forzar && buenas) await fs(env, 'PATCH', '/abonado_lecturas/RESUMEN-ESTADO?updateMask.fieldPaths=ok', { fields: { ok: aFS(true) } }).catch(() => {});
  return { enviado: buenas > 0, personas, enviados, grupos: grupos.size, ...(errores.length ? { errores } : {}) };
}

/* ---------- boletín de drenajes (cada 15, 30 o 60 min mientras se riega) ----------
   Lo último que mandó el lector del uCrop de cada cabezal (abonado_lecturas/UCR-<CAB>_<fecha>, último punto): % de drenaje de hoy de cada sector y los riegos.
   Ajuste en la app: abonado_config/finca → boletin {on, cada: 15|30|60, desde, hasta}. Sin nada puesto: APAGADO (es un aviso nuevo; lo enciende la persona).
   Estado: abonado_lecturas/BOLETIN-ESTADO {dia, slot}. Un solo aviso por tramo de «cada» minutos; el móvil sustituye el anterior (mismo tag). */
const hm = t => new Date(t).toLocaleTimeString('es-ES', { timeZone: 'Europe/Madrid', hour: '2-digit', minute: '2-digit', hour12: false });
function textoBoletin(cfg, ids, ult, t) {
  const nom = id => ((cfg.cabezales || []).find(c => c && c.id === id) || {}).nombre || id, cortos = [], largos = [];
  for (const id of ids) {
    const u = ult[id], n = nom(id);
    if (!u) { largos.push(`${n}\nSin lectura hoy`); continue; }
    const rancia = t - u.t > 40 * 60000, dr = (u.v.dren || []).filter(d => d && d.n).sort((a, b) => a.n - b.n);
    const pct = d => d.rH > 0 && d.drH != null ? d.drH / d.rH * 100 : d.dH;
    const f = d => `D${d.n} ${pct(d) == null ? '—' : Math.round(pct(d)) + ' %'}`;
    if (!dr.length) { largos.push(`${n}\nSin lectura de drenajes`); continue; }
    cortos.push(`${n} ${dr.map(f).join(' · ')}`);
    largos.push(`${n}${rancia ? ` (última lectura a las ${hm(u.t)})` : ''}\n${dr.map(d => `${f(d)}${d.act != null ? ` · ${Math.round(d.act)} riegos` : ''}${d.dU != null ? ` · último ${Math.round(d.dU)} %` : ''}`).join('\n')}`);
  }
  return { hay: cortos.length > 0, titulo: `Drenajes · ${hm(t)}`, cuerpo: corto(cortos.join('\n') || 'Sin lecturas', 280), cuerpoTg: corto(largos.join('\n\n'), 1700) };
}
/* Último punto de hoy de cada cabezal (null si no hay). */
async function ultimosRiego(env, ids, hoy) {
  const out = {};
  await Promise.all(ids.map(async id => {
    const d = await leerDoc(env, `/abonado_lecturas/UCR-${id.toUpperCase()}_${hoy}`, ['p']).catch(() => null), p = d && Array.isArray(d.p) ? d.p : [];
    const u = p.filter(x => x && x.t && x.v).sort((a, b) => a.t - b.t).at(-1); if (u) out[id] = u;
  }));
  return out;
}
/* opc: {forzar: sin mirar hora ni tramo, soloAdmin: solo al administrador (prueba), ahora: reloj para pruebas} */
async function boletinDrenajes(env, opc) {
  opc = opc || {};
  if (!(env.AVISOS_SVC || env.AVISOS_URL) || !env.INTERNO_TOKEN) return { enviado: false, motivo: 'sin_avisos' };
  const t = opc.ahora || Date.now(), hoy = hoyMadrid(t), parts = new Date(t).toLocaleString('en-GB', { timeZone: 'Europe/Madrid', hour: '2-digit', minute: '2-digit', hour12: false }).split(':'), min = (+parts[0] % 24) * 60 + +parts[1];
  const cfg = await leerDoc(env, '/abonado_config/finca', ['boletin', 'alertas', 'cabezales', 'fincas']) || {}, aj = cfg.boletin || {};
  if (!aj.on && !opc.forzar) return { enviado: false, motivo: 'apagado' };
  const cada = [15, 30, 60].includes(aj.cada) ? aj.cada : 30, desde = Number.isInteger(aj.desde) && aj.desde >= 0 && aj.desde <= 23 ? aj.desde : 8, hasta = Number.isInteger(aj.hasta) && aj.hasta >= 1 && aj.hasta <= 24 ? aj.hasta : 19;
  if (!opc.forzar && (min < desde * 60 || min >= hasta * 60)) return { enviado: false, motivo: 'fuera_de_hora' };
  const slot = Math.floor(min / cada), est = await leerDoc(env, '/abonado_lecturas/BOLETIN-ESTADO') || {};
  if (!opc.forzar && est.dia === hoy && est.slot === slot) return { enviado: false, motivo: 'ya_enviado' };
  const [grupos, todos] = await Promise.all([gruposDestino(env, cfg, opc.soloAdmin), Promise.resolve((cfg.cabezales || []).map(c => c && c.id).filter(Boolean))]);
  if (!grupos.size) return { enviado: false, motivo: 'sin_destinatarios' };
  const ult = await ultimosRiego(env, todos, hoy);
  if (!Object.keys(ult).length) return { enviado: false, motivo: 'sin_lecturas' };   // de noche o con el lector parado: no se manda un aviso vacío
  let llamadas = 0, buenas = 0, personas = 0, errores = [];
  for (const g of grupos.values()) {
    const x = textoBoletin(cfg, g.ids, ult, t); if (!x.hay) continue;
    for (let i = 0; i < g.para.length && llamadas < 20; i += 5) {
      const para = g.para.slice(i, i + 5); llamadas++;
      try {
        const r = await avisosFetch(env, { method: 'POST', headers: { 'content-type': 'application/json', authorization: 'Bearer ' + env.INTERNO_TOKEN },
          body: JSON.stringify({ para, titulo: x.titulo, cuerpo: x.cuerpo, cuerpoTg: x.cuerpoTg, tag: 'boletin-drenaje', tab: 'ajriego' }) });
        if (r.ok) { buenas++; personas += para.length; } else errores.push(r.status);
      } catch (e) { errores.push('red'); }
    }
  }
  if (!opc.forzar && buenas) await fs(env, 'PATCH', '/abonado_lecturas/BOLETIN-ESTADO?updateMask.fieldPaths=dia&updateMask.fieldPaths=slot', { fields: { dia: aFS(hoy), slot: aFS(slot) } }).catch(() => {});   // el tramo solo se da por hecho si salió; si no, se reintenta en 5 min
  return { enviado: buenas > 0, personas, grupos: grupos.size, ...(errores.length ? { errores } : {}) };
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
        const r = await registrar(env, { ...L, rssi: typeof b.rssi === 'number' ? b.rssi : null, snr: typeof b.snr === 'number' ? b.snr : null, gw: corto(b.gw, 20) });
        if (L.nodo === 'N10' && L.v.ev === 1 && r.ok) r.aviso = await avisarValvula(env, L.id, L.v.c).catch(e => ({ error: corto(e.message, 80) }));
        return json(r);
      }
      if (ruta === 'riego') {
        if (!env.PUENTE_TOKEN || !igual(tk, env.PUENTE_TOKEN)) return json({ error: 'clave' }, 401);
        return json(await registrarRiego(env, b));
      }
      if (ruta === 'resumen') {   // prueba a mano: manda el resumen ahora, solo al administrador (o a todos con «todos»: true)
        if (!env.PUENTE_TOKEN || !igual(tk, env.PUENTE_TOKEN)) return json({ error: 'clave' }, 401);
        return json(await resumenDiario(env, { forzar: true, soloAdmin: !b.todos }));
      }
      if (ruta === 'boletin') {   // prueba a mano: manda el boletín ahora, solo al administrador (o a todos con «todos»: true)
        if (!env.PUENTE_TOKEN || !igual(tk, env.PUENTE_TOKEN)) return json({ error: 'clave' }, 401);
        return json(await boletinDrenajes(env, { forzar: true, soloAdmin: !b.todos }));
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
  async scheduled(event, env, ctx) { ctx.waitUntil(Promise.all([revisar(env).catch(() => {}), revisarClima(env).catch(() => {}), resumenDiario(env).catch(() => {}), boletinDrenajes(env).catch(() => {})])); }
};
