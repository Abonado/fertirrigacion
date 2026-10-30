/* Agro FLY · Lector del clima (extensión de Edge / Chrome)
   Cada minuto mira si toca leer (cada «cada» minutos). Abre su propia pestaña fijada con la página del controlador de clima,
   lee la tabla «Estados» (Compartimento 1…N: humedad, temperatura y posición de las ventanas) y la manda al servidor puente
   de la app (ruta /clima, con la clave PUENTE_TOKEN). Si la página se queda colgada o pide entrar, la recarga.
   No guarda ni manda nada más de la página. */
const DEF = { puente: '', token: '', cab: 'gas', cada: 15, pagina: '' };
const cfg = async () => ({ ...DEF, ...((await chrome.storage.local.get('cfg')).cfg || {}) });
const est = async () => (await chrome.storage.local.get('est')).est || {};
const ponEst = async p => { const e = { ...(await est()), ...p }; await chrome.storage.local.set({ est: e }); return e; };
const badge = (t, c) => { chrome.action.setBadgeText({ text: t }); if (c) chrome.action.setBadgeBackgroundColor({ color: c }); };
const armar = () => chrome.alarms.create('leer', { periodInMinutes: 1 });
chrome.runtime.onInstalled.addListener(armar);
chrome.runtime.onStartup.addListener(armar);
chrome.alarms.onAlarm.addListener(a => { if (a.name === 'leer') ciclo(false).catch(e => ponEst({ msg: 'Error: ' + e.message })); });

/* Se ejecuta DENTRO de la página del controlador: devuelve los compartimentos o por qué no se pueden leer */
function leerPagina() {
  const norm = s => String(s == null ? '' : s).replace(/\s+/g, ' ').trim();
  const num = s => { s = norm(s); if (!s || s === '-') return null; const m = s.match(/-?\d+(?:[.,]\d+)?/); return m ? parseFloat(m[0].replace(',', '.')) : null; };
  const texto = document.body ? document.body.innerText : '';
  const FILAS = { hr: /^humedad del compartimento$/i, ta: /^temperatura del compartimento$/i, v1: /^posici\S{1,2}n ventana 1$/i, v2: /^posici\S{1,2}n ventana 2$/i, v3: /^posici\S{1,2}n ventana 3$/i };
  const tw = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT), nodos = [];
  for (let n = tw.nextNode(); n; n = tw.nextNode()) { const t = norm(n.textContent); if (t) nodos.push({ t, el: n.parentElement }); }
  const N = Math.max(0, ...nodos.map(x => (/^compartimento\s*(\d+)$/i.exec(x.t) || [])[1]).filter(Boolean).map(Number).filter(n => n <= 20));
  if (!N) return { ok: false, motivo: 'No se ve la tabla de compartimentos (¿está en «Estados»? ¿pide entrar?)' };
  const celdas = el => {   // las celdas de la fila de una etiqueta: la fila de tabla o el primer antepasado con N+1 hijos
    const tr = el.closest('tr'); if (tr) return [...tr.children].map(c => norm(c.innerText));
    let r = el; for (let i = 0; i < 6 && r.parentElement; i++) { r = r.parentElement; if (r.children.length >= N + 1) return [...r.children].map(c => norm(c.innerText)); }
    return null;
  };
  const fila = {};
  for (const [k, re] of Object.entries(FILAS)) {
    const x = nodos.find(y => re.test(y.t)); if (!x) continue;
    let c = celdas(x.el);
    if (c) { const i = c.findIndex(v => re.test(v)); c = c.slice(i + 1, i + 1 + N); }
    if (!c || c.length < N) {   // plan B: el texto plano de la página, en la línea de la etiqueta (tabuladores) o en las líneas siguientes
      const L = texto.split('\n').map(norm), i = L.findIndex(l => re.test(l.split('\t')[0]) || re.test(l));
      const raw = texto.split('\n')[i] || '', partes = raw.split('\t').map(norm).filter(Boolean);
      c = partes.length > N ? partes.slice(1, N + 1) : L.slice(i + 1).filter(Boolean).slice(0, N);
    }
    fila[k] = c.map(num);
  }
  if (!fila.ta && !fila.hr) return { ok: false, motivo: 'Veo los compartimentos, pero no las filas de humedad y temperatura' };
  const comp = [];
  for (let i = 0; i < N; i++) {
    const v = ['v1', 'v2', 'v3'].map(k => fila[k] ? fila[k][i] : null).filter(x => x != null);
    const c = { n: i + 1, ta: fila.ta ? fila.ta[i] : null, hr: fila.hr ? fila.hr[i] : null, vent: v };
    if (c.ta != null || c.hr != null) comp.push(c);
  }
  if (!comp.length) return { ok: false, motivo: 'Las filas están vacías' };
  return { ok: true, comp, firma: JSON.stringify(comp) };
}

