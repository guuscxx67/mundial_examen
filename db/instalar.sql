-- INSTALADOR COMPLETO Mundial 2026 (PostgreSQL) - datos reales al 01/07/2026
-- Ejecutar en una base NUEVA y VACIA. En pgAdmin: crear BD mundial2026 -> Query Tool -> abrir -> Run.

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
    id          SERIAL PRIMARY KEY,
    nombre      VARCHAR(100) NOT NULL,
    ciudad      VARCHAR(80)  NOT NULL,
    pais        VARCHAR(60)  NOT NULL,
    latitud     NUMERIC(9,6) NOT NULL,
    longitud    NUMERIC(9,6) NOT NULL,
    capacidad   INT          CHECK (capacidad > 0)
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
-- puntos > diferencia de goles > goles a favor)
CREATE OR REPLACE VIEW v_clasificacion AS
SELECT g.nombre                       AS grupo,
       s.bandera,
       s.nombre                       AS seleccion,
       c.pj, c.pg, c.pe, c.pp, c.gf, c.gc, c.dg, c.pts,
       RANK() OVER (PARTITION BY c.id_grupo
                    ORDER BY c.pts DESC, c.dg DESC, c.gf DESC) AS posicion
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

-- ============================================================================
--  COPA MUNDIAL FIFA 2026  -  Datos REALES al 01/07/2026 (seed)
--  GENERADO por scripts/generar-datos-reales.mjs  (no editar a mano)
--  48 selecciones | 16 estadios | 12 grupos | 72 partidos de grupos + fase final
--  Resultados y sedes reales (fuente: Wikipedia por grupo, verificado vs posiciones oficiales).
-- ============================================================================
SET client_encoding = 'UTF8';
BEGIN;

-- 1) CONTINENTES
INSERT INTO continentes (id_continente, nombre, confederacion, descripcion) VALUES (1, 'Europa', 'UEFA', 'Union de Asociaciones Europeas de Futbol');
INSERT INTO continentes (id_continente, nombre, confederacion, descripcion) VALUES (2, 'America del Sur', 'CONMEBOL', 'Confederacion Sudamericana de Futbol');
INSERT INTO continentes (id_continente, nombre, confederacion, descripcion) VALUES (3, 'America del Norte', 'CONCACAF', 'Confederacion de Norteamerica, Centroamerica y el Caribe');
INSERT INTO continentes (id_continente, nombre, confederacion, descripcion) VALUES (4, 'Africa', 'CAF', 'Confederacion Africana de Futbol');
INSERT INTO continentes (id_continente, nombre, confederacion, descripcion) VALUES (5, 'Asia', 'AFC', 'Confederacion Asiatica de Futbol');
INSERT INTO continentes (id_continente, nombre, confederacion, descripcion) VALUES (6, 'Oceania', 'OFC', 'Confederacion de Futbol de Oceania');

