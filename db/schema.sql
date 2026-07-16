-- ============================================================================
--  COPA MUNDIAL FIFA 2026  -  Esquema de Base de Datos (PostgreSQL)
--  Sistema de Simulacion, Administracion y Geolocalizacion
-- ----------------------------------------------------------------------------
--  Motor: PostgreSQL 16
--  Este script crea TODAS las tablas, restricciones, funciones, disparadores
--  (triggers) y vistas del sistema. Es idempotente: borra y recrea el esquema.
-- ============================================================================

-- Reiniciar esquema (entorno de desarrollo / examen)
DROP SCHEMA IF EXISTS public CASCADE;
CREATE SCHEMA public;
SET client_encoding = 'UTF8';

-- ============================================================================
-- 1) CONTINENTES  (un continente <-> una confederacion FIFA)
--    Europa=UEFA, America del Sur=CONMEBOL, Norteamerica=CONCACAF,
--    Africa=CAF, Asia=AFC, Oceania=OFC
-- ============================================================================
CREATE TABLE continentes (
    id_continente   SERIAL PRIMARY KEY,
    nombre          VARCHAR(60)  NOT NULL UNIQUE,   -- Continente
    confederacion   VARCHAR(20)  NOT NULL UNIQUE,   -- Confederacion FIFA
    descripcion     TEXT
);

COMMENT ON TABLE continentes IS 'Continentes y su confederacion FIFA correspondiente';

-- ============================================================================
-- 2) SELECCIONES  (con geolocalizacion de la capital del pais)
-- ============================================================================
CREATE TABLE selecciones (
    id              SERIAL PRIMARY KEY,
    nombre          VARCHAR(80)  NOT NULL UNIQUE,    -- Nombre de la seleccion
    id_continente   INT          NOT NULL REFERENCES continentes(id_continente),
    pais            VARCHAR(80)  NOT NULL,
    capital         VARCHAR(80),
    historia        TEXT,
    ventajas        TEXT,
    desventajas     TEXT,
    entrenador      VARCHAR(80),                        -- Director tecnico
    ranking         INT          CHECK (ranking > 0),  -- Ranking FIFA mundial
    bandera         VARCHAR(16),                        -- Emoji de la bandera
    latitud         NUMERIC(9,6),                       -- Geolocalizacion
    longitud        NUMERIC(9,6)
);

COMMENT ON TABLE selecciones IS 'Selecciones nacionales participantes con geolocalizacion';
CREATE INDEX idx_selecciones_continente ON selecciones(id_continente);
CREATE INDEX idx_selecciones_ranking    ON selecciones(ranking);

-- ============================================================================
-- 3) GRUPOS  (12 grupos de 4 equipos: A .. L)
-- ============================================================================
CREATE TABLE grupos (
    id      SERIAL PRIMARY KEY,
    nombre  VARCHAR(5) NOT NULL UNIQUE   -- A, B, C, ...
);

COMMENT ON TABLE grupos IS '12 grupos de la fase de grupos';

-- ============================================================================
-- 4) ESTADIOS  (sedes en Mexico, Estados Unidos y Canada, con geolocalizacion)
-- ============================================================================
CREATE TABLE estadios (
    id              SERIAL PRIMARY KEY,
    nombre          VARCHAR(100) NOT NULL,
    ciudad          VARCHAR(80)  NOT NULL,
    pais            VARCHAR(60)  NOT NULL,
    latitud         NUMERIC(9,6) NOT NULL,
    longitud        NUMERIC(9,6) NOT NULL,
    capacidad       INT          CHECK (capacidad > 0),
    descripcion     TEXT,                -- Resena / dato historico del estadio
    anio_apertura   INT,                 -- Ano de inauguracion
    superficie      VARCHAR(60),         -- Tipo de cesped
    techo           VARCHAR(60),         -- Abierto / retractil / fijo
    equipo_local    VARCHAR(120)         -- Club(es) que lo usan habitualmente
);

COMMENT ON TABLE estadios IS 'Estadios sede con geolocalizacion';

-- ============================================================================
-- 5) PARTIDOS  (fase de grupos y fase final)
-- ============================================================================
CREATE TABLE partidos (
    id                  SERIAL PRIMARY KEY,
    fase                VARCHAR(20) NOT NULL DEFAULT 'Grupos'
                        CHECK (fase IN ('Grupos','Dieciseisavos','Octavos',
                                        'Cuartos','Semifinal','Tercer Lugar','Final')),
    id_grupo            INT REFERENCES grupos(id) ON DELETE SET NULL,  -- NULL en fase final
    id_equipo_local     INT NOT NULL REFERENCES selecciones(id),
    id_equipo_visitante INT NOT NULL REFERENCES selecciones(id),
    goles_local         INT CHECK (goles_local >= 0),
    goles_visitante     INT CHECK (goles_visitante >= 0),
    fecha               DATE,
    horario             TIME,
    id_estadio          INT REFERENCES estadios(id),
    jugado              BOOLEAN NOT NULL DEFAULT FALSE,
    CONSTRAINT chk_equipos_distintos CHECK (id_equipo_local <> id_equipo_visitante)
);

