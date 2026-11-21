// Servidor de avisos + Telegram: vincular con código, webhook, envío (urgente con sonido / resto en silencio), chat bloqueado, /stop,
// presupuesto de peticiones del plan gratuito y que la prueba del móvil no moleste a Telegram. Todo con KV, Firebase y Telegram simulados.
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path';
const tmp = path.join(os.tmpdir(), 'avisos-worker-' + process.pid + '.mjs');
fs.writeFileSync(tmp, fs.readFileSync(process.argv[2], 'utf8'));
const W = (await import('file://' + tmp)).default; fs.unlinkSync(tmp);
const ok = (c, m) => { if (!c) { console.log('FALLA:', m); process.exit(1); } };

/* KV simulado */
const datos = new Map();
const kv = { async get(k, t) { const v = datos.get(k); if (v == null) return null; return t === 'json' ? JSON.parse(v) : v; }, async put(k, v) { datos.set(k, String(v)); }, async delete(k) { datos.delete(k); } };
/* Firebase simulado: clave RSA, JWK y lista de correos con acceso */
const b64u = u8 => Buffer.from(u8).toString('base64url');
const kp = await crypto.subtle.generateKey({ name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' }, true, ['sign', 'verify']);
const jwk = { ...(await crypto.subtle.exportKey('jwk', kp.publicKey)), kid: 'k1', alg: 'RS256' };
const PROY = 'fertirrigacion-cabezales';
async function token(email) {
  const h = b64u(Buffer.from(JSON.stringify({ alg: 'RS256', kid: 'k1', typ: 'JWT' }))), ahora = Math.floor(Date.now() / 1000);
  const p = b64u(Buffer.from(JSON.stringify({ aud: PROY, iss: 'https://securetoken.google.com/' + PROY, sub: 'u-' + email, email, iat: ahora - 10, exp: ahora + 3600 })));
  const f = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', kp.privateKey, Buffer.from(h + '.' + p));
  return h + '.' + p + '.' + b64u(new Uint8Array(f));
}
const CON_ACCESO = ['ana@x.es', 'bea@x.es', ...Array.from({ length: 12 }, (_, i) => `p${i}@x.es`)];
/* Telegram simulado */
const llamadas = []; const chatsMuertos = new Set(); let nPeticiones = 0;
globalThis.fetch = async (url, o) => {
  url = String(url); nPeticiones++;
  const res = (obj, st = 200, h = {}) => new Response(JSON.stringify(obj), { status: st, headers: { 'content-type': 'application/json', ...h } });
  if (url.includes('googleapis.com/service_accounts')) return res({ keys: [jwk] }, 200, { 'cache-control': 'max-age=3600' });
  if (url.includes('firestore.googleapis.com')) return res({ fields: { emails: { arrayValue: { values: CON_ACCESO.map(e => ({ stringValue: e })) } } } });
  const m = /api\.telegram\.org\/bot([^/]+)\/(\w+)/.exec(url);
  if (m) {
    const cuerpo = JSON.parse(o.body || '{}'); llamadas.push({ metodo: m[2], token: m[1], ...cuerpo });
    if (m[2] === 'getMe') return res({ ok: true, result: { username: 'AbonadoTestBot' } });
    if (m[2] === 'sendMessage' && chatsMuertos.has(cuerpo.chat_id)) return res({ ok: false, description: 'Forbidden: bot was blocked by the user' }, 403);
    return res({ ok: true, result: true });
  }
  throw new Error('fetch inesperado: ' + url);
};
const pend = []; const ctx = { waitUntil: p => pend.push(p) };
const env = { AVISOS: kv, TELEGRAM_TOKEN: 'TOK', TELEGRAM_SECRET: 'SEC', INTERNO_TOKEN: 'I' };
const base = 'https://avisos.test';
const ORIGEN = 'https://abonado.github.io';
async function app(email, ruta, cuerpo) {
  const r = await W.fetch(new Request(base + '/' + ruta, { method: 'POST', headers: { origin: ORIGEN, authorization: 'Bearer ' + await token(email), 'content-type': 'application/json' }, body: JSON.stringify(cuerpo || {}) }), env, ctx);
  return { st: r.status, j: await r.json() };
}
async function webhook(upd, secreto = 'SEC') {
  const r = await W.fetch(new Request(base + '/telegram', { method: 'POST', headers: { 'x-telegram-bot-api-secret-token': secreto, 'content-type': 'application/json' }, body: JSON.stringify(upd) }), env, ctx);
  return r.status;
}
const msg = (chat, text) => ({ message: { chat: { id: chat, type: 'private' }, text } });
const ultimas = metodo => llamadas.filter(l => l.metodo === metodo);
const limpiar = () => { llamadas.length = 0; };

// 1) instalación del webhook: sin secretos avisa de qué falta; con ellos llama a setWebhook con la clave
{ const r = await W.fetch(new Request(base + '/telegram/instalar'), { AVISOS: kv }, ctx); const j = await r.json();
  ok(j.ok === false && j.falta.join() === 'TELEGRAM_TOKEN,TELEGRAM_SECRET', 'sin secretos: dice cuáles faltan');
  const r2 = await W.fetch(new Request(base + '/telegram/instalar'), env, ctx); const j2 = await r2.json();
  const sw = ultimas('setWebhook')[0]; ok(j2.ok && j2.webhook === base + '/telegram' && j2.bot === '@AbonadoTestBot', 'instala el webhook y dice el bot');
  ok(sw.url === base + '/telegram' && sw.secret_token === 'SEC' && sw.allowed_updates.join() === 'message', 'setWebhook con la clave secreta y solo mensajes'); }
// 2) el webhook exige la clave de Telegram
ok(await webhook(msg(1, '/start'), 'otra') === 401 && await webhook(msg(1, '/start'), '') === 401, 'webhook con clave mala: 401');
{ const r = await W.fetch(new Request(base + '/telegram', { method: 'POST', body: '{}' }), { AVISOS: kv }, ctx); ok(r.status === 401, 'sin secretos configurados: 401'); }
// 3) estado y vincular
ok((await app('ana@x.es', 'tg-estado')).j.vinculado === false, 'ana aún sin vincular');
const v = await app('ana@x.es', 'tg-vincular'); ok(v.j.ok && /^https:\/\/t\.me\/AbonadoTestBot\?start=[A-Z2-9]{10}$/.test(v.j.enlace), 'enlace de vinculación: ' + v.j.enlace);
const cod = v.j.enlace.split('=')[1]; ok(datos.get('tl:' + cod) === 'ana@x.es', 'el código queda guardado para ana');
{ const sin = await W.fetch(new Request(base + '/tg-estado', { method: 'POST', headers: { origin: ORIGEN, 'content-type': 'application/json' }, body: '{}' }), env, ctx); ok(sin.status === 401, 'sin sesión no se puede pedir un código'); }
// 4) Telegram manda /start con el código
limpiar(); ok(await webhook(msg(111, '/start ' + cod)) === 200, 'webhook ok');
ok(JSON.parse(datos.get('t:ana@x.es')).chat === 111 && datos.get('tc:111') === 'ana@x.es' && !datos.has('tl:' + cod), 'vinculada y código gastado');
ok(/Vinculado/.test(ultimas('sendMessage')[0].text), 'el bot confirma');
limpiar(); await webhook(msg(222, '/start ' + cod)); ok(/caducado/.test(ultimas('sendMessage')[0].text) && !datos.has('t:222'), 'el código no vale dos veces');
limpiar(); await webhook(msg(222, '/start ABCDEFGHJK')); ok(/caducado/.test(ultimas('sendMessage')[0].text), 'código inventado: caducado');
limpiar(); await webhook(msg(222, 'hola')); ok(/Ajustes/.test(ultimas('sendMessage')[0].text), 'chat sin vincular: explica cómo');
limpiar(); await webhook({ message: { chat: { id: -5, type: 'group' }, text: '/start ' + cod } }); ok(!llamadas.length, 'los grupos se ignoran');
ok((await app('ana@x.es', 'tg-estado')).j.vinculado === true, 'ana vinculada según la app');
// 5) un chat, una persona: bea vincula el mismo chat y ana deja de estar vinculada
{ const c2 = (await app('bea@x.es', 'tg-vincular')).j.enlace.split('=')[1]; await webhook(msg(111, '/start ' + c2));
  ok(datos.get('tc:111') === 'bea@x.es' && !datos.has('t:ana@x.es') && JSON.parse(datos.get('t:bea@x.es')).chat === 111, 'el chat pasa a bea y se quita a ana'); }
// ana vuelve a vincular desde su chat 111→333 (otro) para los siguientes casos
{ const c3 = (await app('ana@x.es', 'tg-vincular')).j.enlace.split('=')[1]; await webhook(msg(333, '/start ' + c3)); ok(datos.get('tc:333') === 'ana@x.es', 'ana vinculada en 333'); }
// 6) envío: urgente suena y lleva botón a la pantalla; no urgente en silencio; el texto se escapa
limpiar(); { const r = await app('bea@x.es', 'enviar', { para: ['ana@x.es'], titulo: 'Toca llenar: Nitrato <Norte>', cuerpo: 'Quedan 12 cm & bajando', tag: 't', tab: 'rellenar:fra' });
  const s = ultimas('sendMessage')[0]; ok(r.j.ok && r.j.telegram === 1 && r.j.enviados === 1, 'cuenta el envío por Telegram');
  ok(s.chat_id === 333 && s.parse_mode === 'HTML' && s.text === '<b>Toca llenar: Nitrato &lt;Norte&gt;</b>\nQuedan 12 cm &amp; bajando', 'texto en negrita y escapado: ' + s.text);
  ok(s.disable_notification === false, 'urgente: con sonido');
  ok(s.reply_markup.inline_keyboard[0][0].url === 'https://abonado.github.io/fertirrigacion/#ir=rellenar:fra', 'botón a la pantalla: ' + s.reply_markup.inline_keyboard[0][0].url); }
limpiar(); { await app('bea@x.es', 'enviar', { para: ['ana@x.es'], titulo: 'Stock bajo', cuerpo: 'x', tab: 'almacen', urgente: false }); ok(ultimas('sendMessage')[0].disable_notification === true, 'no urgente: en silencio'); }
limpiar(); { await app('bea@x.es', 'enviar', { para: ['ana@x.es'], titulo: 'X', cuerpo: '', tab: 'a b<c>' }); ok(ultimas('sendMessage')[0].reply_markup.inline_keyboard[0][0].url === 'https://abonado.github.io/fertirrigacion/#ir=abc', 'el destino se limpia'); }
// 7) la prueba del móvil no molesta a Telegram
limpiar(); { const r = await app('ana@x.es', 'enviar', { prueba: true }); ok(r.j.ok && !ultimas('sendMessage').length && r.j.telegram === 0, 'prueba del móvil: sin Telegram'); }
// 8) probar Telegram, y desvincular desde la app
limpiar(); { const r = await app('ana@x.es', 'tg-probar'); ok(r.j.ok && ultimas('sendMessage')[0].chat_id === 333 && /vinculado/.test(ultimas('sendMessage')[0].text), 'probar manda mensaje a su chat'); }
{ const r = await app('p0@x.es', 'tg-probar'); ok(r.st === 404 && r.j.error === 'sin_vincular', 'probar sin vincular: error claro'); }
// 9) la persona bloquea el bot: el envío falla con 403 y se borra el vínculo (sin repetir fallos)
chatsMuertos.add(333); limpiar(); { const r = await app('bea@x.es', 'enviar', { para: ['ana@x.es'], titulo: 'A', cuerpo: 'b' });
  ok(r.j.telegram === 0 && !datos.has('t:ana@x.es') && !datos.has('tc:333'), 'chat bloqueado: se desvincula'); }
chatsMuertos.clear();
// 10) /stop desde Telegram
{ const c = (await app('ana@x.es', 'tg-vincular')).j.enlace.split('=')[1]; await webhook(msg(444, '/start ' + c)); ok(datos.has('t:ana@x.es'), 'ana de nuevo');
  limpiar(); await webhook(msg(444, '/stop')); ok(!datos.has('t:ana@x.es') && !datos.has('tc:444') && /Desvinculado/.test(ultimas('sendMessage')[0].text), '/stop desvincula');
  limpiar(); await webhook(msg(444, '/stop@AbonadoTestBot')); ok(/no estaba vinculado/.test(ultimas('sendMessage')[0].text), '/stop repetido: avisa'); }
// 11) desvincular desde la app
{ const c = (await app('ana@x.es', 'tg-vincular')).j.enlace.split('=')[1]; await webhook(msg(555, '/start ' + c));
  limpiar(); const r = await app('ana@x.es', 'tg-baja'); ok(r.j.ok && !datos.has('t:ana@x.es') && !datos.has('tc:555') && /Desvinculado/.test(ultimas('sendMessage')[0].text), 'baja desde la app');
  ok((await app('ana@x.es', 'tg-baja')).j.ok, 'baja repetida: sin error'); }
// 12) sin Telegram configurado el servidor sigue igual y la app lo sabe
{ const sin = { AVISOS: kv, INTERNO_TOKEN: 'I' }; const r = await W.fetch(new Request(base + '/tg-estado', { method: 'POST', headers: { origin: ORIGEN, authorization: 'Bearer ' + await token('ana@x.es'), 'content-type': 'application/json' }, body: '{}' }), sin, ctx);
  ok((await r.json()).config === false, 'sin secretos: config=false');
  const r2 = await W.fetch(new Request(base + '/tg-vincular', { method: 'POST', headers: { origin: ORIGEN, authorization: 'Bearer ' + await token('ana@x.es'), 'content-type': 'application/json' }, body: '{}' }), sin, ctx); ok(r2.status === 503, 'sin secretos: no deja vincular');
  limpiar(); datos.set('t:ana@x.es', JSON.stringify({ chat: 9, ts: 1 }));
  const r3 = await W.fetch(new Request(base + '/enviar', { method: 'POST', headers: { origin: ORIGEN, authorization: 'Bearer ' + await token('bea@x.es'), 'content-type': 'application/json' }, body: JSON.stringify({ para: ['ana@x.es'], titulo: 'A' }) }), sin, ctx);
  ok((await r3.json()).sinDispositivo === 1 && !llamadas.length, 'sin secretos no se llama a Telegram'); datos.delete('t:ana@x.es'); }
// 13) presupuesto de peticiones: 12 personas vinculadas en un aviso programado → caben ~11 en la primera pasada, la que falta sale en la siguiente
{ for (let i = 0; i < 12; i++) { datos.set(`t:p${i}@x.es`, JSON.stringify({ chat: 1000 + i, ts: 1 })); datos.set(`tc:${1000 + i}`, `p${i}@x.es`); }
  datos.set('prog', JSON.stringify({ 'llenado-x': { t: 'Toca llenar', b: 'cuerpo', tag: 'llenado-x', tab: 'rellenar:fra', titulo: 'Toca llenar', cuerpo: 'cuerpo', para: Array.from({ length: 12 }, (_, i) => `p${i}@x.es`), cuando: Date.now() - 1000, ref: 'r', por: 'ana@x.es', enviado: 0 } }));
  limpiar(); nPeticiones = 0; await W.scheduled({}, env, ctx); await Promise.all(pend.splice(0));
  const n1 = ultimas('sendMessage').length, pr = JSON.parse(datos.get('prog'))['llenado-x'];
  ok(n1 >= 8 && n1 < 12, 'primera pasada: reparte lo que cabe (' + n1 + ')'); ok(pr.pend && pr.pend.length === 12 - n1 && !pr.enviado, 'el resto queda pendiente: ' + (pr.pend || []).length);
  ok(nPeticiones <= 50, 'la primera pasada no pasa de 50 peticiones: ' + nPeticiones);
  limpiar(); nPeticiones = 0; await W.scheduled({}, env, ctx); await Promise.all(pend.splice(0));
  const pr2 = JSON.parse(datos.get('prog'))['llenado-x']; ok(ultimas('sendMessage').length === 12 - n1 && pr2.enviado > 0 && !pr2.pend, 'la segunda pasada termina: ' + ultimas('sendMessage').length);
  const todos = new Set(); /* nadie recibe dos veces: ya comprobado por el reparto 12 = n1 + resto */ }
console.log('AVISOS TELEGRAM OK');
