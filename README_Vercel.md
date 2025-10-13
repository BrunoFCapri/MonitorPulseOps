MonitorPulseOps - Vercel integration

Archivos añadidos:
- vercel/api/metrics.js  -> función serverless para recibir POST en /api/metrics
- send_metrics_to_vercel.py -> script cliente para que un host en la LAN envíe métricas a Vercel

Instrucciones rápidas:
1) Despliega el contenido de la carpeta `vercel` en tu repo (path: /vercel/api/metrics.js) a Vercel.
2) En Vercel > Settings > Environment Variables añade (opcional) METRICS_API_KEY con una clave secreta si quieres proteger el endpoint.
3) Despliega el proyecto. URL del endpoint será: https://<tu-proyecto>.vercel.app/api/metrics

Probar localmente con curl:

curl -X POST "https://<tu-proyecto>.vercel.app/api/metrics" -H "Content-Type: application/json" -d '{"hostname":"pc1","cpu_percent":5}'

Desde la máquina del compañero, ejecutar:

python send_metrics_to_vercel.py --url "https://<tu-proyecto>.vercel.app/api/metrics" --interval 5

Notas:
- La función guarda el último payload en memoria (no persistente). Para almacenamiento duradero integra Supabase/Firestore/Postgres etc.
- Asegúrate de proteger el endpoint con METRICS_API_KEY si quieres evitar envíos no autorizados.

Si quieres, puedo:
- añadir integración a Supabase en la función Vercel (necesitaré la URL y la KEY de Supabase),
- o modificar `main.py` / `Monitring.py` para que incluyan una opción --send-to para enviar automáticamente las métricas.
