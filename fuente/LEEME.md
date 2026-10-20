# Abonado-Fertirrigación · código fuente

Todo lo necesario para rehacer la app desde cero. La web publicada (carpeta de arriba) **se genera** desde aquí: no se toca a mano.

| Archivo / carpeta | Qué es |
|---|---|
| `abonado-pinta-santos.html` | La app entera (pantallas, cálculos, partes, cuaderno…) |
| `nube.src.js` + `firebase-config.json` | Conexión con Firebase (usuarios y datos compartidos) |
| `build.py` | Monta la web en `netlify/abonado` |
| `plantilla/`, `plantilla2/` | Hojas de la empresa: parte grande y parte pequeño |
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
