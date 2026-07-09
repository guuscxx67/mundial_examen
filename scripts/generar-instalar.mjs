// ============================================================================
//  Generador de db/instalar.sql (instalador completo para pgAdmin):
//  schema.sql + seed.sql + el cuadro de fase final tomado de la base de datos
//  en ejecucion (docker: mundial2026_db).
//
//  Uso:  node scripts/generar-instalar.mjs
//  Requiere: contenedor de PostgreSQL arriba y cuadro de fase final generado.
// ============================================================================
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const leer = (f) => fs.readFileSync(path.join(root, 'db', f), 'utf8');

// 1) Cuadro de fase final desde la BD viva (INSERTs por columna)
const dump = execSync(
  'docker exec mundial2026_db pg_dump -U mundial -d mundial2026 --data-only --table=fase_final --column-inserts',
  { encoding: 'utf8' },
);
const insertsFF = dump.split('\n').filter((l) => l.startsWith('INSERT INTO'));
if (insertsFF.length !== 32) {
  throw new Error(`Se esperaban 32 INSERTs de fase_final y se obtuvieron ${insertsFF.length}. ¿Esta generado el cuadro?`);
}
// pg_dump escribe "INSERT INTO public.fase_final"; normalizamos sin esquema
const ff = insertsFF.map((l) => l.replace('INSERT INTO public.fase_final', 'INSERT INTO fase_final'));

// 2) Seed sin BEGIN/COMMIT ni reajuste de secuencias (se agregan al final)
const seed = leer('seed.sql').split('\n').filter((l) =>
  l.trim() !== 'BEGIN;' && l.trim() !== 'COMMIT;' &&
  !l.startsWith('SELECT setval(') && !l.startsWith('-- Reajustar'),
).join('\n').trimEnd();

const L = [];
L.push('-- INSTALADOR COMPLETO Mundial 2026 (PostgreSQL) - datos reales al 08/07/2026');
L.push('-- Ejecutar en una base NUEVA y VACIA. En pgAdmin: crear BD mundial2026 -> Query Tool -> abrir -> Run.');
L.push('-- GENERADO por scripts/generar-instalar.mjs (no editar a mano).');
L.push('');
L.push(leer('schema.sql').trimEnd());
L.push('');
L.push('BEGIN;');
L.push(seed);
L.push('');
L.push('-- 7) FASE FINAL (cuadro de 32 llaves generado automaticamente: dieciseisavos');
L.push('--    sembrados desde la clasificacion + rondas siguientes con sede asignada)');
L.push(...ff);
L.push('');
L.push('-- Reajustar secuencias');
const seqs = [
  ['continentes_id_continente_seq', 'continentes', 'id_continente'],
  ['selecciones_id_seq', 'selecciones', 'id'],
  ['grupos_id_seq', 'grupos', 'id'],
  ['estadios_id_seq', 'estadios', 'id'],
  ['clasificaciones_id_seq', 'clasificaciones', 'id'],
  ['partidos_id_seq', 'partidos', 'id'],
  ['fase_final_id_seq', 'fase_final', 'id'],
  ['usuarios_id_seq', 'usuarios', 'id'],
  ['boletos_id_seq', 'boletos', 'id'],
];
for (const [seq, tabla, col] of seqs) {
  L.push(`SELECT setval('${seq}', (SELECT COALESCE(MAX(${col}),1) FROM ${tabla}));`);
}
L.push('');
L.push('COMMIT;');
L.push('');

fs.writeFileSync(path.join(root, 'db', 'instalar.sql'), L.join('\n'));
console.log(`instalar.sql generado (${ff.length} llaves de fase final incluidas).`);