-- 2) SELECCIONES (con geolocalizacion)
INSERT INTO selecciones (id, nombre, id_continente, pais, capital, historia, ventajas, desventajas, entrenador, ranking, bandera, latitud, longitud) VALUES (1, 'Mexico', 3, 'Mexico', 'Ciudad de Mexico', 'Mexico es la potencia historica de la CONCACAF y uno de los participantes mas constantes de los mundiales. Alcanzo los cuartos de final en 1970 y 1986, ambos como anfitrion, su mejor resultado historico. En 2026 vuelve a ser sede mundialista por tercera vez.', 'Gran experiencia mundialista, aficion extremadamente solida y plantel competitivo con jugadores en ligas europeas.', 'Recurrente incapacidad para superar los octavos de final, la llamada maldicion del quinto partido.', 'Javier Aguirre', 14, '🇲🇽', 19.4326, -99.1332);
INSERT INTO selecciones (id, nombre, id_continente, pais, capital, historia, ventajas, desventajas, entrenador, ranking, bandera, latitud, longitud) VALUES (2, 'Sudafrica', 4, 'Sudafrica', 'Pretoria', 'Sudafrica organizo el Mundial de 2010, el primero en suelo africano. Gano la Copa Africana de Naciones en 1996 como anfitriona. Los Bafana Bafana regresan a la elite mundial.', 'Velocidad, juego colectivo dinamico y buen estado fisico.', 'Irregularidad y poca experiencia mundialista reciente.', 'Hugo Broos', 56, '🇿🇦', -25.7479, 28.2293);
INSERT INTO selecciones (id, nombre, id_continente, pais, capital, historia, ventajas, desventajas, entrenador, ranking, bandera, latitud, longitud) VALUES (3, 'Corea del Sur', 5, 'Corea del Sur', 'Seul', 'Corea del Sur es el equipo asiatico con mas participaciones mundialistas y alcanzo las semifinales como anfitrion en 2002, su mejor resultado historico. Clasifica a los Mundiales de manera regular desde 1986. Liderada por figuras como Son Heung-min, mantiene un nivel competitivo constante.', 'Intensidad fisica, gran capacidad de presion y el talento individual de Son Heung-min.', 'Defensa vulnerable ante rivales tecnicos y dependencia excesiva de sus estrellas.', 'Hong Myung-bo', 23, '🇰🇷', 37.5665, 126.978);
INSERT INTO selecciones (id, nombre, id_continente, pais, capital, historia, ventajas, desventajas, entrenador, ranking, bandera, latitud, longitud) VALUES (4, 'Republica Checa', 1, 'Republica Checa', 'Praga', 'Heredera de la escuela checoslovaca, fue subcampeona de la Eurocopa 1996 y semifinalista mundialista en 1934 y 1962. Mantiene una solida tradicion en Europa central.', 'Orden tactico y buena tecnica individual.', 'Generacion en transicion sin grandes estrellas.', 'Ivan Hasek', 40, '🇨🇿', 50.0755, 14.4378);
INSERT INTO selecciones (id, nombre, id_continente, pais, capital, historia, ventajas, desventajas, entrenador, ranking, bandera, latitud, longitud) VALUES (5, 'Suiza', 1, 'Suiza', 'Berna', 'Suiza es una participante habitual de los Mundiales, alcanzando octavos en 2014, 2018 y 2022. Llego a cuartos en la Eurocopa 2020 y 2024. Destaca por su solidez y regularidad.', 'Equipo ordenado, disciplinado y dificil de batir.', 'Le falta jerarquia ofensiva para pelear titulos.', 'Murat Yakin', 19, '🇨🇭', 46.948, 7.4474);
INSERT INTO selecciones (id, nombre, id_continente, pais, capital, historia, ventajas, desventajas, entrenador, ranking, bandera, latitud, longitud) VALUES (6, 'Canada', 3, 'Canada', 'Ottawa', 'Canada disputo su primer Mundial en 1986 sin anotar goles y volvio a la cita tras 36 anos en 2022. Ha crecido enormemente impulsado por figuras como Alphonso Davies y Jonathan David. En 2026 sera anfitrion por primera vez en su historia.', 'Velocidad y dinamismo ofensivo con figuras de talla mundial y proyeccion en ascenso.', 'Poca profundidad de plantel y limitada experiencia en fases finales mundialistas.', 'Jesse Marsch', 30, '🇨🇦', 45.4215, -75.6972);
INSERT INTO selecciones (id, nombre, id_continente, pais, capital, historia, ventajas, desventajas, entrenador, ranking, bandera, latitud, longitud) VALUES (7, 'Bosnia y Herzegovina', 1, 'Bosnia y Herzegovina', 'Sarajevo', 'Debuto en el Mundial de Brasil 2014 con figuras como Edin Dzeko. Es una seleccion competitiva del sureste europeo que vuelve a la cita mundialista.', 'Poder ofensivo y caracter competitivo.', 'Defensa vulnerable y poca profundidad de plantel.', 'Sergej Barbarez', 74, '🇧🇦', 43.8563, 18.4131);
INSERT INTO selecciones (id, nombre, id_continente, pais, capital, historia, ventajas, desventajas, entrenador, ranking, bandera, latitud, longitud) VALUES (8, 'Catar', 5, 'Catar', 'Doha', 'Catar fue anfitrion del Mundial 2022 y es el vigente bicampeon de la Copa Asiatica (2019 y 2023). Aunque su debut mundialista fue discreto, ha invertido fuertemente en su desarrollo futbolistico. Es una de las selecciones emergentes mas fuertes del continente.', 'Generacion talentosa y campeona continental con buen toque y movilidad.', 'Escasa experiencia ganadora a nivel mundial y bajo rendimiento ante selecciones de elite.', 'Julen Lopetegui', 36, '🇶🇦', 25.2854, 51.531);
INSERT INTO selecciones (id, nombre, id_continente, pais, capital, historia, ventajas, desventajas, entrenador, ranking, bandera, latitud, longitud) VALUES (9, 'Brasil', 2, 'Brasil', 'Brasilia', 'Brasil es la unica seleccion pentacampeona del mundo (1958, 1962, 1970, 1994 y 2002). Es el equipo con mas participaciones mundialistas y nunca ha faltado a una Copa del Mundo. Representa la maxima tradicion del jogo bonito.', 'Abundante talento ofensivo individual y una cantera inagotable de futbolistas de elite.', 'Inestabilidad reciente y falta de un proyecto solido tras varios cambios de entrenador.', 'Carlo Ancelotti', 6, '🇧🇷', -15.7939, -47.8828);
INSERT INTO selecciones (id, nombre, id_continente, pais, capital, historia, ventajas, desventajas, entrenador, ranking, bandera, latitud, longitud) VALUES (10, 'Marruecos', 4, 'Marruecos', 'Rabat', 'Marruecos hizo historia en Catar 2022 al convertirse en la primera seleccion africana en alcanzar las semifinales de un Mundial. Debutaron en 1970 y en 1986 fueron el primer pais africano en superar la fase de grupos. Son hoy el referente del futbol del continente.', 'Defensa solida y bloque compacto con jugadores de elite europea como Hakimi y Amrabat.', 'Dependen mucho de su solidez defensiva y a veces les falta contundencia en ataque.', 'Walid Regragui', 7, '🇲🇦', 34.0209, -6.8417);
INSERT INTO selecciones (id, nombre, id_continente, pais, capital, historia, ventajas, desventajas, entrenador, ranking, bandera, latitud, longitud) VALUES (11, 'Escocia', 1, 'Escocia', 'Edimburgo', 'Escocia es pionera del futbol y disputo varios Mundiales entre 1954 y 1998. No supera la fase de grupos en su historia mundialista. Resurgio clasificando a las Eurocopas 2020 y 2024.', 'Espiritu combativo y solido funcionamiento colectivo.', 'Limitado talento individual frente a las grandes potencias.', 'Steve Clarke', 39, '🏴󠁧󠁢󠁳󠁣󠁴󠁿', 55.9533, -3.1883);
INSERT INTO selecciones (id, nombre, id_continente, pais, capital, historia, ventajas, desventajas, entrenador, ranking, bandera, latitud, longitud) VALUES (12, 'Haiti', 3, 'Haiti', 'Puerto Principe', 'Haiti disputo su unico Mundial en Alemania 1974. Es una de las selecciones historicas del Caribe que regresa a la maxima cita pese a sus dificultades.', 'Talento individual y velocidad en ataque.', 'Falta de recursos e infraestructura futbolistica.', 'Sebastien Migne', 86, '🇭🇹', 18.5944, -72.3074);
INSERT INTO selecciones (id, nombre, id_continente, pais, capital, historia, ventajas, desventajas, entrenador, ranking, bandera, latitud, longitud) VALUES (13, 'Estados Unidos', 3, 'Estados Unidos', 'Washington D. C.', 'Estados Unidos fue semifinalista en el primer Mundial de 1930 y resurgio como potencia regional tras organizar el torneo de 1994. Llego a cuartos de final en 2002, su mejor actuacion moderna. Coorganiza el Mundial 2026 con una generacion joven y talentosa.', 'Generacion joven con muchos jugadores en clubes europeos de primer nivel y condicion de local.', 'Inconsistencia ante rivales fuertes y falta de un goleador de elite consolidado.', 'Mauricio Pochettino', 17, '🇺🇸', 38.9072, -77.0369);
INSERT INTO selecciones (id, nombre, id_continente, pais, capital, historia, ventajas, desventajas, entrenador, ranking, bandera, latitud, longitud) VALUES (14, 'Australia', 5, 'Australia', 'Canberra', 'Australia se integro a la AFC en 2006 y desde entonces es habitual en los Mundiales. En 2022 alcanzo los octavos de final tras una destacada fase de grupos. Los Socceroos combinan fisico europeo con experiencia internacional.', 'Fortaleza fisica, gran mentalidad competitiva y juego aereo dominante.', 'Plantilla con poca profundidad de talento de primer nivel y limitaciones tecnicas.', 'Tony Popovic', 25, '🇦🇺', -35.2809, 149.13);
INSERT INTO selecciones (id, nombre, id_continente, pais, capital, historia, ventajas, desventajas, entrenador, ranking, bandera, latitud, longitud) VALUES (15, 'Paraguay', 2, 'Paraguay', 'Asuncion', 'Paraguay alcanzo los cuartos de final en Sudafrica 2010, su mejor actuacion mundialista. Es una seleccion historicamente dura y combativa en eliminatorias sudamericanas. Regresa a un Mundial tras varias ausencias.', 'Solidez defensiva y caracter competitivo con orden tactico bajo su cuerpo tecnico.', 'Escasa generacion de juego ofensivo y dependencia de resultados ajustados.', 'Gustavo Alfaro', 41, '🇵🇾', -25.2637, -57.5759);
INSERT INTO selecciones (id, nombre, id_continente, pais, capital, historia, ventajas, desventajas, entrenador, ranking, bandera, latitud, longitud) VALUES (16, 'Turquia', 1, 'Turquia', 'Ankara', 'Turquia logro un historico tercer puesto en el Mundial 2002. Llego a cuartos en la Eurocopa 2024 con una generacion prometedora. Es un equipo con creciente proyeccion.', 'Juventud talentosa y gran ambiente de aficion.', 'Inconsistencia y falta de regularidad en torneos largos.', 'Vincenzo Montella', 26, '🇹🇷', 39.9334, 32.8597);
INSERT INTO selecciones (id, nombre, id_continente, pais, capital, historia, ventajas, desventajas, entrenador, ranking, bandera, latitud, longitud) VALUES (17, 'Alemania', 1, 'Alemania', 'Berlin', 'Alemania es tetracampeona del mundo (1954, 1974, 1990 y 2014). Es una de las selecciones mas exitosas de la historia. Tras fracasos en 2018 y 2022 busca recuperar su jerarquia.', 'Mentalidad competitiva y estructura tactica solida.', 'Reconstruccion en marcha tras dos Mundiales decepcionantes.', 'Julian Nagelsmann', 9, '🇩🇪', 52.52, 13.405);
INSERT INTO selecciones (id, nombre, id_continente, pais, capital, historia, ventajas, desventajas, entrenador, ranking, bandera, latitud, longitud) VALUES (18, 'Costa de Marfil', 4, 'Costa de Marfil', 'Yamusukro', 'Costa de Marfil vivio su epoca dorada con la generacion de Drogba, clasificando a tres Mundiales consecutivos. Conquistaron la Copa Africana de Naciones en 1992, 2015 y como anfitriones en 2024. Mantienen una camada talentosa de jugadores en Europa.', 'Plantel equilibrado y campeon continental vigente con confianza renovada.', 'Historial de bajo rendimiento en fases de grupos mundialistas.', 'Emerse Fae', 33, '🇨🇮', 6.8276, -5.2893);
INSERT INTO selecciones (id, nombre, id_continente, pais, capital, historia, ventajas, desventajas, entrenador, ranking, bandera, latitud, longitud) VALUES (19, 'Ecuador', 2, 'Ecuador', 'Quito', 'Ecuador ha clasificado a varios mundiales desde 2002, alcanzando los octavos de final en Alemania 2006. En las eliminatorias recientes mostro solidez pese a deducciones de puntos. Su altura en Quito es un factor diferencial como local.', 'Defensa joven y robusta con gran fortaleza fisica y equipo bien estructurado.', 'Falta de pegada ofensiva y poca experiencia en instancias decisivas mundialistas.', 'Sebastian Beccacece', 23, '🇪🇨', -0.1807, -78.4678);
INSERT INTO selecciones (id, nombre, id_continente, pais, capital, historia, ventajas, desventajas, entrenador, ranking, bandera, latitud, longitud) VALUES (20, 'Curazao', 3, 'Curazao', 'Willemstad', 'Pequena isla del Caribe, Curazao gano la Copa del Caribe 2017 y vive una clasificacion historica aprovechando jugadores de origen neerlandes.', 'Jugadores formados en ligas europeas.', 'Escasa poblacion y nula experiencia mundialista.', 'Dick Advocaat', 82, '🇨🇼', 12.1084, -68.9335);
INSERT INTO selecciones (id, nombre, id_continente, pais, capital, historia, ventajas, desventajas, entrenador, ranking, bandera, latitud, longitud) VALUES (21, 'Paises Bajos', 1, 'Paises Bajos', 'Amsterdam', 'Paises Bajos fue subcampeona del mundo en 1974, 1978 y 2010. Es famosa por el ''futbol total''. Pese a su gran historia, nunca ha levantado la Copa del Mundo.', 'Estilo ofensivo y solida defensa con jugadores de top.', 'Inconsistencia y falta de un cierre de torneos ganador.', 'Ronald Koeman', 7, '🇳🇱', 52.3676, 4.9041);
INSERT INTO selecciones (id, nombre, id_continente, pais, capital, historia, ventajas, desventajas, entrenador, ranking, bandera, latitud, longitud) VALUES (22, 'Japon', 5, 'Japon', 'Tokio', 'Japon disputa Mundiales de forma ininterrumpida desde 1998 y ha alcanzado los octavos de final en cuatro ediciones. En Catar 2022 sorprendio al vencer a Alemania y Espana en la fase de grupos. Es considerada la potencia futbolistica mas consistente de Asia.', 'Juego colectivo muy organizado, ritmo alto y un bloque de jugadores formados en las mejores ligas europeas.', 'Falta de un goleador de elite y dificultad historica para superar la barrera de los octavos de final.', 'Hajime Moriyasu', 17, '🇯🇵', 35.6762, 139.6503);
INSERT INTO selecciones (id, nombre, id_continente, pais, capital, historia, ventajas, desventajas, entrenador, ranking, bandera, latitud, longitud) VALUES (23, 'Suecia', 1, 'Suecia', 'Estocolmo', 'Suecia fue subcampeona del mundo en 1958 como anfitriona y tercera en 1950 y 1994. Es una potencia tradicional del futbol nordico que llego a cuartos en 2018.', 'Fortaleza fisica y solidez defensiva.', 'Dependencia de transiciones y poca posesion.', 'Jon Dahl Tomasson', 27, '🇸🇪', 59.3293, 18.0686);
INSERT INTO selecciones (id, nombre, id_continente, pais, capital, historia, ventajas, desventajas, entrenador, ranking, bandera, latitud, longitud) VALUES (24, 'Tunez', 4, 'Tunez', 'Tunez', 'Tunez fue el primer pais africano en ganar un partido en un Mundial, en 1978 ante Mexico. Conquistaron la Copa Africana de Naciones en 2004 como anfitriones. En Catar 2022 vencieron a la campeona Francia en fase de grupos.', 'Orden tactico y disciplina defensiva muy consolidada.', 'Escasa capacidad goleadora que les impide superar la fase de grupos.', 'Sami Trabelsi', 50, '🇹🇳', 36.8065, 10.1815);
INSERT INTO selecciones (id, nombre, id_continente, pais, capital, historia, ventajas, desventajas, entrenador, ranking, bandera, latitud, longitud) VALUES (25, 'Egipto', 4, 'Egipto', 'El Cairo', 'Egipto es la seleccion mas laureada de la Copa Africana de Naciones con siete titulos. Disputaron su primer Mundial en 1934, siendo pioneros africanos en el torneo. Han dependido en gran medida del talento de Mohamed Salah en la ultima decada.', 'Cuentan con Mohamed Salah, uno de los mejores delanteros del mundo.', 'Excesiva dependencia de Salah y poca regularidad para clasificar a Mundiales.', 'Hossam Hassan', 29, '🇪🇬', 30.0444, 31.2357);
INSERT INTO selecciones (id, nombre, id_continente, pais, capital, historia, ventajas, desventajas, entrenador, ranking, bandera, latitud, longitud) VALUES (26, 'Iran', 5, 'Iran', 'Teheran', 'Iran es una de las selecciones mas dominantes de Asia y suele clasificar con holgura a las eliminatorias finales. Ha participado en multiples Mundiales aunque nunca ha superado la fase de grupos. Cuenta con jugadores destacados en ligas europeas.', 'Solidez defensiva y orden tactico que la convierten en un rival muy dificil de batir.', 'Limitada creatividad ofensiva y poca pegada en momentos decisivos.', 'Amir Ghalenoei', 20, '🇮🇷', 35.6892, 51.389);
INSERT INTO selecciones (id, nombre, id_continente, pais, capital, historia, ventajas, desventajas, entrenador, ranking, bandera, latitud, longitud) VALUES (27, 'Belgica', 1, 'Belgica', 'Bruselas', 'Belgica vivio su mejor epoca con la ''generacion dorada'', logrando el tercer puesto en el Mundial 2018. Nunca ha conquistado un titulo mayor. Atraviesa una transicion generacional.', 'Jugadores tecnicos con experiencia en grandes ligas.', 'El recambio aun no iguala a la generacion anterior.', 'Rudi Garcia', 8, '🇧🇪', 50.8503, 4.3517);
INSERT INTO selecciones (id, nombre, id_continente, pais, capital, historia, ventajas, desventajas, entrenador, ranking, bandera, latitud, longitud) VALUES (28, 'Nueva Zelanda', 6, 'Nueva Zelanda', 'Wellington', 'Nueva Zelanda, apodada los ''All Whites'', es la potencia dominante de la OFC y ha clasificado a los Mundiales de 1982 y 2010. En Sudafrica 2010 logro la hazana de terminar invicta en fase de grupos con tres empates, aunque sin avanzar. Para 2026 son los grandes favoritos de Oceania, que por primera vez tiene un cupo directo garantizado.', 'Dominio absoluto de su confederacion con jugadores fisicos y experiencia europea como Chris Wood.', 'Escaso roce competitivo internacional por la debilidad general de los rivales de la OFC.', 'Darren Bazeley', 86, '🇳🇿', -41.2865, 174.7762);
INSERT INTO selecciones (id, nombre, id_continente, pais, capital, historia, ventajas, desventajas, entrenador, ranking, bandera, latitud, longitud) VALUES (29, 'Espana', 1, 'Espana', 'Madrid', 'Espana fue campeona del mundo en 2010 en Sudafrica, su unico titulo mundialista. Domino el futbol entre 2008 y 2012 con dos Eurocopas. Reciente campeona de la Eurocopa 2024.', 'Posesion dominante y un mediocampo creativo de elite.', 'A veces le falta contundencia y un goleador nato.', 'Luis de la Fuente', 3, '🇪🇸', 40.4168, -3.7038);
INSERT INTO selecciones (id, nombre, id_continente, pais, capital, historia, ventajas, desventajas, entrenador, ranking, bandera, latitud, longitud) VALUES (30, 'Uruguay', 2, 'Uruguay', 'Montevideo', 'Uruguay fue el primer campeon del mundo en 1930 y volvio a conquistar el titulo en 1950 con el historico Maracanazo. Es una potencia tradicional con cuatro estrellas oficiales reconocidas por FIFA. Su garra charrua es legendaria.', 'Renovacion generacional prometedora bajo un esquema tactico ordenado y competitivo.', 'Plantel corto en profundidad y presion por mantener el legado de jugadores historicos.', 'Marcelo Bielsa', 16, '🇺🇾', -34.9011, -56.1645);
INSERT INTO selecciones (id, nombre, id_continente, pais, capital, historia, ventajas, desventajas, entrenador, ranking, bandera, latitud, longitud) VALUES (31, 'Cabo Verde', 4, 'Cabo Verde', 'Praia', 'Los Tiburones Azules son una de las grandes sorpresas del futbol africano, con un crecimiento notable en el ranking FIFA y una clasificacion historica.', 'Cohesion grupal y crecimiento sostenido.', 'Plantel limitado por el tamano del pais.', 'Pedro Leitao Brito (Bubista)', 70, '🇨🇻', 14.9215, -23.5087);
INSERT INTO selecciones (id, nombre, id_continente, pais, capital, historia, ventajas, desventajas, entrenador, ranking, bandera, latitud, longitud) VALUES (32, 'Arabia Saudita', 5, 'Arabia Saudita', 'Riad', 'Arabia Saudita es una potencia tradicional del futbol asiatico con varias participaciones mundialistas. En Catar 2022 protagonizo una de las mayores sorpresas al vencer a la Argentina campeona. Su liga local ha crecido enormemente atrayendo a estrellas mundiales.', 'Equipo veloz y atrevido, capaz de dar grandes golpes ante favoritos.', 'Inconsistencia y fragilidad defensiva que suele costarle goleadas.', 'Herve Renard', 58, '🇸🇦', 24.7136, 46.6753);
INSERT INTO selecciones (id, nombre, id_continente, pais, capital, historia, ventajas, desventajas, entrenador, ranking, bandera, latitud, longitud) VALUES (33, 'Francia', 1, 'Francia', 'Paris', 'Francia conquisto la Copa del Mundo en 1998 como anfitriona y en 2018 en Rusia. Finalista en 2022 cayendo ante Argentina en penales. Es una de las potencias dominantes del futbol moderno.', 'Plantilla profunda con talento de clase mundial en todas las lineas.', 'Tensiones internas y exceso de confianza pueden afectar al grupo.', 'Didier Deschamps', 2, '🇫🇷', 48.8566, 2.3522);
INSERT INTO selecciones (id, nombre, id_continente, pais, capital, historia, ventajas, desventajas, entrenador, ranking, bandera, latitud, longitud) VALUES (34, 'Noruega', 1, 'Noruega', 'Oslo', 'Noruega participo en los Mundiales de 1994 y 1998, alcanzando octavos. Tras anos de ausencia, resurge con una generacion liderada por estrellas mundiales. Busca volver a una cita mundialista.', 'Poder ofensivo con figuras de talla mundial.', 'Poca experiencia reciente en fases finales de Mundial.', 'Stale Solbakken', 33, '🇳🇴', 59.9139, 10.7522);
INSERT INTO selecciones (id, nombre, id_continente, pais, capital, historia, ventajas, desventajas, entrenador, ranking, bandera, latitud, longitud) VALUES (35, 'Senegal', 4, 'Senegal', 'Dakar', 'Senegal sorprendio al mundo en su debut en 2002 llegando a cuartos de final tras vencer a Francia. Conquistaron la Copa Africana de Naciones en 2021, su primer titulo continental. Se han consolidado como una de las potencias estables de Africa.', 'Plantel fisicamente potente y profundo con figuras como Sadio Mane y Koulibaly.', 'Irregularidad en momentos clave y exceso de confianza ante rivales menores.', 'Pape Thiaw', 15, '🇸🇳', 14.6928, -17.4467);
INSERT INTO selecciones (id, nombre, id_continente, pais, capital, historia, ventajas, desventajas, entrenador, ranking, bandera, latitud, longitud) VALUES (36, 'Iraq', 5, 'Iraq', 'Bagdad', 'Iraq fue campeon de la Copa Asiatica en 2007 en una gesta emotiva tras anos de conflicto. Pese a las dificultades para jugar de local, mantiene una base solida de talento. Pelea por regresar a un Mundial tras su unica participacion en 1986.', 'Caracter combativo y jugadores tecnicos con creciente proyeccion internacional.', 'Inestabilidad institucional y falta de continuidad en sus procesos deportivos.', 'Graham Arnold', 56, '🇮🇶', 33.3152, 44.3661);
INSERT INTO selecciones (id, nombre, id_continente, pais, capital, historia, ventajas, desventajas, entrenador, ranking, bandera, latitud, longitud) VALUES (37, 'Argentina', 2, 'Argentina', 'Buenos Aires', 'Argentina es tricampeona del mundo, con titulos en 1978, 1986 y 2022. La conquista en Qatar 2022 de la mano de Lionel Messi consolido una generacion dorada. Es una de las potencias historicas del futbol mundial.', 'Cuenta con Lionel Messi y una columna vertebral campeona del mundo con gran jerarquia.', 'Dependencia de jugadores veteranos cuya edad avanzada genera dudas sobre su rendimiento.', 'Lionel Scaloni', 1, '🇦🇷', -34.6037, -58.3816);
INSERT INTO selecciones (id, nombre, id_continente, pais, capital, historia, ventajas, desventajas, entrenador, ranking, bandera, latitud, longitud) VALUES (38, 'Austria', 1, 'Austria', 'Viena', 'Austria tuvo su epoca dorada en los anos 30 con el ''Wunderteam'', logrando el cuarto puesto en 1934. En la era moderna ha vuelto a ser competitiva. Hizo buen papel en la Euro 2024.', 'Intensidad y presion alta bajo esquemas modernos.', 'Falta de experiencia en grandes citas mundialistas recientes.', 'Ralf Rangnick', 22, '🇦🇹', 48.2082, 16.3738);
INSERT INTO selecciones (id, nombre, id_continente, pais, capital, historia, ventajas, desventajas, entrenador, ranking, bandera, latitud, longitud) VALUES (39, 'Argelia', 4, 'Argelia', 'Argel', 'Argelia protagonizo el famoso partido ante Alemania Occidental en 1982 y alcanzo los octavos de final en Brasil 2014. Fueron campeones de Africa en 1990 y 2019. Cuentan con una generacion talentosa formada en ligas europeas.', 'Medio campo creativo y jugadores tecnicos con experiencia europea.', 'Fragilidad mental y baja productividad tras su titulo continental de 2019.', 'Vladimir Petkovic', 28, '🇩🇿', 36.7538, 3.0588);
INSERT INTO selecciones (id, nombre, id_continente, pais, capital, historia, ventajas, desventajas, entrenador, ranking, bandera, latitud, longitud) VALUES (40, 'Jordania', 5, 'Jordania', 'Aman', 'Jordania alcanzo la final de la Copa Asiatica 2023, su mejor resultado historico, y debuta en una Copa del Mundo con gran ambicion.', 'Orden defensivo y juego directo.', 'Poca experiencia ante potencias mundiales.', 'Jamal Sellami', 62, '🇯🇴', 31.9539, 35.9106);
INSERT INTO selecciones (id, nombre, id_continente, pais, capital, historia, ventajas, desventajas, entrenador, ranking, bandera, latitud, longitud) VALUES (41, 'Colombia', 2, 'Colombia', 'Bogota', 'Colombia vivio su epoca dorada en los anos noventa y alcanzo los cuartos de final en Brasil 2014. Fue subcampeona de la Copa America 2024 mostrando un gran nivel. Cuenta con una generacion talentosa liderada por James Rodriguez.', 'Mediocampo creativo y juego asociativo de gran calidad con James Rodriguez en su mejor forma.', 'Irregularidad defensiva y falta de un goleador consistente de area.', 'Nestor Lorenzo', 13, '🇨🇴', 4.711, -74.0721);
INSERT INTO selecciones (id, nombre, id_continente, pais, capital, historia, ventajas, desventajas, entrenador, ranking, bandera, latitud, longitud) VALUES (42, 'Portugal', 1, 'Portugal', 'Lisboa', 'Portugal gano la Eurocopa 2016 y la Liga de Naciones 2019 y 2025. Nunca ha sido campeona del mundo pese a generaciones doradas. Llego a semifinales del Mundial en 1966 y 2006.', 'Talento ofensivo abundante y experiencia ganadora.', 'Dependencia historica de figuras veteranas.', 'Roberto Martinez', 6, '🇵🇹', 38.7223, -9.1393);
INSERT INTO selecciones (id, nombre, id_continente, pais, capital, historia, ventajas, desventajas, entrenador, ranking, bandera, latitud, longitud) VALUES (43, 'Republica Democratica del Congo', 4, 'Republica Democratica del Congo', 'Kinshasa', 'La RD Congo (como Zaire) gano dos Copas Africanas (1968 y 1974) y disputo el Mundial de 1974. Es una cantera de gran talento fisico que resurge en Africa.', 'Potencia fisica y talento individual.', 'Inestabilidad institucional y federativa.', 'Sebastien Desabre', 57, '🇨🇩', -4.4419, 15.2663);
INSERT INTO selecciones (id, nombre, id_continente, pais, capital, historia, ventajas, desventajas, entrenador, ranking, bandera, latitud, longitud) VALUES (44, 'Uzbekistan', 5, 'Uzbekistan', 'Tashkent', 'Uzbekistan logro su clasificacion historica al primer Mundial de su historia rumbo a 2026, un hito para el pais. Durante anos estuvo cerca de clasificar pero quedaba eliminado en repechajes. Su generacion actual es la mas talentosa que ha producido.', 'Juventud, hambre competitiva y un bloque cohesionado que crecio juntos.', 'Falta total de experiencia mundialista y poca jerarquia ante grandes rivales.', 'Timur Kapadze', 57, '🇺🇿', 41.2995, 69.2401);
INSERT INTO selecciones (id, nombre, id_continente, pais, capital, historia, ventajas, desventajas, entrenador, ranking, bandera, latitud, longitud) VALUES (45, 'Inglaterra', 1, 'Inglaterra', 'Londres', 'Inglaterra gano su unico Mundial en 1966 como local. Ha sido constante en fases finales recientes, con semifinal en 2018 y cuartos en 2022. Sufre una larga sequia de titulos.', 'Generacion joven y talentosa con gran ataque.', 'Historico bloqueo mental en instancias decisivas.', 'Thomas Tuchel', 4, '🏴󠁧󠁢󠁥󠁮󠁧󠁿', 51.5074, -0.1278);
INSERT INTO selecciones (id, nombre, id_continente, pais, capital, historia, ventajas, desventajas, entrenador, ranking, bandera, latitud, longitud) VALUES (46, 'Ghana', 4, 'Ghana', 'Accra', 'Las Estrellas Negras llegaron a cuartos en Sudafrica 2010, rozando la semifinal, y han ganado cuatro Copas Africanas. Son una seleccion muy respetada del continente.', 'Fisico, juventud y tradicion mundialista.', 'Inconsistencia y conflictos internos recurrentes.', 'Otto Addo', 73, '🇬🇭', 5.6037, -0.187);
INSERT INTO selecciones (id, nombre, id_continente, pais, capital, historia, ventajas, desventajas, entrenador, ranking, bandera, latitud, longitud) VALUES (47, 'Croacia', 1, 'Croacia', 'Zagreb', 'Croacia fue subcampeona del mundo en 2018 y tercera en 2022. Para un pais pequeno, sus resultados son extraordinarios. Su mediocampo ha sido referencia mundial.', 'Mediocampo de elite y enorme caracter competitivo.', 'Plantilla envejecida en sus figuras clave.', 'Zlatko Dalic', 11, '🇭🇷', 45.815, 15.9819);
INSERT INTO selecciones (id, nombre, id_continente, pais, capital, historia, ventajas, desventajas, entrenador, ranking, bandera, latitud, longitud) VALUES (48, 'Panama', 3, 'Panama', 'Ciudad de Panama', 'Panama vivio un hito historico al clasificar por primera vez a un Mundial en Rusia 2018. Aunque cayo en la fase de grupos, anoto sus primeros goles mundialistas. Desde entonces se ha consolidado como un rival exigente en la CONCACAF.', 'Intensidad fisica, garra competitiva y un bloque defensivo aguerrido.', 'Falta de jerarquia ofensiva ante selecciones de mayor nivel.', 'Thomas Christiansen', 34, '🇵🇦', 8.9824, -79.5199);

