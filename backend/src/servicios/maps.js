// =========================================================
//  Google Routes API: millas manejando restaurante -> cliente
//  Usa Compute Routes "Essentials" (sin tráfico): solo pide
//  distanceMeters y duration, que es lo más barato.
// =========================================================
const config = require('../config');

const URL_ROUTES = 'https://routes.googleapis.com/directions/v2:computeRoutes';
const METROS_POR_MILLA = 1609.344;

// Caché en memoria: la misma ubicación no se vuelve a cobrar en Google
// (el cliente cotiza y luego confirma el pedido = 1 sola consulta)
const CACHE_MS = 30 * 60 * 1000;
const cache = new Map();

function claveCache(lat, lng) {
  return `${lat.toFixed(5)},${lng.toFixed(5)}`; // ~1 metro de precisión
}

/** Distancia en línea recta (millas). Sirve para descartar lejanos sin pagar a Google. */
function millasLineaRecta(lat1, lng1, lat2, lng2) {
  const rad = (g) => (g * Math.PI) / 180;
  const dLat = rad(lat2 - lat1);
  const dLng = rad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 3958.8 * 2 * Math.asin(Math.sqrt(a));
}

/**
 * Devuelve { millas, minutos } manejando desde el restaurante.
 * Devuelve null si Google no encuentra ruta (isla, sin calles, etc.).
 */
async function millasManejando(lat, lng) {
  const clave = claveCache(lat, lng);
  const guardado = cache.get(clave);
  if (guardado && guardado.expira > Date.now()) return guardado.valor;

  const respuesta = await fetch(URL_ROUTES, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': config.google.claveServidor,
      'X-Goog-FieldMask': 'routes.distanceMeters,routes.duration',
    },
    body: JSON.stringify({
      origin: { location: { latLng: { latitude: config.restaurante.lat, longitude: config.restaurante.lng } } },
      destination: { location: { latLng: { latitude: lat, longitude: lng } } },
      travelMode: 'DRIVE',
      routingPreference: 'TRAFFIC_UNAWARE',
    }),
    signal: AbortSignal.timeout(8000),
  });

  if (!respuesta.ok) {
    const texto = await respuesta.text().catch(() => '');
    throw new Error(`Routes API respondió ${respuesta.status}: ${texto.slice(0, 300)}`);
  }

  const datos = await respuesta.json();
  const ruta = datos.routes && datos.routes[0];
  let valor = null;
  if (ruta && typeof ruta.distanceMeters === 'number') {
    valor = {
      millas: Math.round((ruta.distanceMeters / METROS_POR_MILLA) * 100) / 100,
      minutos: Math.round(parseInt(ruta.duration, 10) / 60) || null, // duration viene como "1234s"
    };
  }

  cache.set(clave, { valor, expira: Date.now() + CACHE_MS });
  if (cache.size > 5000) cache.delete(cache.keys().next().value); // no crecer sin límite
  return valor;
}

module.exports = { millasManejando, millasLineaRecta };
