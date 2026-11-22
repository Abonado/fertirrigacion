# Avisos por Telegram (gratis) — puesta en marcha

Los avisos de la app (llenado de depósitos, tareas, mensajes, stock, riego iniciado por los sensores…) llegan también a un bot de Telegram.
Cada persona vincula su propio Telegram desde **Ajustes → Avisos por Telegram → Vincular Telegram**.
Los urgentes suenan; los demás llegan en silencio. El botón «Abrir en la app» lleva a la pantalla del aviso.

Un bot por empresa: cada app de empresa tiene su propio servidor de avisos y su propio bot (p. ej. «Paloma · Avisos»).

## 1. Crear el bot (2 minutos, en Telegram)
1. Abre **@BotFather** → `/newbot`.
2. Nombre visible: el que verá el cliente (p. ej. `Abonado Avisos`). Usuario: debe acabar en `bot` (p. ej. `agrofly_avisos_bot`).
3. BotFather te da un **token** (algo como `123456:ABC...`). Es una contraseña: no lo pegues en chats, correos ni en el repositorio.
   Si se filtra: BotFather → `/revoke`.

## 2. Poner los secretos en el servidor de avisos (Cloudflare)
Workers → el worker de avisos → *Settings* → *Variables and Secrets* → añadir como **Secret**:
- `TELEGRAM_TOKEN` = el token de BotFather.
- `TELEGRAM_SECRET` = una clave larga inventada, solo letras, números, `_` y `-` (40 caracteres o más). Telegram la manda en cada llamada y el worker rechaza las que no la traen.

## 3. Subir el código nuevo
Pega el contenido de `servidor/avisos-worker.js` en el worker y despliega (igual que en versiones anteriores). No hacen falta más cambios: el KV `AVISOS` y el cron de 5 minutos son los mismos.

## 4. Conectar Telegram con el worker (una sola vez)
Abre en el navegador, con la dirección de tu worker:

    https://<tu-worker>.workers.dev/telegram/instalar

Debe salir `{"ok":true, ... "bot":"@agrofly_avisos_bot"}`. Si sale `falta`, falta un secreto del paso 2.

## 5. Vincular cada persona
Con la app publicada: Ajustes → **Vincular Telegram** → «Abrir Telegram y pulsar Iniciar». Al volver a la app aparece «Telegram vinculado». «Probar» manda un mensaje de prueba.
Para dejar de recibir: «Desvincular» en la app, o `/stop` en el chat del bot. Si alguien bloquea el bot, se desvincula solo.

## Resumen diario a las 10:00 (encargados y administrador)
Cada día, a la hora que se elija en Ajustes → **Resumen diario** (por defecto las 10:00, hora de Madrid), el servidor de los sensores (`puente-worker.js`) manda por notificación y por Telegram las cuentas y los drenajes de cada cabezal: riego, % de drenaje, CE y pH de entrada y de drenaje, y cuántos productos se salen de ±10 % de la dosis. Si de un cabezal aún no hay registro de hoy, enseña el de ayer y lo dice; si no hay ninguno, avisa.
- Lo recibe quien es administrador o encargado en «Usuarios y acceso» **y** tiene activados los avisos del móvil o Telegram. Cada persona ve solo sus fincas y zonas.
- Hace falta: `puente-worker.js` actualizado en Cloudflare, el enlace de servicio `AVISOS_SVC` → `abonado-avisos`, el secreto `INTERNO_TOKEN` (igual en los dos) y `ADMIN_EMAIL` en el puente, `avisos-worker.js` actualizado (lleva el texto largo a Telegram) y el Cron `*/30 * * * *` del puente (ya existe).
- Para no repetir, el puente apunta el día en `abonado_lecturas/RESUMEN-ESTADO`. Si el servidor de avisos falla, reintenta cada 30 min hasta 3 veces el mismo día; si se hace tarde (4 horas después de la hora elegida) lo deja.
- Prueba a mano (solo al administrador, sin gastar el aviso del día): `POST https://<puente>.workers.dev/resumen` con `Authorization: Bearer <PUENTE_TOKEN>` y cuerpo `{}`. Con `{"todos":true}` lo manda a todos los destinatarios.
- Pruebas: `fuente/pruebas/datos/prueba-resumen-diario.mjs` y `fuente/pruebas/t167.py`.

## Límites y detalles
- El plan gratuito de Cloudflare admite ~50 peticiones por ejecución. El servidor lleva la cuenta: si en un aviso no caben todas las personas, el resto sale en la pasada siguiente (5 min) en los avisos programados. La app manda en grupos de 6.
- El botón de prueba del móvil («Probar con la app cerrada») no escribe a Telegram.
- Un chat de Telegram pertenece a una sola persona de la app.
- Los mensajes de bots de Telegram no van cifrados de extremo a extremo. Los avisos llevan nombres de depósitos, cantidades y tareas: nada de datos personales, pero conviene decirlo en la política de privacidad de cada empresa.
- Pruebas: `fuente/pruebas/datos/prueba-avisos-telegram.mjs` (servidor, con Telegram simulado) y `fuente/pruebas/t166.py` (pantalla).
