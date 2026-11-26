// Puente: boletín de drenajes cada 30 min (% de cada sector, de la última lectura del uCrop). Firestore y servidor de avisos simulados.
import fs from 'node:fs'; import vm from 'node:vm';
const src = fs.readFileSync(process.argv[2], 'utf8').replace('export default {', 'globalThis.__w = {');
const llamadas = []; let avisosEstado = 200;
const ctx = vm.createContext({ console, Date, JSON, Math, URL, Response: class { constructor(b, o) { this.b = b; this.o = o; } }, TextEncoder, TextDecoder, crypto: globalThis.crypto, atob, btoa, Promise, Object, Array, Set, Map, Number, String, isFinite,
  fetch: async (url, o) => { llamadas.push({ url, body: JSON.parse(o.body) }); return { ok: avisosEstado === 200, status: avisosEstado, json: async () => ({ ok: true, enviados: JSON.parse(o.body).para.length }), text: async () => 'x' }; } });
vm.runInContext(src, ctx);
const aFS = vm.runInContext('aFS', ctx), deFS = vm.runInContext('deFS', ctx);
const cod = o => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, aFS(v)]));
let cfg, acc, lect, estado; const lee = [];
ctx.fs = async (env, m, ruta, cuerpo) => {
  if (m === 'GET' && ruta.startsWith('/abonado_config/finca')) return { fields: cod(cfg) };
  if (m === 'GET' && ruta.startsWith('/abonado_acceso/usuarios')) return { fields: cod(acc) };
  if (m === 'GET' && ruta.startsWith('/abonado_lecturas/UCR-')) { lee.push(ruta); const r = lect[ruta.split('?')[0].split('/').pop()]; if (!r) throw new Error('firestore 404 no existe'); return { fields: cod(r) }; }
  if (m === 'GET' && ruta === '/abonado_lecturas/BOLETIN-ESTADO') { if (!estado) throw new Error('firestore 404 no existe'); return { fields: cod(estado) }; }
  if (m === 'PATCH' && ruta.startsWith('/abonado_lecturas/BOLETIN-ESTADO')) { estado = { ...(estado || {}) }; for (const [k, v] of Object.entries(cuerpo.fields)) estado[k] = deFS(v); return {}; }
  throw new Error('fs inesperado ' + m + ' ' + ruta);
};
const ok = (c, m) => { if (!c) { console.log('FALLA:', m, new Error().stack.split('\n')[2]); process.exit(1); } };
const env = { PUENTE_TOKEN: 'T', AVISOS_URL: 'https://avisos.x', INTERNO_TOKEN: 'I', ADMIN_EMAIL: 'admin@x.es' };
const boletin = vm.runInContext('boletinDrenajes', ctx);
const M = (h, mi = 0) => Date.UTC(2026, 10, 22, h - 1, mi);   // 22 nov 2026, hora de Madrid (UTC+1)
const reinicia = () => {
  llamadas.length = 0; lee.length = 0; avisosEstado = 200; estado = null;
  cfg = { boletin: { on: true }, cabezales: [{ id: 'gas', nombre: 'Gasolinera' }, { id: 'pla', nombre: 'Planos' }, { id: 'fra', nombre: 'Franco' }], fincas: [{ id: 'pinta', cabezales: ['gas', 'pla'] }, { id: 'palacias', cabezales: ['fra'] }] };
  acc = { emails: ['admin@x.es', 'enc@x.es', 'trab@x.es'], info: { 'admin@x.es': { admin: true }, 'enc@x.es': { encargado: true, fincas: ['pinta'] }, 'trab@x.es': { nombre: 'Trabajador' } } };
  lect = { 'UCR-GAS_2026-11-22': { dev: 'UCR-GAS', p: [
      { t: M(11, 40), v: { dren: [{ n: 1, act: 5, dH: 10, rH: 100, drH: 12 }] } },
      { t: M(12, 28), v: { dren: [{ n: 1, act: 7, dH: 20, dU: 31, rH: 100, drH: 22.4 }, { n: 2, act: 6, dH: 18 }, { n: 3, act: 0 }] } }] },
    'UCR-PLA_2026-11-22': { dev: 'UCR-PLA', p: [{ t: M(10, 0), v: { dren: [{ n: 3, act: 4, dH: 25 }] } }] } };
};
// 1) apagado por defecto; con cfg sin «boletin» tampoco manda
reinicia(); delete cfg.boletin; let r = await boletin(env, { ahora: M(12, 30) }); ok(!r.enviado && r.motivo === 'apagado' && !llamadas.length, JSON.stringify(r));
cfg.boletin = { on: false }; r = await boletin(env, { ahora: M(12, 30) }); ok(r.motivo === 'apagado', JSON.stringify(r));
// 2) fuera de horario (8–19 por defecto)
reinicia(); r = await boletin(env, { ahora: M(7, 30) }); ok(r.motivo === 'fuera_de_hora', JSON.stringify(r)); r = await boletin(env, { ahora: M(19, 0) }); ok(r.motivo === 'fuera_de_hora', JSON.stringify(r));
// 3) a las 12:30: manda a administrador y encargado, cada uno con lo suyo; el último punto manda y el % sale de drenado/regado
r = await boletin(env, { ahora: M(12, 30) }); ok(r.enviado && r.personas === 2 && r.grupos === 2 && llamadas.length === 2, JSON.stringify(r));
const de = e => llamadas.find(l => l.body.para.includes(e)).body, A = de('admin@x.es'), E = de('enc@x.es');
console.log(A.titulo, '|', A.cuerpo, '\n' + A.cuerpoTg);
ok(A.titulo === 'Drenajes · 12:30' && A.tag === 'boletin-drenaje' && A.tab === 'ajriego', JSON.stringify(A));
ok(A.cuerpo.includes('Gasolinera D1 22 % · D2 18 % · D3 —') && A.cuerpo.includes('Planos D3 25 %'), A.cuerpo);
ok(A.cuerpoTg.includes('Gasolinera\nD1 22 % · 7 riegos · último 31 %\nD2 18 % · 6 riegos') && A.cuerpoTg.includes('Franco\nSin lectura hoy'), A.cuerpoTg);
ok(A.cuerpoTg.includes('Planos (última lectura a las 10:00)\nD3 25 %'), 'lectura rancia: ' + A.cuerpoTg);
ok(!A.cuerpoTg.includes('Gasolinera (última'), 'la reciente no avisa de rancia');
ok(!E.cuerpoTg.includes('Franco') && E.cuerpoTg.includes('Gasolinera'), 'el encargado de Pinta Santos no ve Franco');
ok(estado.dia === '2026-11-22' && estado.slot === 25, JSON.stringify(estado));
// 4) en el mismo tramo no se repite; en el siguiente (13:00) sí; en un tramo nuevo hay que volver a leer
llamadas.length = 0; r = await boletin(env, { ahora: M(12, 40) }); ok(r.motivo === 'ya_enviado' && !llamadas.length, JSON.stringify(r));
lee.length = 0; r = await boletin(env, { ahora: M(13, 5) }); ok(r.enviado && estado.slot === 26 && lee.length === 3, JSON.stringify(r) + estado.slot);
// 5) «cada» 60 min: 13:05 ya enviado, 13:35 no repite, 14:00 sí
reinicia(); cfg.boletin = { on: true, cada: 60 }; await boletin(env, { ahora: M(13, 5) }); llamadas.length = 0;
r = await boletin(env, { ahora: M(13, 35) }); ok(r.motivo === 'ya_enviado', 'cada 60: ' + JSON.stringify(r)); r = await boletin(env, { ahora: M(14, 0) }); ok(r.enviado, 'cada 60 siguiente');
// 6) horario propio y valor raro de «cada» (cae a 30)
reinicia(); cfg.boletin = { on: true, cada: 7, desde: 6, hasta: 10 }; r = await boletin(env, { ahora: M(11, 0) }); ok(r.motivo === 'fuera_de_hora', 'hasta 10'); r = await boletin(env, { ahora: M(9, 40) }); ok(r.enviado && estado.slot === 19, 'cada 7 → 30: ' + JSON.stringify(estado));
// 7) sin lecturas de hoy (de noche o lector parado): no manda y no gasta el tramo, así al volver el lector sale en 5 min
reinicia(); lect = {}; r = await boletin(env, { ahora: M(12, 30) }); ok(!r.enviado && r.motivo === 'sin_lecturas' && !llamadas.length && estado === null, JSON.stringify(r));
lect = { 'UCR-FRA_2026-11-22': { p: [{ t: M(12, 33), v: { dren: [{ n: 1, act: 3, dH: 15 }] } }] } }; r = await boletin(env, { ahora: M(12, 35) }); ok(r.enviado && r.personas === 1 && llamadas[0].body.para[0] === 'admin@x.es', 'vuelve el lector: ' + JSON.stringify(r));
// 8) si el servidor de avisos falla: no se da el tramo por hecho (se reintenta); si va bien, sí
reinicia(); avisosEstado = 500; r = await boletin(env, { ahora: M(12, 30) }); ok(!r.enviado && estado === null, JSON.stringify(r)); avisosEstado = 200; r = await boletin(env, { ahora: M(12, 35) }); ok(r.enviado && estado.slot === 25, 'reintento');
// 9) prueba a mano por /boletin: pide clave, ignora hora y apagado, solo al administrador y no gasta el tramo
reinicia(); cfg.boletin = { on: false }; lect = { ['UCR-GAS_' + vm.runInContext('hoyMadrid', ctx)(Date.now())]: { p: [{ t: Date.now(), v: { dren: [{ n: 1, act: 2, dH: 11 }] } }] } };   // la ruta usa el reloj real
const pide = async (tk, b = {}) => { const x = await ctx.__w.fetch({ method: 'POST', url: 'https://puente.x/boletin', headers: { get: () => 'Bearer ' + tk }, json: async () => b }, env); return { s: (x.o || {}).status || 200, j: JSON.parse(x.b) }; };
ok((await pide('mala')).s === 401, 'clave'); const q = await pide('T'); ok(q.j.enviado && q.j.personas === 1 && llamadas.length === 1 && llamadas[0].body.para[0] === 'admin@x.es' && estado === null, JSON.stringify(q.j));
// 10) el cron lo llama (scheduled) sin romper
const w = ctx.__w; const lanzado = []; await w.scheduled({}, env, { waitUntil: p => lanzado.push(p) }).catch(() => {}); await Promise.allSettled(lanzado);
console.log('BOLETIN DRENAJES OK');
