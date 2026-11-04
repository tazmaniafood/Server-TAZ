// =========================================================
//  Servidor Tazmania (Express)
// =========================================================
const express = require('express');
const db = require('./db/pool');
const config = require('./config');
const { limitePorIp } = require('./middleware/limite');

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.set('trust proxy', 'loopback'); // Nginx está delante

// Webhook de Stripe ANTES de express.json (necesita el body crudo)
app.use('/api', require('./rutas/stripeWebhook'));

app.use(express.json({ limit: '100kb' }));

// Estado del servidor y de la base de datos
app.get('/api/salud', async (req, res) => {
  try {
    await db.comprobarConexion();
    res.json({ ok: true, db: 'conectada' });
  } catch (err) {
    res.status(503).json({ ok: false, db: 'sin conexión' });
  }
});

app.use('/api', require('./rutas/publico'));
app.use('/api/delivery', limitePorIp({ maximo: 30, ventanaMs: 60 * 1000 }));
app.use('/api', require('./rutas/delivery'));
app.use('/api/pedidos', limitePorIp({ maximo: 10, ventanaMs: 60 * 1000 }));
app.use('/api', require('./rutas/pedidos'));

// Aquí irán las rutas de login y panel de admin

app.use((req, res) => res.status(404).json({ error: 'No encontrado' }));

// Errores: los esperados (validación, fuera de zona) muestran su mensaje,
// los inesperados solo se registran en el log
app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'JSON inválido' });
  if (err.status && err.status < 500) return res.status(err.status).json({ error: err.message });
  if (err.status === 503) return res.status(503).json({ error: err.message });
  console.error('[api]', err);
  res.status(500).json({ error: 'Error interno, intenta de nuevo' });
});

async function iniciar() {
  await db.comprobarConexion();
  console.log('[db] Conectado a PostgreSQL');
  if (!config.deliveryListo) console.warn('[config] Falta GOOGLE_MAPS_SERVER_KEY o RESTAURANTE_LAT/LNG: no se aceptarán pedidos');
  if (!config.stripeListo) console.warn('[config] Falta STRIPE_SECRET_KEY o STRIPE_WEBHOOK_SECRET: pago con tarjeta desactivado');

  const servidor = app.listen(PORT, '127.0.0.1', () => {
    console.log(`[api] Escuchando en http://127.0.0.1:${PORT}`);
  });

  // Apagado limpio (pm2 restart / reboot)
  const apagar = async (senal) => {
    console.log(`[api] ${senal} recibido, cerrando...`);
    servidor.close(async () => {
      await db.cerrar();
      process.exit(0);
    });
  };
  process.on('SIGINT', apagar);
  process.on('SIGTERM', apagar);
}

iniciar().catch((err) => {
  console.error('[api] No se pudo iniciar:', err.message);
  process.exit(1);
});
