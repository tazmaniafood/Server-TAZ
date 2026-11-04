// =========================================================
//  POST /api/delivery/cotizar   { lat, lng }
//  -> { distancia_millas, minutos, costo_delivery }
//  Solo informa el precio; el pedido lo vuelve a calcular.
// =========================================================
const { Router } = require('express');
const { cotizar } = require('../servicios/delivery');
const { ubicacion } = require('../validar');

const router = Router();

router.post('/delivery/cotizar', async (req, res, next) => {
  try {
    const { lat, lng } = ubicacion(req.body || {});
    const c = await cotizar(lat, lng);
    res.json({
      distancia_millas: c.millas,
      minutos: c.minutos,
      costo_delivery: c.costoCentavos / 100,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
