// Simula el lector (background.js) con un chrome de mentira y comprueba las salvaguardas del cambio real (modo «cambio»).
import fs from 'node:fs'; import vm from 'node:vm';
const src = fs.readFileSync('lector-clima/background.js', 'utf8').replace('sondeo: 500, asentar: 1500', 'sondeo: 2, asentar: 2');
function montar(guarda, mira, atasco = 0) {
  const ls = [], llamadas = [], posts = []; let url = 'about:blank', sondeos = 0;
  const chrome = { storage: { local: { get: async k => ({ uTab: 5 }), set: async () => {} } }, alarms: { create() {}, onAlarm: { addListener() {} } },
    runtime: { onInstalled: { addListener() {} }, onStartup: { addListener() {} }, onMessage: { addListener() {} } }, action: { setBadgeText() {}, setBadgeBackgroundColor() {} },
    tabs: { get: async id => { if (url.startsWith('https://app.ucrop.net/') && atasco > 0 && sondeos++ < atasco) return { id, status: 'complete', url: 'chrome-extension://abc/' }; return { id, status: 'complete', url }; }, create: async () => ({ id: 5 }), update: async (id, o) => { llamadas.push(['nav', o.url]); url = o.url; sondeos = 0; setTimeout(() => ls.forEach(h => h(id, { status: 'complete' })), 2); },
      onUpdated: { addListener: h => ls.push(h), removeListener: h => { const i = ls.indexOf(h); if (i >= 0) ls.splice(i, 1); } } },
    scripting: { executeScript: async ({ func, args, world }) => { llamadas.push([func.name, world || 'aislado', args]);
      if (func.name === 'ucropGuarda') return [{ result: guarda(args) }]; if (func.name === 'ucropMira') return [{ result: mira(args) }]; throw new Error('func ' + func.name); } } };
  const fetchStub = async (url, o) => { posts.push(JSON.parse(o.body)); return { ok: true, status: 200, json: async () => ({ ok: true }) }; };
  const ctx = vm.createContext({ chrome, fetch: fetchStub, console, setTimeout, Date, JSON, Math, URL, Promise, Number, isFinite, parseFloat, String, Array });
  vm.runInContext(src + '\n;globalThis.__o = ordenesUcrop;', ctx);
  return { o: ctx.__o, llamadas, posts };
}
const C = { puente: 'https://p.example', token: 'T' }, P = { url: 'https://app.ucrop.net/farming/210525125621-064/irrigation', cab: 'fra' };
const ahora = (min = 0) => new Date(Date.now() - min * 6e4).toISOString();
const ord = (x = {}) => ({ id: 'c1', campo: 'control', valor: 200, idx: { prog: 0, dren: 0 }, nombre: 'Drenaje 1', modo: 'cambio', confirmado: true, valorAntes: 150, ts: ahora(1), ...x });
const okG = a => ({ ok: true, coincide: true, titulo: a[1], valor: a[3], estado: 'pulsado', leido: a[2] });
const okM = v => a => ({ ok: true, coincide: true, titulo: a[1], valor: v });
let fallos = 0; const ver = (c, m) => { if (!c) { fallos++; console.log('FALLO:', m); } };
const guardas = L => L.filter(l => l[0] === 'ucropGuarda').length;

{ const t = montar(okG, okM(200)); const r = await t.o(C, P, [ord()]); const h = t.posts[0].hechos[0];
  ver(h.estado === 'hecho' && h.valor === 200 && /guardado: de 150 a 200/.test(h.motivo), 'caso bueno: ' + JSON.stringify(h)); ver(guardas(t.llamadas) === 1, 'una sola escritura');
  ver(t.llamadas.find(l => l[0] === 'ucropGuarda')[1] === 'MAIN', 'corre en el mundo de la página'); ver(/1 bien, 0 con fallo/.test(r), r); }
