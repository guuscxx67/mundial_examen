// ============================================================================
//  Genera el dataset y el seed REALES del Mundial 2026 al 25/06/2026.
//  - 48 selecciones en sus grupos reales (con las posiciones aportadas).
//  - Reconstruye los marcadores individuales de cada partido mediante un solver
//    de restricciones, de modo que reproduzcan EXACTAMENTE las posiciones.
//  - Ancla los marcadores reales confirmados por la prensa (mapa FIXED).
//  Salidas: db/dataset.json (real) y db/seed.sql.
//  Uso: node scripts/generar-datos-reales.mjs
// ============================================================================
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

const CONF = {
  UEFA: { id: 1, cont: 'Europa' },
  CONMEBOL: { id: 2, cont: 'America del Sur' },
  CONCACAF: { id: 3, cont: 'America del Norte' },
  CAF: { id: 4, cont: 'Africa' },
  AFC: { id: 5, cont: 'Asia' },
  OFC: { id: 6, cont: 'Oceania' },
};

// --- Metadatos de las selecciones que ya teniamos (reutilizamos del dataset) ---
const viejo = JSON.parse(fs.readFileSync(path.join(root, 'db', 'dataset.json'), 'utf8'));
const meta = {};
for (const c of viejo.confederaciones) {
  for (const e of c.equipos) meta[e.nombre] = { ...e, confederacion: c.confederacion };
}
const estadios = viejo.estadios;

// --- Metadatos de las 10 selecciones nuevas (reales del Mundial 2026) ---
const NUEVOS = {
  'Sudafrica': { pais: 'Sudafrica', capital: 'Pretoria', latitud: -25.7479, longitud: 28.2293, ranking_fifa: 56, bandera: '🇿🇦', confederacion: 'CAF',
    historia: 'Sudafrica organizo el Mundial de 2010, el primero en suelo africano. Gano la Copa Africana de Naciones en 1996 como anfitriona. Los Bafana Bafana regresan a la elite mundial.',
    ventajas: 'Velocidad, juego colectivo dinamico y buen estado fisico.', desventajas: 'Irregularidad y poca experiencia mundialista reciente.' },
  'Republica Checa': { pais: 'Republica Checa', capital: 'Praga', latitud: 50.0755, longitud: 14.4378, ranking_fifa: 40, bandera: '🇨🇿', confederacion: 'UEFA',
    historia: 'Heredera de la escuela checoslovaca, fue subcampeona de la Eurocopa 1996 y semifinalista mundialista en 1934 y 1962. Mantiene una solida tradicion en Europa central.',
    ventajas: 'Orden tactico y buena tecnica individual.', desventajas: 'Generacion en transicion sin grandes estrellas.' },
  'Bosnia y Herzegovina': { pais: 'Bosnia y Herzegovina', capital: 'Sarajevo', latitud: 43.8563, longitud: 18.4131, ranking_fifa: 74, bandera: '🇧🇦', confederacion: 'UEFA',
    historia: 'Debuto en el Mundial de Brasil 2014 con figuras como Edin Dzeko. Es una seleccion competitiva del sureste europeo que vuelve a la cita mundialista.',
    ventajas: 'Poder ofensivo y caracter competitivo.', desventajas: 'Defensa vulnerable y poca profundidad de plantel.' },
  'Haiti': { pais: 'Haiti', capital: 'Puerto Principe', latitud: 18.5944, longitud: -72.3074, ranking_fifa: 86, bandera: '🇭🇹', confederacion: 'CONCACAF',
    historia: 'Haiti disputo su unico Mundial en Alemania 1974. Es una de las selecciones historicas del Caribe que regresa a la maxima cita pese a sus dificultades.',
    ventajas: 'Talento individual y velocidad en ataque.', desventajas: 'Falta de recursos e infraestructura futbolistica.' },
  'Curazao': { pais: 'Curazao', capital: 'Willemstad', latitud: 12.1084, longitud: -68.9335, ranking_fifa: 82, bandera: '🇨🇼', confederacion: 'CONCACAF',
    historia: 'Pequena isla del Caribe, Curazao gano la Copa del Caribe 2017 y vive una clasificacion historica aprovechando jugadores de origen neerlandes.',
    ventajas: 'Jugadores formados en ligas europeas.', desventajas: 'Escasa poblacion y nula experiencia mundialista.' },
  'Suecia': { pais: 'Suecia', capital: 'Estocolmo', latitud: 59.3293, longitud: 18.0686, ranking_fifa: 27, bandera: '🇸🇪', confederacion: 'UEFA',
    historia: 'Suecia fue subcampeona del mundo en 1958 como anfitriona y tercera en 1950 y 1994. Es una potencia tradicional del futbol nordico que llego a cuartos en 2018.',
    ventajas: 'Fortaleza fisica y solidez defensiva.', desventajas: 'Dependencia de transiciones y poca posesion.' },
  'Cabo Verde': { pais: 'Cabo Verde', capital: 'Praia', latitud: 14.9215, longitud: -23.5087, ranking_fifa: 70, bandera: '🇨🇻', confederacion: 'CAF',
    historia: 'Los Tiburones Azules son una de las grandes sorpresas del futbol africano, con un crecimiento notable en el ranking FIFA y una clasificacion historica.',
    ventajas: 'Cohesion grupal y crecimiento sostenido.', desventajas: 'Plantel limitado por el tamano del pais.' },
  'Jordania': { pais: 'Jordania', capital: 'Aman', latitud: 31.9539, longitud: 35.9106, ranking_fifa: 62, bandera: '🇯🇴', confederacion: 'AFC',
    historia: 'Jordania alcanzo la final de la Copa Asiatica 2023, su mejor resultado historico, y debuta en una Copa del Mundo con gran ambicion.',
    ventajas: 'Orden defensivo y juego directo.', desventajas: 'Poca experiencia ante potencias mundiales.' },
  'Republica Democratica del Congo': { pais: 'Republica Democratica del Congo', capital: 'Kinshasa', latitud: -4.4419, longitud: 15.2663, ranking_fifa: 57, bandera: '🇨🇩', confederacion: 'CAF',
    historia: 'La RD Congo (como Zaire) gano dos Copas Africanas (1968 y 1974) y disputo el Mundial de 1974. Es una cantera de gran talento fisico que resurge en Africa.',
    ventajas: 'Potencia fisica y talento individual.', desventajas: 'Inestabilidad institucional y federativa.' },
  'Ghana': { pais: 'Ghana', capital: 'Accra', latitud: 5.6037, longitud: -0.1870, ranking_fifa: 73, bandera: '🇬🇭', confederacion: 'CAF',
    historia: 'Las Estrellas Negras llegaron a cuartos en Sudafrica 2010, rozando la semifinal, y han ganado cuatro Copas Africanas. Son una seleccion muy respetada del continente.',
    ventajas: 'Fisico, juventud y tradicion mundialista.', desventajas: 'Inconsistencia y conflictos internos recurrentes.' },
};
for (const [nombre, d] of Object.entries(NUEVOS)) meta[nombre] = { nombre, ...d };

