// =========================================================
//  POST /api/stripe/webhook
//  Stripe avisa aquí cuando un pago se completa.
//  Necesita el body CRUDO (sin JSON) para verificar la firma,
//  por eso se registra antes de express.json() en index.js.
// =========================================================
const express = require('express');
const db = require('../db/pool');
const config = require('../config');
const { stripe } = require('../servicios/stripe');

const router = express.Router();

router.post('/stripe/webhook', express.raw({ type: 'application/json', limit: '1mb' }), async (req, res) => {
  if (!config.stripeListo) return res.status(503).end();

  let evento;
  try {
    evento = stripe.webhooks.constructEvent(req.body, req.get('stripe-signature'), config.stripe.secretoWebhook);
  } catch (err) {
    console.warn('[stripe] Firma de webhook inválida:', err.message);
    return res.status(400).send('Firma inválida');
  }

  try {
    if (evento.type === 'payment_intent.succeeded') {
      const pago = evento.data.object;
      // Solo se confirma si lo cobrado coincide con el total del pedido
      const { rowCount } = await db.query(
        `UPDATE pedidos SET pago_confirmado = true
          WHERE stripe_payment_intent_id = $1
            AND round(monto_total * 100) = $2
            AND NOT pago_confirmado`,
        [pago.id, pago.amount_received]
      );
      console.log(`[stripe] Pago ${pago.id} recibido (${rowCount ? 'pedido confirmado' : 'sin cambios'})`);
    } else if (evento.type === 'payment_intent.payment_failed') {
      console.warn(`[stripe] Pago fallido ${evento.data.object.id}`);
    }
    res.json({ recibido: true });
  } catch (err) {
    console.error('[stripe] Error procesando webhook:', err.message);
    res.status(500).end(); // Stripe lo reintenta
  }
});

module.exports = router;
