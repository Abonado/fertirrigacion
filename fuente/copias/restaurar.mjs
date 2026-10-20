// Abrir una copia:            BACKUP_PASS='tu contraseña' node restaurar.mjs copia-2026-10-21.bin
//   → crea copia-2026-10-21.json con todos los datos (se puede mirar con cualquier editor).
// Volver a subirla a Firebase: BACKUP_PASS='…' FIREBASE_SA="$(cat cuenta-servicio.json)" node restaurar.mjs copia-….bin --subir [coleccion]
//   → escribe cada documento tal y como estaba (sobrescribe los que existan con el mismo id). Con [coleccion] solo esa.
import crypto from 'node:crypto'; import fs from 'node:fs'; import zlib from 'node:zlib';
const [f, op, solo] = process.argv.slice(2), PASS = process.env.BACKUP_PASS;
if (!f || !PASS) { console.log('Uso: BACKUP_PASS=… node restaurar.mjs copia-AAAA-MM-DD.bin [--subir [coleccion]]'); process.exit(1); }
const b = fs.readFileSync(f); if (b.subarray(0, 8).toString() !== 'ABONADO1') { console.log('Ese archivo no es una copia de la app'); process.exit(1); }
const salt = b.subarray(8, 24), iv = b.subarray(24, 36), tag = b.subarray(36, 52), enc = b.subarray(52), key = crypto.scryptSync(PASS, salt, 32);
const de = crypto.createDecipheriv('aes-256-gcm', key, iv); de.setAuthTag(tag);
let datos; try { datos = JSON.parse(zlib.gunzipSync(Buffer.concat([de.update(enc), de.final()]))); } catch (e) { console.log('Contraseña incorrecta o archivo dañado'); process.exit(1); }
const json = f.replace(/\.bin$/, '') + '.json'; fs.writeFileSync(json, JSON.stringify(datos, null, 1));
console.log(`Copia del ${datos.exportado}: ${Object.entries(datos.colecciones).map(([c, l]) => c + ' ' + l.length).join(', ')}\nGuardada en ${json}`);
if (op !== '--subir') process.exit(0);
const sa = JSON.parse(process.env.FIREBASE_SA || 'null'); if (!sa) { console.log('Para subirla hace falta FIREBASE_SA'); process.exit(1); }
const TOKEN_URL = process.env.TOKEN_URL || 'https://oauth2.googleapis.com/token', FS = process.env.FS_URL || `https://firestore.googleapis.com/v1/projects/${sa.project_id}/databases/(default)/documents`;
const b64u = x => Buffer.from(x).toString('base64url'), now = Math.floor(Date.now() / 1000);
const h = b64u(JSON.stringify({ alg: 'RS256', typ: 'JWT' })), c = b64u(JSON.stringify({ iss: sa.client_email, scope: 'https://www.googleapis.com/auth/datastore', aud: TOKEN_URL, iat: now, exp: now + 3600 }));
const r = await fetch(TOKEN_URL, { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: `${h}.${c}.${crypto.sign('RSA-SHA256', Buffer.from(h + '.' + c), sa.private_key).toString('base64url')}` }) });
const tk = (await r.json()).access_token; if (!tk) { console.log('No se pudo entrar en Firebase'); process.exit(1); }
for (const [col, L] of Object.entries(datos.colecciones)) {
  if (solo && col !== solo) continue; let n = 0;
  for (const d of L) { const w = await fetch(`${FS}/${col}/${encodeURIComponent(d.id)}`, { method: 'PATCH', headers: { authorization: 'Bearer ' + tk, 'content-type': 'application/json' }, body: JSON.stringify({ fields: d.fields }) }); if (w.ok) n++; else console.log('Error en', col, d.id, w.status); }
  console.log(col, n, 'documentos subidos');
}
