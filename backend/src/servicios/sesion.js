// =========================================================
//  Sesión del panel admin con cookie firmada (HMAC-SHA256)
//  No guarda nada en la base: la cookie lleva el id del usuario,
//  la hora de vencimiento y una huella de su contraseña. Si se
//  cambia la contraseña, todas las sesiones abiertas dejan de valer.
// =========================================================
const crypto = require('crypto');
const db = require('../db/pool');
const config = require('../config');

const COOKIE = 'taz_sesion';
const DURACION_MS = 12 * 60 * 60 * 1000; // 12 horas

const b64 = (buf) => Buffer.from(buf).toString('base64url');
const firmar = (texto) => b64(crypto.createHmac('sha256', config.sesion.secreto).update(texto).digest());
const huella = (hash) => firmar(`clave:${hash}`).slice(0, 16);

function crearToken(usuario) {
  const datos = b64(JSON.stringify({ id: String(usuario.id_usuario), h: huella(usuario.contrasena_hash), exp: Date.now() + DURACION_MS }));
  return `${datos}.${firmar(datos)}`;
}

function leerCookie(req) {
  const cabecera = req.get('cookie') || '';
  for (const parte of cabecera.split(';')) {
    const i = parte.indexOf('=');
    if (i > 0 && parte.slice(0, i).trim() === COOKIE) return parte.slice(i + 1).trim();
  }
  return null;
}

/** Devuelve el usuario de la sesión o null. */
async function usuarioDeSesion(req) {
  if (!config.sesion.secreto) return null;
  const token = leerCookie(req);
  if (!token) return null;
  const [datos, firma] = token.split('.');
  if (!datos || !firma) return null;
  const esperada = firmar(datos);
  if (firma.length !== esperada.length || !crypto.timingSafeEqual(Buffer.from(firma), Buffer.from(esperada))) return null;

  let s;
  try {
    s = JSON.parse(Buffer.from(datos, 'base64url').toString('utf8'));
  } catch {
    return null;
  }
  if (!s || typeof s.exp !== 'number' || s.exp < Date.now() || !/^\d+$/.test(s.id)) return null;

  const { rows } = await db.query(
    'SELECT id_usuario, usuario, tipo_usuario, contrasena_hash FROM usuarios WHERE id_usuario = $1',
    [s.id]
  );
  const u = rows[0];
  if (!u || huella(u.contrasena_hash) !== s.h) return null;
  return { id_usuario: Number(u.id_usuario), usuario: u.usuario, tipo_usuario: u.tipo_usuario };
}

/** Comprueba usuario y contraseña (bcrypt en PostgreSQL). Devuelve la fila o null. */
async function comprobarClave(usuario, clave) {
  const { rows } = await db.query(
    `SELECT id_usuario, usuario, tipo_usuario, contrasena_hash
       FROM usuarios
      WHERE usuario = $1 AND contrasena_hash = crypt($2, contrasena_hash)`,
    [usuario, clave]
  );
  return rows[0] || null;
}

const opcionesCookie = () => ({
  httpOnly: true,               // JavaScript de la página no la puede leer
  secure: config.sesion.cookieSegura, // solo por HTTPS
  sameSite: 'strict',           // no se envía desde otros sitios (evita CSRF)
  path: '/api',
});

function abrir(res, usuario) {
  res.cookie(COOKIE, crearToken(usuario), { ...opcionesCookie(), maxAge: DURACION_MS });
}

function cerrar(res) {
  res.clearCookie(COOKIE, opcionesCookie());
}

/** Middleware: solo deja pasar a usuarios con sesión y uno de los tipos indicados. */
function requiere(...tipos) {
  return async (req, res, next) => {
    try {
      const u = await usuarioDeSesion(req);
      if (!u) return res.status(401).json({ error: 'Inicia sesión' });
      if (tipos.length && !tipos.includes(u.tipo_usuario)) return res.status(403).json({ error: 'No tienes permiso' });
      req.usuario = u;
      next();
    } catch (err) {
      next(err);
    }
  };
}

module.exports = { usuarioDeSesion, comprobarClave, abrir, cerrar, requiere };
