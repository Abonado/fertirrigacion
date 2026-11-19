/* Agro FLY · Lector del clima y del riego (extensión de Edge / Chrome)
   Cada minuto mira si toca leer (cada «cada» minutos). Abre su propia pestaña fijada con la página que se le haya dado y lee:
   · la del controlador de clima: la tabla «Estados» (Compartimento 1…N: humedad, temperatura y ventanas) → ruta /clima;
   · la de riego del uCrop: «Estado del cabezal» (cada Drenaje: activaciones, % de drenaje, litros regados y drenados, pulsos,
     radiación acumulada, corte, anterior y corrección) y arriba la radiación acumulada del día, ET0, CE y pH → ruta /riego.
   Lo manda al servidor puente de la app con la clave PUENTE_TOKEN. Si la página se queda colgada o pide entrar, la recarga.
   No guarda ni manda nada más de la página. */
const DEF = { puente: '', token: '', cada: 15, paginas: [] };
/* Puede leer varias páginas (por ejemplo el clima y el riego del uCrop en el mismo PC): cada una con su cabezal y su pestaña fijada.
   La configuración de la versión 1.0 (una sola página) se pasa sola a la lista. */
const cfg = async () => { const c = { ...DEF, ...((await chrome.storage.local.get('cfg')).cfg || {}) };
  if ((!c.paginas || !c.paginas.length) && c.pagina) c.paginas = [{ url: c.pagina, cab: c.cab || 'gas' }];
  c.paginas = (c.paginas || []).filter(p => p && p.url); return c; };
const est = async () => (await chrome.storage.local.get('est')).est || {};
const ponEst = async p => { const e = { ...(await est()), ...p }; await chrome.storage.local.set({ est: e }); return e; };
const badge = (t, c) => { chrome.action.setBadgeText({ text: t }); if (c) chrome.action.setBadgeBackgroundColor({ color: c }); };
const armar = () => chrome.alarms.create('leer', { periodInMinutes: 1 });
chrome.runtime.onInstalled.addListener(armar);
chrome.runtime.onStartup.addListener(armar);
chrome.alarms.onAlarm.addListener(a => { if (a.name === 'leer') ciclo(false).catch(e => ponEst({ msg: 'Error: ' + e.message })); });

/* Se ejecuta DENTRO de la página del controlador: devuelve los compartimentos o por qué no se pueden leer.
   Lee por POSICIÓN en pantalla, no por cómo esté hecha la página por dentro: las cabeceras «Compartimento N» marcan las columnas y
   cada etiqueta («Humedad del compartimento»…) marca su fila; el valor de cada casilla es el texto que cae en ese cruce.
   Así funciona igual con tablas, rejillas o primera columna fija (como uCrop). */
function leerPagina() {
  const norm = s => String(s == null ? '' : s).replace(/\s+/g, ' ').trim();
  const num = s => { s = norm(s); if (!s || s === '-' || s === '—') return null; const m = s.match(/-?\d+(?:[.,]\d+)?/); return m ? parseFloat(m[0].replace(',', '.')) : null; };
  if (!document.body) return { ok: false, motivo: 'La página está vacía' };
  // todos los trozos de texto visibles, con su caja en pantalla
  const tw = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT), T = [], rg = document.createRange();
  for (let n = tw.nextNode(); n; n = tw.nextNode()) {
    const t = norm(n.textContent); if (!t) continue;
    rg.selectNodeContents(n); const r = rg.getBoundingClientRect(); if (r.width < 1 || r.height < 1) continue;
    T.push({ t, l: r.left, r: r.right, top: r.top, b: r.bottom, cx: (r.left + r.right) / 2, cy: (r.top + r.bottom) / 2 });
  }
  // cabeceras de columna: la primera vez que sale cada «Compartimento N»
  const H = new Map();
  for (const x of T) { const m = /^compartimento\s*(\d+)$/i.exec(x.t); if (m && +m[1] <= 20 && !H.has(+m[1])) H.set(+m[1], x); }
  const ns = [...H.keys()].sort((a, b) => a - b);
  if (!ns.length) return { ok: false, motivo: 'No se ve la tabla de compartimentos (¿está en «Estados»? ¿pide entrar?)' };
  const cols = ns.map((n, i) => {   // cada columna va de la mitad con la anterior a la mitad con la siguiente
    const c = H.get(n).cx, ant = i ? H.get(ns[i - 1]).cx : null, sig = i < ns.length - 1 ? H.get(ns[i + 1]).cx : null;
    const paso = sig != null ? sig - c : ant != null ? c - ant : 200;
    return { n, a: ant != null ? (ant + c) / 2 : c - paso / 2, z: sig != null ? (c + sig) / 2 : c + paso / 2 };
  });
  const FILAS = { hr: /^humedad del compartimento$/i, ta: /^temperatura del compartimento$/i, v1: /^posici\S{1,2}n ventana 1$/i, v2: /^posici\S{1,2}n ventana 2$/i, v3: /^posici\S{1,2}n ventana 3$/i };
  const leerFila = et => {   // textos a la altura de la etiqueta, a la derecha de ella, repartidos por columnas
    const alto = Math.max(8, et.b - et.top), a = et.cy - alto * 0.8, z = et.cy + alto * 0.8;
    return cols.map(c => num(T.filter(x => x !== et && x.cy >= a && x.cy <= z && x.l > et.r - 2 && x.cx >= c.a && x.cx < c.z).sort((p, q) => p.l - q.l).map(x => x.t).join(' ')));
  };
  const fila = {};
  for (const [k, re] of Object.entries(FILAS)) {
    let mejor = null;   // si la etiqueta sale varias veces (menús…), la que tiene más valores
    for (const et of T.filter(x => re.test(x.t))) { const v = leerFila(et), n = v.filter(x => x != null).length; if (!mejor || n > mejor.n) mejor = { v, n }; }
    if (mejor && mejor.n) fila[k] = mejor.v;
  }
  if (!fila.ta && !fila.hr) return { ok: false, motivo: 'Veo los compartimentos, pero no las filas de humedad y temperatura (baja la página hasta verlas)' };
  const comp = [];
  cols.forEach((c, i) => {
    const v = ['v1', 'v2', 'v3'].map(k => fila[k] ? fila[k][i] : null).filter(x => x != null);
    const x = { n: c.n, ta: fila.ta ? fila.ta[i] : null, hr: fila.hr ? fila.hr[i] : null, vent: v };
    if (x.ta != null || x.hr != null) comp.push(x);
  });
  if (!comp.length) return { ok: false, motivo: 'Las filas están vacías' };
  return { ok: true, comp, firma: JSON.stringify(comp) };
}

