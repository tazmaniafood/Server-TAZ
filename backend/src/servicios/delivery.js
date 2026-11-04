// =========================================================
//  Cálculo del costo de delivery
//  1) Descarta en línea recta lo que está claramente lejos (gratis)
//  2) Pide las millas manejando a Google
//  3) Busca el tramo en la tabla tarifas_delivery
// =========================================================
const db = require('../db/pool');
const config = require('../config');
const { millasManejando, millasLineaRecta } = require('./maps');

class ErrorDelivery extends Error {
  constructor(mensaje, status) {
    super(mensaje);
    this.status = status;
  }
}

/**
 * Devuelve { millas, minutos, costoCentavos } o lanza ErrorDelivery.
 * El costo va en centavos (enteros) para no tener errores de decimales.
 */
async function cotizar(lat, lng) {
  if (!config.deliveryListo) {
    throw new ErrorDelivery('El cálculo de delivery no está configurado', 503);
  }

  const { rows: [{ maximo }] } = await db.query(
    'SELECT MAX(millas_hasta)::float AS maximo FROM tarifas_delivery WHERE activo'
  );
  if (maximo === null) throw new ErrorDelivery('No hay tarifas de delivery cargadas', 503);

  // Manejando nunca es más corto que en línea recta
  if (millasLineaRecta(config.restaurante.lat, config.restaurante.lng, lat, lng) >= maximo) {
    throw new ErrorDelivery('La dirección está fuera de la zona de entrega', 422);
  }

  let ruta;
  try {
    ruta = await millasManejando(lat, lng);
  } catch (err) {
    console.error('[maps]', err.message);
    throw new ErrorDelivery('No se pudo calcular la distancia, intenta de nuevo', 503);
  }
  if (!ruta) throw new ErrorDelivery('No hay ruta en carro hasta esa dirección', 422);

  const { rows } = await db.query(
    `SELECT round(costo * 100)::int AS centavos
       FROM tarifas_delivery
      WHERE activo AND $1 >= millas_desde AND $1 < millas_hasta
      ORDER BY millas_desde
      LIMIT 1`,
    [ruta.millas]
  );
  if (rows.length === 0) throw new ErrorDelivery('La dirección está fuera de la zona de entrega', 422);

  return { millas: ruta.millas, minutos: ruta.minutos, costoCentavos: rows[0].centavos };
}

module.exports = { cotizar, ErrorDelivery };
