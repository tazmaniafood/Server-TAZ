// =========================================================
//  Límite de peticiones por IP (en memoria)
//  Evita que alguien gaste el cupo de Google o llene la base
//  de pedidos falsos.
// =========================================================
function limitePorIp({ maximo, ventanaMs }) {
  const visitas = new Map();

  setInterval(() => {
    const ahora = Date.now();
    for (const [ip, v] of visitas) if (v.reinicia <= ahora) visitas.delete(ip);
  }, ventanaMs).unref();

  return (req, res, next) => {
    const ahora = Date.now();
    let v = visitas.get(req.ip);
    if (!v || v.reinicia <= ahora) {
      v = { cuenta: 0, reinicia: ahora + ventanaMs };
      visitas.set(req.ip, v);
    }
    v.cuenta += 1;
    if (v.cuenta > maximo) {
      res.set('Retry-After', String(Math.ceil((v.reinicia - ahora) / 1000)));
      return res.status(429).json({ error: 'Demasiadas solicitudes, espera un momento' });
    }
    next();
  };
}

module.exports = { limitePorIp };
