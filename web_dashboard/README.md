# Web Dashboard — Deploy en Vercel

Este proyecto es un sitio estático (HTML/CSS/JS). Puedes desplegarlo fácilmente en Vercel.

## Estructura
- `index.html`, `styles.css`, `app.js` y otras páginas (`disks.html`, `network.html`, `logs.html`, `processes.html`).
- `data.json`: datos locales por defecto. `app.js` intenta cargar `DATA_URL` (si existe en `config.js`) o, si no existe, `./data.json`.

## Opción A: Conectar repositorio (recomendado)
1. Inicializa Git y sube a GitHub/GitLab/Bitbucket:
   ```pwsh
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin <URL_DEL_REPO>
   git push -u origin main
   ```
2. Entra a https://vercel.com → New Project → Import Git Repository y selecciona tu repo.
3. Framework Preset: "Other" / "Static Site". Build Command: vacío. Output: raíz (`/`).
4. Deploy. Vercel generará una URL pública.

## Opción B: Vercel CLI (desde tu PC)
1. Requisitos: Node.js y Vercel CLI.
   ```pwsh
   npm i -g vercel
   vercel login
   ```
2. En la carpeta del proyecto:
   ```pwsh
   vercel        # preview
   vercel --prod # producción
   ```

## Variables de entorno (opcional)
Si quieres usar una URL remota en lugar de `data.json`, edita `config.js` con:
```js
const DATA_URL = 'https://tu-api.example.com/data.json';
```
Asegúrate de que el `<script src="config.js">` esté antes de `app.js` en tus HTML.

Para variables seguras/secreta, usa Functions en Vercel y no las expongas en el cliente.

## Archivos de configuración
- `vercel.json`: configuración mínima para sitio estático y cache-control de `.json`.
- `.vercelignore`: archivos que no se suben al deploy.

## Notas
- Si usas una API externa, asegúrate de que tenga CORS habilitado para tu dominio de Vercel.
- Para depurar, revisa los logs del deployment en el dashboard de Vercel.
