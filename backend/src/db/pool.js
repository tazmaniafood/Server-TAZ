// =========================================================
//  Pool de conexiones a PostgreSQL
//  Mantiene varias conexiones abiertas y las reutiliza, así
//  cada consulta no tiene que abrir una conexión nueva.
// =========================================================
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: Number(process.env.DB_POOL_MAX) || 20,
  idleTimeoutMillis: Number(process.env.DB_POOL_IDLE_MS) || 30000,
  connectionTimeoutMillis: Number(process.env.DB_POOL_TIMEOUT_MS) || 5000,
  application_name: 'taz-backend',
});

// Si una conexión inactiva se cae, se registra sin tumbar el servidor
pool.on('error', (err) => {
  console.error('[db] Error en una conexión inactiva del pool:', err.message);
});

/**
 * Consulta simple. Usar siempre parámetros ($1, $2...) para evitar inyección SQL.
 *   const { rows } = await query('SELECT * FROM pedidos WHERE numero_pedido = $1', [id]);
 */
function query(text, params) {
  return pool.query(text, params);
}

/**
 * Varias consultas que deben ir juntas: si una falla, se deshacen todas.
 *   await transaccion(async (client) => {
 *     await client.query('...');
 *     await client.query('...');
 *   });
 */
async function transaccion(fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const resultado = await fn(client);
    await client.query('COMMIT');
    return resultado;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/** Comprueba que la base de datos responde. */
async function comprobarConexion() {
  await pool.query('SELECT 1');
}

/** Cierra todas las conexiones (al apagar el servidor). */
function cerrar() {
  return pool.end();
}

module.exports = { pool, query, transaccion, comprobarConexion, cerrar };