-- 3) GRUPOS
INSERT INTO grupos (id, nombre) VALUES (1, 'A');
INSERT INTO grupos (id, nombre) VALUES (2, 'B');
INSERT INTO grupos (id, nombre) VALUES (3, 'C');
INSERT INTO grupos (id, nombre) VALUES (4, 'D');
INSERT INTO grupos (id, nombre) VALUES (5, 'E');
INSERT INTO grupos (id, nombre) VALUES (6, 'F');
INSERT INTO grupos (id, nombre) VALUES (7, 'G');
INSERT INTO grupos (id, nombre) VALUES (8, 'H');
INSERT INTO grupos (id, nombre) VALUES (9, 'I');
INSERT INTO grupos (id, nombre) VALUES (10, 'J');
INSERT INTO grupos (id, nombre) VALUES (11, 'K');
INSERT INTO grupos (id, nombre) VALUES (12, 'L');

-- 4) ESTADIOS
INSERT INTO estadios (id, nombre, ciudad, pais, latitud, longitud, capacidad) VALUES (1, 'Estadio Azteca', 'Ciudad de Mexico', 'Mexico', 19.302889, -99.150528, 80824);
INSERT INTO estadios (id, nombre, ciudad, pais, latitud, longitud, capacidad) VALUES (2, 'Estadio Akron', 'Zapopan', 'Mexico', 20.681944, -103.462778, 45664);
INSERT INTO estadios (id, nombre, ciudad, pais, latitud, longitud, capacidad) VALUES (3, 'Estadio BBVA', 'Guadalupe', 'Mexico', 25.669167, -100.244722, 51243);
INSERT INTO estadios (id, nombre, ciudad, pais, latitud, longitud, capacidad) VALUES (4, 'BMO Field', 'Toronto', 'Canada', 43.633056, -79.418611, 43036);
INSERT INTO estadios (id, nombre, ciudad, pais, latitud, longitud, capacidad) VALUES (5, 'BC Place', 'Vancouver', 'Canada', 49.276667, -123.111944, 52497);
INSERT INTO estadios (id, nombre, ciudad, pais, latitud, longitud, capacidad) VALUES (6, 'SoFi Stadium', 'Inglewood', 'Estados Unidos', 33.953333, -118.339167, 70492);
INSERT INTO estadios (id, nombre, ciudad, pais, latitud, longitud, capacidad) VALUES (7, 'MetLife Stadium', 'East Rutherford', 'Estados Unidos', 40.813611, -74.074444, 80663);
INSERT INTO estadios (id, nombre, ciudad, pais, latitud, longitud, capacidad) VALUES (8, 'AT&T Stadium', 'Arlington', 'Estados Unidos', 32.747778, -97.092778, 70649);
INSERT INTO estadios (id, nombre, ciudad, pais, latitud, longitud, capacidad) VALUES (9, 'Mercedes-Benz Stadium', 'Atlanta', 'Estados Unidos', 33.755556, -84.400833, 68239);
INSERT INTO estadios (id, nombre, ciudad, pais, latitud, longitud, capacidad) VALUES (10, 'Hard Rock Stadium', 'Miami Gardens', 'Estados Unidos', 25.957958, -80.238889, 64478);
INSERT INTO estadios (id, nombre, ciudad, pais, latitud, longitud, capacidad) VALUES (11, 'NRG Stadium', 'Houston', 'Estados Unidos', 29.684722, -95.410833, 68777);
INSERT INTO estadios (id, nombre, ciudad, pais, latitud, longitud, capacidad) VALUES (12, 'Arrowhead Stadium', 'Kansas City', 'Estados Unidos', 39.048889, -94.483889, 69045);
INSERT INTO estadios (id, nombre, ciudad, pais, latitud, longitud, capacidad) VALUES (13, 'Lumen Field', 'Seattle', 'Estados Unidos', 47.595278, -122.331667, 66925);
INSERT INTO estadios (id, nombre, ciudad, pais, latitud, longitud, capacidad) VALUES (14, 'Levi''s Stadium', 'Santa Clara', 'Estados Unidos', 37.403, -121.969722, 68827);
INSERT INTO estadios (id, nombre, ciudad, pais, latitud, longitud, capacidad) VALUES (15, 'Gillette Stadium', 'Foxborough', 'Estados Unidos', 42.090944, -71.264344, 64146);
INSERT INTO estadios (id, nombre, ciudad, pais, latitud, longitud, capacidad) VALUES (16, 'Lincoln Financial Field', 'Philadelphia', 'Estados Unidos', 39.900833, -75.1675, 68324);