// --- Posiciones reales aportadas (al 25/06/2026). Orden = posicion en la tabla ---
// n = nombre formal en la BD. Grupos A,B,C completos (pj=3); D-L con pj=2.
const GRUPOS = [
  { nombre: 'A', equipos: [
    { n: 'Mexico', pj: 3, w: 3, d: 0, l: 0, gf: 6, gc: 0 },
    { n: 'Sudafrica', pj: 3, w: 1, d: 1, l: 1, gf: 2, gc: 3 },
    { n: 'Corea del Sur', pj: 3, w: 1, d: 0, l: 2, gf: 2, gc: 3 },
    { n: 'Republica Checa', pj: 3, w: 0, d: 1, l: 2, gf: 2, gc: 6 } ] },
  { nombre: 'B', equipos: [
    { n: 'Suiza', pj: 3, w: 2, d: 1, l: 0, gf: 7, gc: 3 },
    { n: 'Canada', pj: 3, w: 1, d: 1, l: 1, gf: 8, gc: 3 },
    { n: 'Bosnia y Herzegovina', pj: 3, w: 1, d: 1, l: 1, gf: 5, gc: 6 },
    { n: 'Catar', pj: 3, w: 0, d: 1, l: 2, gf: 2, gc: 10 } ] },
  { nombre: 'C', equipos: [
    { n: 'Brasil', pj: 3, w: 2, d: 1, l: 0, gf: 7, gc: 1 },
    { n: 'Marruecos', pj: 3, w: 2, d: 1, l: 0, gf: 6, gc: 3 },
    { n: 'Escocia', pj: 3, w: 1, d: 0, l: 2, gf: 1, gc: 4 },
    { n: 'Haiti', pj: 3, w: 0, d: 0, l: 3, gf: 2, gc: 8 } ] },
  { nombre: 'D', equipos: [
    { n: 'Estados Unidos', pj: 3, w: 2, d: 0, l: 1, gf: 8, gc: 4 },
    { n: 'Australia', pj: 3, w: 1, d: 1, l: 1, gf: 2, gc: 2 },
    { n: 'Paraguay', pj: 3, w: 1, d: 1, l: 1, gf: 2, gc: 4 },
    { n: 'Turquia', pj: 3, w: 1, d: 0, l: 2, gf: 3, gc: 5 } ] },
  { nombre: 'E', equipos: [
    { n: 'Alemania', pj: 3, w: 2, d: 0, l: 1, gf: 10, gc: 4 },
    { n: 'Costa de Marfil', pj: 3, w: 2, d: 0, l: 1, gf: 4, gc: 2 },
    { n: 'Ecuador', pj: 3, w: 1, d: 1, l: 1, gf: 2, gc: 2 },
    { n: 'Curazao', pj: 3, w: 0, d: 1, l: 2, gf: 1, gc: 9 } ] },
  { nombre: 'F', equipos: [
    { n: 'Paises Bajos', pj: 3, w: 2, d: 1, l: 0, gf: 10, gc: 4 },
    { n: 'Japon', pj: 3, w: 1, d: 2, l: 0, gf: 7, gc: 3 },
    { n: 'Suecia', pj: 3, w: 1, d: 1, l: 1, gf: 7, gc: 7 },
    { n: 'Tunez', pj: 3, w: 0, d: 0, l: 3, gf: 2, gc: 12 } ] },
  { nombre: 'G', equipos: [
    { n: 'Egipto', pj: 2, w: 1, d: 1, l: 0, gf: 4, gc: 2 },
    { n: 'Iran', pj: 2, w: 0, d: 2, l: 0, gf: 2, gc: 2 },
    { n: 'Belgica', pj: 2, w: 0, d: 2, l: 0, gf: 1, gc: 1 },
    { n: 'Nueva Zelanda', pj: 2, w: 0, d: 1, l: 1, gf: 3, gc: 5 } ] },
  { nombre: 'H', equipos: [
    { n: 'Espana', pj: 2, w: 1, d: 1, l: 0, gf: 4, gc: 0 },
    { n: 'Uruguay', pj: 2, w: 0, d: 2, l: 0, gf: 3, gc: 3 },
    { n: 'Cabo Verde', pj: 2, w: 0, d: 2, l: 0, gf: 2, gc: 2 },
    { n: 'Arabia Saudita', pj: 2, w: 0, d: 1, l: 1, gf: 1, gc: 5 } ] },
  { nombre: 'I', equipos: [
    { n: 'Francia', pj: 2, w: 2, d: 0, l: 0, gf: 6, gc: 1 },
    { n: 'Noruega', pj: 2, w: 2, d: 0, l: 0, gf: 7, gc: 3 },
    { n: 'Senegal', pj: 2, w: 0, d: 0, l: 2, gf: 3, gc: 6 },
    { n: 'Iraq', pj: 2, w: 0, d: 0, l: 2, gf: 1, gc: 7 } ] },
  { nombre: 'J', equipos: [
    { n: 'Argentina', pj: 2, w: 2, d: 0, l: 0, gf: 5, gc: 0 },
    { n: 'Austria', pj: 2, w: 1, d: 0, l: 1, gf: 3, gc: 3 },
    { n: 'Argelia', pj: 2, w: 1, d: 0, l: 1, gf: 2, gc: 4 },
    { n: 'Jordania', pj: 2, w: 0, d: 0, l: 2, gf: 2, gc: 5 } ] },
  { nombre: 'K', equipos: [
    { n: 'Colombia', pj: 2, w: 2, d: 0, l: 0, gf: 4, gc: 1 },
    { n: 'Portugal', pj: 2, w: 1, d: 1, l: 0, gf: 6, gc: 1 },
    { n: 'Republica Democratica del Congo', pj: 2, w: 0, d: 1, l: 1, gf: 1, gc: 2 },
    { n: 'Uzbekistan', pj: 2, w: 0, d: 0, l: 2, gf: 1, gc: 8 } ] },
  { nombre: 'L', equipos: [
    { n: 'Inglaterra', pj: 2, w: 1, d: 1, l: 0, gf: 4, gc: 2 },
    { n: 'Ghana', pj: 2, w: 1, d: 1, l: 0, gf: 1, gc: 0 },
    { n: 'Croacia', pj: 2, w: 1, d: 0, l: 1, gf: 3, gc: 4 },
    { n: 'Panama', pj: 2, w: 0, d: 0, l: 2, gf: 0, gc: 2 } ] },
];

