// ============================================================================
//  Genera el dataset y el seed REALES del Mundial 2026 al 01/07/2026.
//  - 48 selecciones en sus grupos reales.
//  - 72 partidos de grupos con marcadores, fechas y SEDES reales (Wikipedia por grupo),
//    verificados: cada grupo reproduce EXACTAMENTE la tabla oficial (GD y Pts).
//  - Fase final (cuadro) con sedes/fechas/horas oficiales de la FIFA.
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

// --- Directores tecnicos (entrenadores) de cada seleccion ---
const ENTRENADORES = {
  'Mexico': 'Javier Aguirre', 'Sudafrica': 'Hugo Broos', 'Corea del Sur': 'Hong Myung-bo',
  'Republica Checa': 'Ivan Hasek', 'Suiza': 'Murat Yakin', 'Canada': 'Jesse Marsch',
  'Bosnia y Herzegovina': 'Sergej Barbarez', 'Catar': 'Julen Lopetegui', 'Brasil': 'Carlo Ancelotti',
  'Marruecos': 'Walid Regragui', 'Escocia': 'Steve Clarke', 'Haiti': 'Sebastien Migne',
  'Estados Unidos': 'Mauricio Pochettino', 'Australia': 'Tony Popovic', 'Paraguay': 'Gustavo Alfaro',
  'Turquia': 'Vincenzo Montella', 'Alemania': 'Julian Nagelsmann', 'Costa de Marfil': 'Emerse Fae',
  'Ecuador': 'Sebastian Beccacece', 'Curazao': 'Dick Advocaat', 'Paises Bajos': 'Ronald Koeman',
  'Japon': 'Hajime Moriyasu', 'Suecia': 'Jon Dahl Tomasson', 'Tunez': 'Sami Trabelsi',
  'Egipto': 'Hossam Hassan', 'Iran': 'Amir Ghalenoei', 'Belgica': 'Rudi Garcia',
  'Nueva Zelanda': 'Darren Bazeley', 'Espana': 'Luis de la Fuente', 'Uruguay': 'Marcelo Bielsa',
  'Cabo Verde': 'Pedro Leitao Brito (Bubista)', 'Arabia Saudita': 'Herve Renard', 'Francia': 'Didier Deschamps',
  'Noruega': 'Stale Solbakken', 'Senegal': 'Pape Thiaw', 'Iraq': 'Graham Arnold',
  'Argentina': 'Lionel Scaloni', 'Austria': 'Ralf Rangnick', 'Argelia': 'Vladimir Petkovic',
  'Jordania': 'Jamal Sellami', 'Colombia': 'Nestor Lorenzo', 'Portugal': 'Roberto Martinez',
  'Republica Democratica del Congo': 'Sebastien Desabre', 'Uzbekistan': 'Timur Kapadze',
  'Inglaterra': 'Thomas Tuchel', 'Ghana': 'Otto Addo', 'Croacia': 'Zlatko Dalic',
  'Panama': 'Thomas Christiansen',
};
for (const nombre of Object.keys(meta)) meta[nombre].entrenador = ENTRENADORES[nombre] || 'Por confirmar';

// --- Equipos de cada grupo (orden estable para asignar ids de seleccion) ---
const GRUPOS_TEAMS = {
  A: ['Mexico', 'Sudafrica', 'Corea del Sur', 'Republica Checa'],
  B: ['Suiza', 'Canada', 'Bosnia y Herzegovina', 'Catar'],
  C: ['Brasil', 'Marruecos', 'Escocia', 'Haiti'],
  D: ['Estados Unidos', 'Australia', 'Paraguay', 'Turquia'],
  E: ['Alemania', 'Costa de Marfil', 'Ecuador', 'Curazao'],
  F: ['Paises Bajos', 'Japon', 'Suecia', 'Tunez'],
  G: ['Egipto', 'Iran', 'Belgica', 'Nueva Zelanda'],
  H: ['Espana', 'Uruguay', 'Cabo Verde', 'Arabia Saudita'],
  I: ['Francia', 'Noruega', 'Senegal', 'Iraq'],
  J: ['Argentina', 'Austria', 'Argelia', 'Jordania'],
  K: ['Colombia', 'Portugal', 'Republica Democratica del Congo', 'Uzbekistan'],
  L: ['Inglaterra', 'Ghana', 'Croacia', 'Panama'],
};
const NOMBRES_GRUPO = Object.keys(GRUPOS_TEAMS); // A..L