-- 6) CLASIFICACIONES (membresias; el trigger calcula las estadisticas)
INSERT INTO clasificaciones (id, id_grupo, id_seleccion) VALUES (1, 1, 1);
INSERT INTO clasificaciones (id, id_grupo, id_seleccion) VALUES (2, 1, 2);
INSERT INTO clasificaciones (id, id_grupo, id_seleccion) VALUES (3, 1, 3);
INSERT INTO clasificaciones (id, id_grupo, id_seleccion) VALUES (4, 1, 4);
INSERT INTO clasificaciones (id, id_grupo, id_seleccion) VALUES (5, 2, 5);
INSERT INTO clasificaciones (id, id_grupo, id_seleccion) VALUES (6, 2, 6);
INSERT INTO clasificaciones (id, id_grupo, id_seleccion) VALUES (7, 2, 7);
INSERT INTO clasificaciones (id, id_grupo, id_seleccion) VALUES (8, 2, 8);
INSERT INTO clasificaciones (id, id_grupo, id_seleccion) VALUES (9, 3, 9);
INSERT INTO clasificaciones (id, id_grupo, id_seleccion) VALUES (10, 3, 10);
INSERT INTO clasificaciones (id, id_grupo, id_seleccion) VALUES (11, 3, 11);
INSERT INTO clasificaciones (id, id_grupo, id_seleccion) VALUES (12, 3, 12);
INSERT INTO clasificaciones (id, id_grupo, id_seleccion) VALUES (13, 4, 13);
INSERT INTO clasificaciones (id, id_grupo, id_seleccion) VALUES (14, 4, 14);
INSERT INTO clasificaciones (id, id_grupo, id_seleccion) VALUES (15, 4, 15);
INSERT INTO clasificaciones (id, id_grupo, id_seleccion) VALUES (16, 4, 16);
INSERT INTO clasificaciones (id, id_grupo, id_seleccion) VALUES (17, 5, 17);
INSERT INTO clasificaciones (id, id_grupo, id_seleccion) VALUES (18, 5, 18);
INSERT INTO clasificaciones (id, id_grupo, id_seleccion) VALUES (19, 5, 19);
INSERT INTO clasificaciones (id, id_grupo, id_seleccion) VALUES (20, 5, 20);
INSERT INTO clasificaciones (id, id_grupo, id_seleccion) VALUES (21, 6, 21);
INSERT INTO clasificaciones (id, id_grupo, id_seleccion) VALUES (22, 6, 22);
INSERT INTO clasificaciones (id, id_grupo, id_seleccion) VALUES (23, 6, 23);
INSERT INTO clasificaciones (id, id_grupo, id_seleccion) VALUES (24, 6, 24);
INSERT INTO clasificaciones (id, id_grupo, id_seleccion) VALUES (25, 7, 25);
INSERT INTO clasificaciones (id, id_grupo, id_seleccion) VALUES (26, 7, 26);
INSERT INTO clasificaciones (id, id_grupo, id_seleccion) VALUES (27, 7, 27);
INSERT INTO clasificaciones (id, id_grupo, id_seleccion) VALUES (28, 7, 28);
INSERT INTO clasificaciones (id, id_grupo, id_seleccion) VALUES (29, 8, 29);
INSERT INTO clasificaciones (id, id_grupo, id_seleccion) VALUES (30, 8, 30);
INSERT INTO clasificaciones (id, id_grupo, id_seleccion) VALUES (31, 8, 31);
INSERT INTO clasificaciones (id, id_grupo, id_seleccion) VALUES (32, 8, 32);
INSERT INTO clasificaciones (id, id_grupo, id_seleccion) VALUES (33, 9, 33);
INSERT INTO clasificaciones (id, id_grupo, id_seleccion) VALUES (34, 9, 34);
INSERT INTO clasificaciones (id, id_grupo, id_seleccion) VALUES (35, 9, 35);
INSERT INTO clasificaciones (id, id_grupo, id_seleccion) VALUES (36, 9, 36);
INSERT INTO clasificaciones (id, id_grupo, id_seleccion) VALUES (37, 10, 37);
INSERT INTO clasificaciones (id, id_grupo, id_seleccion) VALUES (38, 10, 38);
INSERT INTO clasificaciones (id, id_grupo, id_seleccion) VALUES (39, 10, 39);
INSERT INTO clasificaciones (id, id_grupo, id_seleccion) VALUES (40, 10, 40);
INSERT INTO clasificaciones (id, id_grupo, id_seleccion) VALUES (41, 11, 41);
INSERT INTO clasificaciones (id, id_grupo, id_seleccion) VALUES (42, 11, 42);
INSERT INTO clasificaciones (id, id_grupo, id_seleccion) VALUES (43, 11, 43);
INSERT INTO clasificaciones (id, id_grupo, id_seleccion) VALUES (44, 11, 44);
INSERT INTO clasificaciones (id, id_grupo, id_seleccion) VALUES (45, 12, 45);
INSERT INTO clasificaciones (id, id_grupo, id_seleccion) VALUES (46, 12, 46);
INSERT INTO clasificaciones (id, id_grupo, id_seleccion) VALUES (47, 12, 47);
INSERT INTO clasificaciones (id, id_grupo, id_seleccion) VALUES (48, 12, 48);