async function miPestana(c, crear) {
  const { tabId } = await chrome.storage.local.get('tabId');
  if (tabId != null) { try { const t = await chrome.tabs.get(tabId); if (t) return t; } catch (e) {} }
  if (!crear) return null;
  const t = await chrome.tabs.create({ url: c.pagina, active: false, pinned: true });
  await chrome.storage.local.set({ tabId: t.id }); return null;   // se lee en la siguiente vuelta, cuando haya cargado
}

async function mandar(c, comp) {
  const r = await fetch(c.puente.replace(/\/+$/, '') + '/clima', { method: 'POST', headers: { 'content-type': 'application/json', authorization: 'Bearer ' + c.token }, body: JSON.stringify({ cab: c.cab, comp }) });
  const j = await r.json().catch(() => ({}));
  if (r.status === 401) throw new Error('la clave (PUENTE_TOKEN) no es la buena');
  if (!r.ok || !j.ok) throw new Error(j.error || ('el servidor contesta ' + r.status));
  return j;
}

async function ciclo(forzar) {
  const c = await cfg(), e = await est();
  if (!c.puente || !c.token || !c.pagina) { badge('!', '#b00020'); return { ok: false, msg: 'Falta configurar: abre el lector y rellena los datos' }; }
  if (!forzar && e.ult && Date.now() - e.ult < c.cada * 60000 - 20000) return { ok: true, msg: 'Aún no toca' };
  const tab = await miPestana(c, true);
  if (!tab) { await ponEst({ msg: 'Abriendo la página del clima…' }); return { ok: false, msg: 'Abriendo la página del clima: prueba otra vez en un minuto' }; }
  if (tab.discarded || tab.status === 'unloaded') { await chrome.tabs.reload(tab.id); return { ok: false, msg: 'La pestaña estaba dormida: recargando' }; }
  let r;
  try { [{ result: r }] = await chrome.scripting.executeScript({ target: { tabId: tab.id }, func: leerPagina }); } catch (err) { r = { ok: false, motivo: 'No puedo leer la pestaña: ' + err.message }; }
  if (!r || !r.ok) {
    const fallos = (e.fallos || 0) + 1; await ponEst({ fallos, msg: (r && r.motivo) || 'No se ha podido leer' }); badge('×', '#b00020');
    if (fallos % 3 === 0) await chrome.tabs.update(tab.id, { url: c.pagina });   // a la tercera, vuelve a la página del clima
    return { ok: false, msg: (r && r.motivo) || 'No se ha podido leer' };
  }
  // Si lo leído no cambia en 45 minutos, la página no se está refrescando sola: se recarga
  const desde = r.firma === e.firma ? (e.desde || Date.now()) : Date.now();
  if (Date.now() - desde > 45 * 60000) { await chrome.tabs.reload(tab.id); await ponEst({ desde: Date.now() }); }
  try {
    await mandar(c, r.comp);
    await ponEst({ ult: Date.now(), fallos: 0, firma: r.firma, desde, ultimo: r.comp, msg: `Enviado: ${r.comp.length} compartimentos` }); badge('', '#1a7f4b');
    return { ok: true, comp: r.comp, msg: `Enviado: ${r.comp.length} compartimentos` };
  } catch (err) { await ponEst({ msg: 'Leído pero no enviado: ' + err.message }); badge('×', '#b00020'); return { ok: false, comp: r.comp, msg: 'Leído pero no enviado: ' + err.message }; }
}

/* El panel del lector: probar en la pestaña de delante, guardar la página y mandar ya */
chrome.runtime.onMessage.addListener((m, s, responder) => {
  (async () => {
    if (m.q === 'probar') { const [t] = await chrome.tabs.query({ active: true, currentWindow: true }); if (!t) return { ok: false, motivo: 'No hay pestaña' };
      try { const [{ result }] = await chrome.scripting.executeScript({ target: { tabId: t.id }, func: leerPagina }); return { ...result, url: t.url, tabId: t.id }; } catch (e) { return { ok: false, motivo: 'Esta pestaña no se puede leer: ' + e.message }; } }
    if (m.q === 'usar') { await chrome.storage.local.set({ tabId: m.tabId }); return { ok: true }; }
    if (m.q === 'ahora') return await ciclo(true);
    return { ok: false };
  })().then(responder, e => responder({ ok: false, msg: e.message }));
  return true;
});
