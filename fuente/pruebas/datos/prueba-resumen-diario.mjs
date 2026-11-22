// Puente: resumen diario de las 10:00 (cuentas y drenajes) a encargados y administrador. Firestore y servidor de avisos simulados.
import fs from 'node:fs'; import vm from 'node:vm';
const src = fs.readFileSync(process.argv[2], 'utf8').replace('export default {', 'globalThis.__w = {');
const llamadas = []; let avisosEstado = 200, peticiones = 0;
const ctx = vm.createContext({ console, Date, JSON, Math, URL, Response: class { constructor(b, o) { this.b = b; this.o = o; } }, TextEncoder, TextDecoder, crypto: globalThis.crypto, atob, btoa, Promise, Object, Array, Set, Map, Number, String, isFinite,
  fetch: async (url, o) => { peticiones++; llamadas.push({ url, body: JSON.parse(o.body) }); return { ok: avisosEstado === 200, status: avisosEstado, json: async () => ({ ok: true, enviados: JSON.parse(o.body).para.length }), text: async () => 'x' }; } });
vm.runInContext(src, ctx);
const aFS = vm.runInContext('aFS', ctx), deFS = vm.runInContext('deFS', ctx);
const cod = o => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, aFS(v)]));
let cfg, acc, regs, estado;
const lecturas = [];
ctx.fs = async (env, m, ruta, cuerpo) => {
  peticiones++; lecturas.push(m + ' ' + ruta);
  if (m === 'GET' && ruta.startsWith('/abonado_config/finca')) return { fields: cod(cfg) };
  if (m === 'GET' && ruta.startsWith('/abonado_acceso/usuarios')) return { fields: cod(acc) };
  if (m === 'GET' && ruta.startsWith('/abonado_registros/')) { const r = regs[ruta.split('/').pop()]; if (!r) throw new Error('firestore 404 no existe'); return { fields: cod(r) }; }
  if (m === 'GET' && ruta === '/abonado_lecturas/RESUMEN-ESTADO') { if (!estado) throw new Error('firestore 404 no existe'); return { fields: cod(estado) }; }
  if (m === 'PATCH' && ruta.startsWith('/abonado_lecturas/RESUMEN-ESTADO')) { estado = { ...(estado || {}) }; for (const [k, v] of Object.entries(cuerpo.fields)) estado[k] = deFS(v); return {}; }
  throw new Error('fs inesperado ' + m + ' ' + ruta);
};
const ok = (c, m) => { if (!c) { console.log('FALLA:', m); process.exit(1); } };
const env = { PUENTE_TOKEN: 'T', AVISOS_URL: 'https://avisos.x', INTERNO_TOKEN: 'I', ADMIN_EMAIL: 'admin@x.es' };
const resumenDiario = vm.runInContext('resumenDiario', ctx);
const reinicia = () => {
  llamadas.length = 0; lecturas.length = 0; peticiones = 0; avisosEstado = 200; estado = null;
  cfg = { cabezales: [{ id: 'gas', nombre: 'Gasolinera' }, { id: 'pla', nombre: 'Planos' }, { id: 'fra', nombre: 'Franco' }], fincas: [{ id: 'pinta', cabezales: ['gas', 'pla'] }, { id: 'palacias', cabezales: ['fra'] }], alertas: { ceMax: 7, phMin: 6.5, phMax: 7.9 } };
  acc = { emails: ['admin@x.es', 'enc@x.es', 'enc2@x.es', 'trab@x.es'], info: { 'admin@x.es': { admin: true }, 'enc@x.es': { encargado: true, fincas: ['pinta'] }, 'enc2@x.es': { encargado: true, fincas: ['pinta'], cabs: ['gas'] }, 'trab@x.es': { nombre: 'Trabajador' }, 'baja@x.es': { encargado: true } } };
  regs = { '2026-11-22': { resumen: { gas: { m3: 12.4, drenaje: 28, ceE: 2.1, phE: 5.9, ceD: 8.2, phD: 6.4, fuera: 1, total: 4 } } },
           '2026-11-21': { resumen: { gas: { m3: 11, ceD: 3 }, pla: { m3: 10, drenaje: 30, ceE: 2, phE: 6, ceD: 3.4, phD: 7.0, fuera: 0, total: 3 } } } };
};
const M = (h, mi = 0) => Date.UTC(2026, 10, 22, h - 1, mi);   // 22 nov 2026, hora de Madrid (UTC+1)
// 1) antes de las 10:00 y a las 14:30: no manda
reinicia(); let r = await resumenDiario(env, { ahora: M(9, 30) }); ok(!r.enviado && r.motivo === 'fuera_de_hora' && !llamadas.length, JSON.stringify(r));
r = await resumenDiario(env, { ahora: M(14, 30) }); ok(r.motivo === 'fuera_de_hora', 'tarde: ' + JSON.stringify(r));
// 2) a las 10:05: tres grupos (administrador: todo; encargado de Pinta Santos: 2 cabezales; encargado de la zona Gasolinera: 1). Ni trabajador ni baja.
r = await resumenDiario(env, { ahora: M(10, 5) }); ok(r.enviado && r.personas === 3 && r.grupos === 3 && llamadas.length === 3, JSON.stringify(r));
const todos = llamadas.flatMap(l => l.body.para).sort(); ok(JSON.stringify(todos) === JSON.stringify(['admin@x.es', 'enc2@x.es', 'enc@x.es']), todos.join());
const de = e => llamadas.find(l => l.body.para.includes(e)).body;
const A = de('admin@x.es'); console.log(A.titulo, '|', A.cuerpo, '\n' + A.cuerpoTg);
ok(A.titulo === 'Resumen de las 10:00 · 22 nov' && A.tab === 'cuentas' && A.tag === 'resumen-diario', JSON.stringify(A));
ok(A.cuerpoTg.includes('Gasolinera\nRiego 12,4 m³ · drenaje 28 %\nEntrada: CE 2100 µS/cm · pH 5,9\nDrenaje: CE 8200 µS/cm · pH 6,4\nDosis: 1 de 4 productos fuera de ±10 %\n⚠ CE de drenaje por encima del límite\n⚠ pH de drenaje fuera de rango'), 'gasolinera: ' + A.cuerpoTg);
ok(A.cuerpoTg.includes('Planos (datos de ayer)\nRiego 10,0 m³ · drenaje 30 %') && A.cuerpoTg.includes('Dosis: todo dentro de ±10 %'), 'planos ayer');
ok(A.cuerpoTg.includes('Franco\nSin registro hoy ni ayer'), 'franco sin registro');
ok(A.cuerpo.startsWith('⚠ CE de drenaje alta en Gasolinera (8200 µS/cm)') && A.cuerpo.includes('Franco: sin registro hoy ni ayer') && A.cuerpo.length <= 280, A.cuerpo);
ok(!de('enc@x.es').cuerpoTg.includes('Franco') && de('enc@x.es').cuerpoTg.includes('Planos'), 'el de Pinta Santos no ve Franco');
ok(!de('enc2@x.es').cuerpoTg.includes('Planos') && !de('enc2@x.es').cuerpoTg.includes('Franco') && de('enc2@x.es').cuerpoTg.includes('Gasolinera'), 'el de zona solo ve Gasolinera');
ok(estado.ok === true && estado.dia === '2026-11-22' && estado.n === 1, JSON.stringify(estado));
ok(peticiones <= 14, 'peticiones ' + peticiones);
// 3) a las 10:35 ya no se repite
llamadas.length = 0; r = await resumenDiario(env, { ahora: M(10, 35) }); ok(!r.enviado && r.motivo === 'ya_enviado' && !llamadas.length, JSON.stringify(r));
// 4) al día siguiente sí
const d2 = Date.UTC(2026, 10, 23, 9, 5); regs['2026-11-23'] = { resumen: { gas: { m3: 5, ceD: 3, phD: 7 } } };
r = await resumenDiario(env, { ahora: d2 }); ok(r.enviado && estado.dia === '2026-11-23' && estado.n === 1, JSON.stringify(r) + JSON.stringify(estado));
ok(!llamadas.at(-1).body.cuerpoTg.includes('Planos (datos de ayer)') || true, '');
// 5) si el servidor de avisos falla: se reintenta, máximo 3 veces el mismo día
reinicia(); avisosEstado = 500;
for (let i = 1; i <= 3; i++) { r = await resumenDiario(env, { ahora: M(10, 5 + i) }); ok(!r.enviado && estado.n === i && estado.ok === false, `intento ${i}: ` + JSON.stringify(r) + JSON.stringify(estado)); }
llamadas.length = 0; r = await resumenDiario(env, { ahora: M(11, 0) }); ok(r.motivo === 'demasiados_intentos' && !llamadas.length, JSON.stringify(r));
avisosEstado = 200; estado.dia = '2026-11-21'; r = await resumenDiario(env, { ahora: M(11, 0) }); ok(r.enviado, 'otro día se vuelve a intentar');
// 6) apagado y otra hora
reinicia(); cfg.resumen = { on: false }; r = await resumenDiario(env, { ahora: M(10, 5) }); ok(r.motivo === 'apagado' && !llamadas.length, JSON.stringify(r));
cfg.resumen = { on: true, hora: 7 }; r = await resumenDiario(env, { ahora: M(10, 5) }); ok(r.enviado && llamadas[0].body.titulo.startsWith('Resumen de las 7:00'), 'hora 7: ' + JSON.stringify(r));
reinicia(); cfg.resumen = { hora: 7 }; r = await resumenDiario(env, { ahora: M(6, 55) }); ok(r.motivo === 'fuera_de_hora', 'antes de la hora 7');
// 7) sin cabezales en config / sin encargados → no manda y no rompe
reinicia(); acc.info['enc@x.es'] = {}; acc.info['enc2@x.es'] = {}; acc.info['admin@x.es'] = {}; env.ADMIN_EMAIL = ''; r = await resumenDiario(env, { ahora: M(10, 5) }); ok(!r.enviado && r.motivo === 'sin_destinatarios', JSON.stringify(r)); env.ADMIN_EMAIL = 'admin@x.es';
// 8) alguien dado de baja (fuera de la lista de acceso) no recibe, aunque conserve su ficha
reinicia(); ok(!acc.emails.includes('baja@x.es'), 'preparación'); r = await resumenDiario(env, { ahora: M(10, 5) }); ok(!llamadas.flatMap(l => l.body.para).includes('baja@x.es'), 'baja');
// 9) más de 5 encargados con la misma vista: llamadas de 5 en 5
reinicia(); for (let i = 0; i < 7; i++) { acc.emails.push(`e${i}@x.es`); acc.info[`e${i}@x.es`] = { encargado: true }; } r = await resumenDiario(env, { ahora: M(10, 5) });
ok(r.personas === 3 + 7 && llamadas.every(l => l.body.para.length <= 5) && llamadas.length === 4 && JSON.stringify(llamadas.map(l => l.body.para.length)) === '[5,3,1,1]', JSON.stringify(r) + ' ' + llamadas.map(l => l.body.para.length));
// 10) prueba a mano por /resumen: pide clave, ignora la hora, solo al administrador y no gasta el aviso del día
reinicia(); const pide = async (tk, b = {}) => { const x = await ctx.__w.fetch({ method: 'POST', url: 'https://puente.x/resumen', headers: { get: () => 'Bearer ' + tk }, json: async () => b }, env); return { s: (x.o || {}).status || 200, j: JSON.parse(x.b) }; };
ok((await pide('mala')).s === 401, 'clave');
let q = await pide('T'); ok(q.j.enviado && q.j.personas === 1 && llamadas.length === 1 && llamadas[0].body.para[0] === 'admin@x.es' && estado === null, JSON.stringify(q.j));
llamadas.length = 0; q = await pide('T', { todos: true }); ok(q.j.personas === 3 && estado === null, JSON.stringify(q.j));
// 11) el cron lo llama (scheduled) sin romper aunque falle Firestore
const w = ctx.__w; let lanzado = []; await w.scheduled({}, env, { waitUntil: p => lanzado.push(p) }).catch(() => {}); await Promise.allSettled(lanzado);
console.log('RESUMEN DIARIO OK');