/* Se ejecuta DENTRO de la página de riego del uCrop. También por POSICIÓN: cada «Drenaje N» marca un bloque; dentro, cada etiqueta
   (Activaciones, Drenaje, Regado, Drenado, Pulsos, Radiación acumulada) marca su fila y los números a su derecha son «Último» y «Hoy»;
   bajo «Corte · Anterior · Corrección» van esos tres. Arriba, cada recuadro (Radiación acumulada, ETo, CE entrada…) lleva el número debajo. */
function leerRiego() {
  const norm = s => String(s == null ? '' : s).replace(/\s+/g, ' ').trim();
  const nums = s => { s = norm(s).replace(/\/\s*m\s*[²2]/gi, '/m²'); return (s.match(/-?\d+(?:[.,]\d+)?/g) || []).map(x => parseFloat(x.replace(',', '.'))); };
  if (!document.body) return { ok: false, motivo: 'La página está vacía' };
  const tw = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT), T = [], rg = document.createRange();
  for (let n = tw.nextNode(); n; n = tw.nextNode()) {
    const t = norm(n.textContent); if (!t) continue;
    rg.selectNodeContents(n); const r = rg.getBoundingClientRect(); if (r.width < 1 || r.height < 1) continue;
    T.push({ t, l: r.left, r: r.right, top: r.top, b: r.bottom, cx: (r.left + r.right) / 2, cy: (r.top + r.bottom) / 2, h: r.bottom - r.top });
  }
  const esAct = /^activaciones$/i;
  // cabeceras «Drenaje N» que tienen debajo «Activaciones» (así no se confunden con la lista de la pestaña Drenajes)
  const H = [];
  for (const x of T) { const m = /^drenaje\s*(\d+)$/i.exec(x.t); if (!m || +m[1] > 24) continue;
    if (T.some(y => esAct.test(y.t) && y.cy > x.cy && y.cy < x.cy + 90 && y.r > x.l - 200 && y.l < x.r + 200) && !H.some(h => h.n === +m[1])) H.push({ n: +m[1], x }); }
  if (!H.length) return { ok: false, motivo: 'No se ven los drenajes (¿está en la página de riego, con «Estado del cabezal» abierto?)' };
  const bloque = h => { const mismos = H.filter(o => o !== h && Math.abs(o.x.cy - h.x.cy) < 40).map(o => o.x.cx), izq = mismos.filter(c => c < h.x.cx), der = mismos.filter(c => c > h.x.cx);
    const a = izq.length ? (Math.max(...izq) + h.x.cx) / 2 : h.x.cx - 190, z = der.length ? (Math.min(...der) + h.x.cx) / 2 : h.x.cx + 190; return { a, z, y0: h.x.cy, y1: h.x.cy + 340 } };
  const FIL = { act: esAct, d: /^drenaje$/i, r: /^regado$/i, dr: /^drenado$/i, p: /^pulsos$/i, racc: /^radiaci\S{1,2}n acumulada$/i };
  const dren = [];
  for (const h of H) { const B = bloque(h), dentro = x => x.cx >= B.a && x.cx < B.z && x.cy > B.y0 && x.cy < B.y1, o = { n: h.n };
    const fila = et => nums(T.filter(x => x !== et && dentro(x) && Math.abs(x.cy - et.cy) <= Math.max(6, et.h * 0.7) && x.l > et.r - 2).sort((p, q) => p.l - q.l).map(x => x.t).join(' '));
    for (const [k, re] of Object.entries(FIL)) { const et = T.find(x => dentro(x) && re.test(x.t)); if (!et) continue; const v = fila(et);
      if (k === 'act' || k === 'racc') { if (v.length) o[k] = v[0] } else { if (v.length >= 2) { o[k + 'U'] = v[0]; o[k + 'H'] = v[1] } else if (v.length) o[k + 'H'] = v[0] } }
    const ec = T.find(x => dentro(x) && /^corte$/i.test(x.t));
    if (ec) { const v = nums(T.filter(x => dentro(x) && x.cy > ec.b && x.cy < ec.b + ec.h * 2.6).sort((p, q) => p.l - q.l).map(x => x.t).join(' ')); if (v[0] != null) o.corte = v[0]; if (v[1] != null) o.ant = v[1]; if (v[2] != null) o.corr = v[2]; }
    // nombres para el servidor: dU/dH drenaje %, rU/rH regado, drU/drH drenado, pU/pH pulsos
    const r = { n: o.n, act: o.act, dU: o.dU, dH: o.dH, rU: o.rU, rH: o.rH, drU: o.drU, drH: o.drH, pU: o.pU, pH: o.pH, racc: o.racc, corte: o.corte, ant: o.ant, corr: o.corr };
    if (r.act != null || r.dH != null || r.corte != null) dren.push(r); }
  if (!dren.length) return { ok: false, motivo: 'Veo los drenajes pero no sus números' };
  // recuadros de arriba: el número va debajo de la etiqueta
  const top = Math.min(...H.map(h => h.x.top)), ext = {};
  const ARR = { racc: /^radiaci\S{1,2}n acumulada$/i, rad: /^radiaci\S{1,2}n$/i, eto: /^eto$/i, ta: /^temperatura$/i, hr: /^humedad$/i, viento: /^velocidad del viento$/i, ceE: /^ce entrada$/i, ceS: /^ce salida$/i, ceI: /^ce ideal$/i, ph: /^ph le\S{1,2}do$/i };
  for (const [k, re] of Object.entries(ARR)) { const et = T.find(x => re.test(x.t) && (k.startsWith('ce') || k === 'ph' || x.cy < top)); if (!et) continue;
    const c = T.filter(x => x !== et && /\d/.test(x.t) && x.top >= et.top - 2 && x.top < et.b + 70 && x.l >= et.l - 12 && x.l < et.l + 260 && !(Math.abs(x.cy - et.cy) < 4 && x.l < et.r)).sort((p, q) => (p.top - q.top) || (p.l - q.l));
    // la fila del primero (así el «2» de «m²» puesto en pequeño va con su número y no se lee suelto)
    const v = c.length ? nums(c.filter(x => Math.abs(x.cy - c[0].cy) < Math.max(c[0].h, 10)).sort((p, q) => p.l - q.l).map(x => x.t).join(' ')) : []; if (v.length) ext[k] = v[0]; }
  // estado del cabezal: qué programa está regando ahora (etiqueta y el valor debajo), el tiempo y la lista de espera
  // el valor que va debajo de una etiqueta: el primer texto que empieza a su altura y los que le siguen pegados en la misma línea
  const debajo = re => { const et = T.find(x => re.test(x.t)); if (!et) return null; const c = T.filter(x => x !== et && x.top >= et.b - 2 && x.top < et.b + 44 && x.l >= et.l - 12 && x.l < et.l + 60).sort((p, q) => (p.top - q.top) || (p.l - q.l));
    if (!c.length) return null; const f = c[0], fila = T.filter(x => x !== et && Math.abs(x.cy - f.cy) < Math.max(f.h * 0.5, 5) && x.l >= f.l).sort((p, q) => p.l - q.l), w = [f];
    for (const x of fila) { if (x === f) continue; if (x.l - w.at(-1).r > 24) break; w.push(x); } return norm(w.map(x => x.t).join(' ')); };
  const chip = T.find(x => /^\S.*\s[-–]\s*regando$/i.test(x.t)), et = T.find(x => /^tiempo:?/i.test(x.t));
  const filaT = et ? norm(T.filter(x => Math.abs(x.cy - et.cy) <= Math.max(6, et.h * 0.7) && x.l >= et.l - 2 && x.l < et.l + 500).sort((p, q) => p.l - q.l).map(x => x.t).join(' ')) : '';
  const mt = /(\d{1,2}:\d{2}(?::\d{2})?)\s*\/\s*(\d{1,2}:\d{2}(?::\d{2})?)/.exec(filaT), fase = debajo(/^fase$/i), actv = debajo(/^activaci\S{1,2}n$/i);
  const estado = { prog: debajo(/^programa activo$/i) || (chip ? norm(chip.t.replace(/\s[-–]\s*regando$/i, '')) : null), fase, agr: debajo(/^agrupaci\S{1,2}n$/i), valv: debajo(/^v\S{1,2}lvulas$/i),
    act: actv && /\d/.test(actv) ? nums(actv)[0] : null, t: mt ? mt[1] : null, tt: mt ? mt[2] : null, espera: debajo(/^lista de espera$/i), regando: /regand/i.test(fase || '') || !!chip };
  return { ok: true, tipo: 'riego', dren, ext, estado, firma: JSON.stringify(dren) };
}

