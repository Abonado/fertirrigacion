// Prueba del servidor de IA con voz: firma un token de Firebase de mentira, simula Firestore y OpenAI y comprueba límites y errores.
import { webcrypto } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
const w = (await import(pathToFileURL(path.resolve('../servidor/ia-worker.js')).href)).default;
const { subtle } = webcrypto;
const kp = await subtle.generateKey({ name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' }, true, ['sign', 'verify']);
const jwk = { ...(await subtle.exportKey('jwk', kp.publicKey)), kid: 'k1', alg: 'RS256' };
const b64 = o => Buffer.from(typeof o === 'string' ? o : JSON.stringify(o)).toString('base64url');
async function token(email) {
  const now = Math.floor(Date.now() / 1000), h = b64({ alg: 'RS256', kid: 'k1', typ: 'JWT' }), p = b64({ aud: 'fertirrigacion-cabezales', iss: 'https://securetoken.google.com/fertirrigacion-cabezales', sub: 'u1', email, iat: now - 5, exp: now + 3000 });
  const sig = Buffer.from(await subtle.sign('RSASSA-PKCS1-v1_5', kp.privateKey, new TextEncoder().encode(h + '.' + p))).toString('base64url');
  return h + '.' + p + '.' + sig;
}
let openaiLlamadas = [], openaiRespuesta = 'ok';
globalThis.fetch = async (url, init) => {
  url = String(url);
  if (url.includes('securetoken@system')) return new Response(JSON.stringify({ keys: [jwk] }), { headers: { 'cache-control': 'max-age=3600' } });
  if (url.includes('abonado_acceso/usuarios')) return new Response(JSON.stringify({ fields: { emails: { arrayValue: { values: ['ana@x.es', 'bea@x.es', 'carlos@x.es'].map(e => ({ stringValue: e })) } } } }));
  if (url.includes('api.openai.com/v1/audio/speech')) {
    openaiLlamadas.push({ auth: init.headers.authorization, body: JSON.parse(init.body) });
    if (openaiRespuesta === 'creditos') return new Response(JSON.stringify({ error: { message: 'You exceeded your current quota, billing' } }), { status: 429 });
    return new Response(new Uint8Array([0xff, 0xfb, 1, 2, 3]), { headers: { 'content-type': 'audio/mpeg' } });
  }
  throw new Error('fetch inesperado ' + url);
};
const O = 'https://agrofly-abonado.pages.dev';
const pide = async (cuerpo, env, email = 'ana@x.es', tk) => w.fetch(new Request('https://ia.workers.dev/', { method: 'POST', headers: { origin: O, 'content-type': 'application/json', authorization: 'Bearer ' + (tk || await token(email)) }, body: JSON.stringify(cuerpo) }), env);
let fallos = 0; const ok = (c, m) => { if (!c) { fallos++; console.log('✗', m); } else console.log('✓', m); };

// GET: dice si hay voz, sin dar más pistas
let r = await w.fetch(new Request('https://ia.workers.dev/', { headers: { origin: O } }), { OPENAI_VOZ_KEY: 'sk-x' }); let j = await r.json();
ok(j.voz === true && j.configurado === false, 'GET: voz disponible aunque no haya IA de texto');
r = await w.fetch(new Request('https://ia.workers.dev/', { headers: { origin: O } }), {}); j = await r.json(); ok(j.voz === false, 'GET: sin clave, voz no disponible');
// sin clave de voz
r = await pide({ voz: 'Hola' }, {}); ok(r.status === 503 && (await r.json()).error === 'sin_voz', 'sin clave de voz: 503 sin_voz (la app usará la voz del móvil)');
// funciona con la clave de voz aparte y sin clave de chat
r = await pide({ voz: 'Hola, ¿qué tal?' }, { OPENAI_VOZ_KEY: 'sk-voz', VOZ: 'marin' });
ok(r.status === 200 && r.headers.get('content-type') === 'audio/mpeg' && (await r.arrayBuffer()).byteLength === 5, 'devuelve audio mp3');
const L = openaiLlamadas[0]; ok(L.auth === 'Bearer sk-voz' && L.body.model === 'gpt-4o-mini-tts' && L.body.voice === 'marin' && /español de España/.test(L.body.instructions) && L.body.response_format === 'mp3' && L.body.input === 'Hola, ¿qué tal?', 'pide a OpenAI modelo, voz, instrucciones en español y mp3');
// el texto se limpia y se recorta
openaiLlamadas = []; await pide({ voz: 'a\n\n\tb ' + 'x'.repeat(2000) }, { OPENAI_API_KEY: 'sk-1' }); ok(openaiLlamadas[0].body.input.length === 700 && openaiLlamadas[0].body.input.startsWith('a b x') && openaiLlamadas[0].auth === 'Bearer sk-1', 'recorta a 700 caracteres, limpia saltos y usa OPENAI_API_KEY si no hay clave de voz');
// vacío
r = await pide({ voz: '   ' }, { OPENAI_API_KEY: 'sk-1' }); ok(r.status === 400, 'texto vacío: 400');
// seguridad: sin sesión, sin alta, otro origen
r = await pide({ voz: 'Hola' }, { OPENAI_API_KEY: 'sk-1' }, 'ana@x.es', 'basura'); ok(r.status === 401, 'sin sesión válida: 401');
r = await pide({ voz: 'Hola' }, { OPENAI_API_KEY: 'sk-1' }, 'intruso@x.es'); ok(r.status === 403, 'sesión válida pero sin alta en la app: 403');
r = await w.fetch(new Request('https://ia.workers.dev/', { method: 'POST', headers: { origin: 'https://malo.com', 'content-type': 'application/json' }, body: '{"voz":"x"}' }), { OPENAI_API_KEY: 'sk-1' }); ok(r.status === 403, 'otro origen: 403');
// límite diario por persona (tope mínimo 500)
openaiLlamadas = []; const env = { OPENAI_API_KEY: 'sk-1', VOZ_DIA: '500' }; let n = 0, lim = null;
for (let i = 0; i < 20; i++) { r = await pide({ voz: 'y'.repeat(120) }, env, 'bea@x.es'); if (r.status === 429) { lim = (await r.json()).error; break; } n++; }
ok(lim === 'limite_voz' && n >= 1 && n <= 4, `límite diario: corta con 429 limite_voz tras ${n} frases`);
// error de saldo: no cuenta contra el límite y se explica
openaiRespuesta = 'creditos'; const env2 = { OPENAI_API_KEY: 'sk-1', VOZ_DIA: '500' };
r = await pide({ voz: 'z'.repeat(100) }, env2, 'carlos@x.es'); j = await r.json(); ok(r.status === 502 && j.error === 'creditos', 'sin saldo en OpenAI: 502 creditos');
// el chat de texto sigue funcionando igual: sin clave de chat sigue diciendo sin_clave
r = await pide({ prompt: 'hola' }, { OPENAI_VOZ_KEY: 'sk-voz' }); ok(r.status === 500 && (await r.json()).error === 'sin_clave', 'sin IA de texto: sigue dando sin_clave (aunque haya voz)');
console.log(fallos ? 'FALLOS ' + fallos : 'errs []'); process.exit(fallos ? 1 : 0);