// --- Marcadores reales confirmados por la prensa (clave "LocalFormal|VisitanteFormal") ---
const FIXED = {
  'Mexico|Sudafrica': [2, 0],
  'Mexico|Corea del Sur': [1, 0],
  'Canada|Catar': [6, 0],
  'Alemania|Curazao': [7, 1],
  'Ghana|Panama': [1, 0],
};

// ============================================================================
//  Solver de restricciones: encuentra marcadores que reproducen las posiciones
// ============================================================================
function resolverGrupo(equipos) {
  const completo = equipos[0].pj === 3;
  const pares = [];
  for (let i = 0; i < 4; i++) for (let j = i + 1; j < 4; j++) pares.push([i, j]);

  const candidatos = completo
    ? [{ jugados: pares, noJugados: [] }]
    : [[[0, 1], [2, 3]], [[0, 2], [1, 3]], [[0, 3], [1, 2]]].map((unp) => ({
        noJugados: unp,
        jugados: pares.filter((p) => !unp.some((u) => u[0] === p[0] && u[1] === p[1])),
      }));

  // Primero intenta respetando los marcadores reales anclados (FIXED);
  // si eso hace inviable el grupo, reintenta sin anclas.
  for (const useFixed of [true, false]) {
    for (const cand of candidatos) {
      const sol = resolver(equipos, cand.jugados, useFixed);
      if (sol) return { jugados: sol, noJugados: cand.noJugados };
    }
  }
  return null;
}

