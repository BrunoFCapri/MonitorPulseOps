# Web Dashboard — multi-dispositivo y deploy en Vercel

Este proyecto es un sitio estático (HTML/CSS/JS) con soporte para múltiples dispositivos. Puedes desplegarlo fácilmente en Vercel o ejecutarlo de forma local para pruebas.

## ¿Qué hay de nuevo?
- API simple incluida en `api/metrics` que almacena en memoria el último payload por dispositivo.
- El agente `Monitring.py` ahora envía `device_id` (por defecto, el hostname) junto con el `context`.
- La UI detecta múltiples dispositivos y permite elegir uno con un selector o vía `?device=<ID>` en la URL.

## Estructura
- `index.html`, `styles.css`, `app.js` y otras páginas (`disks.html`, `network.html`, `logs.html`, `processes.html`).
- `config.js`: define `DATA_URL` (por defecto `/api/metrics`) y puedes predefinir `DEFAULT_DEVICE_ID`.
- `api/metrics.js`: endpoint sin autenticación para publicar/leer métricas en memoria.
- `server.mjs`: servidor Node opcional para pruebas locales (sirve estáticos + API).

## Usos

### 1) Modo estático local (un dispositivo)
1. Genera `data.json` periódicamente con:
   ```pwsh
   python Monitring.py --interval 5 --count 0 --no-open
   ```
   Esto sirve la UI en un servidor local y escribe `web_dashboard/data.json`.
2. Abre `index.html` o la UI servida localmente.

### 2) Modo remoto (endpoint multi-dispositivo)
1. Despliega la carpeta `web_dashboard` en Vercel (Static Site). `config.js` ya apunta a `/api/metrics`.
2. En cada equipo, ejecuta el agente hacia tu URL pública, con IDs únicos:
   ```pwsh
   python Monitring.py --endpoint https://tu-app.vercel.app/api/metrics --device-id PC-Oficina --interval 5
   python Monitring.py --endpoint https://tu-app.vercel.app/api/metrics --device-id PC-Laptop --interval 5
   ```
3. Abre `https://tu-app.vercel.app/`. Si hay múltiples dispositivos, verás un selector; o usa `?device=PC-Oficina`.

### 3) API incluida (`api/metrics`) – detalles
- `POST /api/metrics`
  - Cuerpo: `{ device_id: "PC-Oficina", context: { ... } }`
  - Si `device_id` no está, se usa `context.platform_info.node_name` o el header `x-device-id`.
  - Respuesta: `{ ok: true, device: "PC-Oficina" }`
- `GET /api/metrics`
  - Si hay varios dispositivos y no pasas `?device`, devuelve `{ devices: [ { id, receivedAt, node, os } ] }`.
  - Si hay 1 solo, devuelve su payload.
  - Con `?device=<ID>`, devuelve ese payload.

Nota: al estar en memoria, los datos se pierden cuando el proceso se reinicia. Para persistencia, usa una base de datos o almacenamiento externo.

### 4) Pruebas locales rápidas
1. Inicia el servidor local desde `web_dashboard`:
   ```pwsh
   node server.mjs
   ```
2. En una o más terminales, simula varios dispositivos:
   ```pwsh
   python Monitring.py --endpoint http://localhost:3000/api/metrics --device-id PC-1 --interval 5
   python Monitring.py --endpoint http://localhost:3000/api/metrics --device-id PC-2 --interval 5
   ```
3. Abre `http://localhost:3000/` y selecciona el dispositivo.
