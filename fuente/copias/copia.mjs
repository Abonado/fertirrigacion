// Copia de seguridad diaria de toda la base de datos (colecciones abonado_*) de Firebase.
// La lanza GitHub (Actions) cada noche. Necesita dos secretos en el repositorio:
//   FIREBASE_SA  → el JSON de la cuenta de servicio de Firebase (Configuración del proyecto → Cuentas de servicio → Generar nueva clave privada)
//   BACKUP_PASS  → una contraseña larga que elijas tú (guárdala: sin ella la copia no se puede abrir)
// El archivo sale cifrado (AES-256-GCM), así que aunque el repositorio sea público nadie puede leerlo.
import crypto from 'node:crypto'; import fs from 'node:fs'; import zlib from 'node:zlib';
const SA = process.env.FIREBASE_SA, PASS = process.env.BACKUP_PASS;
if (!SA || !PASS) { console.log('Faltan los secretos FIREBASE_SA y BACKUP_PASS: no se hace copia.'); process.exit(process.env.CI ? 1 : 0); }
const sa = JSON.parse(SA);
const TOKEN_URL = process.env.TOKEN_URL || 'https://oauth2.googleapis.com/token';
const FS = process.env.FS_URL || `https://firestore.googleapis.com/v1/projects/${sa.project_id}/databases/(default)/documents`;
const b64u = b => Buffer.from(b).toString('base64url');
async function token() {
  const now = Math.floor(Date.now() / 1000), h = b64u(JSON.stringify({ alg: 'RS256', typ: 'JWT' })),
    c = b64u(JSON.stringify({ iss: sa.client_email, scope: 'https://www.googleapis.com/auth/datastore', aud: TOKEN_URL, iat: now, exp: now + 3600 }));
  const sig = crypto.sign('RSA-SHA256', Buffer.from(h + '.' + c), sa.private_key).toString('base64url');
  const r = await fetch(TOKEN_URL, { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: `${h}.${c}.${sig}` }) });
  const j = await r.json(); if (!j.access_token) throw new Error('No se pudo entrar en Firebase con la cuenta de servicio: ' + (j.error_description || j.error || r.status)); return j.access_token;
}
const tk = await token(), H = { authorization: 'Bearer ' + tk, 'content-type': 'application/json' };
async function api(url, opt = {}) { const r = await fetch(url, { ...opt, headers: H }); const j = await r.json(); if (!r.ok) throw new Error(url.split('/documents')[1] + ': ' + JSON.stringify(j.error || j).slice(0, 200)); return j; }
let ids = [], pt = '';
do { const j = await api(`${FS}:listCollectionIds`, { method: 'POST', body: JSON.stringify({ pageSize: 100, pageToken: pt || undefined }) }); ids.push(...(j.collectionIds || [])); pt = j.nextPageToken; } while (pt);
ids = ids.filter(x => x.startsWith('abonado_')).sort();
const out = { app: 'abonado-fertirrigacion', proyecto: sa.project_id, exportado: new Date().toISOString(), colecciones: {} };
let total = 0;
for (const col of ids) {
  const L = out.colecciones[col] = []; let pt2 = '';
  do { const j = await api(`${FS}/${col}?pageSize=300${pt2 ? '&pageToken=' + encodeURIComponent(pt2) : ''}`); for (const d of j.documents || []) L.push({ id: d.name.split('/').pop(), fields: d.fields || {}, updateTime: d.updateTime }); pt2 = j.nextPageToken; } while (pt2);
  total += L.length; console.log(col.padEnd(24), L.length);   // solo cuántos documentos, nunca su contenido
}
const datos = zlib.gzipSync(Buffer.from(JSON.stringify(out)), { level: 9 });
const salt = crypto.randomBytes(16), iv = crypto.randomBytes(12), key = crypto.scryptSync(PASS, salt, 32);
const ci = crypto.createCipheriv('aes-256-gcm', key, iv), enc = Buffer.concat([ci.update(datos), ci.final()]);
const nombre = `copia-${out.exportado.slice(0, 10)}.bin`;
fs.writeFileSync(nombre, Buffer.concat([Buffer.from('ABONADO1'), salt, iv, ci.getAuthTag(), enc]));
console.log(`Copia hecha: ${ids.length} colecciones, ${total} documentos, ${(fs.statSync(nombre).size / 1048576).toFixed(1)} MB → ${nombre}`);
