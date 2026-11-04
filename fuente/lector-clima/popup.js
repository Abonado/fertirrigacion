const $ = id => document.getElementById(id);
const CABS = [['gas', 'Gasolinera'], ['pla', 'Planos'], ['fra', 'Franco']];
let C = { puente: '', token: '', cada: 15, paginas: [] }, nuevas = [];
const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const tabla = comp => `<table><tr><th>Comp.</th><th>Temp.</th><th>Humedad</th><th>Ventanas</th></tr>${comp.map(c => `<tr><td>${c.n}</td><td>${c.ta ?? '—'} °C</td><td>${c.hr ?? '—'} %</td><td>${(c.vent || []).join(' / ') || '—'}</td></tr>`).join('')}</table>`;
const tablaR = r => `<table><tr><th>Drenaje</th><th>Riegos</th><th>Drena hoy</th><th>Corte</th></tr>${r.dren.map(d => `<tr><td>${d.n}</td><td>${d.act ?? '—'}</td><td>${d.dH ?? '—'} %</td><td>${d.corte ?? '—'}</td></tr>`).join('')}</table>${r.ext && r.ext.racc != null ? `<small>Radiación acumulada hoy: ${r.ext.racc} Wh/m²</small>` : ''}`;
const verLeido = r => r.tipo === 'riego' ? tablaR(r) : tabla(r.comp);
const hace = t => { if (!t) return 'nunca'; const m = Math.round((Date.now() - t) / 60000); return m < 1 ? 'ahora mismo' : m < 60 ? `hace ${m} min` : `hace ${Math.round(m / 6) / 10} h`; };
const res = (h, ok) => { const r = $('res'); r.hidden = false; r.innerHTML = `<span class="${ok ? 'ok' : 'mal'}">${h}</span>`; };
function pintaPaginas() {
  $('paginas').innerHTML = C.paginas.length ? C.paginas.map((p, i) => `<div class="pag"><div class="t"><b>${i + 1}.</b><select data-i="${i}">${CABS.map(([v, n]) => `<option value="${v}" ${p.cab === v ? 'selected' : ''}>${n}</option>`).join('')}</select><button class="sm" data-q="${i}">Quitar</button></div><span class="url">${esc(p.url)}</span></div>`).join('')
    : '<small>Ninguna: abre la página del clima («Estados») o la de riego del uCrop («Estado del cabezal») y pulsa «Añadir la pestaña de delante».</small>';
  document.querySelectorAll('#paginas select').forEach(s => s.onchange = () => { C.paginas[+s.dataset.i].cab = s.value; });
  document.querySelectorAll('#paginas [data-q]').forEach(b => b.onclick = async () => { const i = +b.dataset.q; C.paginas.splice(i, 1); nuevas = nuevas.filter(n => n.i !== i).map(n => ({ ...n, i: n.i > i ? n.i - 1 : n.i })); await chrome.runtime.sendMessage({ q: 'quitar', i }); pintaPaginas(); });
}
async function pinta() {
  const { cfg, est } = await chrome.storage.local.get(['cfg', 'est']); const c = cfg || {}, e = est || {};
  C = { puente: c.puente || '', token: c.token || '', cada: c.cada || 15, paginas: (c.paginas && c.paginas.length ? c.paginas : c.pagina ? [{ url: c.pagina, cab: c.cab || 'gas' }] : []).map(p => ({ ...p })) };
  $('puente').value = C.puente; $('token').value = C.token; $('cada').value = String(C.cada); pintaPaginas();
  const ps = e.p || (e.ult ? [e] : []);
  $('estado').innerHTML = `<b class="${e.ult && Date.now() - e.ult < (C.cada + 10) * 60000 ? 'ok' : 'mal'}">Última vuelta: ${hace(e.ult)}</b>` + (ps.length ? ps.map((p, i) => `<div style="margin-top:6px"><b>${i + 1}.</b> <small>${esc((p && p.msg) || '—')}${p && p.ult ? ' · ' + hace(p.ult) : ''}</small>${p && p.ultimoR ? tablaR(p.ultimoR) : p && p.ultimo ? tabla(p.ultimo) : ''}</div>`).join('') : `<br><small>${esc(e.msg || 'Aún no ha hecho nada')}</small>`);
}
$('probar').onclick = async () => {
  const r = await chrome.runtime.sendMessage({ q: 'probar' });
  if (!r || !r.ok) { res(esc((r && r.motivo) || 'No se ha podido leer esta pestaña'), false); return; }
  if (C.paginas.some(p => p.url === r.url)) { res('Esa página ya está en la lista.', false); return; }
  C.paginas.push({ url: r.url, cab: r.tipo === 'riego' ? 'fra' : 'gas' }); nuevas.push({ i: C.paginas.length - 1, tabId: r.tabId }); pintaPaginas();
  res(`Leído bien (${r.tipo === 'riego' ? 'riego del uCrop' : 'clima'}). Elige su cabezal arriba y pulsa «Guardar».${verLeido(r)}`, true);
};
$('guardar').onclick = async () => {
  const n = { puente: $('puente').value.trim().replace(/\/+$/, ''), token: $('token').value.trim(), cada: +$('cada').value, paginas: C.paginas };
  if (!/^https:\/\//.test(n.puente)) { res('La dirección del puente empieza por https://', false); return; }
  if (!n.token) { res('Falta la clave', false); return; }
  if (!n.paginas.length) { res('Falta la página: ve a la pestaña del clima o del riego y pulsa «Añadir la pestaña de delante»', false); return; }
  await chrome.storage.local.set({ cfg: n });
  for (const x of nuevas) { await chrome.runtime.sendMessage({ q: 'usar', i: x.i, tabId: x.tabId }); try { await chrome.tabs.update(x.tabId, { pinned: true }); } catch (e) {} }
  nuevas = []; res('Guardado. Las pestañas quedan fijadas: déjalas abiertas (puedes usar los programas en otras).', true); pinta();
};
$('ahora').onclick = async () => { res('Leyendo…', true); const r = await chrome.runtime.sendMessage({ q: 'ahora' }); res(esc((r && r.msg) || 'Sin respuesta'), r && r.ok); pinta(); };
pinta();