for (const [nombre, o] of [['sin confirmar', ord({ confirmado: false })], ['sin confirmado', ord({ confirmado: undefined })], ['sin valorAntes', ord({ valorAntes: null })], ['caducada', ord({ ts: ahora(45) })], ['sin fecha', ord({ ts: undefined })],
  ['fuera de límites', ord({ valor: 900 })], ['fuera de límites ce', ord({ campo: 'ce', valor: 9, idx: { prog: 0, dren: 0 }, nombre: 'SE01FRANCO', valorAntes: 1.87 })], ['bajo mínimo', ord({ valor: 5 })], ['sin nombre', ord({ nombre: '' })], ['campo raro', ord({ campo: 'x' })], ['valor texto', ord({ valor: '200' })]]) {
  const t = montar(okG, okM(200)); await t.o(C, P, [o]); const h = t.posts[0].hechos[0];
  ver(h.estado === 'fallo' && /no he guardado nada/.test(h.motivo), nombre + ': ' + JSON.stringify(h)); ver(guardas(t.llamadas) === 0, nombre + ': no debe tocar la pantalla'); }
{ const t = montar(a => ({ ok: true, coincide: true, titulo: 'Drenaje 1', valor: 160, estado: 'distinto' }), okM(160)); await t.o(C, P, [ord()]); const h = t.posts[0].hechos[0];
  ver(h.estado === 'fallo' && /lo cambió alguien/.test(h.motivo), 'valor distinto: ' + h.motivo); ver(!t.llamadas.some(l => l[0] === 'ucropMira'), 'no recarga si no pulsó'); }
{ const t = montar(a => ({ ok: true, coincide: false, titulo: 'Drenaje 2' }), okM(150)); await t.o(C, P, [ord()]); ver(/no Drenaje 1/.test(t.posts[0].hechos[0].motivo), 'pantalla equivocada'); }
{ const t = montar(a => ({ ok: true, coincide: true, titulo: 'Drenaje 1', valor: 200, estado: 'yaestaba' }), okM(200)); await t.o(C, P, [ord()]); const h = t.posts[0].hechos[0]; ver(h.estado === 'hecho' && /ya estaba/.test(h.motivo), 'ya estaba'); ver(!t.llamadas.some(l => l[0] === 'ucropMira'), 'ya estaba: sin recarga'); }
for (const est of ['noactivo', 'boton']) { const t = montar(a => ({ ok: true, coincide: true, titulo: 'Drenaje 1', valor: 150, estado: est, leido: 200, boton: 'Guardar programa' }), okM(150)); await t.o(C, P, [ord()]); const h = t.posts[0].hechos[0]; ver(h.estado === 'fallo', est + ': ' + h.motivo); }
{ const t = montar(a => ({ ok: true, coincide: true, titulo: 'Drenaje 1', valor: 150, estado: 'aviso', dialogo: 'otro aviso', botones: 'si | no' }), okM(150)); await t.o(C, P, [ord()]); const h = t.posts[0].hechos[0]; ver(h.estado === 'fallo' && /aviso que no reconozco/.test(h.motivo) && !t.llamadas.some(l => l[0] === 'ucropMira'), 'aviso desconocido: ' + h.motivo); }
{ const t = montar(a => ({ ok: true, coincide: true, titulo: 'Drenaje 1', valor: 150, estado: 'pulsado', leido: 200, confirmado: 'aceptar' }), okM(200)); await t.o(C, P, [ord()]); const h = t.posts[0].hechos[0]; ver(h.estado === 'hecho' && /se aceptó/.test(h.motivo), 'con aviso aceptado: ' + h.motivo); }
{ const t = montar(okG, okM(150)); await t.o(C, P, [ord()]); const h = t.posts[0].hechos[0]; ver(h.estado === 'fallo' && /OJO: pulsé Guardar pero al recargar pone 150/.test(h.motivo), 'no quedó guardado: ' + h.motivo); }
{ const t = montar(okG, () => null); await t.o(C, P, [ord()]); const h = t.posts[0].hechos[0]; ver(h.estado === 'fallo' && /no pude comprobar/.test(h.motivo), 'sin poder comprobar: ' + h.motivo); }
{ const t = montar(() => { throw new Error('boom'); }, okM(150)); await t.o(C, P, [ord()]); ver(t.posts[0].hechos[0].estado === 'fallo', 'error al escribir'); }
{ const t = montar(okG, okM(200)); await t.o(C, P, [1, 2, 3, 4, 5].map(i => ord({ id: 'c' + i }))); ver(guardas(t.llamadas) === 3 && t.posts[0].hechos.length === 3, 'máximo 3 cambios por vuelta: ' + guardas(t.llamadas)); }
{ const t = montar(okG, okM(200)); await t.o(C, P, [ord({ modo: 'borrar' })]); ver(t.posts[0].hechos[0].estado === 'fallo' && guardas(t.llamadas) === 0, 'modo raro'); }
{ const t = montar(okG, okM(150)); await t.o(C, P, [ord({ modo: 'prueba' })]); ver(guardas(t.llamadas) === 0 && t.posts[0].hechos[0].estado === 'probado', 'una prueba nunca guarda'); }
{ const t = montar(okG, okM(150)); await t.o(C, P, [ord({ modo: 'ensayo', valor: 99 })]); ver(guardas(t.llamadas) === 0, 'un ensayo nunca usa la función de guardar'); }
{ const t = montar(okG, okM(200), 5); await t.o(C, P, [ord()]); ver(t.posts[0].hechos[0].estado === 'hecho' && guardas(t.llamadas) === 1, 'espera a que la pestaña esté de verdad en el uCrop: ' + JSON.stringify(t.posts[0].hechos[0])); }
{ const t = montar(okG, okM(200), 1e9); await t.o(C, P, [ord()]); const h = t.posts[0].hechos[0]; ver(h.estado === 'fallo' && /no pude abrir la pantalla/.test(h.motivo) && guardas(t.llamadas) === 0, 'pestaña atascada en otra página: ' + JSON.stringify(h)); }
{ const t = montar(okG, okM(150), 1e9); await t.o(C, P, [ord({ modo: 'ensayo', valor: 99 })]); const h = t.posts[0].hechos[0]; ver(h.estado === 'fallo' && /no pude abrir la pantalla/.test(h.motivo) && !t.llamadas.some(l => l[0] === 'ucropMira'), 'ensayo con pestaña atascada no lee nada'); }
const ordH = (x = {}) => ord({ campo: 'horario', valor: 1, valorAntes: 0, nombre: 'SE01FRANCO', ...x });
{ const t = montar(okG, okM(1)); await t.o(C, P, [ordH()]); const h = t.posts[0].hechos[0]; ver(h.estado === 'hecho' && h.valor === 1, 'poner horario: ' + JSON.stringify(h));
  ver(t.llamadas.some(l => l[0] === 'nav' && /\/program\/0$/.test(l[1])), 'el horario va a la pantalla del programa: ' + JSON.stringify(t.llamadas.filter(l => l[0] === 'nav'))); }
