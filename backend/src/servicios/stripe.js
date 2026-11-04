// =========================================================
//  Stripe: cobros con tarjeta (PaymentIntent)
// =========================================================
const Stripe = require('stripe');
const config = require('../config');

const stripe = config.stripe.claveSecreta ? new Stripe(config.stripe.claveSecreta) : null;

/** Crea el cobro. El navegador lo completa con el client_secret. */
function crearCobro(centavos, descripcion) {
  return stripe.paymentIntents.create({
    amount: centavos,
    currency: config.stripe.moneda,
    automatic_payment_methods: { enabled: true },
    description: descripcion,
  });
}

module.exports = { stripe, crearCobro };