// --- Partidos REALES de la fase de grupos (72), fuente: Wikipedia por grupo ---
// Verificados: cada grupo reproduce EXACTAMENTE la tabla oficial (GD y Pts).
// [grupo, local, goles_local, goles_visitante, visitante, fecha, id_estadio]
// Estadios: 1 Azteca, 2 Akron, 3 BBVA, 4 BMO, 5 BC Place, 6 SoFi, 7 MetLife,
// 8 AT&T, 9 Mercedes-Benz, 10 Hard Rock, 11 NRG, 12 Arrowhead, 13 Lumen, 14 Levi's,
// 15 Gillette, 16 Lincoln Financial.
const PARTIDOS_G = [
  ['A', 'Mexico', 2, 0, 'Sudafrica', '2026-06-11', 1],
  ['A', 'Corea del Sur', 2, 1, 'Republica Checa', '2026-06-11', 2],
  ['A', 'Republica Checa', 1, 1, 'Sudafrica', '2026-06-18', 9],
  ['A', 'Mexico', 1, 0, 'Corea del Sur', '2026-06-18', 2],
  ['A', 'Republica Checa', 0, 3, 'Mexico', '2026-06-24', 1],
  ['A', 'Sudafrica', 1, 0, 'Corea del Sur', '2026-06-24', 3],
  ['B', 'Canada', 1, 1, 'Bosnia y Herzegovina', '2026-06-12', 4],
  ['B', 'Catar', 1, 1, 'Suiza', '2026-06-13', 14],
  ['B', 'Suiza', 4, 1, 'Bosnia y Herzegovina', '2026-06-18', 6],
  ['B', 'Canada', 6, 0, 'Catar', '2026-06-18', 5],
  ['B', 'Suiza', 2, 1, 'Canada', '2026-06-24', 5],
  ['B', 'Bosnia y Herzegovina', 3, 1, 'Catar', '2026-06-24', 13],
  ['C', 'Brasil', 1, 1, 'Marruecos', '2026-06-13', 7],
  ['C', 'Haiti', 0, 1, 'Escocia', '2026-06-13', 15],
  ['C', 'Escocia', 0, 1, 'Marruecos', '2026-06-19', 15],
  ['C', 'Brasil', 3, 0, 'Haiti', '2026-06-19', 16],
  ['C', 'Escocia', 0, 3, 'Brasil', '2026-06-24', 10],
  ['C', 'Marruecos', 4, 2, 'Haiti', '2026-06-24', 9],
  ['D', 'Estados Unidos', 4, 1, 'Paraguay', '2026-06-12', 6],
  ['D', 'Australia', 2, 0, 'Turquia', '2026-06-13', 5],
  ['D', 'Estados Unidos', 2, 0, 'Australia', '2026-06-19', 13],
  ['D', 'Turquia', 0, 1, 'Paraguay', '2026-06-19', 14],
  ['D', 'Turquia', 3, 2, 'Estados Unidos', '2026-06-25', 6],
  ['D', 'Paraguay', 0, 0, 'Australia', '2026-06-25', 14],
  ['E', 'Alemania', 7, 1, 'Curazao', '2026-06-14', 11],
  ['E', 'Costa de Marfil', 1, 0, 'Ecuador', '2026-06-14', 16],
  ['E', 'Alemania', 2, 1, 'Costa de Marfil', '2026-06-20', 4],
  ['E', 'Ecuador', 0, 0, 'Curazao', '2026-06-20', 12],
  ['E', 'Curazao', 0, 2, 'Costa de Marfil', '2026-06-25', 16],
  ['E', 'Ecuador', 2, 1, 'Alemania', '2026-06-25', 7],
  ['F', 'Paises Bajos', 2, 2, 'Japon', '2026-06-14', 8],
  ['F', 'Suecia', 5, 1, 'Tunez', '2026-06-14', 3],
  ['F', 'Paises Bajos', 5, 1, 'Suecia', '2026-06-20', 11],
  ['F', 'Tunez', 0, 4, 'Japon', '2026-06-20', 3],
  ['F', 'Japon', 1, 1, 'Suecia', '2026-06-25', 8],
  ['F', 'Tunez', 1, 3, 'Paises Bajos', '2026-06-25', 12],
  ['G', 'Belgica', 1, 1, 'Egipto', '2026-06-15', 13],
  ['G', 'Iran', 2, 2, 'Nueva Zelanda', '2026-06-15', 6],
  ['G', 'Belgica', 0, 0, 'Iran', '2026-06-21', 6],
  ['G', 'Nueva Zelanda', 1, 3, 'Egipto', '2026-06-21', 5],
  ['G', 'Egipto', 1, 1, 'Iran', '2026-06-26', 13],
  ['G', 'Nueva Zelanda', 1, 5, 'Belgica', '2026-06-26', 5],
  ['H', 'Espana', 0, 0, 'Cabo Verde', '2026-06-15', 9],
  ['H', 'Arabia Saudita', 1, 1, 'Uruguay', '2026-06-15', 10],
  ['H', 'Espana', 4, 0, 'Arabia Saudita', '2026-06-21', 9],
  ['H', 'Uruguay', 2, 2, 'Cabo Verde', '2026-06-21', 10],
  ['H', 'Cabo Verde', 0, 0, 'Arabia Saudita', '2026-06-26', 11],
  ['H', 'Uruguay', 0, 1, 'Espana', '2026-06-26', 2],
  ['I', 'Francia', 3, 1, 'Senegal', '2026-06-16', 7],
  ['I', 'Iraq', 1, 4, 'Noruega', '2026-06-16', 15],
  ['I', 'Francia', 3, 0, 'Iraq', '2026-06-22', 16],
  ['I', 'Noruega', 3, 2, 'Senegal', '2026-06-22', 7],
  ['I', 'Noruega', 1, 4, 'Francia', '2026-06-26', 15],
  ['I', 'Senegal', 5, 0, 'Iraq', '2026-06-26', 4],
  ['J', 'Argentina', 3, 0, 'Argelia', '2026-06-16', 12],
  ['J', 'Austria', 3, 1, 'Jordania', '2026-06-16', 14],
  ['J', 'Argentina', 2, 0, 'Austria', '2026-06-22', 8],
  ['J', 'Jordania', 1, 2, 'Argelia', '2026-06-22', 14],
  ['J', 'Argelia', 3, 3, 'Austria', '2026-06-27', 12],
  ['J', 'Jordania', 1, 3, 'Argentina', '2026-06-27', 8],
  ['K', 'Portugal', 1, 1, 'Republica Democratica del Congo', '2026-06-17', 11],
  ['K', 'Uzbekistan', 1, 3, 'Colombia', '2026-06-17', 1],
  ['K', 'Portugal', 5, 0, 'Uzbekistan', '2026-06-23', 11],
  ['K', 'Colombia', 1, 0, 'Republica Democratica del Congo', '2026-06-23', 2],
  ['K', 'Colombia', 0, 0, 'Portugal', '2026-06-27', 10],
  ['K', 'Republica Democratica del Congo', 3, 1, 'Uzbekistan', '2026-06-27', 9],
  ['L', 'Inglaterra', 4, 2, 'Croacia', '2026-06-17', 8],
  ['L', 'Ghana', 1, 0, 'Panama', '2026-06-17', 4],
  ['L', 'Inglaterra', 0, 0, 'Ghana', '2026-06-23', 15],
  ['L', 'Panama', 0, 1, 'Croacia', '2026-06-23', 4],
  ['L', 'Panama', 0, 2, 'Inglaterra', '2026-06-27', 7],
  ['L', 'Croacia', 2, 1, 'Ghana', '2026-06-27', 16],
];