COMMENT ON TABLE partidos IS 'Partidos de todas las fases del torneo';
CREATE INDEX idx_partidos_grupo   ON partidos(id_grupo);
CREATE INDEX idx_partidos_estadio ON partidos(id_estadio);
CREATE INDEX idx_partidos_fase    ON partidos(fase);

-- ============================================================================
-- 6) CLASIFICACIONES  (tabla de posiciones por grupo)
--    dg = gf - gc es columna GENERADA (siempre consistente).
-- ============================================================================
CREATE TABLE clasificaciones (
    id              SERIAL PRIMARY KEY,
    id_grupo        INT NOT NULL REFERENCES grupos(id) ON DELETE CASCADE,
    id_seleccion    INT NOT NULL REFERENCES selecciones(id) ON DELETE CASCADE,
    pj              INT NOT NULL DEFAULT 0,   -- Partidos jugados
    pg              INT NOT NULL DEFAULT 0,   -- Ganados
    pe              INT NOT NULL DEFAULT 0,   -- Empatados
    pp              INT NOT NULL DEFAULT 0,   -- Perdidos
    gf              INT NOT NULL DEFAULT 0,   -- Goles a favor
    gc              INT NOT NULL DEFAULT 0,   -- Goles en contra
    dg              INT GENERATED ALWAYS AS (gf - gc) STORED,  -- Diferencia de goles
    pts             INT NOT NULL DEFAULT 0,   -- Puntos
    UNIQUE (id_grupo, id_seleccion)
);

COMMENT ON TABLE clasificaciones IS 'Tabla de posiciones por grupo (se recalcula con triggers)';

-- ============================================================================
-- 7) FASE FINAL  (eliminatorias: sede asignada automaticamente tras los grupos)
-- ============================================================================
CREATE TABLE fase_final (
    id                      SERIAL PRIMARY KEY,
    nombre_fase             VARCHAR(20) NOT NULL
                            CHECK (nombre_fase IN ('Dieciseisavos','Octavos',
                                   'Cuartos','Semifinal','Tercer Lugar','Final')),
    llave                   VARCHAR(20),    -- Identificador de la llave, ej. 'O1'
    id_seleccion_local      INT REFERENCES selecciones(id),  -- Clasificado 1 (NULL = por definir)
    id_seleccion_visitante  INT REFERENCES selecciones(id),  -- Clasificado 2 (NULL = por definir)
    id_estadio              INT REFERENCES estadios(id),     -- Sede
    fecha                   DATE,
    horario                 TIME,
    goles_local             INT CHECK (goles_local >= 0),        -- Marcador (si jugado)
    goles_visitante         INT CHECK (goles_visitante >= 0),
    penales_local           INT CHECK (penales_local >= 0),      -- Definicion por penales
    penales_visitante       INT CHECK (penales_visitante >= 0),
    jugado                  BOOLEAN NOT NULL DEFAULT FALSE,
    id_partido              INT REFERENCES partidos(id) ON DELETE SET NULL
);

COMMENT ON TABLE fase_final IS 'Cuadro de eliminatorias con sedes asignadas';

-- ============================================================================
-- 8) USUARIOS
-- ============================================================================
CREATE TABLE usuarios (
    id          SERIAL PRIMARY KEY,
    nombre      VARCHAR(120) NOT NULL,
    email       VARCHAR(160) UNIQUE,
    creado_en   TIMESTAMP NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE usuarios IS 'Usuarios del sistema (compradores de boletos)';

-- ============================================================================
-- 9) BOLETOS
-- ============================================================================
CREATE TABLE boletos (
    id              SERIAL PRIMARY KEY,
    id_usuario      INT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    id_estadio      INT NOT NULL REFERENCES estadios(id),
    id_partido      INT REFERENCES partidos(id) ON DELETE SET NULL,
    id_seleccion    INT REFERENCES selecciones(id),
    dia             VARCHAR(20),     -- Dia de la semana / jornada
    fecha           DATE,
    horario         TIME,
    costo           NUMERIC(10,2) CHECK (costo >= 0)
);

COMMENT ON TABLE boletos IS 'Boletos comprados por los usuarios';

