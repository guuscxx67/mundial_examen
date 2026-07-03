// Genera Markdown con cada consulta (SQL + resultado en tabla) para la entrega.
// Uso: node scripts/generar-consultas-md.mjs > docs/consultas-resultados.md
import pg from 'pg';
const { Pool } = pg;
const pool = new Pool({
  host: process.env.PGHOST || 'localhost',
  port: Number(process.env.PGPORT) || 55432,
  user: process.env.PGUSER || 'mundial',
  password: process.env.PGPASSWORD || 'mundial2026',
  database: process.env.PGDATABASE || 'mundial2026',
});

const corta = (v) => {
  if (v == null) return '';
  let s = String(v).replace(/\|/g, '\\|').replace(/\n/g, ' ');
  return s.length > 90 ? s.slice(0, 88) + '…' : s;
};

function md(rows) {
  if (!rows.length) return '_(sin filas)_\n';
  const cols = Object.keys(rows[0]);
  let out = '| ' + cols.join(' | ') + ' |\n';
  out += '| ' + cols.map(() => '---').join(' | ') + ' |\n';
  for (const r of rows) out += '| ' + cols.map((c) => corta(r[c])).join(' | ') + ' |\n';
  return out;
}

const consultas = [
  {
    n: 'Consulta 1', titulo: 'id_continente, Continente, Confederación y País',
    sql: `SELECT co.id_continente, co.nombre AS continente, co.confederacion, s.pais
  FROM continentes co
  JOIN selecciones s ON s.id_continente = co.id_continente
 ORDER BY co.id_continente, s.pais;`,
  },
  {
    n: 'Consulta 2', titulo: 'Búsqueda (WHERE) por las diferentes confederaciones, una de cada',
    sql: `SELECT DISTINCT ON (co.confederacion)
       co.id_continente, co.nombre AS continente, co.confederacion, s.pais, s.nombre AS seleccion
  FROM continentes co
  JOIN selecciones s ON s.id_continente = co.id_continente
 WHERE co.confederacion IN ('UEFA','CONMEBOL','CONCACAF','CAF','AFC','OFC')
 ORDER BY co.confederacion, s.ranking;`,
  },
  {
    n: 'Consulta 3', titulo: 'id_Selección, Selección, Continente, Confederación, historia, Ventajas, Desventajas, Ranking',
    sql: `SELECT s.id AS id_seleccion, s.nombre AS seleccion, co.nombre AS continente,
       co.confederacion, s.historia, s.ventajas, s.desventajas, s.ranking
  FROM selecciones s
  JOIN continentes co ON co.id_continente = s.id_continente
 ORDER BY s.ranking;`,
  },
  {
    n: 'Consulta 4', titulo: 'Búsqueda (WHERE) que muestre los mejores 10 rankeados',
    sql: `SELECT s.id AS id_seleccion, s.nombre AS seleccion, co.nombre AS continente,
       co.confederacion, s.historia, s.ventajas, s.desventajas, s.ranking
  FROM selecciones s
  JOIN continentes co ON co.id_continente = s.id_continente
 WHERE s.ranking <= 10
 ORDER BY s.ranking ASC
 LIMIT 10;`,
  },
  {
    n: 'Consulta 5', titulo: 'NomSelección, Grupo, Partidos de la primera fase, Estadio, Capacidad, Latitud, Longitud',
    sql: `SELECT sl.nombre AS seleccion, g.nombre AS grupo,
       (sl.nombre || ' vs ' || sv.nombre) AS partido,
       p.fecha, e.nombre AS estadio, e.capacidad, e.latitud, e.longitud
  FROM partidos p
  JOIN selecciones sl ON sl.id = p.id_equipo_local
  JOIN selecciones sv ON sv.id = p.id_equipo_visitante
  JOIN grupos g  ON g.id = p.id_grupo
  JOIN estadios e ON e.id = p.id_estadio
 WHERE p.fase = 'Grupos'
 ORDER BY g.nombre, p.fecha;`,
  },
  {
    n: 'Consulta 6', titulo: 'Con las latitudes/longitudes anteriores, mostrar la ubicación en Google Maps',
    sql: `SELECT sl.nombre AS seleccion, g.nombre AS grupo,
       (sl.nombre || ' vs ' || sv.nombre) AS partido,
       e.nombre AS estadio, e.capacidad, e.latitud, e.longitud,
       'https://www.google.com/maps/search/?api=1&query=' || e.latitud || ',' || e.longitud AS google_maps
  FROM partidos p
  JOIN selecciones sl ON sl.id = p.id_equipo_local
  JOIN selecciones sv ON sv.id = p.id_equipo_visitante
  JOIN grupos g  ON g.id = p.id_grupo
  JOIN estadios e ON e.id = p.id_estadio
 WHERE p.fase = 'Grupos'
 ORDER BY g.nombre, p.fecha;`,
  },
  {
    n: 'Consulta 7', titulo: 'Bandera, Selección, PJ, GF, GC, DG, Juegos Ganados, Empatados, Perdidos y Puntos',
    sql: `SELECT vc.bandera, vc.seleccion, vc.grupo,
       vc.pj AS partidos_jugados, vc.gf AS goles_favor, vc.gc AS goles_contra,
       vc.dg AS diferencia_goles, vc.pg AS juegos_ganados, vc.pe AS juegos_empatados,
       vc.pp AS juegos_perdidos, vc.pts AS puntos_totales
  FROM v_clasificacion vc
 ORDER BY vc.grupo, vc.posicion;`,
  },
  {
    n: 'Consulta 8', titulo: 'Continente, Confederación, Selección, Estadio, lat, lon, Capacidad, Fecha, Horario y Costo del boleto',
    sql: `SELECT co.nombre AS continente, co.confederacion, s.nombre AS seleccion,
       e.nombre AS estadio, e.latitud, e.longitud, e.capacidad,
       p.fecha, p.horario, b.costo
  FROM boletos b
  JOIN partidos p  ON p.id = b.id_partido
  JOIN estadios e  ON e.id = b.id_estadio
  JOIN selecciones s  ON s.id = b.id_seleccion
  JOIN continentes co ON co.id_continente = s.id_continente
 WHERE p.fase = 'Grupos'
 ORDER BY p.fecha, p.horario;`,
  },
  {
    n: 'Adicional 1', titulo: 'Los 5 estadios donde los equipos LOCALES han metido más goles (con partidos, goles y equipos)',
    sql: `SELECT e.nombre AS estadio, e.ciudad, e.pais,
       COUNT(p.id) AS partidos,
       SUM(p.goles_local) AS goles_locales,
       SUM(p.goles_local + p.goles_visitante) AS goles_totales,
       STRING_AGG(DISTINCT sl.nombre, ', ') AS equipos_locales
  FROM estadios e
  JOIN partidos p  ON p.id_estadio = e.id AND p.jugado = TRUE
  JOIN selecciones sl ON sl.id = p.id_equipo_local
 GROUP BY e.id, e.nombre, e.ciudad, e.pais
 ORDER BY goles_locales DESC, goles_totales DESC
 LIMIT 5;`,
  },
  {
    n: 'Adicional 2', titulo: 'Clasificados directos a la fase final (1.º y 2.º de cada grupo)',
    sql: `SELECT grupo, posicion, bandera, seleccion, pts, dg, gf
  FROM v_clasificacion
 WHERE posicion <= 2
 ORDER BY grupo, posicion;`,
  },
  {
    n: 'Adicional 3', titulo: 'Selecciones más goleadoras (Top 10 por goles a favor)',
    sql: `SELECT s.bandera, s.nombre AS seleccion, SUM(c.gf) AS goles_favor
  FROM clasificaciones c
  JOIN selecciones s ON s.id = c.id_seleccion
 GROUP BY s.bandera, s.nombre
 ORDER BY goles_favor DESC, seleccion
 LIMIT 10;`,
  },
  {
    n: 'Adicional 4', titulo: 'Rendimiento por confederación (puntos y goles agregados)',
    sql: `SELECT co.confederacion, COUNT(DISTINCT s.id) AS selecciones,
       SUM(c.pts) AS puntos_totales, SUM(c.gf) AS goles_favor,
       SUM(c.gc) AS goles_contra, ROUND(AVG(c.pts), 2) AS promedio_puntos
  FROM clasificaciones c
  JOIN selecciones s  ON s.id = c.id_seleccion
  JOIN continentes co ON co.id_continente = s.id_continente
 GROUP BY co.confederacion
 ORDER BY puntos_totales DESC;`,
  },
  {
    n: 'Adicional 5', titulo: 'Distancia geográfica (Haversine en SQL) de las capitales del Grupo A al Estadio Azteca',
    sql: `WITH azteca AS (
  SELECT latitud AS lat, longitud AS lon FROM estadios WHERE nombre = 'Estadio Azteca'
)
SELECT s.bandera, s.nombre AS seleccion, s.capital,
       ROUND((6371 * acos(
          cos(radians(a.lat)) * cos(radians(s.latitud)) *
          cos(radians(s.longitud) - radians(a.lon)) +
          sin(radians(a.lat)) * sin(radians(s.latitud))
       ))::numeric, 1) AS km_al_estadio_azteca
  FROM selecciones s
  JOIN clasificaciones c ON c.id_seleccion = s.id
  JOIN grupos g ON g.id = c.id_grupo
  CROSS JOIN azteca a
 WHERE g.nombre = 'A'
 ORDER BY km_al_estadio_azteca;`,
  },
];

let salida = '# Consultas SQL y sus resultados\n\n';
salida += '> Resultados reales obtenidos al ejecutar las consultas sobre la base de datos PostgreSQL del sistema (Mundial 2026 al 25/06/2026).\n';
salida += '> Los textos largos (historia, ventajas, etc.) se recortan con «…» solo para visualización en la tabla.\n\n';

for (const c of consultas) {
  const { rows } = await pool.query(c.sql);
  salida += `## ${c.n}: ${c.titulo}\n\n`;
  salida += '```sql\n' + c.sql + '\n```\n\n';
  salida += `**Resultado (${rows.length} fila${rows.length === 1 ? '' : 's'}):**\n\n`;
  salida += md(rows) + '\n';
}

process.stdout.write(salida);
await pool.end();