// Objetivo de verificacion: posiciones oficiales finales {equipo: [GD, Pts]}
const TARGET_POS = {
  Mexico: [6, 9], Sudafrica: [-1, 4], 'Corea del Sur': [-1, 3], 'Republica Checa': [-4, 1],
  Suiza: [4, 7], Canada: [5, 4], 'Bosnia y Herzegovina': [-1, 4], Catar: [-8, 1],
  Brasil: [6, 7], Marruecos: [3, 7], Escocia: [-3, 3], Haiti: [-6, 0],
  'Estados Unidos': [4, 6], Australia: [0, 4], Paraguay: [-2, 4], Turquia: [-2, 3],
  Alemania: [6, 6], 'Costa de Marfil': [2, 6], Ecuador: [0, 4], Curazao: [-8, 1],
  'Paises Bajos': [6, 7], Japon: [4, 5], Suecia: [0, 4], Tunez: [-10, 0],
  Belgica: [4, 5], Egipto: [2, 5], Iran: [0, 3], 'Nueva Zelanda': [-6, 1],
  Espana: [5, 7], 'Cabo Verde': [0, 3], Uruguay: [-1, 2], 'Arabia Saudita': [-4, 2],
  Francia: [8, 9], Noruega: [1, 6], Senegal: [2, 3], Iraq: [-11, 0],
  Argentina: [7, 9], Austria: [0, 4], Argelia: [-2, 4], Jordania: [-5, 0],
  Colombia: [3, 7], Portugal: [5, 5], 'Republica Democratica del Congo': [1, 4], Uzbekistan: [-9, 0],
  Inglaterra: [4, 7], Croacia: [0, 6], Ghana: [0, 4], Panama: [-4, 0],
};

