-- ============================================================================
--  COPA MUNDIAL FIFA 2026  -  CONSULTAS (PostgreSQL)
--  8 consultas solicitadas en clase + 5 consultas adicionales
--  Ejecutar:  docker exec -i mundial2026_db psql -U mundial -d mundial2026 -f - < db/queries.sql
--             (o abrir este archivo en pgAdmin / Azure Data Studio y dar Run)
-- ============================================================================


-- ############################################################################
--  PARTE A) LAS 8 CONSULTAS SOLICITADAS
-- ############################################################################

-- ----------------------------------------------------------------------------
-- CONSULTA 1: id_continente, Continente, Confederacion y Pais.
-- ----------------------------------------------------------------------------
SELECT co.id_continente,
       co.nombre        AS continente,
       co.confederacion,
       s.pais
  FROM continentes co
  JOIN selecciones s ON s.id_continente = co.id_continente
 ORDER BY co.id_continente, s.pais;


-- ----------------------------------------------------------------------------
-- CONSULTA 2: Busqueda (WHERE) por las diferentes confederaciones, una de cada.
--             (DISTINCT ON devuelve una seleccion -la mejor rankeada- por
--              cada confederacion).
-- ----------------------------------------------------------------------------
SELECT DISTINCT ON (co.confederacion)
       co.id_continente,
       co.nombre        AS continente,
       co.confederacion,
       s.pais,
       s.nombre         AS seleccion
  FROM continentes co
  JOIN selecciones s ON s.id_continente = co.id_continente
 WHERE co.confederacion IN ('UEFA','CONMEBOL','CONCACAF','CAF','AFC','OFC')
 ORDER BY co.confederacion, s.ranking;


-- ----------------------------------------------------------------------------
-- CONSULTA 3: id_Seleccion, Seleccion, Continente, Confederacion, historia,
--             Ventajas, Desventajas, Ranking.
-- ----------------------------------------------------------------------------
SELECT s.id        AS id_seleccion,
       s.nombre    AS seleccion,
       co.nombre   AS continente,
       co.confederacion,
       s.historia,
       s.ventajas,
       s.desventajas,
       s.ranking
  FROM selecciones s
  JOIN continentes co ON co.id_continente = s.id_continente
 ORDER BY s.ranking;


-- ----------------------------------------------------------------------------
-- CONSULTA 4: Busqueda (WHERE) que muestre los mejores 10 rankeados.
-- ----------------------------------------------------------------------------
SELECT s.id        AS id_seleccion,
       s.nombre    AS seleccion,
       co.nombre   AS continente,
       co.confederacion,
       s.historia,
       s.ventajas,
       s.desventajas,
       s.ranking
  FROM selecciones s
  JOIN continentes co ON co.id_continente = s.id_continente
 WHERE s.ranking <= 10
 ORDER BY s.ranking ASC
 LIMIT 10;


-- ----------------------------------------------------------------------------
-- CONSULTA 5: NomSeleccion, Grupo, Partidos de la primera fase, Estadio,
--             Capacidad del estadio, Latitud, Longitud.
-- ----------------------------------------------------------------------------
SELECT sl.nombre              AS seleccion,
       g.nombre               AS grupo,
       (sl.nombre || ' vs ' || sv.nombre) AS partido,
       p.fecha,
       e.nombre               AS estadio,
       e.capacidad,
       e.latitud,
       e.longitud
  FROM partidos p
  JOIN selecciones sl ON sl.id = p.id_equipo_local
  JOIN selecciones sv ON sv.id = p.id_equipo_visitante
  JOIN grupos      g  ON g.id  = p.id_grupo
  JOIN estadios    e  ON e.id  = p.id_estadio
 WHERE p.fase = 'Grupos'
 ORDER BY g.nombre, p.fecha;


-- ----------------------------------------------------------------------------
-- CONSULTA 6: Con las latitudes y longitudes anteriores, mostrar la ubicacion
--             en Google Maps (se genera el enlace directo al mapa).
-- ----------------------------------------------------------------------------
SELECT sl.nombre              AS seleccion,
       g.nombre               AS grupo,
       (sl.nombre || ' vs ' || sv.nombre) AS partido,
       e.nombre               AS estadio,
       e.capacidad,
       e.latitud,
       e.longitud,
       'https://www.google.com/maps/search/?api=1&query='
         || e.latitud || ',' || e.longitud AS google_maps
  FROM partidos p
  JOIN selecciones sl ON sl.id = p.id_equipo_local
  JOIN selecciones sv ON sv.id = p.id_equipo_visitante
  JOIN grupos      g  ON g.id  = p.id_grupo
  JOIN estadios    e  ON e.id  = p.id_estadio
 WHERE p.fase = 'Grupos'
 ORDER BY g.nombre, p.fecha;