async function miPestana(P, i, crear) {
  const { tabs = {}, tabId } = await chrome.storage.local.get(['tabs', 'tabId']); const id = tabs[i] ?? (i === 0 ? tabId : null);
  if (id != null) { try { const t = await chrome.tabs.get(id); if (t) return t; } catch (e) {} }
  if (!crear) return null;
  const t = await chrome.tabs.create({ url: P.url, active: false, pinned: true });
  tabs[i] = t.id; await chrome.storage.local.set({ tabs }); return null;   // se lee en la siguiente vuelta, cuando haya cargado
}

async function mandar(c, cab, r0, extra) {
  const riego = r0.tipo === 'riego', cuerpo = riego ? { cab, dren: r0.dren, ext: r0.ext, estado: r0.estado || null, empieza: !!r0.empieza, ...(extra || {}) } : { cab, comp: r0.comp };
  const r = await fetch(c.puente.replace(/\/+$/, '') + (riego ? '/riego' : '/clima'), { method: 'POST', headers: { 'content-type': 'application/json', authorization: 'Bearer ' + c.token }, body: JSON.stringify(cuerpo) });
  const j = await r.json().catch(() => ({}));
  if (r.status === 401) throw new Error('la clave (PUENTE_TOKEN) no es la buena');
  if (!r.ok || !j.ok) throw new Error(j.error || ('el servidor contesta ' + r.status));
  return j;
}