function fixedScore(nombreA, nombreB) {
  if (FIXED[`${nombreA}|${nombreB}`]) return FIXED[`${nombreA}|${nombreB}`];
  if (FIXED[`${nombreB}|${nombreA}`]) { const [x, y] = FIXED[`${nombreB}|${nombreA}`]; return [y, x]; }
  return null;
}

function resolver(eq, jugados, useFixed = true) {
  const rem = eq.map((t) => ({ gf: t.gf, gc: t.gc, w: t.w, d: t.d, l: t.l }));
  // ordenar: primero los partidos de equipos mas restringidos (menos GF)
  const orden = [...jugados].sort((p, q) => (eq[p[0]].gf + eq[p[1]].gf) - (eq[q[0]].gf + eq[q[1]].gf));
  const res = new Array(orden.length);

  function bt(k) {
    if (k === orden.length) return rem.every((r) => !r.gf && !r.gc && !r.w && !r.d && !r.l);
    const [a, b] = orden[k];
    const fx = useFixed ? fixedScore(eq[a].n, eq[b].n) : null;
    const aMax = fx ? fx[0] : Math.min(rem[a].gf, rem[b].gc, 9);
    const aMin = fx ? fx[0] : 0;
    for (let sa = aMin; sa <= aMax; sa++) {
      const bMax = fx ? fx[1] : Math.min(rem[b].gf, rem[a].gc, 9);
      const bMin = fx ? fx[1] : 0;
      for (let sb = bMin; sb <= bMax; sb++) {
        const ra = sa > sb ? 'w' : sa === sb ? 'd' : 'l';
        const rb = sb > sa ? 'w' : sa === sb ? 'd' : 'l';
        if (rem[a][ra] <= 0 || rem[b][rb] <= 0) continue;
        rem[a].gf -= sa; rem[a].gc -= sb; rem[a][ra]--;
        rem[b].gf -= sb; rem[b].gc -= sa; rem[b][rb]--;
        res[k] = { a, b, sa, sb };
        if (bt(k + 1)) return true;
        rem[a].gf += sa; rem[a].gc += sb; rem[a][ra]++;
        rem[b].gf += sb; rem[b].gc += sa; rem[b][rb]++;
      }
    }
    return false;
  }
  return bt(0) ? res.slice() : null;
}