-- 5) PARTIDOS (jugados y programados). Cada alta dispara el recalculo de la clasificacion.
INSERT INTO partidos (id, fase, id_grupo, id_equipo_local, id_equipo_visitante, goles_local, goles_visitante, fecha, horario, id_estadio, jugado) VALUES (1, 'Grupos', 1, 1, 2, 2, 0, '2026-06-11', '12:00', 1, TRUE);
INSERT INTO partidos (id, fase, id_grupo, id_equipo_local, id_equipo_visitante, goles_local, goles_visitante, fecha, horario, id_estadio, jugado) VALUES (2, 'Grupos', 1, 3, 4, 2, 1, '2026-06-11', '15:00', 2, TRUE);
INSERT INTO partidos (id, fase, id_grupo, id_equipo_local, id_equipo_visitante, goles_local, goles_visitante, fecha, horario, id_estadio, jugado) VALUES (3, 'Grupos', 1, 4, 2, 1, 1, '2026-06-18', '18:00', 9, TRUE);
INSERT INTO partidos (id, fase, id_grupo, id_equipo_local, id_equipo_visitante, goles_local, goles_visitante, fecha, horario, id_estadio, jugado) VALUES (4, 'Grupos', 1, 1, 3, 1, 0, '2026-06-18', '21:00', 2, TRUE);
INSERT INTO partidos (id, fase, id_grupo, id_equipo_local, id_equipo_visitante, goles_local, goles_visitante, fecha, horario, id_estadio, jugado) VALUES (5, 'Grupos', 1, 4, 1, 0, 3, '2026-06-24', '12:00', 1, TRUE);
INSERT INTO partidos (id, fase, id_grupo, id_equipo_local, id_equipo_visitante, goles_local, goles_visitante, fecha, horario, id_estadio, jugado) VALUES (6, 'Grupos', 1, 2, 3, 1, 0, '2026-06-24', '15:00', 3, TRUE);
INSERT INTO partidos (id, fase, id_grupo, id_equipo_local, id_equipo_visitante, goles_local, goles_visitante, fecha, horario, id_estadio, jugado) VALUES (7, 'Grupos', 2, 6, 7, 1, 1, '2026-06-12', '18:00', 4, TRUE);
INSERT INTO partidos (id, fase, id_grupo, id_equipo_local, id_equipo_visitante, goles_local, goles_visitante, fecha, horario, id_estadio, jugado) VALUES (8, 'Grupos', 2, 8, 5, 1, 1, '2026-06-13', '21:00', 14, TRUE);
INSERT INTO partidos (id, fase, id_grupo, id_equipo_local, id_equipo_visitante, goles_local, goles_visitante, fecha, horario, id_estadio, jugado) VALUES (9, 'Grupos', 2, 5, 7, 4, 1, '2026-06-18', '12:00', 6, TRUE);
INSERT INTO partidos (id, fase, id_grupo, id_equipo_local, id_equipo_visitante, goles_local, goles_visitante, fecha, horario, id_estadio, jugado) VALUES (10, 'Grupos', 2, 6, 8, 6, 0, '2026-06-18', '15:00', 5, TRUE);
INSERT INTO partidos (id, fase, id_grupo, id_equipo_local, id_equipo_visitante, goles_local, goles_visitante, fecha, horario, id_estadio, jugado) VALUES (11, 'Grupos', 2, 5, 6, 2, 1, '2026-06-24', '18:00', 5, TRUE);
INSERT INTO partidos (id, fase, id_grupo, id_equipo_local, id_equipo_visitante, goles_local, goles_visitante, fecha, horario, id_estadio, jugado) VALUES (12, 'Grupos', 2, 7, 8, 3, 1, '2026-06-24', '21:00', 13, TRUE);
INSERT INTO partidos (id, fase, id_grupo, id_equipo_local, id_equipo_visitante, goles_local, goles_visitante, fecha, horario, id_estadio, jugado) VALUES (13, 'Grupos', 3, 9, 10, 1, 1, '2026-06-13', '12:00', 7, TRUE);
INSERT INTO partidos (id, fase, id_grupo, id_equipo_local, id_equipo_visitante, goles_local, goles_visitante, fecha, horario, id_estadio, jugado) VALUES (14, 'Grupos', 3, 12, 11, 0, 1, '2026-06-13', '15:00', 15, TRUE);
INSERT INTO partidos (id, fase, id_grupo, id_equipo_local, id_equipo_visitante, goles_local, goles_visitante, fecha, horario, id_estadio, jugado) VALUES (15, 'Grupos', 3, 11, 10, 0, 1, '2026-06-19', '18:00', 15, TRUE);
INSERT INTO partidos (id, fase, id_grupo, id_equipo_local, id_equipo_visitante, goles_local, goles_visitante, fecha, horario, id_estadio, jugado) VALUES (16, 'Grupos', 3, 9, 12, 3, 0, '2026-06-19', '21:00', 16, TRUE);
INSERT INTO partidos (id, fase, id_grupo, id_equipo_local, id_equipo_visitante, goles_local, goles_visitante, fecha, horario, id_estadio, jugado) VALUES (17, 'Grupos', 3, 11, 9, 0, 3, '2026-06-24', '12:00', 10, TRUE);
INSERT INTO partidos (id, fase, id_grupo, id_equipo_local, id_equipo_visitante, goles_local, goles_visitante, fecha, horario, id_estadio, jugado) VALUES (18, 'Grupos', 3, 10, 12, 4, 2, '2026-06-24', '15:00', 9, TRUE);
INSERT INTO partidos (id, fase, id_grupo, id_equipo_local, id_equipo_visitante, goles_local, goles_visitante, fecha, horario, id_estadio, jugado) VALUES (19, 'Grupos', 4, 13, 15, 4, 1, '2026-06-12', '18:00', 6, TRUE);
INSERT INTO partidos (id, fase, id_grupo, id_equipo_local, id_equipo_visitante, goles_local, goles_visitante, fecha, horario, id_estadio, jugado) VALUES (20, 'Grupos', 4, 14, 16, 2, 0, '2026-06-13', '21:00', 5, TRUE);
INSERT INTO partidos (id, fase, id_grupo, id_equipo_local, id_equipo_visitante, goles_local, goles_visitante, fecha, horario, id_estadio, jugado) VALUES (21, 'Grupos', 4, 13, 14, 2, 0, '2026-06-19', '12:00', 13, TRUE);
INSERT INTO partidos (id, fase, id_grupo, id_equipo_local, id_equipo_visitante, goles_local, goles_visitante, fecha, horario, id_estadio, jugado) VALUES (22, 'Grupos', 4, 16, 15, 0, 1, '2026-06-19', '15:00', 14, TRUE);
INSERT INTO partidos (id, fase, id_grupo, id_equipo_local, id_equipo_visitante, goles_local, goles_visitante, fecha, horario, id_estadio, jugado) VALUES (23, 'Grupos', 4, 16, 13, 3, 2, '2026-06-25', '18:00', 6, TRUE);
INSERT INTO partidos (id, fase, id_grupo, id_equipo_local, id_equipo_visitante, goles_local, goles_visitante, fecha, horario, id_estadio, jugado) VALUES (24, 'Grupos', 4, 15, 14, 0, 0, '2026-06-25', '21:00', 14, TRUE);
INSERT INTO partidos (id, fase, id_grupo, id_equipo_local, id_equipo_visitante, goles_local, goles_visitante, fecha, horario, id_estadio, jugado) VALUES (25, 'Grupos', 5, 17, 20, 7, 1, '2026-06-14', '12:00', 11, TRUE);
INSERT INTO partidos (id, fase, id_grupo, id_equipo_local, id_equipo_visitante, goles_local, goles_visitante, fecha, horario, id_estadio, jugado) VALUES (26, 'Grupos', 5, 18, 19, 1, 0, '2026-06-14', '15:00', 16, TRUE);
INSERT INTO partidos (id, fase, id_grupo, id_equipo_local, id_equipo_visitante, goles_local, goles_visitante, fecha, horario, id_estadio, jugado) VALUES (27, 'Grupos', 5, 17, 18, 2, 1, '2026-06-20', '18:00', 4, TRUE);
INSERT INTO partidos (id, fase, id_grupo, id_equipo_local, id_equipo_visitante, goles_local, goles_visitante, fecha, horario, id_estadio, jugado) VALUES (28, 'Grupos', 5, 19, 20, 0, 0, '2026-06-20', '21:00', 12, TRUE);
INSERT INTO partidos (id, fase, id_grupo, id_equipo_local, id_equipo_visitante, goles_local, goles_visitante, fecha, horario, id_estadio, jugado) VALUES (29, 'Grupos', 5, 20, 18, 0, 2, '2026-06-25', '12:00', 16, TRUE);
INSERT INTO partidos (id, fase, id_grupo, id_equipo_local, id_equipo_visitante, goles_local, goles_visitante, fecha, horario, id_estadio, jugado) VALUES (30, 'Grupos', 5, 19, 17, 2, 1, '2026-06-25', '15:00', 7, TRUE);
INSERT INTO partidos (id, fase, id_grupo, id_equipo_local, id_equipo_visitante, goles_local, goles_visitante, fecha, horario, id_estadio, jugado) VALUES (31, 'Grupos', 6, 21, 22, 2, 2, '2026-06-14', '18:00', 8, TRUE);
INSERT INTO partidos (id, fase, id_grupo, id_equipo_local, id_equipo_visitante, goles_local, goles_visitante, fecha, horario, id_estadio, jugado) VALUES (32, 'Grupos', 6, 23, 24, 5, 1, '2026-06-14', '21:00', 3, TRUE);
INSERT INTO partidos (id, fase, id_grupo, id_equipo_local, id_equipo_visitante, goles_local, goles_visitante, fecha, horario, id_estadio, jugado) VALUES (33, 'Grupos', 6, 21, 23, 5, 1, '2026-06-20', '12:00', 11, TRUE);
INSERT INTO partidos (id, fase, id_grupo, id_equipo_local, id_equipo_visitante, goles_local, goles_visitante, fecha, horario, id_estadio, jugado) VALUES (34, 'Grupos', 6, 24, 22, 0, 4, '2026-06-20', '15:00', 3, TRUE);
INSERT INTO partidos (id, fase, id_grupo, id_equipo_local, id_equipo_visitante, goles_local, goles_visitante, fecha, horario, id_estadio, jugado) VALUES (35, 'Grupos', 6, 22, 23, 1, 1, '2026-06-25', '18:00', 8, TRUE);
INSERT INTO partidos (id, fase, id_grupo, id_equipo_local, id_equipo_visitante, goles_local, goles_visitante, fecha, horario, id_estadio, jugado) VALUES (36, 'Grupos', 6, 24, 21, 1, 3, '2026-06-25', '21:00', 12, TRUE);
INSERT INTO partidos (id, fase, id_grupo, id_equipo_local, id_equipo_visitante, goles_local, goles_visitante, fecha, horario, id_estadio, jugado) VALUES (37, 'Grupos', 7, 27, 25, 1, 1, '2026-06-15', '12:00', 13, TRUE);
INSERT INTO partidos (id, fase, id_grupo, id_equipo_local, id_equipo_visitante, goles_local, goles_visitante, fecha, horario, id_estadio, jugado) VALUES (38, 'Grupos', 7, 26, 28, 2, 2, '2026-06-15', '15:00', 6, TRUE);
INSERT INTO partidos (id, fase, id_grupo, id_equipo_local, id_equipo_visitante, goles_local, goles_visitante, fecha, horario, id_estadio, jugado) VALUES (39, 'Grupos', 7, 27, 26, 0, 0, '2026-06-21', '18:00', 6, TRUE);
INSERT INTO partidos (id, fase, id_grupo, id_equipo_local, id_equipo_visitante, goles_local, goles_visitante, fecha, horario, id_estadio, jugado) VALUES (40, 'Grupos', 7, 28, 25, 1, 3, '2026-06-21', '21:00', 5, TRUE);
INSERT INTO partidos (id, fase, id_grupo, id_equipo_local, id_equipo_visitante, goles_local, goles_visitante, fecha, horario, id_estadio, jugado) VALUES (41, 'Grupos', 7, 25, 26, 1, 1, '2026-06-26', '12:00', 13, TRUE);
INSERT INTO partidos (id, fase, id_grupo, id_equipo_local, id_equipo_visitante, goles_local, goles_visitante, fecha, horario, id_estadio, jugado) VALUES (42, 'Grupos', 7, 28, 27, 1, 5, '2026-06-26', '15:00', 5, TRUE);
INSERT INTO partidos (id, fase, id_grupo, id_equipo_local, id_equipo_visitante, goles_local, goles_visitante, fecha, horario, id_estadio, jugado) VALUES (43, 'Grupos', 8, 29, 31, 0, 0, '2026-06-15', '18:00', 9, TRUE);
INSERT INTO partidos (id, fase, id_grupo, id_equipo_local, id_equipo_visitante, goles_local, goles_visitante, fecha, horario, id_estadio, jugado) VALUES (44, 'Grupos', 8, 32, 30, 1, 1, '2026-06-15', '21:00', 10, TRUE);
INSERT INTO partidos (id, fase, id_grupo, id_equipo_local, id_equipo_visitante, goles_local, goles_visitante, fecha, horario, id_estadio, jugado) VALUES (45, 'Grupos', 8, 29, 32, 4, 0, '2026-06-21', '12:00', 9, TRUE);
INSERT INTO partidos (id, fase, id_grupo, id_equipo_local, id_equipo_visitante, goles_local, goles_visitante, fecha, horario, id_estadio, jugado) VALUES (46, 'Grupos', 8, 30, 31, 2, 2, '2026-06-21', '15:00', 10, TRUE);
INSERT INTO partidos (id, fase, id_grupo, id_equipo_local, id_equipo_visitante, goles_local, goles_visitante, fecha, horario, id_estadio, jugado) VALUES (47, 'Grupos', 8, 31, 32, 0, 0, '2026-06-26', '18:00', 11, TRUE);
INSERT INTO partidos (id, fase, id_grupo, id_equipo_local, id_equipo_visitante, goles_local, goles_visitante, fecha, horario, id_estadio, jugado) VALUES (48, 'Grupos', 8, 30, 29, 0, 1, '2026-06-26', '21:00', 2, TRUE);
INSERT INTO partidos (id, fase, id_grupo, id_equipo_local, id_equipo_visitante, goles_local, goles_visitante, fecha, horario, id_estadio, jugado) VALUES (49, 'Grupos', 9, 33, 35, 3, 1, '2026-06-16', '12:00', 7, TRUE);
INSERT INTO partidos (id, fase, id_grupo, id_equipo_local, id_equipo_visitante, goles_local, goles_visitante, fecha, horario, id_estadio, jugado) VALUES (50, 'Grupos', 9, 36, 34, 1, 4, '2026-06-16', '15:00', 15, TRUE);
INSERT INTO partidos (id, fase, id_grupo, id_equipo_local, id_equipo_visitante, goles_local, goles_visitante, fecha, horario, id_estadio, jugado) VALUES (51, 'Grupos', 9, 33, 36, 3, 0, '2026-06-22', '18:00', 16, TRUE);
INSERT INTO partidos (id, fase, id_grupo, id_equipo_local, id_equipo_visitante, goles_local, goles_visitante, fecha, horario, id_estadio, jugado) VALUES (52, 'Grupos', 9, 34, 35, 3, 2, '2026-06-22', '21:00', 7, TRUE);
INSERT INTO partidos (id, fase, id_grupo, id_equipo_local, id_equipo_visitante, goles_local, goles_visitante, fecha, horario, id_estadio, jugado) VALUES (53, 'Grupos', 9, 34, 33, 1, 4, '2026-06-26', '12:00', 15, TRUE);
INSERT INTO partidos (id, fase, id_grupo, id_equipo_local, id_equipo_visitante, goles_local, goles_visitante, fecha, horario, id_estadio, jugado) VALUES (54, 'Grupos', 9, 35, 36, 5, 0, '2026-06-26', '15:00', 4, TRUE);
INSERT INTO partidos (id, fase, id_grupo, id_equipo_local, id_equipo_visitante, goles_local, goles_visitante, fecha, horario, id_estadio, jugado) VALUES (55, 'Grupos', 10, 37, 39, 3, 0, '2026-06-16', '18:00', 12, TRUE);
INSERT INTO partidos (id, fase, id_grupo, id_equipo_local, id_equipo_visitante, goles_local, goles_visitante, fecha, horario, id_estadio, jugado) VALUES (56, 'Grupos', 10, 38, 40, 3, 1, '2026-06-16', '21:00', 14, TRUE);
INSERT INTO partidos (id, fase, id_grupo, id_equipo_local, id_equipo_visitante, goles_local, goles_visitante, fecha, horario, id_estadio, jugado) VALUES (57, 'Grupos', 10, 37, 38, 2, 0, '2026-06-22', '12:00', 8, TRUE);
INSERT INTO partidos (id, fase, id_grupo, id_equipo_local, id_equipo_visitante, goles_local, goles_visitante, fecha, horario, id_estadio, jugado) VALUES (58, 'Grupos', 10, 40, 39, 1, 2, '2026-06-22', '15:00', 14, TRUE);
INSERT INTO partidos (id, fase, id_grupo, id_equipo_local, id_equipo_visitante, goles_local, goles_visitante, fecha, horario, id_estadio, jugado) VALUES (59, 'Grupos', 10, 39, 38, 3, 3, '2026-06-27', '18:00', 12, TRUE);
INSERT INTO partidos (id, fase, id_grupo, id_equipo_local, id_equipo_visitante, goles_local, goles_visitante, fecha, horario, id_estadio, jugado) VALUES (60, 'Grupos', 10, 40, 37, 1, 3, '2026-06-27', '21:00', 8, TRUE);
INSERT INTO partidos (id, fase, id_grupo, id_equipo_local, id_equipo_visitante, goles_local, goles_visitante, fecha, horario, id_estadio, jugado) VALUES (61, 'Grupos', 11, 42, 43, 1, 1, '2026-06-17', '12:00', 11, TRUE);
INSERT INTO partidos (id, fase, id_grupo, id_equipo_local, id_equipo_visitante, goles_local, goles_visitante, fecha, horario, id_estadio, jugado) VALUES (62, 'Grupos', 11, 44, 41, 1, 3, '2026-06-17', '15:00', 1, TRUE);
INSERT INTO partidos (id, fase, id_grupo, id_equipo_local, id_equipo_visitante, goles_local, goles_visitante, fecha, horario, id_estadio, jugado) VALUES (63, 'Grupos', 11, 42, 44, 5, 0, '2026-06-23', '18:00', 11, TRUE);
INSERT INTO partidos (id, fase, id_grupo, id_equipo_local, id_equipo_visitante, goles_local, goles_visitante, fecha, horario, id_estadio, jugado) VALUES (64, 'Grupos', 11, 41, 43, 1, 0, '2026-06-23', '21:00', 2, TRUE);
INSERT INTO partidos (id, fase, id_grupo, id_equipo_local, id_equipo_visitante, goles_local, goles_visitante, fecha, horario, id_estadio, jugado) VALUES (65, 'Grupos', 11, 41, 42, 0, 0, '2026-06-27', '12:00', 10, TRUE);
INSERT INTO partidos (id, fase, id_grupo, id_equipo_local, id_equipo_visitante, goles_local, goles_visitante, fecha, horario, id_estadio, jugado) VALUES (66, 'Grupos', 11, 43, 44, 3, 1, '2026-06-27', '15:00', 9, TRUE);
INSERT INTO partidos (id, fase, id_grupo, id_equipo_local, id_equipo_visitante, goles_local, goles_visitante, fecha, horario, id_estadio, jugado) VALUES (67, 'Grupos', 12, 45, 47, 4, 2, '2026-06-17', '18:00', 8, TRUE);
INSERT INTO partidos (id, fase, id_grupo, id_equipo_local, id_equipo_visitante, goles_local, goles_visitante, fecha, horario, id_estadio, jugado) VALUES (68, 'Grupos', 12, 46, 48, 1, 0, '2026-06-17', '21:00', 4, TRUE);
INSERT INTO partidos (id, fase, id_grupo, id_equipo_local, id_equipo_visitante, goles_local, goles_visitante, fecha, horario, id_estadio, jugado) VALUES (69, 'Grupos', 12, 45, 46, 0, 0, '2026-06-23', '12:00', 15, TRUE);
INSERT INTO partidos (id, fase, id_grupo, id_equipo_local, id_equipo_visitante, goles_local, goles_visitante, fecha, horario, id_estadio, jugado) VALUES (70, 'Grupos', 12, 48, 47, 0, 1, '2026-06-23', '15:00', 4, TRUE);
INSERT INTO partidos (id, fase, id_grupo, id_equipo_local, id_equipo_visitante, goles_local, goles_visitante, fecha, horario, id_estadio, jugado) VALUES (71, 'Grupos', 12, 48, 45, 0, 2, '2026-06-27', '18:00', 7, TRUE);
INSERT INTO partidos (id, fase, id_grupo, id_equipo_local, id_equipo_visitante, goles_local, goles_visitante, fecha, horario, id_estadio, jugado) VALUES (72, 'Grupos', 12, 47, 46, 2, 1, '2026-06-27', '21:00', 16, TRUE);

