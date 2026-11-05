// jsonSuelto: lo que devuelve la IA → objeto, aunque venga con ```json, con saltos de línea dentro de los textos o cortado.
import fs from 'node:fs';
const html = fs.readFileSync(process.argv[2], 'utf8'); const i = html.indexOf('function jsonSuelto('), j = html.indexOf('\n  return null}', i) + 15;
const jsonSuelto = new Function(html.slice(i, j) + '; return jsonSuelto;')();
const ok = (c, m) => { if (!c) { console.log('FALLA:', m); process.exit(1); } };
const bueno = '{"resumen":"Hojas viejas amarillas","urgencia":"media","posibles":[{"problema":"Falta de magnesio","tipo":"carencia","probabilidad":"alta","senales":"amarillo entre nervios","comprobar":"análisis de hoja","actuacion":"subir magnesio"},{"problema":"Exceso de sal","tipo":"salinidad","probabilidad":"media","senales":"bordes quemados","comprobar":"CE del drenaje","actuacion":"drenar más"}],"faltan":""}';
let o = jsonSuelto(bueno); ok(o && o.posibles.length === 2, 'normal');
o = jsonSuelto('Aquí tienes:\n```json\n' + bueno + '\n```\nEspero que ayude'); ok(o && o.posibles.length === 2, 'con ```json y texto alrededor');
o = jsonSuelto(bueno.replace('amarillo entre nervios', 'amarillo entre nervios.\nEmpieza abajo.')); ok(o && o.posibles[0].senales.includes('Empieza abajo'), 'salto de línea dentro de un texto');
// cortada a mitad del segundo problema → se queda con el primero entero
const cortada = bueno.slice(0, bueno.indexOf('bordes que'));
o = jsonSuelto(cortada); ok(o && Array.isArray(o.posibles) && o.posibles.length >= 1 && o.posibles[0].problema === 'Falta de magnesio', 'cortada: ' + JSON.stringify(o));
// cortada justo después de una coma y en medio de una clave
o = jsonSuelto(bueno.slice(0, bueno.indexOf('"tipo":"salinidad"') + 3)); ok(o && o.posibles[0].actuacion === 'subir magnesio', 'cortada en una clave');
o = jsonSuelto('{"resumen":"sólo el resu'); ok(o && o.resumen === 'sólo el resu', 'cortada en el primer texto');
ok(jsonSuelto('no hay json') === null, 'sin json');
console.log('JSON OK');
