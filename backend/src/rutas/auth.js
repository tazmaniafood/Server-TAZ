// =========================================================
//  Inicio de sesión del panel admin
//    POST /api/login    { usuario, clave } -> { usuario, tipo_usuario }  (pone la cookie)
//    POST /api/logout                      -> { ok: true }               (borra la cookie)
//    GET  /api/sesion                      -> { usuario, tipo_usuario }  o 401
// =========================================================
const { Router } = require('express');
const config = require('../config');
const sesion = require('../servicios/sesion');

const router = Router();

router.post('/login', async (req, res, next) => {
  try {
    if (!config.sesion.secreto) return res.status(503).json({ error: 'El inicio de sesión no está configurado' });
    const { usuario, clave } = req.body || {};
    if (typeof usuario !== 'string' || typeof clave !== 'string' || !usuario.trim() || !clave || clave.length > 200) {
      return res.status(400).json({ error: 'Escribe tu usuario y contraseña' });
    }
    const u = await sesion.comprobarClave(usuario.trim().toLowerCase().slice(0, 50), clave);
    if (!u) return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
    sesion.abrir(res, u);
    res.json({ usuario: u.usuario, tipo_usuario: u.tipo_usuario });
  } catch (err) {
    next(err);
  }
});

router.post('/logout', (req, res) => {
  sesion.cerrar(res);
  res.json({ ok: true });
});

router.get('/sesion', sesion.requiere(), (req, res) => {
  res.json({ usuario: req.usuario.usuario, tipo_usuario: req.usuario.tipo_usuario });
});

module.exports = router;
