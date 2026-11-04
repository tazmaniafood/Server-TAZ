#!/usr/bin/env node
// =========================================================
//  Genera database/datos/menu_inicial.sql a partir del menú base
//  del panel admin (Frontend-admin/JS/menu-base.js).
//  Volver a ejecutarlo cada vez que cambie menu-base.js.
//
//  Uso:
//    node scripts/generar_menu_inicial.js ../Frontend-admin/JS/menu-base.js
//
//  El SQL generado actualiza la "base" de cada elemento SIN borrar
//  los cambios hechos desde el admin, y elimina lo que ya no existe.
// =========================================================
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const origen = process.argv[2];
if (!origen) {
  console.error('Uso: node scripts/generar_menu_inicial.js <ruta a menu-base.js>');
  process.exit(1);
}

// menu-base.js define window.TAZ_MENU_BASE: se ejecuta aislado, sin acceso a nada
const caja = { window: {} };
vm.runInNewContext(fs.readFileSync(origen, 'utf8'), caja, { timeout: 1000 });
const M = caja.window.TAZ_MENU_BASE;
if (!M || !Array.isArray(M.secciones) || !Array.isArray(M.platos)) {
  console.error('No se encontró window.TAZ_MENU_BASE con secciones y platos');
  process.exit(1);
}

// Igual que la página Menú del admin: id -> campos editables
const filas = [];
for (const s of M.secciones) {
  s.items.forEach((it) => {
    if (s.extras) {
      filas.push({ id: it.id, seccion: s.id, base: { n: it.n } });
      for (const pl of M.platos) {
        if (!it.plato || !it.plato[pl.id]) throw new Error(`${it.id} no tiene datos para ${pl.id}`);
        filas.push({ id: `${it.id}@${pl.id}`, seccion: s.id, base: it.plato[pl.id] });
      }
    } else {
      const { id, ...campos } = it;
      filas.push({ id, seccion: s.id, base: campos });
    }
  });
}

const ids = new Set();
for (const f of filas) {
  if (ids.has(f.id)) throw new Error(`id repetido: ${f.id}`);
  ids.add(f.id);
}

const lit = (s) => `'${String(s).replace(/'/g, "''")}'`;
const valores = filas
  .map((f, i) => `    (${lit(f.id)}, ${lit(f.seccion)}, ${i + 1}, ${lit(JSON.stringify(f.base))}::jsonb)`)
  .join(',\n');

const sql = `-- =========================================================
--  MENÚ INICIAL (GENERADO, no editar a mano)
--  Origen: Frontend-admin/JS/menu-base.js
--  Regenerar: node scripts/generar_menu_inicial.js <ruta a menu-base.js>
--  Uso:
--    psql -h localhost -U tazmania -d tazmania_db -f database/datos/menu_inicial.sql
--  Actualiza la base de cada elemento SIN tocar los cambios del admin
--  y borra los elementos que ya no están en menu-base.js.
-- =========================================================
\\set ON_ERROR_STOP on
BEGIN;

INSERT INTO menu (id, seccion, orden, base) VALUES
${valores}
ON CONFLICT (id) DO UPDATE
    SET seccion = EXCLUDED.seccion,
        orden   = EXCLUDED.orden,
        base    = EXCLUDED.base;

DELETE FROM menu WHERE id NOT IN (
${filas.map((f) => `    ${lit(f.id)}`).join(',\n')}
);

COMMIT;

SELECT seccion, count(*) AS elementos FROM menu GROUP BY seccion ORDER BY min(orden);
`;

const destino = path.join(__dirname, '..', 'database', 'datos', 'menu_inicial.sql');
fs.writeFileSync(destino, sql);
console.log(`>> ${filas.length} elementos escritos en ${path.relative(process.cwd(), destino)}`);
