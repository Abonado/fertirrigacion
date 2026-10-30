# Abonado-Fertirrigación · código fuente

Todo lo necesario para rehacer la app desde cero. La web publicada (carpeta de arriba) **se genera** desde aquí: no se toca a mano.

| Archivo / carpeta | Qué es |
|---|---|
| `abonado-pinta-santos.html` | La app entera (pantallas, cálculos, partes, cuaderno…) |
| `nube.src.js` + `firebase-config.json` | Conexión con Firebase (usuarios y datos compartidos) |
| `build.py` | Monta la web en `netlify/abonado` |
| `plantilla/`, `plantilla2/` | Hojas de la empresa: parte grande y parte pequeño |
| `taller/taller.js` | Taller de sensores (menú Taller → Taller de sensores, solo el administrador): «Diseña hablando» (la IA pregunta qué medir, dónde, distancia, corriente y cada cuánto, escribe la especificación del prototipo y crea los diseños con los nodos del Taller; la conversación se guarda en el móvil hasta crear), piezas, esquema, caja 3D y ficha. Se carga solo al abrirlo |
| Llave del Taller | El Taller y sus carpetas los ve todo el personal de riego, pero se abren con la contraseña que pone el administrador (en la configuración solo va su huella SHA-256 con sal, `tallerClave`). Abierto, sigue así en el móvil hasta cerrar la app o «Cerrar con llave». Es un cerrojo de la app, no un permiso de la base de datos |
| `lector-clima/` → `lector-clima.zip` | Extensión de Edge para el PC donde se ve el controlador de clima: cada rato lee la tabla «Estados» (compartimentos: temperatura, humedad y ventanas) y la manda al servidor puente (ruta `/clima`, clave PUENTE_TOKEN). Cada compartimento queda en las lecturas como `UC-<CABEZAL>-<n>` y en Clima y estrés se rellenan las naves con él (como con un sensor N4). El puente avisa si deja de llegar en horario de trabajo |
| `taller/catalogo.js` | Catálogo de tecnología agrícola (menú Taller → Catálogo, solo el administrador): sensores, robots, drones, conectividad y control por carpetas, con buscador; cada ficha con su página de «Detalles» (qué es, cómo hacerlo, qué necesitas, dónde comprarlo con enlaces de búsqueda, ojo con, mantenimiento, en la app). Se carga solo al abrirlo |
| `taller/montaje.js` + `guias-*.js` | Guías de montaje del catálogo (se juntan en `montaje.js` al construir y se cargan al abrir una ficha): visor paso a paso con dibujo animado, materiales con enlace de compra y total, herramientas. `guias-taller.js` las genera del diseño del Taller (un paso por cable); `guias-casa.js` proyectos caseros y variantes; `guias-compra.js` instalación de lo comprado y «qué pedir» al instalador; `guias-img.js` imágenes realistas orientativas (IA) |
| Colecciones `abonado_tldisenos` y `abonado_aparatos` | Diseños del Taller (en la nube, con copia en el móvil; los que solo estaban en el móvil se suben al abrir el Taller) y «Mis aparatos» (Taller → Mis aparatos: lo instalado, su mantenimiento, calibración, último dato e historial). Las cubre la regla general de colecciones `abonado_*` |
| Colecciones `abonado_cajon` y `abonado_lecturas` | El cajón de piezas del Taller (Cajón y compra) y los datos de los sensores (un documento por placa y día, con todos sus puntos), que escribe el servidor puente |
| `firmware/genera.cjs` → `firmware/src/` | build.py genera el código de cada nodo con los pines de serie. GitHub lo compila (`.github/workflows/firmware.yml`) y deja los `.bin` y `estado.json` en la rama `firmware`; la app los instala por USB (Taller → Instalar y probar, con `libs/esptool.js` de Espressif, Apache-2.0) |
| `servidor/puente-worker.js` | Servidor puente de los sensores (Cloudflare): recibe de la pasarela casera (/p) y de The Things Network (/ttn), guarda en `abonado_lecturas`, pone el último dato en el aparato y avisa si uno deja de mandar (por el servidor de avisos, ruta `/interno`). Secretos: FIREBASE_SA, PUENTE_TOKEN, TTN_TOKEN, AVISOS_URL, INTERNO_TOKEN, ADMIN_EMAIL; Cron `*/30 * * * *` |
| `libs/qrcode.js` | qrcode-generator (MIT): etiquetas QR de Mis aparatos |
| `libs/manifold.js` + `manifold.wasm` | [Manifold](https://github.com/elalish/manifold) 3.5.3 (licencia Apache-2.0, en `libs/LICENSE-manifold.txt`): genera las cajas STL del taller |
| `firestore.rules` | Reglas de seguridad de Firebase (se pegan en la consola de Firebase) |
| `mock-firebase.js` | Firebase de mentira para las pruebas |
| `pruebas/` | Pruebas automáticas (`todas.py` las pasa todas) |
| `copias/` | Copia de seguridad diaria cifrada y cómo restaurarla |
| `publicar.sh` | Construye → prueba → publica. Si una prueba falla, no publica |

## Publicar un cambio
```
pip install playwright && python3 -m playwright install chromium   # solo la primera vez
./publicar.sh "Qué ha cambiado"
```

## Copias de seguridad
Cada noche GitHub hace una copia cifrada de toda la base de datos (`.github/workflows/copia.yml`) y la guarda 90 días en
*Actions → Copia de seguridad → (la ejecución) → Artifacts*. Para abrirla:
```
BACKUP_PASS='tu contraseña' node copias/restaurar.mjs copia-AAAA-MM-DD.bin            # la deja en .json
BACKUP_PASS='…' FIREBASE_SA="$(cat cuenta.json)" node copias/restaurar.mjs copia-….bin --subir   # la vuelve a subir
```
Nunca subas al repositorio la cuenta de servicio ni el archivo del servidor de avisos con la clave privada.