async function leer(tabId) {
  let a = null, b = null;
  try { [{ result: a }] = await chrome.scripting.executeScript({ target: { tabId }, func: leerPagina }); } catch (err) { return { ok: false, motivo: 'No puedo leer la pestaña: ' + err.message }; }
  if (a && a.ok) return { ...a, tipo: 'clima' };
  try { [{ result: b }] = await chrome.scripting.executeScript({ target: { tabId }, func: leerRiego }); } catch (err) {}
  if (b && b.ok) return b;
  return { ok: false, motivo: (a && a.motivo) + ' · ' + ((b && b.motivo) || '') };
}
const resumen = r => r.tipo === 'riego' ? `${r.dren.length} drenajes` : `${r.comp.length} compartimentos`;

async function ciclo(forzar) {
  const c = await cfg(), e = await est();
  if (!c.puente || !c.token || !c.paginas.length) { badge('!', '#b00020'); return { ok: false, msg: 'Falta configurar: abre el lector y rellena los datos' }; }
  const toca = forzar || !e.ult || Date.now() - e.ult >= c.cada * 60000 - 20000, ps = e.p || [];
  // si no toca, solo se miran las páginas de riego (cada minuto) por si empieza un riego
  if (!toca && !ps.some(p => p && p.tipo === 'riego')) return { ok: true, msg: 'Aún no toca' };
  const out = [];
  for (let i = 0; i < c.paginas.length; i++) { const pe = ps[i] || {};
    if (!toca && pe.tipo !== 'riego') { out.push({ ok: true, msg: pe.msg || '', est: pe, quieta: true }); continue; }
    out.push(await leerUna(c, i, pe, toca).catch(err => ({ ok: false, msg: 'Error: ' + err.message, est: { ...pe, msg: 'Error: ' + err.message } }))); }
  if (!toca && out.every(o => o.quieta)) { await ponEst({ p: out.map(o => o.est) }); return { ok: true, msg: 'Mirando el riego' }; }
  const todo = out.every(o => o.ok);
  await ponEst({ ...(toca ? { ult: Date.now() } : {}), p: out.map(o => o.est), msg: out.map((o, i) => `${i + 1}: ${o.msg}`).join(' · ') }); badge(todo ? '' : '×', todo ? '#1a7f4b' : '#b00020');
  return { ok: todo, msg: out.map((o, i) => `${i + 1}: ${o.msg}`).join(' · '), res: out };
}
// empieza un riego: ahora riega y antes no, u otro programa, u otra activación del mismo
const empieza = (a, b) => !!(b && b.regando && (!a || !a.regando || a.prog !== b.prog || (b.act != null && a.act !== b.act)));
async function leerUna(c, i, e, toca = true) {
  const P = c.paginas[i], tab = await miPestana(P, i, true);
  if (!tab) return { ok: false, msg: 'Abriendo la página…', est: { ...e, msg: 'Abriendo la página…' } };
  if (tab.discarded || tab.status === 'unloaded') { await chrome.tabs.reload(tab.id); return { ok: false, msg: 'Estaba dormida: recargando', est: { ...e, msg: 'Estaba dormida: recargando' } }; }
  const r = await leer(tab.id);
  if (!r || !r.ok) {
    const fallos = (e.fallos || 0) + 1, msg = (r && r.motivo) || 'No se ha podido leer';
    if (fallos % 3 === 0) await chrome.tabs.update(tab.id, { url: P.url });   // a la tercera, vuelve a la página guardada
    return { ok: false, msg, est: { ...e, fallos, msg } };
  }
  const nuevo = r.tipo === 'riego' && empieza(e.estado, r.estado); if (nuevo) r.empieza = true;
  if (!toca && !nuevo) return { ok: true, msg: e.msg || 'Mirando el riego', est: { ...e, tipo: r.tipo, estado: r.estado || null }, quieta: true };
  // Si lo leído no cambia en 45 minutos, la página no se está refrescando sola: se recarga
  let desde = r.firma === e.firma ? (e.desde || Date.now()) : Date.now();
  if (Date.now() - desde > 45 * 60000) { await chrome.tabs.reload(tab.id); desde = Date.now(); }
  try {
    const j = await mandar(c, P.cab, r);
    let ord = '';   // lo que pasa con las órdenes de la app, a la vista en el panel (antes los fallos se perdían sin decir nada)
    if (r.tipo === 'riego') {
      if (!j || !j.ord) ord = ' · el servidor no contesta con órdenes (¿falta actualizar el worker?)';
      else if (j.ord.err) ord = ' · órdenes: el servidor no pudo mirarlas (' + j.ord.err + ')';
      else ord = ` · órdenes pendientes: ${j.ord.n}`;
      if (j && j.ord && j.ord.n > 0 && !(Array.isArray(j.ordenes) && j.ordenes.length)) ord += ' · (el servidor cuenta ' + j.ord.n + ' pero no las manda; claves: ' + Object.keys(j).join(',') + ')';
      if (j && Array.isArray(j.ordenes) && j.ordenes.length) { try { ord += ' · ' + await ordenesUcrop(c, P, j.ordenes); } catch (err) { ord += ' · error al hacerlas: ' + (err.message || err); } }
    }
    const msg = `Enviado: ${resumen(r)}` + (r.empieza ? ` · empieza ${r.estado.prog || 'un riego'}` : '') + ord;
    return { ok: true, ...r, msg, est: { ult: Date.now(), fallos: 0, firma: r.firma, desde, tipo: r.tipo, estado: r.estado || null, ultimo: r.tipo === 'riego' ? null : r.comp, ultimoR: r.tipo === 'riego' ? r : null, msg } };
  } catch (err) { const msg = 'Leído pero no enviado: ' + err.message; return { ok: false, ...r, msg, est: { ...e, firma: r.firma, desde, msg } }; }
}

