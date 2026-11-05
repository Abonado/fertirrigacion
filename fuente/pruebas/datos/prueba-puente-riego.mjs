// Puente: /riego guarda el estado (qué riega) y, si «empieza», avisa al móvil por el servidor de avisos a quien diga la app.
import fs from 'node:fs'; import vm from 'node:vm';
const src = fs.readFileSync(process.argv[2], 'utf8').replace('export default {', 'globalThis.__w = {');
const llamadas = [], escrito = []; let cfg = null;
const ctx = vm.createContext({ console, Date, JSON, Math, URL, Response: class { constructor(b, o) { this.b = b; this.o = o; } }, TextEncoder, TextDecoder, crypto: globalThis.crypto, atob, btoa,
  fetch: async (url, o) => { llamadas.push({ url, body: JSON.parse(o.body) }); return { ok: true, status: 200, json: async () => ({ ok: true }) }; } });
vm.runInContext(src, ctx);
ctx.fs = async (env, m, ruta, cuerpo) => { if (m === 'GET' && ruta.startsWith('/abonado_config/finca')) { if (!cfg) throw new Error('404'); return { fields: { avisoRiego: cfg } }; } escrito.push({ m, ruta, cuerpo }); return {}; };
const ok = (c, m) => { if (!c) { console.log('FALLA:', m); process.exit(1); } };
const env = { AVISOS_URL: 'https://avisos.x', INTERNO_TOKEN: 'I', ADMIN_EMAIL: 'admin@x.es' };
const base = { cab: 'fra', dren: [{ n: 1, act: 3, dH: 9 }], ext: { racc: 563 }, estado: { prog: 'SE04ENCAÑE', fase: 'Regando', valv: 'Válvula 4', act: 3, t: '00:00:20', tt: '00:08:00', regando: true } };
// 1) sin «empieza»: se guarda el estado, sin aviso
let r = await ctx.registrarRiego(env, base); ok(r.ok && !r.aviso && llamadas.length === 0, 'sin empieza no avisa');
const p = escrito.at(-1).cuerpo.writes[0].updateTransforms[0].appendMissingElements.values[0].mapValue.fields.v.mapValue.fields;
ok(p.estado && p.estado.mapValue.fields.prog.stringValue === 'SE04ENCAÑE', 'el estado se guarda');
// 2) empieza, sin nada puesto en la app → al administrador
r = await ctx.registrarRiego(env, { ...base, empieza: true }); ok(r.aviso && r.aviso.enviado && llamadas.length === 1, 'avisa');
const a = llamadas[0]; ok(a.url === 'https://avisos.x/interno' && a.body.para[0] === 'admin@x.es' && a.body.titulo === 'Regando: Sector 4 · ENCAÑE' && a.body.cuerpo === 'Franco · SE04ENCAÑE · Válvula 4 · 08:00 min' && a.body.tag === 'riego-fra', JSON.stringify(a.body));
// 3) con lo puesto en la app: a esos correos; apagado → no avisa; otro cabezal fuera de la lista → no avisa
cfg = { mapValue: { fields: { on: { booleanValue: true }, para: { arrayValue: { values: [{ stringValue: 'juanjo@x.es' }, { stringValue: 'enc@x.es' }] } } } } };
llamadas.length = 0; r = await ctx.registrarRiego(env, { ...base, empieza: true, estado: { ...base.estado, prog: 'METALICOS2' } }); ok(llamadas[0].body.para.join() === 'juanjo@x.es,enc@x.es' && llamadas[0].body.titulo === 'Regando: Metálicos 2', JSON.stringify(llamadas[0] && llamadas[0].body));
cfg = { mapValue: { fields: { on: { booleanValue: false } } } }; llamadas.length = 0; r = await ctx.registrarRiego(env, { ...base, empieza: true }); ok(llamadas.length === 0 && r.aviso.motivo === 'apagado', 'apagado');
// 4) si el lector dice «empieza» pero no está regando, no avisa
cfg = null; llamadas.length = 0; r = await ctx.registrarRiego(env, { ...base, empieza: true, estado: { ...base.estado, regando: false } }); ok(llamadas.length === 0, 'no regando');
console.log('PUENTE OK');