for (const [nombre, o] of [['horario 2', ordH({ valor: 2 })], ['horario 0.5', ordH({ valor: 0.5 })], ['horario sin confirmar', ordH({ confirmado: false })], ['horario caducado', ordH({ ts: ahora(60) })]]) {
  const t = montar(okG, okM(1)); await t.o(C, P, [o]); ver(t.posts[0].hechos[0].estado === 'fallo' && guardas(t.llamadas) === 0, nombre + ': ' + t.posts[0].hechos[0].motivo); }
{ const t = montar(okG, okM(0)); await t.o(C, P, [ordH({ modo: 'ensayo', valor: 1 })]); const h = t.posts[0].hechos[0]; ver(h.estado === 'fallo' && /no sirve para interruptores ni días/.test(h.motivo) && !t.llamadas.some(l => l[0] === 'ucropMira'), 'el ensayo no toca el horario'); }
{ const t = montar(okG, a => ({ ok: true, coincide: true, titulo: a[1], valor: 1, snap: { schedule: 1, week_days: 'WEEK' } })); await t.o(C, P, [ordH({ modo: 'prueba', valor: null })]); const h = t.posts[0].hechos[0]; ver(h.estado === 'probado' && h.snap && h.snap.schedule === 1, 'la prueba manda el snapshot: ' + JSON.stringify(h)); }
{ const t = montar(okG, a => ({ ok: true, coincide: true, titulo: a[1], valor: 1, snap: { schedule: 1 } })); await t.o(C, P, [ordH()]); ver(t.posts[0].hechos[0].snap && t.posts[0].hechos[0].snap.schedule === 1, 'el cambio manda el snapshot de después'); }
// DÍAS DE LA SEMANA: máscara 1..127, pantalla del programa, mensajes con letras, nunca 0 días
const ordD = (x = {}) => ord({ campo: 'dias', valor: 125, valorAntes: 127, nombre: 'SE01FRANCO', ...x });
{ const t = montar(a => ({ ok: true, coincide: true, titulo: a[1], valor: a[3], estado: 'pulsado', leido: a[2], info: 'los cambios se han guardado y estan pendientes' }), a => ({ ok: true, coincide: true, titulo: a[1], valor: 125, snap: { dias: 'L-XJVSD' } }));
  await t.o(C, P, [ordD()]); const h = t.posts[0].hechos[0]; ver(h.estado === 'hecho' && h.valor === 125 && /guardado: de LMXJVSD a L-XJVSD/.test(h.motivo) && /pendiente de que lo acepte el equipo/.test(h.motivo) && h.snap.dias === 'L-XJVSD', 'cambiar días: ' + JSON.stringify(h));
  ver(t.llamadas.some(l => l[0] === 'nav' && /\/program\/0$/.test(l[1])), 'los días van a la pantalla del programa'); }
for (const [nombre, o] of [['días 0', ordD({ valor: 0 })], ['días 128', ordD({ valor: 128 })], ['días 2.5', ordD({ valor: 2.5 })], ['días sin confirmar', ordD({ confirmado: false })], ['días caducado', ordD({ ts: ahora(60) })], ['días antes raro', ordD({ valorAntes: 1.5 })]]) {
  const t = montar(okG, okM(127)); await t.o(C, P, [o]); ver(t.posts[0].hechos[0].estado === 'fallo' && guardas(t.llamadas) === 0, nombre + ': ' + t.posts[0].hechos[0].motivo); }
{ const t = montar(okG, okM(127)); await t.o(C, P, [ordD({ modo: 'ensayo' })]); const h = t.posts[0].hechos[0]; ver(h.estado === 'fallo' && !t.llamadas.some(l => l[0] === 'ucropMira'), 'el ensayo no toca los días'); }
{ const t = montar(a => ({ ok: true, coincide: true, titulo: a[1], valor: 127, estado: 'distinto' }), okM(127)); await t.o(C, P, [ordD({ valorAntes: 125, valor: 127 })]); ver(/lo cambió alguien/.test(t.posts[0].hechos[0].motivo) && /L-XJVSD/.test(t.posts[0].hechos[0].motivo), 'días distintos: ' + t.posts[0].hechos[0].motivo); }
console.log(fallos ? 'FALLOS ' + fallos : 'OK'); process.exit(fallos ? 1 : 0);