/* ---------- Control del uCrop (órdenes que llegan de la app) ----------
   PRIMERA VERSIÓN: solo PROBAR. Abre la pantalla del sector (drenaje o programa), comprueba que el nombre coincide y lee el valor
   que hay ahora. NO escribe nada y NO pulsa Guardar. Sirve para ver que la app apunta al sitio correcto antes de dejarle cambiar. */
const UC_LIM = { control: [25, 500], min: [25, 350], dren: [15, 40], ce: [0, 5] };   // los mismos límites que la app: si una orden se sale, no se toca nada
const UC_MODOS = ['prueba', 'ensayo', 'cambio'];   // «cambio» = pulsar Guardar de verdad: solo con la orden confirmada en la app (ver cambioUcrop)
const UC_CAMBIO_MAX_MIN = 30, UC_CAMBIOS_POR_CICLO = 3;   // una orden de cambio más vieja que esto caduca; y nunca más de 3 cambios en una vuelta
const UC_CAMPO = { control: 'controlRadiation', min: 'minRadiation', arr: 'startingRadiation', dren: 'idealDraining', ce: 'idealEC' };

// se ejecuta DENTRO de la página del uCrop ya cargada; solo mira
async function ucropMira(campo, nombreEsperado, ensayoValor) {
  const forms = { control: 'controlRadiation', min: 'minRadiation', arr: 'startingRadiation', dren: 'idealDraining', ce: 'idealEC' };
  const fc = forms[campo]; if (!fc) return { ok: false, motivo: 'campo desconocido' };
  const dormir = ms => new Promise(r => setTimeout(r, ms));
  // La pantalla se identifica por su título («UCROP | SE01FRANCO», «UCROP | Drenaje 1»), no por el texto de la página: la de programas
  // lista todos los programas en una tabla, así que el nombre aparecería en cualquiera. En uCrop unos nombres llevan la letra O y otros el cero.
  const norm = t => String(t || '').toUpperCase().replace(/\s+/g, '').replace(/O/g, '0');
  const titulo = () => { const m = /^\s*UCROP\s*\|\s*(.+?)\s*$/i.exec(document.title || ''); return m ? m[1].trim() : ''; };
  let inp = null, tit = '';
  for (let i = 0; i < 40 && !(inp && tit); i++) { inp = document.querySelector(`input[formcontrolname="${fc}"]`); tit = titulo(); if (!(inp && tit)) await dormir(250); }
  if (!inp) return { ok: false, motivo: 'no encuentro el campo en la pantalla (¿cargó bien?)' };
  const coincide = !nombreEsperado || (!!tit && norm(tit) === norm(nombreEsperado));
  const valor = inp.value === '' ? null : parseFloat(String(inp.value).replace(',', '.'));
  const res = { ok: true, coincide, valor: isFinite(valor) ? valor : null, nombre: nombreEsperado || '', titulo: tit };
  // ENSAYO: solo si la pantalla es la esperada. Escribe el valor, mira si la pantalla lo acepta y si se activa «Guardar», y deja el valor de antes.
  // No pulsa NINGÚN botón: lo único que hace con «Guardar» es mirar si está activo.
  if (ensayoValor != null && coincide) {
    const orig = inp.value, coma = /,/.test(orig), txt = v => (coma ? String(v).replace('.', ',') : String(v));
    const clases = () => (inp.className.match(/ng-(?:pristine|dirty|touched|untouched|valid|invalid)/g) || []).join(' ');
    const fijar = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
    // como si alguien escribiera: foco, el valor, evento de entrada, tecla y cambio (Angular decide por estos eventos si hubo cambio)
    const poner = v => { inp.focus(); fijar.call(inp, v);
      inp.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: String(v) }));
      inp.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true, key: '1' })); inp.dispatchEvent(new Event('change', { bubbles: true })); };
    const soltar = () => { inp.dispatchEvent(new FocusEvent('blur')); inp.dispatchEvent(new FocusEvent('focusout', { bubbles: true })); inp.blur(); };
    const guardar = () => [...document.querySelectorAll('button')].find(b => /^\s*guardar\b/i.test(b.innerText || b.textContent || ''));
    const clasesAntes = clases();
    poner(txt(ensayoValor)); await dormir(700);
    let g = guardar(), activo = !!g && !g.disabled, con = activo ? 'escribir' : '';
    if (!activo) { soltar(); await dormir(700); g = guardar(); activo = !!g && !g.disabled; if (activo) con = 'salir del campo'; }
    const leido = parseFloat(String(inp.value).replace(',', '.')), clasesDespues = clases(), hayBoton = !!g;
    poner(orig); soltar(); await dormir(500);
    res.ensayo = { escrito: ensayoValor, leido: isFinite(leido) ? leido : null, guardarActivo: activo, con, hayBoton, clasesAntes, clasesDespues, original: orig, restaurado: inp.value === orig };
  }
  return res;
}

