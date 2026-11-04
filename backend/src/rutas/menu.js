// =========================================================
//  Menú
//    GET /api/menu           (público, para la tienda)
//        -> { items: { "<id>": { seccion, n, d?, p, g?, ing? } }, actualizado }
//    GET /api/menu/cambios   (admin) -> { cambios, actualizado }
//    PUT /api/menu           (admin) { cambios: { "<id>": { n?, d?, p?, g?, ing? } }, actualizado }
//        Reemplaza TODOS los cambios: un id que no viene vuelve al original.
//        Es lo que manda Frontend-admin/JS/menu.js.
// =========================================================
const { Router } = require('express');
const db = require('../db/pool');
const { requiere } = require('../servicios/sesion');
const { ErrorValidacion } = require('../validar');

const router = Router();
const LIM = { n: 60, d: 220, p: 999, g: 99999 };

router.get('/menu', async (req, res, next) => {
  try {
    const { rows } = await db.query(
      `SELECT id, seccion, base || cambios AS datos,
              max(actualizado_cliente) OVER () AS actualizado
         FROM menu ORDER BY orden`
    );
    const items = {};
    for (const r of rows) items[r.id] = { seccion: r.seccion, ...r.datos };
    res.set('Cache-Control', 'no-cache');
    res.json({ items, actualizado: rows.length ? Number(rows[0].actualizado) : 0 });
  } catch (err) {
    next(err);
  }
});

router.get('/menu/cambios', requiere('admin'), async (req, res, next) => {
  try {
    const { rows } = await db.query(
      `SELECT id, cambios, max(actualizado_cliente) OVER () AS actualizado
         FROM menu ORDER BY orden`
    );
    const cambios = {};
    for (const r of rows) if (Object.keys(r.cambios).length) cambios[r.id] = r.cambios;
    res.json({ cambios, actualizado: rows.length ? Number(rows[0].actualizado) : 0 });
  } catch (err) {
    next(err);
  }
});

// ---- Validación: cada cambio debe tener la misma forma que el original ----
const esNum = (x, max) => typeof x === 'number' && Number.isFinite(x) && x >= 0 && x <= max;
const precioOk = (x) => esNum(x, LIM.p) && Math.abs(Math.round(x * 100) - x * 100) < 1e-6;
const porcionOk = (x) => x === null || esNum(x, LIM.g);

/** Mismo formato que el original: lista del mismo largo o valor suelto */
function igualForma(nuevo, original, ok) {
  if (Array.isArray(original)) return Array.isArray(nuevo) && nuevo.length === original.length && nuevo.every(ok);
  return !Array.isArray(nuevo) && ok(nuevo);
}

function validarCampo(id, k, x, base) {
  const mal = (m) => { throw new ErrorValidacion(`${id}: ${m}`); };
  if (!(k in base)) mal(`el campo "${k}" no existe`);
  switch (k) {
    case 'n':
      if (typeof x !== 'string' || !x.trim() || x.length > LIM.n) mal(`nombre vacío o de más de ${LIM.n} letras`);
      return x.trim();
    case 'd':
      if (typeof x !== 'string' || x.length > LIM.d) mal(`descripción de más de ${LIM.d} letras`);
      return x.trim();
    case 'p':
      if (!igualForma(x, base.p, precioOk)) mal(`precio inválido (0 a ${LIM.p}, máx. 2 decimales)`);
      return x;
    case 'g':
      if (!igualForma(x, base.g, porcionOk)) mal(`porción inválida (0 a ${LIM.g} o vacía)`);
      return x;
    case 'ing':
      if (!Array.isArray(x) || x.length !== base.ing.length) mal('los ingredientes no coinciden con el plato');
      return x.map((r, i) => {
        if (!r || typeof r !== 'object' || typeof r.n !== 'string' || !r.n.trim() || r.n.length > LIM.n) mal(`ingrediente ${i + 1} sin nombre`);
        if (!igualForma(r.g, base.ing[i].g, porcionOk)) mal(`porción del ingrediente ${i + 1} inválida`);
        return { n: r.n.trim(), g: r.g };
      });
    default:
      mal(`el campo "${k}" no se puede cambiar`);
  }
}

router.put('/menu', requiere('admin'), async (req, res, next) => {
  try {
    const { cambios, actualizado } = req.body || {};
    if (!cambios || typeof cambios !== 'object' || Array.isArray(cambios)) throw new ErrorValidacion('Falta cambios');
    if (!Number.isSafeInteger(actualizado) || actualizado < 0) throw new ErrorValidacion('Falta actualizado');

    const { rows } = await db.query('SELECT id, base FROM menu');
    const bases = new Map(rows.map((r) => [r.id, r.base]));

    const limpio = {};
    for (const [id, c] of Object.entries(cambios)) {
      const base = bases.get(id);
      if (!base) throw new ErrorValidacion(`${id}: no existe en el menú`);
      if (!c || typeof c !== 'object' || Array.isArray(c)) throw new ErrorValidacion(`${id}: formato inválido`);
      const campos = {};
      for (const [k, x] of Object.entries(c)) campos[k] = validarCampo(id, k, x, base);
      if (Object.keys(campos).length) limpio[id] = campos;
    }

    const resultado = await db.transaccion(async (cli) => {
      // Si llega un envío viejo (otro navegador que estaba sin internet) no pisa uno más nuevo
      const { rows: [{ ultimo }] } = await cli.query(
        'SELECT COALESCE(max(actualizado_cliente), 0) AS ultimo FROM menu'
      );
      if (Number(ultimo) > actualizado) return { aplicado: false, actualizado: Number(ultimo) };

      await cli.query(
        `UPDATE menu
            SET cambios = COALESCE($1::jsonb -> id, '{}'::jsonb),
                actualizado_cliente = $2,
                actualizado_en = now()`,
        [JSON.stringify(limpio), actualizado]
      );
      return { aplicado: true, actualizado };
    });

    if (resultado.aplicado) {
      console.log(`[menu] ${req.usuario.usuario} guardó ${Object.keys(limpio).length} elementos modificados`);
    }
    res.json({ ok: true, ...resultado });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
