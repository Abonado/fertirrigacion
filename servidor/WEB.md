# Solicitudes de la web pública (`web-worker.js`)

Recoge el formulario «Pide una demo» de la web de Agro Fly, guarda cada solicitud y te avisa al momento en el móvil y por Telegram (a través del servidor de avisos que ya tienes). El panel de Agro Fly las lee y les cambia el estado: nueva, contactada, demo, piloto, cliente o descartada.

## Montarlo en Cloudflare (unos 10 minutos)

1. **Workers & Pages → Create → Worker**, nombre `agrofly-web`. Pega el contenido de `servidor/web-worker.js` y despliega.
2. **Storage → KV → Create**, nombre `agrofly-web`. En el worker: **Settings → Bindings → KV namespace**, variable `WEB` → ese espacio.
3. En el worker, **Settings → Bindings → Service binding**: nombre `AVISOS_SVC` → `abonado-avisos`.
4. **Settings → Variables and secrets**:
   - `ADMIN_EMAILS` (texto): tu correo de la app; si son varios, separados por comas. Son los que reciben el aviso y los únicos que ven la lista.
   - `INTERNO_TOKEN` (secreto): la misma clave que ya tienen el servidor de avisos y el puente.
   - `WEB_ORIGENES` (texto, cuando haya dominio): `https://agrofly.es` (o el que elijas). Mientras no lo pongas, el formulario se acepta desde cualquier dirección.
5. Abre `https://agrofly-web.<tu-cuenta>.workers.dev/` en el navegador: debe decir `kv: true`, `admins: 1` y `avisos: true`.
6. Copia esa dirección y pégala en la web, en `window.AGROFLY.solicitud` (el bloque de configuración del final de la página). Mientras esté vacío, el formulario sigue abriendo WhatsApp o el correo como hasta ahora, y si el servidor falla también vuelve a WhatsApp.

Para que el aviso llegue por Telegram, tu correo tiene que estar vinculado a Telegram desde la app (Ajustes), como ya lo está para los demás avisos.

## Qué protege

- Campo trampa invisible: los robots que lo rellenan reciben «ok» pero no se guarda nada.
- Como mucho 5 solicitudes por hora desde una misma conexión.
- Textos recortados y sin caracteres de control.
- La lista y los cambios de estado solo con la sesión de Firebase de un correo de `ADMIN_EMAILS`.

## Prueba

```
cd fuente && node pruebas/web-worker.mjs
```
