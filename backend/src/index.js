// =========================================================
//  Servidor Tazmania (Express)
// =========================================================
const express = require('express');
const db = require('./db/pool');

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.set('trust proxy', 'loopback'); // Nginx está delante
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

// Aquí irán las rutas de pedidos, login y Stripe

app.use((req, res) => res.status(404).json({ error: 'No encontrado' }));

async function iniciar() {
  await db.comprobarConexion();
  console.log('[db] Conectado a PostgreSQL');

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
