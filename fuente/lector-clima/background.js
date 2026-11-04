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
  return { ok: true, tipo: 'riego', dren, ext, firma: JSON.stringify(dren) };
}

async function miPestana(P, i, crear) {
  const { tabs = {}, tabId } = await chrome.storage.local.get(['tabs', 'tabId']); const id = tabs[i] ?? (i === 0 ? tabId : null);
  if (id != null) { try { const t = await chrome.tabs.get(id); if (t) return t; } catch (e) {} }
  if (!crear) return null;
  const t = await chrome.tabs.create({ url: P.url, active: false, pinned: true });
  tabs[i] = t.id; await chrome.storage.local.set({ tabs }); return null;   // se lee en la siguiente vuelta, cuando haya cargado
}

async function mandar(c, cab, r0) {
  const riego = r0.tipo === 'riego', cuerpo = riego ? { cab, dren: r0.dren, ext: r0.ext } : { cab, comp: r0.comp };
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
  if (!forzar && e.ult && Date.now() - e.ult < c.cada * 60000 - 20000) return { ok: true, msg: 'Aún no toca' };
  const ps = e.p || [], out = [];
  for (let i = 0; i < c.paginas.length; i++) out.push(await leerUna(c, i, ps[i] || {}).catch(err => ({ ok: false, msg: 'Error: ' + err.message, est: { ...(ps[i] || {}), msg: 'Error: ' + err.message } })));
  const todo = out.every(o => o.ok);
  await ponEst({ ult: Date.now(), p: out.map(o => o.est), msg: out.map((o, i) => `${i + 1}: ${o.msg}`).join(' · ') }); badge(todo ? '' : '×', todo ? '#1a7f4b' : '#b00020');
  return { ok: todo, msg: out.map((o, i) => `${i + 1}: ${o.msg}`).join(' · '), res: out };
}
async function leerUna(c, i, e) {
  const P = c.paginas[i], tab = await miPestana(P, i, true);
  if (!tab) return { ok: false, msg: 'Abriendo la página…', est: { ...e, msg: 'Abriendo la página…' } };
  if (tab.discarded || tab.status === 'unloaded') { await chrome.tabs.reload(tab.id); return { ok: false, msg: 'Estaba dormida: recargando', est: { ...e, msg: 'Estaba dormida: recargando' } }; }
  const r = await leer(tab.id);
  if (!r || !r.ok) {
    const fallos = (e.fallos || 0) + 1, msg = (r && r.motivo) || 'No se ha podido leer';
    if (fallos % 3 === 0) await chrome.tabs.update(tab.id, { url: P.url });   // a la tercera, vuelve a la página guardada
    return { ok: false, msg, est: { ...e, fallos, msg } };
  }
  // Si lo leído no cambia en 45 minutos, la página no se está refrescando sola: se recarga
  let desde = r.firma === e.firma ? (e.desde || Date.now()) : Date.now();
  if (Date.now() - desde > 45 * 60000) { await chrome.tabs.reload(tab.id); desde = Date.now(); }
  try {
    await mandar(c, P.cab, r); const msg = `Enviado: ${resumen(r)}`;
    return { ok: true, ...r, msg, est: { ult: Date.now(), fallos: 0, firma: r.firma, desde, tipo: r.tipo, ultimo: r.tipo === 'riego' ? null : r.comp, ultimoR: r.tipo === 'riego' ? r : null, msg } };
  } catch (err) { const msg = 'Leído pero no enviado: ' + err.message; return { ok: false, ...r, msg, est: { ...e, firma: r.firma, desde, msg } }; }
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