// ============================================================================
//  Construir selecciones, grupos, partidos
// ============================================================================
const selecciones = [];
const nombreToId = new Map();
let sid = 1;
for (const g of GRUPOS) {
  for (const t of g.equipos) {
    const m = meta[t.n];
    if (!m) throw new Error(`Falta metadata de: ${t.n}`);
    const reg = { id: sid++, ...m, id_continente: CONF[m.confederacion].id };
    selecciones.push(reg);
    nombreToId.set(t.n, reg.id);
  }
}

const FECHAS = {
  1: ['2026-06-11', '2026-06-12', '2026-06-13', '2026-06-14'],
  2: ['2026-06-17', '2026-06-18', '2026-06-19', '2026-06-20'],
};
const horarios = ['12:00', '15:00', '18:00', '21:00'];

const grupos = GRUPOS.map((g, i) => ({ id: i + 1, nombre: g.nombre }));
const clasificaciones = [];
const partidos = [];
let clasId = 1, partidoId = 1, globalMatch = 0;
const verificacion = [];

GRUPOS.forEach((g, gi) => {
  const ids = g.equipos.map((t) => nombreToId.get(t.n));
  ids.forEach((idSel) => clasificaciones.push({ id: clasId++, id_grupo: gi + 1, id_seleccion: idSel }));

  const sol = resolverGrupo(g.equipos);
  if (!sol) throw new Error(`No se pudo reconstruir el grupo ${g.nombre}`);
  const completo = g.equipos[0].pj === 3;

  // Partidos jugados
  sol.jugados.forEach((m, idx) => {
    const ronda = completo ? rondaDePar(m.a, m.b) : (idx < 2 ? 1 : 2);
    // 3a jornada: grupos A-C el 24/06, grupos D-F el 26/06
    const fechaMD3 = gi < 3 ? '2026-06-24' : '2026-06-26';
    const fecha = ronda <= 2 ? FECHAS[ronda][gi % 4] : fechaMD3;
    partidos.push({
      id: partidoId++, id_grupo: gi + 1, local: ids[m.a], visit: ids[m.b],
      gl: m.sa, gv: m.sb, fecha, horario: horarios[globalMatch % 4],
      id_estadio: (globalMatch % estadios.length) + 1, jugado: true,
    });
    globalMatch++;
  });
  // Partidos programados (3a jornada de los grupos con pj=2): aun no jugados
  sol.noJugados.forEach((par) => {
    partidos.push({
      id: partidoId++, id_grupo: gi + 1, local: ids[par[0]], visit: ids[par[1]],
      gl: null, gv: null, fecha: '2026-06-27', horario: horarios[globalMatch % 4],
      id_estadio: (globalMatch % estadios.length) + 1, jugado: false,
    });
    globalMatch++;
  });

  // Verificacion: recomputar posiciones desde los partidos jugados
  const calc = g.equipos.map((t) => ({ n: t.n, pj: 0, w: 0, d: 0, l: 0, gf: 0, gc: 0 }));
  const idx = Object.fromEntries(g.equipos.map((t, i) => [ids[i], i]));
  for (const p of partidos.filter((x) => x.id_grupo === gi + 1 && x.jugado)) {
    const L = calc[idx[p.local]], V = calc[idx[p.visit]];
    L.pj++; V.pj++; L.gf += p.gl; L.gc += p.gv; V.gf += p.gv; V.gc += p.gl;
    if (p.gl > p.gv) { L.w++; V.l++; } else if (p.gl < p.gv) { L.l++; V.w++; } else { L.d++; V.d++; }
  }
  g.equipos.forEach((t, i) => {
    const c = calc[i];
    const ok = c.pj === t.pj && c.w === t.w && c.d === t.d && c.l === t.l && c.gf === t.gf && c.gc === t.gc;
    verificacion.push({ grupo: g.nombre, equipo: t.n, ok, esperado: `${t.w}-${t.d}-${t.l} ${t.gf}:${t.gc}`, obtenido: `${c.w}-${c.d}-${c.l} ${c.gf}:${c.gc}` });
  });
});

function rondaDePar(a, b) {
  const key = `${a}${b}`;
  return { '01': 1, '23': 1, '02': 2, '13': 2, '03': 3, '12': 3 }[key];
}

