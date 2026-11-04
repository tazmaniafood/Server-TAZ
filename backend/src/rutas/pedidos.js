// =========================================================
//  POST /api/pedidos
//  Recibe:
//    { orden, nombre, celular, direccion, lat, lng, subtotal, medio_pago }
//  El backend calcula delivery y total (no se confía en el navegador).
//  Si medio_pago = 'tarjeta' devuelve stripe_client_secret para
//  completar el pago en la página; el pago se confirma por webhook.
// =========================================================
const { Router } = require('express');
const db = require('../db/pool');
const config = require('../config');
const { cotizar } = require('../servicios/delivery');
const { stripe, crearCobro } = require('../servicios/stripe');
const v = require('../validar');

const router = Router();
const aDolares = (centavos) => (centavos / 100).toFixed(2);

router.post('/pedidos', async (req, res, next) => {
  try {
    const body = req.body || {};
    const datos = {
      orden: v.texto(body.orden, 'orden', 5000),
      nombre: v.texto(body.nombre, 'nombre', 100),
      celular: v.texto(body.celular, 'celular', 20),
      direccion: v.texto(body.direccion, 'direccion', 300),
      ...v.ubicacion(body),
      subtotalCentavos: v.dineroACentavos(body.subtotal, 'subtotal'),
      medioPago: v.medioPago(body.medio_pago),
    };
    if (!/^[0-9+\-\s()]{7,20}$/.test(datos.celular)) throw new v.ErrorValidacion('celular no es válido');

    if (datos.medioPago === 'tarjeta' && !config.stripeListo) {
      return res.status(503).json({ error: 'El pago con tarjeta no está disponible' });
    }

    const delivery = await cotizar(datos.lat, datos.lng);
    const totalCentavos = datos.subtotalCentavos + delivery.costoCentavos;

    // Tarjeta: primero se crea el cobro en Stripe para guardar su id con el pedido
    let cobro = null;
    if (datos.medioPago === 'tarjeta') {
      if (totalCentavos < 50) throw new v.ErrorValidacion('El total es muy bajo para pagar con tarjeta');
      cobro = await crearCobro(totalCentavos, `Pedido Tazmania - ${datos.nombre}`);
    }

    let pedido;
    try {
      const { rows } = await db.query(
        `INSERT INTO pedidos (orden, nombre, celular, direccion, lat, lng, distancia_millas,
                              subtotal, costo_delivery, monto_total, medio_pago, stripe_payment_intent_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
         RETURNING numero_pedido, creado_en`,
        [
          datos.orden, datos.nombre, datos.celular, datos.direccion, datos.lat, datos.lng,
          delivery.millas, aDolares(datos.subtotalCentavos), aDolares(delivery.costoCentavos),
          aDolares(totalCentavos), datos.medioPago, cobro ? cobro.id : null,
        ]
      );
      pedido = rows[0];
    } catch (err) {
      if (cobro) stripe.paymentIntents.cancel(cobro.id).catch(() => {});
      throw err;
    }

    // Para ver el número de pedido en el panel de Stripe (si falla no pasa nada)
    if (cobro) {
      stripe.paymentIntents
        .update(cobro.id, { metadata: { numero_pedido: String(pedido.numero_pedido) } })
        .catch((err) => console.error('[stripe] No se pudo poner metadata:', err.message));
    }

    res.status(201).json({
      numero_pedido: Number(pedido.numero_pedido),
      creado_en: pedido.creado_en,
      distancia_millas: delivery.millas,
      minutos: delivery.minutos,
      subtotal: datos.subtotalCentavos / 100,
      costo_delivery: delivery.costoCentavos / 100,
      monto_total: totalCentavos / 100,
      medio_pago: datos.medioPago,
      stripe_client_secret: cobro ? cobro.client_secret : null,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
