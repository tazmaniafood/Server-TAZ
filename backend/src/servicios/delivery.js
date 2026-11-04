// =========================================================
//  Cálculo del costo de delivery
//    costo = millas manejando (restaurante -> cliente) x precio por milla
//    más de millas_maximas -> fuera de alcance
//  1) Descarta en línea recta lo que está claramente lejos (gratis)
//  2) Pide las millas manejando a Google
//  3) Multiplica por el precio de delivery_config
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

const FUERA = 'La dirección está fuera de nuestro alcance de entrega';

/**
 * Devuelve { millas, minutos, costoCentavos } o lanza ErrorDelivery.
 * El costo va en centavos (enteros) para no tener errores de decimales.
 */
async function cotizar(lat, lng) {
  if (!config.deliveryListo) {
    throw new ErrorDelivery('El cálculo de delivery no está configurado', 503);
  }

  const { rows } = await db.query(
    `SELECT round(precio_por_milla * 100)::int AS centavos_milla,
            millas_maximas::float AS maximo
       FROM delivery_config`
  );
  if (rows.length === 0) throw new ErrorDelivery('El precio del delivery no está configurado', 503);
  const { centavos_milla: centavosMilla, maximo } = rows[0];

  // Manejando nunca es más corto que en línea recta
  if (millasLineaRecta(config.restaurante.lat, config.restaurante.lng, lat, lng) > maximo) {
    throw new ErrorDelivery(FUERA, 422);
  }

  let ruta;
  try {
    ruta = await millasManejando(lat, lng);
  } catch (err) {
    console.error('[maps]', err.message);
    throw new ErrorDelivery('No se pudo calcular la distancia, intenta de nuevo', 503);
  }
  if (!ruta) throw new ErrorDelivery('No hay ruta en carro hasta esa dirección', 422);
  if (ruta.millas > maximo) throw new ErrorDelivery(FUERA, 422);

  return {
    millas: ruta.millas,
    minutos: ruta.minutos,
    costoCentavos: Math.round(ruta.millas * centavosMilla),
  };
}

module.exports = { cotizar, ErrorDelivery };