-- 7) FASE FINAL (cuadro real al 01/07/2026, sedes/fechas/horas OFICIALES FIFA)
INSERT INTO fase_final (id, nombre_fase, llave, id_seleccion_local, id_seleccion_visitante, id_estadio, fecha, horario, goles_local, goles_visitante, penales_local, penales_visitante, jugado) VALUES (1, 'Dieciseisavos', 'D1', 17, 15, 15, '2026-06-29', '16:30', 1, 1, 3, 4, TRUE);
INSERT INTO fase_final (id, nombre_fase, llave, id_seleccion_local, id_seleccion_visitante, id_estadio, fecha, horario, goles_local, goles_visitante, penales_local, penales_visitante, jugado) VALUES (2, 'Dieciseisavos', 'D2', 33, 23, 7, '2026-06-30', '17:00', 3, 0, NULL, NULL, TRUE);
INSERT INTO fase_final (id, nombre_fase, llave, id_seleccion_local, id_seleccion_visitante, id_estadio, fecha, horario, goles_local, goles_visitante, penales_local, penales_visitante, jugado) VALUES (3, 'Dieciseisavos', 'D3', 2, 6, 6, '2026-06-28', '12:00', 0, 1, NULL, NULL, TRUE);
INSERT INTO fase_final (id, nombre_fase, llave, id_seleccion_local, id_seleccion_visitante, id_estadio, fecha, horario, goles_local, goles_visitante, penales_local, penales_visitante, jugado) VALUES (4, 'Dieciseisavos', 'D4', 21, 10, 3, '2026-06-29', '19:00', 1, 1, 2, 3, TRUE);
INSERT INTO fase_final (id, nombre_fase, llave, id_seleccion_local, id_seleccion_visitante, id_estadio, fecha, horario, goles_local, goles_visitante, penales_local, penales_visitante, jugado) VALUES (5, 'Dieciseisavos', 'D5', 42, 47, 4, '2026-07-02', '19:00', NULL, NULL, NULL, NULL, FALSE);
INSERT INTO fase_final (id, nombre_fase, llave, id_seleccion_local, id_seleccion_visitante, id_estadio, fecha, horario, goles_local, goles_visitante, penales_local, penales_visitante, jugado) VALUES (6, 'Dieciseisavos', 'D6', 29, 38, 6, '2026-07-02', '15:00', NULL, NULL, NULL, NULL, FALSE);
INSERT INTO fase_final (id, nombre_fase, llave, id_seleccion_local, id_seleccion_visitante, id_estadio, fecha, horario, goles_local, goles_visitante, penales_local, penales_visitante, jugado) VALUES (7, 'Dieciseisavos', 'D7', 13, 7, 14, '2026-07-01', '20:00', NULL, NULL, NULL, NULL, FALSE);
INSERT INTO fase_final (id, nombre_fase, llave, id_seleccion_local, id_seleccion_visitante, id_estadio, fecha, horario, goles_local, goles_visitante, penales_local, penales_visitante, jugado) VALUES (8, 'Dieciseisavos', 'D8', 27, 35, 13, '2026-07-01', '16:00', NULL, NULL, NULL, NULL, FALSE);
INSERT INTO fase_final (id, nombre_fase, llave, id_seleccion_local, id_seleccion_visitante, id_estadio, fecha, horario, goles_local, goles_visitante, penales_local, penales_visitante, jugado) VALUES (9, 'Dieciseisavos', 'D9', 9, 22, 11, '2026-06-29', '12:00', 2, 1, NULL, NULL, TRUE);
INSERT INTO fase_final (id, nombre_fase, llave, id_seleccion_local, id_seleccion_visitante, id_estadio, fecha, horario, goles_local, goles_visitante, penales_local, penales_visitante, jugado) VALUES (10, 'Dieciseisavos', 'D10', 18, 34, 8, '2026-06-30', '12:00', 1, 2, NULL, NULL, TRUE);
INSERT INTO fase_final (id, nombre_fase, llave, id_seleccion_local, id_seleccion_visitante, id_estadio, fecha, horario, goles_local, goles_visitante, penales_local, penales_visitante, jugado) VALUES (11, 'Dieciseisavos', 'D11', 1, 19, 1, '2026-06-30', '15:00', 2, 0, NULL, NULL, TRUE);
INSERT INTO fase_final (id, nombre_fase, llave, id_seleccion_local, id_seleccion_visitante, id_estadio, fecha, horario, goles_local, goles_visitante, penales_local, penales_visitante, jugado) VALUES (12, 'Dieciseisavos', 'D12', 45, 43, 9, '2026-07-01', '12:00', 2, 1, NULL, NULL, TRUE);
INSERT INTO fase_final (id, nombre_fase, llave, id_seleccion_local, id_seleccion_visitante, id_estadio, fecha, horario, goles_local, goles_visitante, penales_local, penales_visitante, jugado) VALUES (13, 'Dieciseisavos', 'D13', 37, 31, 10, '2026-07-03', '18:00', NULL, NULL, NULL, NULL, FALSE);
INSERT INTO fase_final (id, nombre_fase, llave, id_seleccion_local, id_seleccion_visitante, id_estadio, fecha, horario, goles_local, goles_visitante, penales_local, penales_visitante, jugado) VALUES (14, 'Dieciseisavos', 'D14', 14, 25, 8, '2026-07-03', '14:00', NULL, NULL, NULL, NULL, FALSE);
INSERT INTO fase_final (id, nombre_fase, llave, id_seleccion_local, id_seleccion_visitante, id_estadio, fecha, horario, goles_local, goles_visitante, penales_local, penales_visitante, jugado) VALUES (15, 'Dieciseisavos', 'D15', 5, 39, 5, '2026-07-02', '23:00', NULL, NULL, NULL, NULL, FALSE);
INSERT INTO fase_final (id, nombre_fase, llave, id_seleccion_local, id_seleccion_visitante, id_estadio, fecha, horario, goles_local, goles_visitante, penales_local, penales_visitante, jugado) VALUES (16, 'Dieciseisavos', 'D16', 41, 46, 12, '2026-07-03', '21:30', NULL, NULL, NULL, NULL, FALSE);
INSERT INTO fase_final (id, nombre_fase, llave, id_seleccion_local, id_seleccion_visitante, id_estadio, fecha, horario, goles_local, goles_visitante, penales_local, penales_visitante, jugado) VALUES (17, 'Octavos', 'O1', 15, 33, 16, '2026-07-04', '14:00', NULL, NULL, NULL, NULL, FALSE);
INSERT INTO fase_final (id, nombre_fase, llave, id_seleccion_local, id_seleccion_visitante, id_estadio, fecha, horario, goles_local, goles_visitante, penales_local, penales_visitante, jugado) VALUES (18, 'Octavos', 'O2', 6, 10, 11, '2026-07-04', '15:00', NULL, NULL, NULL, NULL, FALSE);
INSERT INTO fase_final (id, nombre_fase, llave, id_seleccion_local, id_seleccion_visitante, id_estadio, fecha, horario, goles_local, goles_visitante, penales_local, penales_visitante, jugado) VALUES (19, 'Octavos', 'O3', NULL, NULL, 10, '2026-07-06', '16:00', NULL, NULL, NULL, NULL, FALSE);
INSERT INTO fase_final (id, nombre_fase, llave, id_seleccion_local, id_seleccion_visitante, id_estadio, fecha, horario, goles_local, goles_visitante, penales_local, penales_visitante, jugado) VALUES (20, 'Octavos', 'O4', NULL, NULL, 9, '2026-07-06', '19:00', NULL, NULL, NULL, NULL, FALSE);
INSERT INTO fase_final (id, nombre_fase, llave, id_seleccion_local, id_seleccion_visitante, id_estadio, fecha, horario, goles_local, goles_visitante, penales_local, penales_visitante, jugado) VALUES (21, 'Octavos', 'O5', 9, 34, 8, '2026-07-05', '14:00', NULL, NULL, NULL, NULL, FALSE);
INSERT INTO fase_final (id, nombre_fase, llave, id_seleccion_local, id_seleccion_visitante, id_estadio, fecha, horario, goles_local, goles_visitante, penales_local, penales_visitante, jugado) VALUES (22, 'Octavos', 'O6', 1, 45, 1, '2026-07-05', '18:00', NULL, NULL, NULL, NULL, FALSE);
INSERT INTO fase_final (id, nombre_fase, llave, id_seleccion_local, id_seleccion_visitante, id_estadio, fecha, horario, goles_local, goles_visitante, penales_local, penales_visitante, jugado) VALUES (23, 'Octavos', 'O7', NULL, NULL, 5, '2026-07-07', '14:00', NULL, NULL, NULL, NULL, FALSE);
INSERT INTO fase_final (id, nombre_fase, llave, id_seleccion_local, id_seleccion_visitante, id_estadio, fecha, horario, goles_local, goles_visitante, penales_local, penales_visitante, jugado) VALUES (24, 'Octavos', 'O8', NULL, NULL, 4, '2026-07-07', '18:00', NULL, NULL, NULL, NULL, FALSE);
INSERT INTO fase_final (id, nombre_fase, llave, id_seleccion_local, id_seleccion_visitante, id_estadio, fecha, horario, goles_local, goles_visitante, penales_local, penales_visitante, jugado) VALUES (25, 'Cuartos', 'C1', NULL, NULL, 15, '2026-07-09', '15:00', NULL, NULL, NULL, NULL, FALSE);
INSERT INTO fase_final (id, nombre_fase, llave, id_seleccion_local, id_seleccion_visitante, id_estadio, fecha, horario, goles_local, goles_visitante, penales_local, penales_visitante, jugado) VALUES (26, 'Cuartos', 'C2', NULL, NULL, 6, '2026-07-10', '20:00', NULL, NULL, NULL, NULL, FALSE);
INSERT INTO fase_final (id, nombre_fase, llave, id_seleccion_local, id_seleccion_visitante, id_estadio, fecha, horario, goles_local, goles_visitante, penales_local, penales_visitante, jugado) VALUES (27, 'Cuartos', 'C3', NULL, NULL, 10, '2026-07-11', '15:00', NULL, NULL, NULL, NULL, FALSE);
INSERT INTO fase_final (id, nombre_fase, llave, id_seleccion_local, id_seleccion_visitante, id_estadio, fecha, horario, goles_local, goles_visitante, penales_local, penales_visitante, jugado) VALUES (28, 'Cuartos', 'C4', NULL, NULL, 12, '2026-07-11', '20:00', NULL, NULL, NULL, NULL, FALSE);
INSERT INTO fase_final (id, nombre_fase, llave, id_seleccion_local, id_seleccion_visitante, id_estadio, fecha, horario, goles_local, goles_visitante, penales_local, penales_visitante, jugado) VALUES (29, 'Semifinal', 'S1', NULL, NULL, 8, '2026-07-14', '19:00', NULL, NULL, NULL, NULL, FALSE);
INSERT INTO fase_final (id, nombre_fase, llave, id_seleccion_local, id_seleccion_visitante, id_estadio, fecha, horario, goles_local, goles_visitante, penales_local, penales_visitante, jugado) VALUES (30, 'Semifinal', 'S2', NULL, NULL, 9, '2026-07-15', '19:00', NULL, NULL, NULL, NULL, FALSE);
INSERT INTO fase_final (id, nombre_fase, llave, id_seleccion_local, id_seleccion_visitante, id_estadio, fecha, horario, goles_local, goles_visitante, penales_local, penales_visitante, jugado) VALUES (31, 'Tercer Lugar', 'T1', NULL, NULL, 10, '2026-07-18', '15:00', NULL, NULL, NULL, NULL, FALSE);
INSERT INTO fase_final (id, nombre_fase, llave, id_seleccion_local, id_seleccion_visitante, id_estadio, fecha, horario, goles_local, goles_visitante, penales_local, penales_visitante, jugado) VALUES (32, 'Final', 'F1', NULL, NULL, 7, '2026-07-19', '19:00', NULL, NULL, NULL, NULL, FALSE);