// Se ejecuta DENTRO de la página del uCrop (en el mundo de la página). Es lo ÚNICO de esta extensión que pulsa un botón, y solo uno:
// «Guardar programa» / «Guardar drenaje», con el nombre de la pantalla ya comprobado, el valor de antes igual al que se confirmó
// y el valor nuevo ya aceptado por la pantalla. Si algo no cuadra no pulsa nada y deja el valor como estaba.
async function ucropGuarda(campo, nombreEsperado, nuevo, antes) {
  const forms = { control: 'controlRadiation', min: 'minRadiation', arr: 'startingRadiation', dren: 'idealDraining', ce: 'idealEC' };
  const fc = forms[campo]; if (!fc) return { ok: false, motivo: 'campo desconocido' };
  if (!nombreEsperado || typeof nuevo !== 'number' || !isFinite(nuevo) || typeof antes !== 'number') return { ok: false, motivo: 'faltan datos de la orden' };
  const dormir = ms => new Promise(r => setTimeout(r, ms));
  const norm = t => String(t || '').toUpperCase().replace(/\s+/g, '').replace(/O/g, '0');
  const titulo = () => { const m = /^\s*UCROP\s*\|\s*(.+?)\s*$/i.exec(document.title || ''); return m ? m[1].trim() : ''; };
  let inp = null, tit = '';
  for (let i = 0; i < 40 && !(inp && tit); i++) { inp = document.querySelector(`input[formcontrolname="${fc}"]`); tit = titulo(); if (!(inp && tit)) await dormir(250); }
  if (!inp) return { ok: false, motivo: 'no encuentro el campo en la pantalla (¿cargó bien?)' };
  const coincide = !!tit && norm(tit) === norm(nombreEsperado);
  const valor = inp.value === '' ? null : parseFloat(String(inp.value).replace(',', '.'));
  const res = { ok: true, coincide, titulo: tit, valor: isFinite(valor) ? valor : null };
  if (!coincide) return res;
  if (res.valor != null && Math.abs(res.valor - nuevo) < 0.0005) return { ...res, estado: 'yaestaba' };   // (p. ej. se guardó pero no llegó el aviso): no se vuelve a pulsar
  if (res.valor == null || Math.abs(res.valor - antes) > 0.0005) return { ...res, estado: 'distinto' };
  const orig = inp.value, coma = /,/.test(orig), txt = v => (coma ? String(v).replace('.', ',') : String(v));
  const fijar = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
  const poner = v => { inp.focus(); fijar.call(inp, v);
    inp.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: String(v) }));
    inp.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true, key: '1' })); inp.dispatchEvent(new Event('change', { bubbles: true })); };
  const soltar = () => { inp.dispatchEvent(new FocusEvent('blur')); inp.dispatchEvent(new FocusEvent('focusout', { bubbles: true })); inp.blur(); };
  const palabra = campo === 'ce' ? 'programa' : 'drenaje';
  const botones = () => [...document.querySelectorAll('button')].filter(b => /^\s*guardar\b/i.test(b.innerText || b.textContent || ''));
  const elBoton = () => botones().find(b => new RegExp('^\\s*guardar\\s+' + palabra + '\\s*$', 'i').test((b.innerText || b.textContent || '').replace(/\s+/g, ' ')));
  poner(txt(nuevo)); await dormir(700);
  let g = elBoton(), activo = !!g && !g.disabled;
  if (!activo) { soltar(); await dormir(700); g = elBoton(); activo = !!g && !g.disabled; }
  const leido = parseFloat(String(inp.value).replace(',', '.'));
  if (!g) { poner(orig); soltar(); return { ...res, estado: 'boton', boton: botones().map(b => (b.innerText || '').trim()).join(' | ').slice(0, 80), leido }; }
  if (!activo || Math.abs(leido - nuevo) > 0.0005) { poner(orig); soltar(); await dormir(300); return { ...res, estado: 'noactivo', leido }; }
  g.click();   // ← el único clic de toda la extensión
  await dormir(3000);
  const dlg = [...document.querySelectorAll('[role="dialog"],mat-dialog-container,.modal.show,.swal2-popup,.cdk-overlay-pane')].map(d => (d.innerText || '').replace(/\s+/g, ' ').trim()).filter(Boolean).join(' | ').slice(0, 120);
  return { ...res, estado: 'pulsado', leido, dialogo: dlg };
}

async function tabTrabajo() {
  const { uTab } = await chrome.storage.local.get('uTab');
  if (uTab != null) { try { const t = await chrome.tabs.get(uTab); if (t) return t.id; } catch (e) {} }
  const t = await chrome.tabs.create({ url: 'about:blank', active: false, pinned: false });
  await chrome.storage.local.set({ uTab: t.id }); return t.id;
}
const UC_ESPERA = { sondeo: 500, asentar: 1500 };
/* Abre una pantalla del uCrop en la pestaña de trabajo y espera a que la pestaña esté DE VERDAD en app.ucrop.net y cargada
   (no se fía del primer aviso de «cargada»: puede ser el de la página en blanco anterior o de una página de otra extensión). */
