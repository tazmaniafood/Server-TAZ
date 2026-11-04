// =========================================================
//  Configuración (sale del archivo .env)
// =========================================================
function numero(nombre) {
  const valor = process.env[nombre];
  if (valor === undefined || valor === '') return null;
  const n = Number(valor);
  if (!Number.isFinite(n)) throw new Error(`${nombre} debe ser un número`);
  return n;
}

const config = {
  restaurante: {
    lat: numero('RESTAURANTE_LAT'),
    lng: numero('RESTAURANTE_LNG'),
  },
  google: {
    claveServidor: process.env.GOOGLE_MAPS_SERVER_KEY || null,   // Routes API (secreta)
    claveNavegador: process.env.GOOGLE_MAPS_BROWSER_KEY || null, // Maps JS + Places (pública)
  },
  stripe: {
    claveSecreta: process.env.STRIPE_SECRET_KEY || null,          // sk_... (secreta)
    clavePublica: process.env.STRIPE_PUBLISHABLE_KEY || null,     // pk_... (pública)
    secretoWebhook: process.env.STRIPE_WEBHOOK_SECRET || null,    // whsec_... (secreta)
    moneda: (process.env.STRIPE_MONEDA || 'usd').toLowerCase(),
  },
};

config.deliveryListo = Boolean(
  config.google.claveServidor && config.restaurante.lat !== null && config.restaurante.lng !== null
);
config.stripeListo = Boolean(config.stripe.claveSecreta && config.stripe.secretoWebhook);

module.exports = config;