// ============================================================================
//  Emitir db/dataset.json (real) y db/seed.sql
// ============================================================================
const q = (s) => (s == null ? 'NULL' : `'${String(s).replace(/'/g, "''")}'`);
const num = (n) => (n == null ? 'NULL' : Number(n));

const CONTINENTES = [
  { id: 1, nombre: 'Europa', confederacion: 'UEFA', desc: 'Union de Asociaciones Europeas de Futbol' },
  { id: 2, nombre: 'America del Sur', confederacion: 'CONMEBOL', desc: 'Confederacion Sudamericana de Futbol' },
  { id: 3, nombre: 'America del Norte', confederacion: 'CONCACAF', desc: 'Confederacion de Norteamerica, Centroamerica y el Caribe' },
  { id: 4, nombre: 'Africa', confederacion: 'CAF', desc: 'Confederacion Africana de Futbol' },
  { id: 5, nombre: 'Asia', confederacion: 'AFC', desc: 'Confederacion Asiatica de Futbol' },
  { id: 6, nombre: 'Oceania', confederacion: 'OFC', desc: 'Confederacion de Futbol de Oceania' },
];

const usuarios = [
  ['Gustavo Ramirez', 'gustavo@example.com'], ['Maria Hernandez', 'maria@example.com'],
  ['Carlos Mendoza', 'carlos@example.com'], ['Ana Torres', 'ana@example.com'],
  ['Luis Gomez', 'luis@example.com'], ['Sofia Martinez', 'sofia@example.com'],
  ['Diego Flores', 'diego@example.com'], ['Valeria Cruz', 'valeria@example.com'],
];
const diasSemana = ['Jueves', 'Viernes', 'Sabado', 'Domingo', 'Miercoles'];
const costos = [1200, 1800, 2500, 3200, 4500, 6000];
const jugados = partidos.filter((p) => p.jugado);
const boletos = [];
for (let i = 0; i < 20; i++) {
  const p = jugados[i];
  boletos.push({ id: i + 1, id_usuario: (i % usuarios.length) + 1, id_estadio: p.id_estadio,
    id_partido: p.id, id_seleccion: i % 2 === 0 ? p.local : p.visit,
    dia: diasSemana[i % diasSemana.length], fecha: p.fecha, horario: p.horario, costo: costos[i % costos.length] });
}

