// Configuración para la versión estática
// Define la URL desde donde cargarás el JSON con el mismo shape de `context` del psutil-dashboard
// Si lo dejas vacío, se usará data.json local para prueba
// Ejemplo: const DATA_URL = "https://tu-proyecto.vercel.app/api/context.json";
// Usar el endpoint público del proyecto (sin tokens)
// Soporta múltiples dispositivos: si hay varios, el endpoint devuelve { devices: [...] }.
// Puedes fijar un dispositivo añadiendo ?device=<id> a la URL o estableciendo DEFAULT_DEVICE_ID abajo.
const DATA_URL = "/api/metrics";
const DEFAULT_DEVICE_ID = undefined; // por ejemplo: "PC-Oficina"