-- ----------------------------------------------------------------------------
-- CONSULTA 7: Bandera, nomSeleccion, Partidos Jugados, Goles a Favor,
--             Goles en Contra, Diferencia de Goles, Juegos Ganados,
--             Juegos Empatados, Juegos Perdidos y Puntos totales.
-- ----------------------------------------------------------------------------
SELECT vc.bandera,
       vc.seleccion,
       vc.grupo,
       vc.pj  AS partidos_jugados,
       vc.gf  AS goles_favor,
       vc.gc  AS goles_contra,
       vc.dg  AS diferencia_goles,
       vc.pg  AS juegos_ganados,
       vc.pe  AS juegos_empatados,
       vc.pp  AS juegos_perdidos,
       vc.pts AS puntos_totales
  FROM v_clasificacion vc
 ORDER BY vc.grupo, vc.posicion;


-- ----------------------------------------------------------------------------
-- CONSULTA 8: Continente, Confederacion, Seleccion, Estadio, latitud, longitud,
--             Capacidad del estadio, Fecha de los partidos de la primera fase,
--             Horario y Costos de los boletos.
-- ----------------------------------------------------------------------------
SELECT co.nombre        AS continente,
       co.confederacion,
       s.nombre         AS seleccion,
       e.nombre         AS estadio,
       e.latitud,
       e.longitud,
       e.capacidad,
       p.fecha,
       p.horario,
       b.costo
  FROM boletos b
  JOIN partidos    p  ON p.id  = b.id_partido
  JOIN estadios    e  ON e.id  = b.id_estadio
  JOIN selecciones s  ON s.id  = b.id_seleccion
  JOIN continentes co ON co.id_continente = s.id_continente
 WHERE p.fase = 'Grupos'
 ORDER BY p.fecha, p.horario;


-- ############################################################################
--  PARTE B) 5 CONSULTAS ADICIONALES (diferentes a las anteriores)
-- ############################################################################

-- ----------------------------------------------------------------------------
-- ADICIONAL 1: Los 5 estadios donde los equipos LOCALES han metido mas goles,
--              con los partidos jugados ahi, los goles locales, los goles
--              totales y los equipos que jugaron de local.
-- ----------------------------------------------------------------------------
SELECT e.nombre AS estadio, e.ciudad, e.pais,
       COUNT(p.id)                            AS partidos,
       SUM(p.goles_local)                     AS goles_locales,
       SUM(p.goles_local + p.goles_visitante) AS goles_totales,
       STRING_AGG(DISTINCT sl.nombre, ', ')   AS equipos_locales
  FROM estadios e
  JOIN partidos    p  ON p.id_estadio = e.id AND p.jugado = TRUE
  JOIN selecciones sl ON sl.id = p.id_equipo_local
 GROUP BY e.id, e.nombre, e.ciudad, e.pais
 ORDER BY goles_locales DESC, goles_totales DESC
 LIMIT 5;

-- ----------------------------------------------------------------------------
-- ADICIONAL 2: Clasificados directos a la fase final (1ro y 2do de cada grupo).
-- ----------------------------------------------------------------------------
SELECT grupo, posicion, bandera, seleccion, pts, dg, gf
  FROM v_clasificacion
 WHERE posicion <= 2
 ORDER BY grupo, posicion;

-- ----------------------------------------------------------------------------
-- ADICIONAL 3: Selecciones mas goleadoras del torneo (Top 10 por goles a favor).
-- ----------------------------------------------------------------------------
SELECT s.bandera, s.nombre AS seleccion, SUM(c.gf) AS goles_favor
  FROM clasificaciones c
  JOIN selecciones s ON s.id = c.id_seleccion
 GROUP BY s.bandera, s.nombre
 ORDER BY goles_favor DESC, seleccion
 LIMIT 10;

-- ----------------------------------------------------------------------------
-- ADICIONAL 4: Rendimiento por confederacion (puntos y goles agregados).
-- ----------------------------------------------------------------------------
SELECT co.confederacion,
       COUNT(DISTINCT s.id) AS selecciones,
       SUM(c.pts)           AS puntos_totales,
       SUM(c.gf)            AS goles_favor,
       SUM(c.gc)            AS goles_contra,
       ROUND(AVG(c.pts), 2) AS promedio_puntos
  FROM clasificaciones c
  JOIN selecciones s  ON s.id = c.id_seleccion
  JOIN continentes co ON co.id_continente = s.id_continente
 GROUP BY co.confederacion
 ORDER BY puntos_totales DESC;

-- ----------------------------------------------------------------------------
-- ADICIONAL 5: Distancia geografica (Haversine en SQL) entre la capital de
--              cada seleccion del Grupo A y el Estadio Azteca.
-- ----------------------------------------------------------------------------
WITH azteca AS (
  SELECT latitud AS lat, longitud AS lon FROM estadios WHERE nombre = 'Estadio Azteca'
)
SELECT s.bandera, s.nombre AS seleccion, s.capital,
       ROUND(
         (6371 * acos(
            cos(radians(a.lat)) * cos(radians(s.latitud)) *
            cos(radians(s.longitud) - radians(a.lon)) +
            sin(radians(a.lat)) * sin(radians(s.latitud))
         ))::numeric, 1) AS km_al_estadio_azteca
  FROM selecciones s
  JOIN clasificaciones c ON c.id_seleccion = s.id
  JOIN grupos g          ON g.id = c.id_grupo
  CROSS JOIN azteca a
 WHERE g.nombre = 'A'
 ORDER BY km_al_estadio_azteca;