-- ============================================================================
--  LOGICA DE CLASIFICACION  (algoritmo de clasificacion en la BD)
--  Recalcula la tabla de posiciones de un grupo a partir de los partidos
--  jugados. Victoria=3 pts, Empate=1 pt, Derrota=0 pts.
-- ============================================================================
CREATE OR REPLACE FUNCTION fn_recalcular_clasificacion(p_grupo INT)
RETURNS VOID AS $$
BEGIN
    -- 1) Reiniciar estadisticas del grupo
    UPDATE clasificaciones
       SET pj = 0, pg = 0, pe = 0, pp = 0, gf = 0, gc = 0, pts = 0
     WHERE id_grupo = p_grupo;

    -- 2) Recalcular desde los partidos jugados (cada partido aporta 2 filas:
    --    la del local y la del visitante)
    WITH eventos AS (
        SELECT id_equipo_local  AS id_seleccion, goles_local AS gf, goles_visitante AS gc
          FROM partidos
         WHERE id_grupo = p_grupo AND jugado = TRUE
        UNION ALL
        SELECT id_equipo_visitante, goles_visitante, goles_local
          FROM partidos
         WHERE id_grupo = p_grupo AND jugado = TRUE
    ),
    agg AS (
        SELECT id_seleccion,
               COUNT(*)                                              AS pj,
               SUM(CASE WHEN gf > gc THEN 1 ELSE 0 END)              AS pg,
               SUM(CASE WHEN gf = gc THEN 1 ELSE 0 END)              AS pe,
               SUM(CASE WHEN gf < gc THEN 1 ELSE 0 END)              AS pp,
               SUM(gf)                                               AS gf,
               SUM(gc)                                               AS gc,
               SUM(CASE WHEN gf > gc THEN 3 WHEN gf = gc THEN 1 ELSE 0 END) AS pts
          FROM eventos
         GROUP BY id_seleccion
    )
    UPDATE clasificaciones c
       SET pj = a.pj, pg = a.pg, pe = a.pe, pp = a.pp,
           gf = a.gf, gc = a.gc, pts = a.pts
      FROM agg a
     WHERE c.id_grupo = p_grupo
       AND c.id_seleccion = a.id_seleccion;
END;
$$ LANGUAGE plpgsql;

-- Disparador: cualquier alta/cambio/baja de un partido de grupos recalcula
-- automaticamente la tabla de posiciones del grupo afectado.
CREATE OR REPLACE FUNCTION trg_partido_clasificacion()
RETURNS TRIGGER AS $$
DECLARE
    v_grupo INT;
BEGIN
    IF TG_OP = 'DELETE' THEN
        v_grupo := OLD.id_grupo;
    ELSE
        v_grupo := NEW.id_grupo;
    END IF;

    IF v_grupo IS NOT NULL THEN
        PERFORM fn_recalcular_clasificacion(v_grupo);
    END IF;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tg_partido_clasificacion
AFTER INSERT OR UPDATE OR DELETE ON partidos
FOR EACH ROW EXECUTE FUNCTION trg_partido_clasificacion();

-- ============================================================================
--  VISTAS DE APOYO
-- ============================================================================

-- Tabla de posiciones ordenada con posicion (algoritmo de desempate:
-- puntos > diferencia de goles > goles a favor > orden alfabético)
CREATE OR REPLACE VIEW v_clasificacion AS
SELECT g.nombre                       AS grupo,
       s.bandera,
       s.nombre                       AS seleccion,
       c.pj, c.pg, c.pe, c.pp, c.gf, c.gc, c.dg, c.pts,
       ROW_NUMBER() OVER (PARTITION BY c.id_grupo
                          ORDER BY c.pts DESC, c.dg DESC, c.gf DESC, s.nombre ASC) AS posicion
  FROM clasificaciones c
  JOIN grupos      g ON g.id = c.id_grupo
  JOIN selecciones s ON s.id = c.id_seleccion;

-- Vista de paises con su continente y confederacion
CREATE OR REPLACE VIEW v_paises AS
SELECT co.id_continente,
       co.nombre        AS continente,
       co.confederacion,
       s.pais,
       s.nombre         AS seleccion,
       s.ranking,
       s.bandera
  FROM selecciones s
  JOIN continentes co ON co.id_continente = s.id_continente;

-- Vista detallada de partidos (nombres en lugar de IDs)
CREATE OR REPLACE VIEW v_partidos AS
SELECT p.id,
       p.fase,
       g.nombre              AS grupo,
       sl.nombre             AS local,
       sl.bandera            AS bandera_local,
       sv.nombre             AS visitante,
       sv.bandera            AS bandera_visitante,
       p.goles_local,
       p.goles_visitante,
       p.fecha,
       p.horario,
       e.nombre              AS estadio,
       e.ciudad,
       e.pais,
       p.jugado
  FROM partidos p
  JOIN selecciones sl ON sl.id = p.id_equipo_local
  JOIN selecciones sv ON sv.id = p.id_equipo_visitante
  LEFT JOIN grupos   g ON g.id = p.id_grupo
  LEFT JOIN estadios e ON e.id = p.id_estadio;

-- ============================================================================
--  FIN DEL ESQUEMA
-- ============================================================================