// ============================================================================
//  Construir selecciones, grupos, clasificaciones y partidos (datos reales)
// ============================================================================
const selecciones = [];
const nombreToId = new Map();
let sid = 1;
for (const g of NOMBRES_GRUPO) {
  for (const n of GRUPOS_TEAMS[g]) {
    const m = meta[n];
    if (!m) throw new Error(`Falta metadata de: ${n}`);
    const reg = { id: sid++, ...m, id_continente: CONF[m.confederacion].id };
    selecciones.push(reg);
    nombreToId.set(n, reg.id);
  }
}

const grupos = NOMBRES_GRUPO.map((nombre, i) => ({ id: i + 1, nombre }));
const grupoId = Object.fromEntries(NOMBRES_GRUPO.map((n, i) => [n, i + 1]));

// Clasificaciones (solo membresias; el trigger calcula las estadisticas)
const clasificaciones = [];
let clasId = 1;
for (const g of NOMBRES_GRUPO) {
  for (const n of GRUPOS_TEAMS[g]) {
    clasificaciones.push({ id: clasId++, id_grupo: grupoId[g], id_seleccion: nombreToId.get(n) });
  }
}

// Partidos de la fase de grupos (todos jugados; el torneo ya llego a la fase final)
const horariosG = ['12:00', '15:00', '18:00', '21:00'];
const partidos = PARTIDOS_G.map((p, i) => {
  const [g, home, gl, gv, away, fecha, est] = p;
  return {
    id: i + 1, id_grupo: grupoId[g],
    local: nombreToId.get(home), visit: nombreToId.get(away),
    gl, gv, fecha, horario: horariosG[i % 4], id_estadio: est, jugado: true,
  };
});

