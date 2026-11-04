// =========================================================
//  Validación de datos que llegan del navegador
// =========================================================
class ErrorValidacion extends Error {
  constructor(mensaje) {
    super(mensaje);
    this.status = 400;
  }
}

function texto(valor, campo, max) {
  if (typeof valor !== 'string' || valor.trim() === '') throw new ErrorValidacion(`Falta ${campo}`);
  const limpio = valor.trim();
  if (limpio.length > max) throw new ErrorValidacion(`${campo} es demasiado largo (máx. ${max})`);
  return limpio;
}

function coordenada(valor, campo, limite) {
  const n = typeof valor === 'string' ? Number(valor) : valor;
  if (typeof n !== 'number' || !Number.isFinite(n) || Math.abs(n) > limite) {
    throw new ErrorValidacion(`${campo} no es válida`);
  }
  return Math.round(n * 1e6) / 1e6; // 6 decimales, como en la base
}

function ubicacion(body) {
  return {
    lat: coordenada(body.lat, 'lat', 90),
    lng: coordenada(body.lng, 'lng', 180),
  };
}

/** Dinero en dólares ("12.5" o 12.5) -> centavos enteros (1250) */
function dineroACentavos(valor, campo) {
  const n = typeof valor === 'string' ? Number(valor) : valor;
  if (typeof n !== 'number' || !Number.isFinite(n) || n < 0 || n > 100000) {
    throw new ErrorValidacion(`${campo} no es válido`);
  }
  const centavos = Math.round(n * 100);
  if (Math.abs(centavos - n * 100) > 1e-6) throw new ErrorValidacion(`${campo} tiene más de 2 decimales`);
  return centavos;
}

const MEDIOS_PAGO = ['efectivo', 'tarjeta', 'transferencia', 'nequi', 'daviplata'];

function medioPago(valor) {
  if (!MEDIOS_PAGO.includes(valor)) throw new ErrorValidacion('medio_pago no es válido');
  return valor;
}

module.exports = { ErrorValidacion, texto, ubicacion, dineroACentavos, medioPago };
