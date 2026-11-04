// =========================================================
//  GET /api/config
//  Claves PÚBLICAS que necesita la página (nunca las secretas).
// =========================================================
const { Router } = require('express');
const config = require('../config');

const router = Router();

router.get('/config', (req, res) => {
  res.json({
    googleMapsKey: config.google.claveNavegador,
    stripePublishableKey: config.stripe.clavePublica,
    restaurante: { lat: config.restaurante.lat, lng: config.restaurante.lng },
    moneda: config.stripe.moneda,
  });
});

module.exports = router;