// Verificacion: los resultados reales deben reproducir las posiciones oficiales
const verificacion = [];
for (const g of NOMBRES_GRUPO) {
  const st = {};
  const add = (t) => (st[t] ||= { gf: 0, ga: 0, pts: 0 });
  for (const [, home, gl, gv, away] of PARTIDOS_G.filter((x) => x[0] === g)) {
    const H = add(home), A = add(away);
    H.gf += gl; H.ga += gv; A.gf += gv; A.ga += gl;
    if (gl > gv) H.pts += 3; else if (gl < gv) A.pts += 3; else { H.pts++; A.pts++; }
  }
  for (const n of GRUPOS_TEAMS[g]) {
    const gd = st[n].gf - st[n].ga, pts = st[n].pts;
    const [tgd, tpts] = TARGET_POS[n];
    const ok = gd === tgd && pts === tpts;
    verificacion.push({ grupo: g, equipo: n, ok, esperado: `GD ${tgd} Pts ${tpts}`, obtenido: `GD ${gd} Pts ${pts}` });
  }
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

// ============================================================================
//  FASE FINAL  -  Cuadro REAL al 01/07/2026 (aportado por la fuente oficial).
//  Ronda de 32 = Dieciseisavos. 8 partidos ya jugados (con marcadores y penales)
//  + 8 programados. Octavos: 4 con equipos definidos + 4 por definir.
//  Cuartos, Semifinal y Final: por definir (fechas/sedes ya asignadas).
// ============================================================================
const idSel = (n) => {
  if (!n) return null;
  const id = nombreToId.get(n);
  if (!id) throw new Error(`FASE FINAL: no existe la seleccion '${n}'`);
  return id;
};
// Sedes, fechas y horarios OFICIALES de la FIFA (calendario Mundial 2026).
// Cada estadio es el real de la sede; el horario es la hora LOCAL de la sede.
// Estadios (id): 1 Azteca, 2 Akron, 3 BBVA, 4 BMO Field, 5 BC Place, 6 SoFi,
// 7 MetLife, 8 AT&T, 9 Mercedes-Benz, 10 Hard Rock, 11 NRG, 12 Arrowhead,
// 13 Lumen Field, 14 Levi's, 15 Gillette, 16 Lincoln Financial.
const faseFinal = [];
let ffId = 1;
const addFF = (nombre_fase, llave, local, visit, fecha, horario, id_estadio, res) => {
  faseFinal.push({
    id: ffId++, nombre_fase, llave,
    local: idSel(local), visit: idSel(visit),
    id_estadio, fecha, horario,
    gl: res ? res[0] : null, gv: res ? res[1] : null,
    pl: res && res.length > 2 ? res[2] : null,
    pv: res && res.length > 2 ? res[3] : null,
    jugado: !!res,
  });
};

// --- Dieciseisavos (Ronda de 32) --- sedes/fechas oficiales FIFA
addFF('Dieciseisavos', 'D1', 'Alemania', 'Paraguay', '2026-06-29', '16:30', 15, [1, 1, 3, 4]);
addFF('Dieciseisavos', 'D2', 'Francia', 'Suecia', '2026-06-30', '17:00', 7, [3, 0]);
addFF('Dieciseisavos', 'D3', 'Sudafrica', 'Canada', '2026-06-28', '12:00', 6, [0, 1]);
addFF('Dieciseisavos', 'D4', 'Paises Bajos', 'Marruecos', '2026-06-29', '19:00', 3, [1, 1, 2, 3]);
addFF('Dieciseisavos', 'D5', 'Portugal', 'Croacia', '2026-07-02', '19:00', 4);
addFF('Dieciseisavos', 'D6', 'Espana', 'Austria', '2026-07-02', '15:00', 6);
addFF('Dieciseisavos', 'D7', 'Estados Unidos', 'Bosnia y Herzegovina', '2026-07-01', '20:00', 14);
addFF('Dieciseisavos', 'D8', 'Belgica', 'Senegal', '2026-07-01', '16:00', 13);
addFF('Dieciseisavos', 'D9', 'Brasil', 'Japon', '2026-06-29', '12:00', 11, [2, 1]);
addFF('Dieciseisavos', 'D10', 'Costa de Marfil', 'Noruega', '2026-06-30', '12:00', 8, [1, 2]);
addFF('Dieciseisavos', 'D11', 'Mexico', 'Ecuador', '2026-06-30', '15:00', 1, [2, 0]);
addFF('Dieciseisavos', 'D12', 'Inglaterra', 'Republica Democratica del Congo', '2026-07-01', '12:00', 9, [2, 1]);
addFF('Dieciseisavos', 'D13', 'Argentina', 'Cabo Verde', '2026-07-03', '18:00', 10);
addFF('Dieciseisavos', 'D14', 'Australia', 'Egipto', '2026-07-03', '14:00', 8);
addFF('Dieciseisavos', 'D15', 'Suiza', 'Argelia', '2026-07-02', '23:00', 5);
addFF('Dieciseisavos', 'D16', 'Colombia', 'Ghana', '2026-07-03', '21:30', 12);

// --- Octavos (Ronda de 16) --- 4 con equipos definidos + 4 por definir
addFF('Octavos', 'O1', 'Paraguay', 'Francia', '2026-07-04', '14:00', 16);
addFF('Octavos', 'O2', 'Canada', 'Marruecos', '2026-07-04', '15:00', 11);
addFF('Octavos', 'O3', null, null, '2026-07-06', '16:00', 10);   // Ganador D5 vs Ganador D6
addFF('Octavos', 'O4', null, null, '2026-07-06', '19:00', 9);    // Ganador D7 vs Ganador D8
addFF('Octavos', 'O5', 'Brasil', 'Noruega', '2026-07-05', '14:00', 8);
addFF('Octavos', 'O6', 'Mexico', 'Inglaterra', '2026-07-05', '18:00', 1);
addFF('Octavos', 'O7', null, null, '2026-07-07', '14:00', 5);    // Ganador D13 vs Ganador D14
addFF('Octavos', 'O8', null, null, '2026-07-07', '18:00', 4);    // Ganador D15 vs Ganador D16

// --- Cuartos de final --- (solo en Estados Unidos)
addFF('Cuartos', 'C1', null, null, '2026-07-09', '15:00', 15);   // G(O1) vs G(O2)
addFF('Cuartos', 'C2', null, null, '2026-07-10', '20:00', 6);    // G(O3) vs G(O4)
addFF('Cuartos', 'C3', null, null, '2026-07-11', '15:00', 10);   // G(O5) vs G(O6)
addFF('Cuartos', 'C4', null, null, '2026-07-11', '20:00', 12);   // G(O7) vs G(O8)

// --- Semifinales ---
addFF('Semifinal', 'S1', null, null, '2026-07-14', '19:00', 8);  // AT&T, Arlington
addFF('Semifinal', 'S2', null, null, '2026-07-15', '19:00', 9);  // Mercedes-Benz, Atlanta

// --- Tercer lugar ---
addFF('Tercer Lugar', 'T1', null, null, '2026-07-18', '15:00', 10); // Hard Rock, Miami

// --- Final ---
addFF('Final', 'F1', null, null, '2026-07-19', '19:00', 7);      // MetLife, East Rutherford

const L = [];
L.push('-- ============================================================================');
L.push('--  COPA MUNDIAL FIFA 2026  -  Datos REALES al 01/07/2026 (seed)');
L.push('--  GENERADO por scripts/generar-datos-reales.mjs  (no editar a mano)');
L.push(`--  48 selecciones | 16 estadios | 12 grupos | ${partidos.length} partidos de grupos + fase final`);
L.push('--  Resultados y sedes reales (fuente: Wikipedia por grupo, verificado vs posiciones oficiales).');
L.push('-- ============================================================================');
L.push("SET client_encoding = 'UTF8';");
L.push('BEGIN;');
L.push('');
L.push('-- 1) CONTINENTES');
for (const c of CONTINENTES) L.push(`INSERT INTO continentes (id_continente, nombre, confederacion, descripcion) VALUES (${c.id}, ${q(c.nombre)}, ${q(c.confederacion)}, ${q(c.desc)});`);
L.push('');
L.push('-- 2) SELECCIONES (con geolocalizacion)');
for (const s of selecciones) L.push(`INSERT INTO selecciones (id, nombre, id_continente, pais, capital, historia, ventajas, desventajas, entrenador, ranking, bandera, latitud, longitud) VALUES (${s.id}, ${q(s.nombre)}, ${s.id_continente}, ${q(s.pais)}, ${q(s.capital)}, ${q(s.historia)}, ${q(s.ventajas)}, ${q(s.desventajas)}, ${q(s.entrenador)}, ${num(s.ranking_fifa)}, ${q(s.bandera)}, ${num(s.latitud)}, ${num(s.longitud)});`);
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
L.push('-- 7) FASE FINAL (cuadro real al 01/07/2026, sedes/fechas/horas OFICIALES FIFA)');
for (const f of faseFinal) {
  L.push(`INSERT INTO fase_final (id, nombre_fase, llave, id_seleccion_local, id_seleccion_visitante, id_estadio, fecha, horario, goles_local, goles_visitante, penales_local, penales_visitante, jugado) VALUES (${f.id}, ${q(f.nombre_fase)}, ${q(f.llave)}, ${f.local ?? 'NULL'}, ${f.visit ?? 'NULL'}, ${f.id_estadio}, '${f.fecha}', '${f.horario}', ${num(f.gl)}, ${num(f.gv)}, ${num(f.pl)}, ${num(f.pv)}, ${f.jugado ? 'TRUE' : 'FALSE'});`);
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
  ['partidos_id_seq', 'partidos', 'id'], ['fase_final_id_seq', 'fase_final', 'id'],
  ['usuarios_id_seq', 'usuarios', 'id'], ['boletos_id_seq', 'boletos', 'id']];
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
    ranking_fifa: s.ranking_fifa, historia: s.historia, ventajas: s.ventajas, desventajas: s.desventajas,
    entrenador: s.entrenador, bandera: s.bandera,
  });
}
const datasetReal = {
  generado: 'Mundial 2026 real al 27/06/2026 (fase de grupos completa)',
  confederaciones: Object.values(porConf),
  estadios,
  grupos: NOMBRES_GRUPO.map((n) => ({ nombre: n, equipos: GRUPOS_TEAMS[n] })),
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
