// Lector con un «chrome» de mentira: dos páginas (clima y riego), la configuración vieja se pasa sola, y manda cada una a su ruta.
import fs from 'node:fs'; import vm from 'node:vm';
const dir = process.argv[2]; const src = fs.readFileSync(dir + '/background.js', 'utf8');
const store = { cfg: { puente: 'https://puente.x', token: 'K', cab: 'gas', cada: 15, pagina: 'https://clima/estados' }, tabId: 11 };
const tabs = { 11: { id: 11, url: 'https://clima/estados', status: 'complete' } }; let nextId = 50; const enviados = []; const listeners = {};
const chrome = {
  storage: { local: { get: async k => { const ks = Array.isArray(k) ? k : [k]; const o = {}; for (const x of ks) if (x in store) o[x] = JSON.parse(JSON.stringify(store[x])); return o; }, set: async o => { Object.assign(store, JSON.parse(JSON.stringify(o))); } } },
  action: { setBadgeText() {}, setBadgeBackgroundColor() {} },
  alarms: { create() {}, onAlarm: { addListener() {} } },
  runtime: { onInstalled: { addListener() {} }, onStartup: { addListener() {} }, onMessage: { addListener(f) { listeners.msg = f; } } },
  tabs: { get: async id => { if (!tabs[id]) throw new Error('no'); return tabs[id]; }, create: async o => { const t = { id: nextId++, url: o.url, status: 'complete', pinned: o.pinned }; tabs[t.id] = t; return t; }, reload: async () => {}, update: async () => {}, query: async () => [tabs[11]] },
  scripting: { executeScript: async ({ target, func }) => { const t = tabs[target.tabId], riego = /riego/.test(t.url);
    if (func.name === 'leerPagina') return [{ result: riego ? { ok: false, motivo: 'no comp' } : { ok: true, comp: [{ n: 1, ta: 25, hr: 70, vent: [] }], firma: 'c' } }];
    return [{ result: riego ? { ok: true, tipo: 'riego', dren: [{ n: 1, act: 3, dH: 9, corte: 245 }], ext: { racc: 563 }, firma: 'r' } : { ok: false, motivo: 'no dren' } }]; } },
};
const fetch = async (url, o) => { enviados.push({ url, body: JSON.parse(o.body), auth: o.headers.authorization }); return { status: 200, ok: true, json: async () => ({ ok: true }) }; };
const ctx = vm.createContext({ chrome, fetch, console, Date, JSON, Math, setTimeout, NodeFilter: {}, document: {} });
vm.runInContext(src, ctx);
const ok = (c, m) => { if (!c) { console.log('FALLA:', m); process.exit(1); } };
// 1) configuración vieja: una página del clima → sigue mandando el clima
let r = await ctx.ciclo(true); ok(r.ok, 'clima solo: ' + r.msg); ok(enviados.length === 1 && enviados[0].url === 'https://puente.x/clima' && enviados[0].body.cab === 'gas' && enviados[0].body.comp.length === 1, 'manda el clima a /clima');
// 2) se añade la página de riego del uCrop (Franco) desde el panel
tabs[21] = { id: 21, url: 'https://app.ucrop.net/farming/x/riego', status: 'complete' };
store.cfg = { puente: 'https://puente.x', token: 'K', cada: 15, paginas: [{ url: 'https://clima/estados', cab: 'gas' }, { url: 'https://app.ucrop.net/farming/x/riego', cab: 'fra' }] };
await new Promise(res => listeners.msg({ q: 'usar', i: 1, tabId: 21 }, null, res));
enviados.length = 0; r = await ctx.ciclo(true); ok(r.ok, 'las dos: ' + r.msg);
ok(enviados.length === 2, 'dos envíos'); ok(enviados[0].url.endsWith('/clima') && enviados[0].body.cab === 'gas', 'clima de la gasolinera');
ok(enviados[1].url.endsWith('/riego') && enviados[1].body.cab === 'fra' && enviados[1].body.dren[0].corte === 245 && enviados[1].body.ext.racc === 563 && enviados[1].auth === 'Bearer K', 'riego de Franco');
ok(store.est.p.length === 2 && /2 ?:|1 compartimentos|1 drenajes/.test(store.est.msg), 'estado de cada página: ' + store.est.msg);
// 3) si no toca, no lee
enviados.length = 0; r = await ctx.ciclo(false); ok(enviados.length === 0, 'aún no toca');
// 4) si una pestaña se cierra, la abre otra vez fijada y en la vuelta siguiente la lee
delete tabs[21]; enviados.length = 0; r = await ctx.ciclo(true); ok(!r.ok && enviados.length === 1, 'abre la pestaña cerrada'); ok(Object.values(tabs).some(t => t.pinned && /riego/.test(t.url)), 'pestaña fijada nueva');
enviados.length = 0; r = await ctx.ciclo(true); ok(r.ok && enviados.length === 2, 'vuelve a leer las dos');
// 5) el riego se mira cada minuto: si empieza un riego se manda en el momento con «empieza»; si no, no se manda hasta que toque
let est = { regando: true, prog: 'SE01FRANCO', act: 2, t: '00:01:00', tt: '00:08:00' };
const exe = chrome.scripting.executeScript; chrome.scripting.executeScript = async o => { const r = await exe(o); const x = r[0].result; if (x && x.tipo === 'riego') x.estado = { ...est }; return r; };
enviados.length = 0; r = await ctx.ciclo(true); ok(r.ok && enviados.length === 2, 'vuelta completa');
const r2 = enviados.find(x => x.url.endsWith('/riego')); ok(r2.body.estado.prog === 'SE01FRANCO' && r2.body.empieza === true, 'el primer riego visto se avisa');
enviados.length = 0; est = { ...est, t: '00:03:00' }; r = await ctx.ciclo(false); ok(enviados.length === 0, 'el mismo riego sigue: no se manda nada: ' + r.msg);
enviados.length = 0; est = { regando: true, prog: 'SE02FRANCO', act: 2, t: '00:00:20', tt: '00:08:00' }; r = await ctx.ciclo(false);
ok(enviados.length === 1 && enviados[0].url.endsWith('/riego') && enviados[0].body.empieza === true && enviados[0].body.estado.prog === 'SE02FRANCO', 'empieza otro sector: se avisa al momento y sin leer el clima');
enviados.length = 0; est = { regando: false, prog: null, act: null }; r = await ctx.ciclo(false); ok(enviados.length === 0, 'para: no se avisa');
enviados.length = 0; est = { regando: true, prog: 'SE02FRANCO', act: 3, t: '00:00:10', tt: '00:08:00' }; r = await ctx.ciclo(false); ok(enviados.length === 1 && enviados[0].body.empieza, 'el mismo sector vuelve a regar (otra activación): se avisa');
console.log('LECTOR OK');