-- 8) USUARIOS
INSERT INTO usuarios (id, nombre, email) VALUES (1, 'Gustavo Ramirez', 'gustavo@example.com');
INSERT INTO usuarios (id, nombre, email) VALUES (2, 'Maria Hernandez', 'maria@example.com');
INSERT INTO usuarios (id, nombre, email) VALUES (3, 'Carlos Mendoza', 'carlos@example.com');
INSERT INTO usuarios (id, nombre, email) VALUES (4, 'Ana Torres', 'ana@example.com');
INSERT INTO usuarios (id, nombre, email) VALUES (5, 'Luis Gomez', 'luis@example.com');
INSERT INTO usuarios (id, nombre, email) VALUES (6, 'Sofia Martinez', 'sofia@example.com');
INSERT INTO usuarios (id, nombre, email) VALUES (7, 'Diego Flores', 'diego@example.com');
INSERT INTO usuarios (id, nombre, email) VALUES (8, 'Valeria Cruz', 'valeria@example.com');

-- 9) BOLETOS
INSERT INTO boletos (id, id_usuario, id_estadio, id_partido, id_seleccion, dia, fecha, horario, costo) VALUES (1, 1, 1, 1, 1, 'Jueves', '2026-06-11', '12:00', 1200);
INSERT INTO boletos (id, id_usuario, id_estadio, id_partido, id_seleccion, dia, fecha, horario, costo) VALUES (2, 2, 2, 2, 4, 'Viernes', '2026-06-11', '15:00', 1800);
INSERT INTO boletos (id, id_usuario, id_estadio, id_partido, id_seleccion, dia, fecha, horario, costo) VALUES (3, 3, 9, 3, 4, 'Sabado', '2026-06-18', '18:00', 2500);
INSERT INTO boletos (id, id_usuario, id_estadio, id_partido, id_seleccion, dia, fecha, horario, costo) VALUES (4, 4, 2, 4, 3, 'Domingo', '2026-06-18', '21:00', 3200);
INSERT INTO boletos (id, id_usuario, id_estadio, id_partido, id_seleccion, dia, fecha, horario, costo) VALUES (5, 5, 1, 5, 4, 'Miercoles', '2026-06-24', '12:00', 4500);
INSERT INTO boletos (id, id_usuario, id_estadio, id_partido, id_seleccion, dia, fecha, horario, costo) VALUES (6, 6, 3, 6, 3, 'Jueves', '2026-06-24', '15:00', 6000);
INSERT INTO boletos (id, id_usuario, id_estadio, id_partido, id_seleccion, dia, fecha, horario, costo) VALUES (7, 7, 4, 7, 6, 'Viernes', '2026-06-12', '18:00', 1200);
INSERT INTO boletos (id, id_usuario, id_estadio, id_partido, id_seleccion, dia, fecha, horario, costo) VALUES (8, 8, 14, 8, 5, 'Sabado', '2026-06-13', '21:00', 1800);
INSERT INTO boletos (id, id_usuario, id_estadio, id_partido, id_seleccion, dia, fecha, horario, costo) VALUES (9, 1, 6, 9, 5, 'Domingo', '2026-06-18', '12:00', 2500);
INSERT INTO boletos (id, id_usuario, id_estadio, id_partido, id_seleccion, dia, fecha, horario, costo) VALUES (10, 2, 5, 10, 8, 'Miercoles', '2026-06-18', '15:00', 3200);
INSERT INTO boletos (id, id_usuario, id_estadio, id_partido, id_seleccion, dia, fecha, horario, costo) VALUES (11, 3, 5, 11, 5, 'Jueves', '2026-06-24', '18:00', 4500);
INSERT INTO boletos (id, id_usuario, id_estadio, id_partido, id_seleccion, dia, fecha, horario, costo) VALUES (12, 4, 13, 12, 8, 'Viernes', '2026-06-24', '21:00', 6000);
INSERT INTO boletos (id, id_usuario, id_estadio, id_partido, id_seleccion, dia, fecha, horario, costo) VALUES (13, 5, 7, 13, 9, 'Sabado', '2026-06-13', '12:00', 1200);
INSERT INTO boletos (id, id_usuario, id_estadio, id_partido, id_seleccion, dia, fecha, horario, costo) VALUES (14, 6, 15, 14, 11, 'Domingo', '2026-06-13', '15:00', 1800);
INSERT INTO boletos (id, id_usuario, id_estadio, id_partido, id_seleccion, dia, fecha, horario, costo) VALUES (15, 7, 15, 15, 11, 'Miercoles', '2026-06-19', '18:00', 2500);
INSERT INTO boletos (id, id_usuario, id_estadio, id_partido, id_seleccion, dia, fecha, horario, costo) VALUES (16, 8, 16, 16, 12, 'Jueves', '2026-06-19', '21:00', 3200);
INSERT INTO boletos (id, id_usuario, id_estadio, id_partido, id_seleccion, dia, fecha, horario, costo) VALUES (17, 1, 10, 17, 11, 'Viernes', '2026-06-24', '12:00', 4500);
INSERT INTO boletos (id, id_usuario, id_estadio, id_partido, id_seleccion, dia, fecha, horario, costo) VALUES (18, 2, 9, 18, 12, 'Sabado', '2026-06-24', '15:00', 6000);
INSERT INTO boletos (id, id_usuario, id_estadio, id_partido, id_seleccion, dia, fecha, horario, costo) VALUES (19, 3, 6, 19, 13, 'Domingo', '2026-06-12', '18:00', 1200);
INSERT INTO boletos (id, id_usuario, id_estadio, id_partido, id_seleccion, dia, fecha, horario, costo) VALUES (20, 4, 5, 20, 16, 'Miercoles', '2026-06-13', '21:00', 1800);

-- Reajustar secuencias
SELECT setval('continentes_id_continente_seq', (SELECT COALESCE(MAX(id_continente),1) FROM continentes));
SELECT setval('selecciones_id_seq', (SELECT COALESCE(MAX(id),1) FROM selecciones));
SELECT setval('grupos_id_seq', (SELECT COALESCE(MAX(id),1) FROM grupos));
SELECT setval('estadios_id_seq', (SELECT COALESCE(MAX(id),1) FROM estadios));
SELECT setval('clasificaciones_id_seq', (SELECT COALESCE(MAX(id),1) FROM clasificaciones));
SELECT setval('partidos_id_seq', (SELECT COALESCE(MAX(id),1) FROM partidos));
SELECT setval('fase_final_id_seq', (SELECT COALESCE(MAX(id),1) FROM fase_final));
SELECT setval('usuarios_id_seq', (SELECT COALESCE(MAX(id),1) FROM usuarios));
SELECT setval('boletos_id_seq', (SELECT COALESCE(MAX(id),1) FROM boletos));

COMMIT;
