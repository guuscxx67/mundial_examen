// ============================================================================
//  Generador del archivo db/seed.sql a partir del dataset verificado
//  (db/dataset.json). Asigna IDs deterministas, simula resultados de la fase
//  de grupos (12 grupos completos) y produce los INSERT de todas las tablas.
//
//  Uso:  node scripts/generar-seed.mjs
// ============================================================================
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const data = JSON.parse(fs.readFileSync(path.join(root, 'db', 'dataset.json'), 'utf8'));

// --- Utilidades --------------------------------------------------------------
const q = (s) => (s == null ? 'NULL' : `'${String(s).replace(/'/g, "''")}'`);
const num = (n) => (n == null ? 'NULL' : Number(n));

// RNG determinista (mulberry32) para resultados reproducibles
function mulberry32(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rnd = mulberry32(20260611);

// Goles simulados segun ranking (mejor ranking => mas probable anotar)
function golesDe(miRank, rivalRank) {
  const ventaja = (rivalRank - miRank) / 40;        // + si soy mas fuerte
  let g = 1.1 + ventaja + (rnd() * 2.2 - 0.8);
  return Math.max(0, Math.min(5, Math.round(g)));
}

// --- Mapeo de confederaciones a continentes ---------------------------------
const CONTINENTES = [
  { id: 1, nombre: 'Europa',          confederacion: 'UEFA',     desc: 'Union de Asociaciones Europeas de Futbol' },
  { id: 2, nombre: 'America del Sur',  confederacion: 'CONMEBOL', desc: 'Confederacion Sudamericana de Futbol' },
  { id: 3, nombre: 'America del Norte',confederacion: 'CONCACAF', desc: 'Confederacion de Norteamerica, Centroamerica y el Caribe' },
  { id: 4, nombre: 'Africa',           confederacion: 'CAF',      desc: 'Confederacion Africana de Futbol' },
  { id: 5, nombre: 'Asia',             confederacion: 'AFC',      desc: 'Confederacion Asiatica de Futbol' },
  { id: 6, nombre: 'Oceania',          confederacion: 'OFC',      desc: 'Confederacion de Futbol de Oceania' },
];
const confToContinente = Object.fromEntries(CONTINENTES.map((c) => [c.confederacion, c.id]));

// --- Asignar IDs a selecciones ----------------------------------------------
const selecciones = [];
const nombreToId = new Map();
let sid = 1;
for (const conf of data.confederaciones) {
  for (const e of conf.equipos) {
    const reg = { id: sid++, id_continente: confToContinente[conf.confederacion], ...e };
    selecciones.push(reg);
    nombreToId.set(e.nombre, reg.id);
    nombreToId.set(e.nombre.toLowerCase(), reg.id);
  }
}

// --- Estadios ----------------------------------------------------------------
const estadios = data.estadios.map((e, i) => ({ id: i + 1, ...e }));

// --- Grupos ------------------------------------------------------------------
const grupos = data.grupos.map((g, i) => ({ id: i + 1, nombre: g.nombre, equipos: g.equipos }));

// --- Fechas y horarios -------------------------------------------------------
const fechasMD = {
  1: ['2026-06-11', '2026-06-12', '2026-06-13'],
  2: ['2026-06-17', '2026-06-18', '2026-06-19'],
  3: ['2026-06-24', '2026-06-25', '2026-06-26'],
};
const horarios = ['12:00', '15:00', '18:00', '21:00'];

// --- Partidos de la fase de grupos (round robin de 4 equipos) ---------------
// Emparejamientos: J1: 1-2,3-4 | J2: 1-3,2-4 | J3: 1-4,2-3
const enfrentamientos = [
  [[0, 1], [2, 3]],
  [[0, 2], [1, 3]],
  [[0, 3], [1, 2]],
];

const clasificaciones = [];
const partidos = [];
let clasId = 1;
let partidoId = 1;
let globalMatch = 0;

grupos.forEach((g, gi) => {
  const ids = g.equipos.map((n) => nombreToId.get(n) ?? nombreToId.get(n.toLowerCase()));
  // Membresias de grupo (la tabla de posiciones se recalcula por trigger)
  ids.forEach((idSel) => clasificaciones.push({ id: clasId++, id_grupo: g.id, id_seleccion: idSel }));

  enfrentamientos.forEach((jornada, jdx) => {
    jornada.forEach(([a, b], k) => {
      const local = selecciones.find((s) => s.id === ids[a]);
      const visit = selecciones.find((s) => s.id === ids[b]);
      const gl = golesDe(local.ranking_fifa, visit.ranking_fifa);
      const gv = golesDe(visit.ranking_fifa, local.ranking_fifa);
      const fecha = fechasMD[jdx + 1][gi % 3];
      const horario = horarios[(gi * 2 + k) % horarios.length];
      const id_estadio = (globalMatch % estadios.length) + 1;
      partidos.push({
        id: partidoId++, fase: 'Grupos', id_grupo: g.id,
        local: local.id, visit: visit.id,
        gl, gv, fecha, horario, id_estadio, jugado: true,
      });
      globalMatch++;
    });
  });
});

// --- Usuarios ----------------------------------------------------------------
const usuarios = [
  { id: 1, nombre: 'Gustavo Ramirez',  email: 'gustavo@example.com' },
  { id: 2, nombre: 'Maria Hernandez',  email: 'maria@example.com' },
  { id: 3, nombre: 'Carlos Mendoza',   email: 'carlos@example.com' },
  { id: 4, nombre: 'Ana Torres',       email: 'ana@example.com' },
  { id: 5, nombre: 'Luis Gomez',       email: 'luis@example.com' },
  { id: 6, nombre: 'Sofia Martinez',   email: 'sofia@example.com' },
  { id: 7, nombre: 'Diego Flores',     email: 'diego@example.com' },
  { id: 8, nombre: 'Valeria Cruz',     email: 'valeria@example.com' },
];

// --- Boletos (uno por cada uno de los primeros 20 partidos) -----------------
const diasSemana = ['Jueves', 'Viernes', 'Sabado', 'Domingo', 'Miercoles'];
const costos = [1200, 1800, 2500, 3200, 4500, 6000];
const boletos = [];
for (let i = 0; i < 20; i++) {
  const p = partidos[i];
  boletos.push({
    id: i + 1,
    id_usuario: (i % usuarios.length) + 1,
    id_estadio: p.id_estadio,
    id_partido: p.id,
    id_seleccion: i % 2 === 0 ? p.local : p.visit,
    dia: diasSemana[i % diasSemana.length],
    fecha: p.fecha,
    horario: p.horario,
    costo: costos[i % costos.length],
  });
}

// ============================================================================
//  Construir el SQL
// ============================================================================
const L = [];
L.push('-- ============================================================================');
L.push('--  COPA MUNDIAL FIFA 2026  -  Datos de carga (seed)');
L.push('--  GENERADO AUTOMATICAMENTE por scripts/generar-seed.mjs  (no editar a mano)');
L.push('--  48 selecciones | 16 estadios | 12 grupos | 72 partidos de fase de grupos');
L.push('-- ============================================================================');
L.push('SET client_encoding = \'UTF8\';');
L.push('BEGIN;');
L.push('');

L.push('-- 1) CONTINENTES');
for (const c of CONTINENTES) {
  L.push(`INSERT INTO continentes (id_continente, nombre, confederacion, descripcion) VALUES (${c.id}, ${q(c.nombre)}, ${q(c.confederacion)}, ${q(c.desc)});`);
}
L.push('');

L.push('-- 2) SELECCIONES (con geolocalizacion de la capital)');
for (const s of selecciones) {
  L.push(`INSERT INTO selecciones (id, nombre, id_continente, pais, capital, historia, ventajas, desventajas, ranking, bandera, latitud, longitud) VALUES (${s.id}, ${q(s.nombre)}, ${s.id_continente}, ${q(s.pais)}, ${q(s.capital)}, ${q(s.historia)}, ${q(s.ventajas)}, ${q(s.desventajas)}, ${num(s.ranking_fifa)}, ${q(s.bandera)}, ${num(s.latitud)}, ${num(s.longitud)});`);
}
L.push('');

L.push('-- 3) GRUPOS');
for (const g of grupos) {
  L.push(`INSERT INTO grupos (id, nombre) VALUES (${g.id}, ${q(g.nombre)});`);
}
L.push('');

L.push('-- 4) ESTADIOS (con geolocalizacion)');
for (const e of estadios) {
  L.push(`INSERT INTO estadios (id, nombre, ciudad, pais, latitud, longitud, capacidad) VALUES (${e.id}, ${q(e.nombre)}, ${q(e.ciudad)}, ${q(e.pais)}, ${num(e.latitud)}, ${num(e.longitud)}, ${num(e.capacidad)});`);
}
L.push('');

L.push('-- 6) CLASIFICACIONES (membresias de grupo; el trigger recalcula las estadisticas)');
for (const c of clasificaciones) {
  L.push(`INSERT INTO clasificaciones (id, id_grupo, id_seleccion) VALUES (${c.id}, ${c.id_grupo}, ${c.id_seleccion});`);
}
L.push('');

L.push('-- 5) PARTIDOS de la fase de grupos (resultados simulados de forma determinista)');
L.push('--    Cada INSERT dispara el trigger que actualiza la tabla de posiciones del grupo.');
for (const p of partidos) {
  L.push(`INSERT INTO partidos (id, fase, id_grupo, id_equipo_local, id_equipo_visitante, goles_local, goles_visitante, fecha, horario, id_estadio, jugado) VALUES (${p.id}, 'Grupos', ${p.id_grupo}, ${p.local}, ${p.visit}, ${p.gl}, ${p.gv}, '${p.fecha}', '${p.horario}', ${p.id_estadio}, TRUE);`);
}
L.push('');

L.push('-- 8) USUARIOS');
for (const u of usuarios) {
  L.push(`INSERT INTO usuarios (id, nombre, email) VALUES (${u.id}, ${q(u.nombre)}, ${q(u.email)});`);
}
L.push('');

L.push('-- 9) BOLETOS');
for (const b of boletos) {
  L.push(`INSERT INTO boletos (id, id_usuario, id_estadio, id_partido, id_seleccion, dia, fecha, horario, costo) VALUES (${b.id}, ${b.id_usuario}, ${b.id_estadio}, ${b.id_partido}, ${b.id_seleccion}, ${q(b.dia)}, '${b.fecha}', '${b.horario}', ${b.costo});`);
}
L.push('');

L.push('-- Reajustar las secuencias (porque insertamos IDs explicitos)');
const seqs = [
  ["continentes_id_continente_seq", "continentes", "id_continente"],
  ["selecciones_id_seq", "selecciones", "id"],
  ["grupos_id_seq", "grupos", "id"],
  ["estadios_id_seq", "estadios", "id"],
  ["clasificaciones_id_seq", "clasificaciones", "id"],
  ["partidos_id_seq", "partidos", "id"],
  ["usuarios_id_seq", "usuarios", "id"],
  ["boletos_id_seq", "boletos", "id"],
];
for (const [seq, tabla, col] of seqs) {
  L.push(`SELECT setval('${seq}', (SELECT COALESCE(MAX(${col}), 1) FROM ${tabla}));`);
}
L.push('');
L.push('COMMIT;');
L.push('');

fs.writeFileSync(path.join(root, 'db', 'seed.sql'), L.join('\n'));
console.log(`seed.sql generado: ${selecciones.length} selecciones, ${estadios.length} estadios, ${grupos.length} grupos, ${partidos.length} partidos, ${clasificaciones.length} clasificaciones, ${boletos.length} boletos`);
