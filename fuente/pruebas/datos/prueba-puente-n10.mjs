// Puente: N10 (válvulas de una máquina antigua) por /p. Al abrirse una válvula avisa con el sector que dice la app (config → valv).
import fs from 'node:fs'; import vm from 'node:vm';
const src = fs.readFileSync(process.argv[2], 'utf8').replace('export default {', 'globalThis.__w = {');
const llamadas = [], escrito = []; let valv = null;
const ctx = vm.createContext({ console, Date, JSON, Math, URL, Response: class { constructor(b, o) { this.b = b; this.o = o; } }, TextEncoder, TextDecoder, crypto: globalThis.crypto, atob, btoa,
  fetch: async (url, o) => { llamadas.push({ url, body: JSON.parse(o.body) }); return { ok: true, status: 200, json: async () => ({ ok: true, enviados: 1 }) }; } });
vm.runInContext(src, ctx);
ctx.fs = async (env, m, ruta, cuerpo) => {
  if (m === 'GET' && ruta.startsWith('/abonado_config/finca')) { if (ruta.includes('valv')) return { fields: valv ? { valv } : {} }; return { fields: {} }; }
  if (ruta === ':runQuery') return []; escrito.push({ m, ruta, cuerpo }); return {}; };
const ok = (c, m) => { if (!c) { console.log('FALLA:', m); process.exit(1); } };
const env = { PUENTE_TOKEN: 'T', AVISOS_URL: 'https://avisos.x', INTERNO_TOKEN: 'I', ADMIN_EMAIL: 'admin@x.es' };
const pide = async (raw, tk = 'T') => { const r = await ctx.__w.fetch({ method: 'POST', url: 'https://puente.x/p', headers: { get: () => 'Bearer ' + tk }, json: async () => ({ raw, gw: 'wifi-1A2B3C', rssi: -60 }) }, env); return { s: (r.o || {}).status || 200, j: JSON.parse(r.b) }; };
// 1) sin clave → 401
ok((await pide('N10;id=1A2B3C;ev=1;c=3;pm=0', 'mala')).s === 401, 'clave');
// 2) abre la válvula 3 sin nada puesto en la app → se guarda, pero no avisa (no sabe de qué cabezal es)
let r = await pide('N10;id=1A2B3C;ev=1;c=3;pm=0'); ok(r.j.ok && r.j.aviso && r.j.aviso.motivo === 'sin_config' && llamadas.length === 0, JSON.stringify(r.j));
const w = escrito.at(-1).cuerpo.writes[0]; ok(w.update.name.endsWith('/abonado_lecturas/1A2B3C_' + new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Madrid' })) && w.update.fields.nodo.stringValue === 'N10', 'se guarda como placa N10');
const v = w.updateTransforms[0].appendMissingElements.values[0].mapValue.fields.v.mapValue.fields; ok(v.ev.integerValue == 1 || v.ev.doubleValue === 1, 'ev');
// 3) con la app configurada: avisa con el nombre del sector y el cabezal
valv = { mapValue: { fields: { '1A2B3C': { mapValue: { fields: { cab: { stringValue: 'pla' }, can: { mapValue: { fields: { '3': { mapValue: { fields: { n: { stringValue: 'Sector 1.3' } } } } } } } } } } } } };
r = await pide('N10;id=1A2B3C;ev=1;c=3;pm=0'); ok(r.j.aviso && r.j.aviso.enviado && llamadas.length === 1, JSON.stringify(r.j));
const a = llamadas[0].body; ok(a.titulo === 'Regando: Sector 1.3' && a.cuerpo === 'Planos · Sector 1.3 · Válvula 3' && a.tag === 'riego-pla' && a.para[0] === 'admin@x.es', JSON.stringify(a));
// 4) una válvula sin nombre en la app: «Válvula 5»
llamadas.length = 0; r = await pide('N10;id=1A2B3C;ev=1;c=5;pm=2'); ok(llamadas[0].body.titulo === 'Regando: Válvula 5', JSON.stringify(llamadas[0].body));
// 5) al cerrar, o mientras riega, no avisa; «on» con dos válvulas se guarda como texto
llamadas.length = 0; r = await pide('N10;id=1A2B3C;ev=2;c=3;dur=482;pul=27.5;pm=4'); ok(r.j.ok && !r.j.aviso && llamadas.length === 0, 'cerrar no avisa');
r = await pide('N10;id=1A2B3C;on=3+5;pm=12'); const v2 = escrito.at(-1).cuerpo.writes[0].updateTransforms[0].appendMissingElements.values[0].mapValue.fields.v.mapValue.fields;
ok(v2.on.stringValue === '3+5' && llamadas.length === 0, JSON.stringify(v2.on));
// 6) texto para «Mis aparatos»
const tx = c => vm.runInContext(c, ctx);
ok(tx("texto('N10', { ev: 2, c: 3, dur: 482, pul: 27.5 })") === 'cierra la válvula 3 · 8 min · 27,5 pulsos' && tx("texto('N10', { on: '3+5' })") === 'regando: válvula 3 y 5' && tx("texto('N10', { on: 0 })") === 'sin regar', 'texto');
console.log('PUENTE N10 OK');
