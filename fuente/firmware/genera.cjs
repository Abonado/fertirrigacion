// Genera firmware/src/<nodo>/<nodo>.ino con el código del Taller y los pines de serie. Lo llama build.py.
// GitHub los compila (.github/workflows/firmware.yml) y deja los .bin en la rama «firmware» para instalarlos desde la app.
const fs = require('fs'), path = require('path');
global.window = { addEventListener() {} }; global.document = { addEventListener() {}, getElementById() { return null; } }; global.st = { tl: {} };
require(path.join(__dirname, '..', 'taller', 'taller.js'));
const T = window.TALLER, base = path.join(__dirname, 'src');
fs.rmSync(base, { recursive: true, force: true });
for (const n of T.nodosConCodigo()) {
  const dir = path.join(base, n); fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, n + '.ino'), T.codigoDefecto(n));
}
console.log('firmware:', T.nodosConCodigo().join(' '));
