const $ = id => document.getElementById(id);
const DEF = { puente: '', token: '', cab: 'gas', cada: 15, pagina: '' };
let C = { ...DEF }, prueba = null;
const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const tabla = comp => `<table><tr><th>Comp.</th><th>Temp.</th><th>Humedad</th><th>Ventanas</th></tr>${comp.map(c => `<tr><td>${c.n}</td><td>${c.ta ?? '—'} °C</td><td>${c.hr ?? '—'} %</td><td>${(c.vent || []).join(' / ') || '—'}</td></tr>`).join('')}</table>`;
const tablaR = r => `<table><tr><th>Drenaje</th><th>Riegos</th><th>Drena hoy</th><th>Corte</th></tr>${r.dren.map(d => `<tr><td>${d.n}</td><td>${d.act ?? '—'}</td><td>${d.dH ?? '—'} %</td><td>${d.corte ?? '—'}</td></tr>`).join('')}</table>${r.ext && r.ext.racc != null ? `<small>Radiación acumulada hoy: ${r.ext.racc} Wh/m²</small>` : ''}`;
const verLeido = r => r.tipo === 'riego' ? tablaR(r) : tabla(r.comp);
const hace = t => { if (!t) return 'nunca'; const m = Math.round((Date.now() - t) / 60000); return m < 1 ? 'ahora mismo' : m < 60 ? `hace ${m} min` : `hace ${Math.round(m / 6) / 10} h`; };
async function pinta() {
  const { cfg, est } = await chrome.storage.local.get(['cfg', 'est']); C = { ...DEF, ...(cfg || {}) }; const e = est || {};
  $('puente').value = C.puente; $('token').value = C.token; $('cab').value = C.cab; $('cada').value = String(C.cada);
  $('pagina').innerHTML = C.pagina ? `<small>${esc(C.pagina)}</small>` : '<small>Sin elegir: ve a la pestaña del controlador (en «Estados») y pulsa «Usar esta pestaña»</small>';
  $('estado').innerHTML = `<b class="${e.ult && Date.now() - e.ult < (C.cada + 10) * 60000 ? 'ok' : 'mal'}">Último envío: ${hace(e.ult)}</b><br><small>${esc(e.msg || 'Aún no ha hecho nada')}</small>${e.ultimoR ? tablaR(e.ultimoR) : e.ultimo ? tabla(e.ultimo) : ''}`;
}
const res = (h, ok) => { const r = $('res'); r.hidden = false; r.innerHTML = `<span class="${ok ? 'ok' : 'mal'}">${h}</span>`; };
$('probar').onclick = async () => {
  const r = await chrome.runtime.sendMessage({ q: 'probar' });
  if (!r || !r.ok) { prueba = null; res(esc((r && r.motivo) || 'No se ha podido leer'), false); return; }
  prueba = r; res(`Leído bien (${r.tipo === 'riego' ? 'riego del uCrop' : 'clima'}). Pulsa «Guardar» para usar esta página:${verLeido(r)}`, true);
};
$('guardar').onclick = async () => {
  const n = { puente: $('puente').value.trim().replace(/\/+$/, ''), token: $('token').value.trim(), cab: $('cab').value, cada: +$('cada').value, pagina: prueba ? prueba.url : C.pagina };
  if (!/^https:\/\//.test(n.puente)) { res('La dirección del puente empieza por https://', false); return; }
  if (!n.token) { res('Falta la clave', false); return; }
  if (!n.pagina) { res('Falta la página: ve a la pestaña del controlador y pulsa «Usar esta pestaña»', false); return; }
  await chrome.storage.local.set({ cfg: n });
  if (prueba) { await chrome.runtime.sendMessage({ q: 'usar', tabId: prueba.tabId }); try { await chrome.tabs.update(prueba.tabId, { pinned: true }); } catch (e) {} }
  res('Guardado. Esa pestaña queda fijada: déjala abierta (puedes usar el programa en otra).', true); pinta();
};
$('ahora').onclick = async () => { res('Leyendo…', true); const r = await chrome.runtime.sendMessage({ q: 'ahora' }); res(esc((r && r.msg) || 'Sin respuesta'), r && r.ok); pinta(); };
pinta();