async function irA(tabId, url) {
  const lista = async () => { try { const t = await chrome.tabs.get(tabId); return !!t && t.status === 'complete' && /^https:\/\/app\.ucrop\.net\//.test(t.url || ''); } catch (e) { return false; } };
  for (let intento = 0; intento < 2; intento++) {
    await chrome.tabs.update(tabId, { url, active: false });
    for (let i = 0; i < 40; i++) { await new Promise(r => setTimeout(r, UC_ESPERA.sondeo)); if (await lista()) { await new Promise(r => setTimeout(r, UC_ESPERA.asentar)); return true; } }
  }
  return false;
}
const esperarCarga = tabId => new Promise(res => { let fin = false; const acabar = () => { if (fin) return; fin = true; chrome.tabs.onUpdated.removeListener(h); res(); };
  const h = (id, info) => { if (id === tabId && info.status === 'complete') acabar(); };
  chrome.tabs.onUpdated.addListener(h); setTimeout(acabar, 15000); });

/* Un cambio de verdad. Solo llega aquí una orden «cambio» y se vuelve a comprobar TODO en el PC (no se fía de la app ni del servidor):
   límites, que traiga la confirmación hecha en la app, que no haya caducado, el nombre de la pantalla y que el valor de ahora sea el que se confirmó.
   Después pulsa Guardar, recarga la pantalla y mira que el valor quedó guardado. Nunca repite un guardado: si ya está en el valor nuevo no pulsa. */
async function cambioUcrop(o, url, tabId) {
  const L = UC_LIM[o.campo], nom = o.nombre || '';
  const no = motivo => ({ id: o.id, estado: 'fallo', motivo: motivo + ' · no he guardado nada' });
  if (!L || typeof o.valor !== 'number' || !isFinite(o.valor) || o.valor < L[0] || o.valor > L[1]) return no(`valor fuera de los límites (${L ? L.join('–') : 'campo desconocido'})`);
  if (!nom) return no('la orden no trae el nombre de la pantalla');
  if (o.confirmado !== true || typeof o.valorAntes !== 'number') return no('la orden no trae la confirmación (¿el servidor puente está sin actualizar?)');
  const edad = (Date.now() - Date.parse(o.ts || '')) / 6e4;
  if (!isFinite(edad) || edad > UC_CAMBIO_MAX_MIN || edad < -5) return no(`la orden ${isFinite(edad) ? 'es de hace ' + Math.round(edad) + ' min: caducó' : 'no trae fecha'}; confírmala otra vez`);
  try {
    if (!(await irA(tabId, url))) return no('no pude abrir la pantalla del uCrop (la pestaña de trabajo se quedó en otra página)');
    let r; try { [{ result: r }] = await chrome.scripting.executeScript({ target: { tabId }, world: 'MAIN', func: ucropGuarda, args: [o.campo, nom, o.valor, o.valorAntes] }); } catch (e) { return no('no puedo escribir en la pantalla: ' + e.message); }
    if (!r || !r.ok) return no((r && r.motivo) || 'no se pudo');
    if (!r.coincide) return no(`la pantalla abierta es «${r.titulo || 'sin título'}», no ${nom}`);
    if (r.estado === 'distinto') return no(`el valor de ahora (${r.valor}) no es el que viste al confirmar (${o.valorAntes}): lo cambió alguien. Léelo y confírmalo otra vez`);
    if (r.estado === 'yaestaba') return { id: o.id, estado: 'hecho', nombre: r.titulo, valor: r.valor, motivo: `ya estaba en ${o.valor}: no hizo falta guardar` };
    if (r.estado === 'boton') return no(`no encuentro el botón «Guardar» esperado (hay: ${r.boton || 'ninguno'})`);
    if (r.estado === 'noactivo') return no(`escribí ${o.valor} (la pantalla puso ${r.leido}) pero «Guardar» no se activó; dejé el valor como estaba`);
    if (r.estado !== 'pulsado') return no('respuesta rara de la pantalla');
    const abierta = await irA(tabId, url);   // recargar y mirar si quedó guardado
    let v = null; if (abierta) try { [{ result: v }] = await chrome.scripting.executeScript({ target: { tabId }, func: ucropMira, args: [o.campo, nom, null] }); } catch (e) { v = null; }
    if (!v || !v.ok || !v.coincide || v.valor == null) return { id: o.id, estado: 'fallo', nombre: r.titulo, motivo: `OJO: pulsé Guardar (de ${o.valorAntes} a ${o.valor}) pero no pude comprobar el resultado${r.dialogo ? ' · salió: ' + r.dialogo : ''}. Míralo en el uCrop` };
    if (Math.abs(v.valor - o.valor) < 0.0005) return { id: o.id, estado: 'hecho', nombre: v.titulo, valor: v.valor, motivo: `guardado: de ${o.valorAntes} a ${v.valor} (comprobado al recargar)` };
    return { id: o.id, estado: 'fallo', nombre: v.titulo, valor: v.valor, motivo: `OJO: pulsé Guardar pero al recargar pone ${v.valor}, no ${o.valor}${r.dialogo ? ' · salió: ' + r.dialogo : ''}. Míralo en el uCrop` };
  } catch (e) { return { id: o.id, estado: 'fallo', motivo: 'error: ' + (e.message || e) + ' · mira el valor en el uCrop' }; }
}

async function ordenesUcrop(c, P, ordenes) {
  const m = /\/farming\/([^/]+)\//.exec(P.url || ''); if (!m) return 'la página guardada no tiene el nº de equipo';   // la página de riego da el nº de serie del equipo
  const base = `https://app.ucrop.net/farming/${m[1]}/irrigation`, tabId = await tabTrabajo(), hechos = [];
  let cambios = 0;
  for (const o of ordenes) {
    const prog = o.campo === 'ce', idx = (o.idx || {}), url = prog ? `${base}/program/${idx.prog}` : `${base}/drainages_v3/${idx.dren}`, modo = o.modo || 'prueba', ens = modo === 'ensayo';
    if (!UC_MODOS.includes(modo)) { hechos.push({ id: o.id, estado: 'fallo', motivo: `modo «${modo}» no permitido en esta versión: no toco nada` }); continue; }
    if (modo === 'cambio') {
      if (cambios >= UC_CAMBIOS_POR_CICLO) continue;   // el resto espera a la próxima vuelta (sigue pendiente)
      cambios++; hechos.push(await cambioUcrop(o, url, tabId)); try { await chrome.tabs.update(tabId, { url: 'about:blank' }); } catch (e) {} continue;
    }
    if (ens) { const L = UC_LIM[o.campo];
      if (!L || typeof o.valor !== 'number' || !isFinite(o.valor) || o.valor < L[0] || o.valor > L[1]) { hechos.push({ id: o.id, estado: 'fallo', motivo: `valor fuera de los límites (${L ? L.join('–') : 'campo desconocido'}): no toco nada` }); continue; } }
    try {
      if (!(await irA(tabId, url))) { hechos.push({ id: o.id, estado: 'fallo', motivo: 'no pude abrir la pantalla del uCrop (la pestaña de trabajo se quedó en otra página)' }); continue; }
      let res; try { [{ result: res }] = await chrome.scripting.executeScript({ target: { tabId }, func: ucropMira, args: [o.campo, o.nombre || '', ens ? o.valor : null] }); } catch (e) { res = { ok: false, motivo: 'no puedo leer la pantalla: ' + e.message }; }
      if (ens && res && res.ok && res.coincide && res.ensayo && res.ensayo.restaurado && !res.ensayo.guardarActivo) {   // otra vez, ahora dentro de la propia página
        try { const [{ result: r2 }] = await chrome.scripting.executeScript({ target: { tabId }, world: 'MAIN', func: ucropMira, args: [o.campo, o.nombre || '', o.valor] });
          if (r2 && r2.ok && r2.coincide && r2.ensayo) { r2.ensayo.mundo = 'pagina'; if (r2.ensayo.guardarActivo || !r2.ensayo.restaurado) res = r2; else res.ensayo.mundo = 'ambos'; } } catch (e) {} }
      if (!res || !res.ok) hechos.push({ id: o.id, estado: 'fallo', motivo: (res && res.motivo) || 'no se pudo' });
      else if (!res.coincide) hechos.push({ id: o.id, estado: 'fallo', nombre: res.titulo || '', valor: res.valor, motivo: `la pantalla abierta es «${res.titulo || 'sin título'}», no ${o.nombre || 'la esperada'}: no toco nada` });
      else if (ens) { const e = res.ensayo || {};
        if (!e.restaurado) hechos.push({ id: o.id, estado: 'fallo', nombre: res.titulo || '', valor: res.valor, motivo: `OJO: no pude dejar el valor como estaba (era ${e.original}). Cierra esa pestaña del uCrop sin guardar` });
        else if (e.leido !== o.valor) hechos.push({ id: o.id, estado: 'fallo', nombre: res.titulo || '', valor: res.valor, motivo: `la pantalla no aceptó el ${o.valor} (puso ${e.leido}). No he guardado nada` });
        else if (!e.guardarActivo) hechos.push({ id: o.id, estado: 'fallo', nombre: res.titulo || '', valor: res.valor, motivo: `escribí ${o.valor} pero «Guardar» no se activó. No he guardado nada · campo: ${e.clasesAntes || '?'} → ${e.clasesDespues || '?'} · botón ${e.hayBoton ? 'visto' : 'NO visto'}${e.mundo ? ' · probado también ' + e.mundo : ''}` });
        else hechos.push({ id: o.id, estado: 'probado', nombre: res.titulo || '', valor: res.valor, motivo: `${res.titulo}: escribí ${o.valor}, la pantalla lo aceptó y «Guardar» se activó (al ${e.con}${e.mundo === 'pagina' ? ', desde la página' : ''}). He vuelto a dejar ${e.original}; no he guardado nada` }); }
      else hechos.push({ id: o.id, estado: 'probado', nombre: res.titulo || o.nombre || '', valor: res.valor, motivo: `prueba correcta: ${res.titulo || o.nombre || ''} · ahora pone ${res.valor}` });
    } catch (e) { hechos.push({ id: o.id, estado: 'fallo', motivo: 'error: ' + (e.message || e) }); }
    if (ens) { try { await chrome.tabs.update(tabId, { url: 'about:blank' }); } catch (e) {} }   // sin guardar: lo escrito se descarta
  }
  let envio = '';
  if (hechos.length) try { const rr = await fetch(c.puente.replace(/\/+$/, '') + '/riego', { method: 'POST', headers: { 'content-type': 'application/json', authorization: 'Bearer ' + c.token }, body: JSON.stringify({ cab: P.cab, hechos }) }); if (!rr.ok) envio = ' (el servidor no guardó el resultado: ' + rr.status + ')'; } catch (e) { envio = ' (no pude mandar el resultado: ' + e.message + ')'; }
  return `hechas ${hechos.length}: ${hechos.filter(h => h.estado === 'probado' || h.estado === 'hecho').length} bien, ${hechos.filter(h => h.estado === 'fallo').length} con fallo` + envio;
}

/* El panel del lector: probar en la pestaña de delante, guardar la página y mandar ya */
chrome.runtime.onMessage.addListener((m, s, responder) => {
  (async () => {
    if (m.q === 'probar') { const [t] = await chrome.tabs.query({ active: true, currentWindow: true }); if (!t) return { ok: false, motivo: 'No hay pestaña' };
      const result = await leer(t.id); return { ...result, url: t.url, tabId: t.id }; }
    if (m.q === 'usar') { const { tabs = {} } = await chrome.storage.local.get('tabs'); tabs[m.i] = m.tabId; await chrome.storage.local.set({ tabs }); return { ok: true }; }
    if (m.q === 'quitar') { const { tabs = {} } = await chrome.storage.local.get('tabs'), n = {}; Object.keys(tabs).forEach(k => { if (+k < m.i) n[k] = tabs[k]; else if (+k > m.i) n[+k - 1] = tabs[k]; }); await chrome.storage.local.set({ tabs: n }); return { ok: true }; }
    if (m.q === 'ahora') return await ciclo(true);
    return { ok: false };
  })().then(responder, e => responder({ ok: false, msg: e.message }));
  return true;
});
