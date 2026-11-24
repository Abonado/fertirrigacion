// Prueba del servidor de la web pública (servidor/web-worker.js): formulario, trampa, límites, aviso y panel.
// Se pasa desde la carpeta fuente:  node pruebas/web-worker.mjs
import { webcrypto } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
const w = (await import(pathToFileURL(path.resolve('../servidor/web-worker.js')).href)).default;
const { subtle } = webcrypto;
const kp = await subtle.generateKey({ name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' }, true, ['sign', 'verify']);
const jwk = { ...(await subtle.exportKey('jwk', kp.publicKey)), kid: 'k1', alg: 'RS256' };
const b64 = o => Buffer.from(typeof o === 'string' ? o : JSON.stringify(o)).toString('base64url');
async function token(email) {
  const now = Math.floor(Date.now() / 1000), h = b64({ alg: 'RS256', kid: 'k1', typ: 'JWT' }), p = b64({ aud: 'fertirrigacion-cabezales', iss: 'https://securetoken.google.com/fertirrigacion-cabezales', sub: 'u1', email, iat: now - 5, exp: now + 3000 });
  const sig = Buffer.from(await subtle.sign('RSASSA-PKCS1-v1_5', kp.privateKey, new TextEncoder().encode(h + '.' + p))).toString('base64url');
  return h + '.' + p + '.' + sig;
}
globalThis.fetch = async (url) => {
  url = String(url);
  if (url.includes('securetoken@system')) return new Response(JSON.stringify({ keys: [jwk] }), { headers: { 'cache-control': 'max-age=3600' } });
  throw new Error('fetch inesperado ' + url);
};
function kv() {
  const m = new Map();
  return { m, async get(k, t) { const v = m.get(k); return v == null ? null : t === 'json' ? JSON.parse(v) : v; }, async put(k, v) { m.set(k, v); },
    async list({ prefix }) { return { keys: [...m.keys()].filter(k => k.startsWith(prefix)).sort().map(name => ({ name })) }; } };
}
let avisos = [];
const svc = { fetch: async (u, init) => { avisos.push({ u, auth: init.headers.authorization, body: JSON.parse(init.body) }); return new Response('{"ok":true}'); } };
const env = { WEB: kv(), ADMIN_EMAILS: 'jefe@agrofly.es, otro@agrofly.es', AVISOS_SVC: svc, INTERNO_TOKEN: 'secreto' };
const ctx = { waitUntil: p => p };
const pide = (ruta, cuerpo, { e = env, ip = '1.1.1.1', origin = 'https://agrofly.es', tk } = {}) => w.fetch(new Request('https://web.workers.dev/' + ruta, { method: 'POST', headers: { origin, 'content-type': 'application/json', 'cf-connecting-ip': ip, ...(tk ? { authorization: 'Bearer ' + tk } : {}) }, body: JSON.stringify(cuerpo) }), e, ctx);
let fallos = 0; const ok = (c, m) => { if (!c) { fallos++; console.log('✗', m); } else console.log('✓', m); };

const base = { nombre: 'Ana López', empresa: 'Invernaderos del Sur', correo: 'ANA@sur.es', telefono: '', mensaje: 'Tomate, 3 cabezales', modulos: ['Cuentas de abonado', 'Satélite'] };

let r = await w.fetch(new Request('https://web.workers.dev/'), env, ctx); let j = await r.json();
ok(j.ok && j.kv && j.admins === 2 && j.avisos && j.origenes === 'todos', 'GET dice qué está configurado');

r = await pide('solicitud', base); j = await r.json();
ok(r.status === 200 && j.ok && j.id, 'una solicitud correcta se guarda');
ok(r.headers.get('access-control-allow-origin') === '*', 'sin WEB_ORIGENES se acepta desde cualquier web');
const guardada = JSON.parse(env.WEB.m.get('s:' + j.id));
ok(guardada.correo === 'ana@sur.es' && guardada.estado === 'nueva' && guardada.modulos.length === 2, 'se guarda limpia, con el correo en minúsculas y estado «nueva»');
ok(avisos.length === 1 && avisos[0].auth === 'Bearer secreto' && avisos[0].u.endsWith('/interno'), 'avisa al servidor de avisos con la clave interna');
ok(avisos[0].body.para.join() === 'jefe@agrofly.es,otro@agrofly.es' && /Invernaderos del Sur/.test(avisos[0].body.cuerpoTg) && /Satélite/.test(avisos[0].body.cuerpoTg), 'el aviso va a los administradores con los datos y los módulos');

r = await pide('solicitud', { ...base, nombre: '' }); j = await r.json();
ok(r.status === 400 && j.campo === 'nombre', 'sin nombre no se guarda');
r = await pide('solicitud', { ...base, correo: '', telefono: '' }); j = await r.json();
ok(r.status === 400 && j.campo === 'contacto', 'sin correo ni teléfono no se guarda');
r = await pide('solicitud', { ...base, correo: 'no-es-correo' }); j = await r.json();
ok(r.status === 400 && j.campo === 'correo', 'un correo mal escrito se rechaza');
r = await pide('solicitud', { ...base, correo: '', telefono: '+34 600 11 22 33' });
ok(r.status === 200, 'basta con un teléfono');

const antes = env.WEB.m.size, avAntes = avisos.length;
r = await pide('solicitud', { ...base, web: 'http://spam' }); j = await r.json();
ok(r.status === 200 && j.ok && !j.id && env.WEB.m.size === antes && avisos.length === avAntes, 'la trampa para robots responde bien pero no guarda ni avisa');

r = await pide('solicitud', { ...base, nombre: 'x'.repeat(500), mensaje: 'y'.repeat(9000) }); j = await r.json();
const larga = JSON.parse(env.WEB.m.get('s:' + j.id));
ok(larga.nombre.length === 100 && larga.mensaje.length === 2000, 'los textos largos se recortan');

let ultimo; for (let i = 0; i < 6; i++) ultimo = await pide('solicitud', base, { ip: '9.9.9.9' });
ok(ultimo.status === 429, 'más de 5 por hora desde la misma conexión se frenan');

const env2 = { ...env, WEB: kv(), WEB_ORIGENES: 'https://agrofly.es' };
r = await pide('solicitud', base, { e: env2, origin: 'https://otra.web' });
ok(r.status === 403, 'con WEB_ORIGENES, otra web no puede enviar');
r = await pide('solicitud', base, { e: env2 });
ok(r.status === 200 && r.headers.get('access-control-allow-origin') === 'https://agrofly.es', 'con WEB_ORIGENES, la web propia sí');

const env3 = { ...env, WEB: kv(), AVISOS_SVC: undefined, INTERNO_TOKEN: '' };
r = await pide('solicitud', base, { e: env3 });
ok(r.status === 200, 'sin servidor de avisos la solicitud se guarda igual');

// panel
r = await pide('solicitudes', {}); ok(r.status === 401, 'sin sesión no se ve la lista');
r = await pide('solicitudes', {}, { tk: await token('regador@finca.es') }); ok(r.status === 403, 'alguien que no es administrador no ve la lista');
const tk = await token('jefe@agrofly.es');
await new Promise(res => setTimeout(res, 5));
const nueva = await (await pide('solicitud', { ...base, nombre: 'Última' }, { ip: '2.2.2.2' })).json();
r = await pide('solicitudes', {}, { tk }); j = await r.json();
ok(r.status === 200 && j.solicitudes.length >= 4 && j.solicitudes[0].nombre === 'Última', 'el administrador ve la lista, la más nueva primero');
ok(!JSON.stringify(j).includes('"ip:'), 'la lista no lleva los contadores de conexiones');

r = await pide('estado', { id: nueva.id, estado: 'contactada', nota: 'Llamada, demo el jueves' }, { tk }); j = await r.json();
ok(r.status === 200 && j.solicitud.estado === 'contactada' && j.solicitud.historial[0].por === 'jefe@agrofly.es' && j.solicitud.historial[0].de === 'nueva', 'el administrador cambia el estado y queda en el historial');
r = await pide('estado', { id: nueva.id, estado: 'inventado' }, { tk }); ok(r.status === 400, 'un estado que no existe se rechaza');
r = await pide('estado', { id: 'nada', estado: 'demo' }, { tk }); ok(r.status === 404, 'una solicitud que no existe da 404');

console.log(fallos ? `\n${fallos} fallo(s)` : '\nTodo bien');
process.exit(fallos ? 1 : 0);