const L = [];
L.push('-- ============================================================================');
L.push('--  COPA MUNDIAL FIFA 2026  -  Datos REALES al 26/06/2026 (seed)');
L.push('--  GENERADO por scripts/generar-datos-reales.mjs  (no editar a mano)');
L.push(`--  48 selecciones | 16 estadios | 12 grupos | ${partidos.length} partidos (${jugados.length} jugados)`);
L.push('--  Marcadores reconstruidos para reproducir las posiciones oficiales.');
L.push('-- ============================================================================');
L.push("SET client_encoding = 'UTF8';");
L.push('BEGIN;');
L.push('');
L.push('-- 1) CONTINENTES');
for (const c of CONTINENTES) L.push(`INSERT INTO continentes (id_continente, nombre, confederacion, descripcion) VALUES (${c.id}, ${q(c.nombre)}, ${q(c.confederacion)}, ${q(c.desc)});`);
L.push('');
L.push('-- 2) SELECCIONES (con geolocalizacion)');
for (const s of selecciones) L.push(`INSERT INTO selecciones (id, nombre, id_continente, pais, capital, historia, ventajas, desventajas, ranking, bandera, latitud, longitud) VALUES (${s.id}, ${q(s.nombre)}, ${s.id_continente}, ${q(s.pais)}, ${q(s.capital)}, ${q(s.historia)}, ${q(s.ventajas)}, ${q(s.desventajas)}, ${num(s.ranking_fifa)}, ${q(s.bandera)}, ${num(s.latitud)}, ${num(s.longitud)});`);
L.push('');
L.push('-- 3) GRUPOS');
for (const g of grupos) L.push(`INSERT INTO grupos (id, nombre) VALUES (${g.id}, ${q(g.nombre)});`);
L.push('');
L.push('-- 4) ESTADIOS');
estadios.forEach((e, i) => L.push(`INSERT INTO estadios (id, nombre, ciudad, pais, latitud, longitud, capacidad) VALUES (${i + 1}, ${q(e.nombre)}, ${q(e.ciudad)}, ${q(e.pais)}, ${num(e.latitud)}, ${num(e.longitud)}, ${num(e.capacidad)});`));
L.push('');
L.push('-- 6) CLASIFICACIONES (membresias; el trigger calcula las estadisticas)');
for (const c of clasificaciones) L.push(`INSERT INTO clasificaciones (id, id_grupo, id_seleccion) VALUES (${c.id}, ${c.id_grupo}, ${c.id_seleccion});`);
L.push('');
L.push('-- 5) PARTIDOS (jugados y programados). Cada alta dispara el recalculo de la clasificacion.');
for (const p of partidos) {
  const gl = p.jugado ? p.gl : 'NULL';
  const gv = p.jugado ? p.gv : 'NULL';
  L.push(`INSERT INTO partidos (id, fase, id_grupo, id_equipo_local, id_equipo_visitante, goles_local, goles_visitante, fecha, horario, id_estadio, jugado) VALUES (${p.id}, 'Grupos', ${p.id_grupo}, ${p.local}, ${p.visit}, ${gl}, ${gv}, '${p.fecha}', '${p.horario}', ${p.id_estadio}, ${p.jugado ? 'TRUE' : 'FALSE'});`);
}
L.push('');
L.push('-- 8) USUARIOS');
usuarios.forEach((u, i) => L.push(`INSERT INTO usuarios (id, nombre, email) VALUES (${i + 1}, ${q(u[0])}, ${q(u[1])});`));
L.push('');
L.push('-- 9) BOLETOS');
for (const b of boletos) L.push(`INSERT INTO boletos (id, id_usuario, id_estadio, id_partido, id_seleccion, dia, fecha, horario, costo) VALUES (${b.id}, ${b.id_usuario}, ${b.id_estadio}, ${b.id_partido}, ${b.id_seleccion}, ${q(b.dia)}, '${b.fecha}', '${b.horario}', ${b.costo});`);
L.push('');
const seqs = [['continentes_id_continente_seq', 'continentes', 'id_continente'], ['selecciones_id_seq', 'selecciones', 'id'],
  ['grupos_id_seq', 'grupos', 'id'], ['estadios_id_seq', 'estadios', 'id'], ['clasificaciones_id_seq', 'clasificaciones', 'id'],
  ['partidos_id_seq', 'partidos', 'id'], ['usuarios_id_seq', 'usuarios', 'id'], ['boletos_id_seq', 'boletos', 'id']];
L.push('-- Reajustar secuencias');
for (const [s, t, c] of seqs) L.push(`SELECT setval('${s}', (SELECT COALESCE(MAX(${c}),1) FROM ${t}));`);
L.push('');
L.push('COMMIT;');
L.push('');
fs.writeFileSync(path.join(root, 'db', 'seed.sql'), L.join('\n'));

// Reescribir dataset.json (formato confederaciones) para mantener coherencia/provenance
const porConf = {};
for (const s of selecciones) {
  const cf = s.confederacion;
  (porConf[cf] ||= { confederacion: cf, continente: CONF[cf].cont, equipos: [] }).equipos.push({
    nombre: s.nombre, pais: s.pais, capital: s.capital, latitud: s.latitud, longitud: s.longitud,
    ranking_fifa: s.ranking_fifa, historia: s.historia, ventajas: s.ventajas, desventajas: s.desventajas, bandera: s.bandera,
  });
}
const datasetReal = {
  generado: 'Mundial 2026 real al 25/06/2026',
  confederaciones: Object.values(porConf),
  estadios,
  grupos: GRUPOS.map((g) => ({ nombre: g.nombre, equipos: g.equipos.map((t) => t.n) })),
};
fs.writeFileSync(path.join(root, 'db', 'dataset.json'), JSON.stringify(datasetReal, null, 2));

// --- Reporte de verificacion ---
const fallos = verificacion.filter((v) => !v.ok);
console.log(`Partidos: ${partidos.length} (${jugados.length} jugados, ${partidos.length - jugados.length} programados)`);
console.log(`Verificacion de posiciones: ${verificacion.length - fallos.length}/${verificacion.length} OK`);
if (fallos.length) {
  console.log('FALLOS:');
  for (const f of fallos) console.log(`  ${f.grupo} ${f.equipo}: esperado ${f.esperado}, obtenido ${f.obtenido}`);
  process.exit(1);
} else {
  console.log('Todas las posiciones reconstruidas coinciden con los datos oficiales.');
}
