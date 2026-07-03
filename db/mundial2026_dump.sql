--
-- PostgreSQL database dump
--

\restrict jZiiDc5zQ8oBp1N4lhTfjZ6JbigG5DQldaVscVh9iqWNUlHbffBtRZ1xYLcfE3t

-- Dumped from database version 18.3
-- Dumped by pg_dump version 18.3

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

-- *not* creating schema, since initdb creates it


--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON SCHEMA public IS '';


--
-- Name: fn_recalcular_clasificacion(integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_recalcular_clasificacion(p_grupo integer) RETURNS void
    LANGUAGE plpgsql
    AS $$
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
$$;


--
-- Name: trg_partido_clasificacion(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.trg_partido_clasificacion() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
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
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: boletos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.boletos (
    id integer NOT NULL,
    id_usuario integer NOT NULL,
    id_estadio integer NOT NULL,
    id_partido integer,
    id_seleccion integer,
    dia character varying(20),
    fecha date,
    horario time without time zone,
    costo numeric(10,2),
    CONSTRAINT boletos_costo_check CHECK ((costo >= (0)::numeric))
);


--
-- Name: TABLE boletos; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.boletos IS 'Boletos comprados por los usuarios';


--
-- Name: boletos_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.boletos_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: boletos_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.boletos_id_seq OWNED BY public.boletos.id;


--
-- Name: clasificaciones; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.clasificaciones (
    id integer NOT NULL,
    id_grupo integer NOT NULL,
    id_seleccion integer NOT NULL,
    pj integer DEFAULT 0 NOT NULL,
    pg integer DEFAULT 0 NOT NULL,
    pe integer DEFAULT 0 NOT NULL,
    pp integer DEFAULT 0 NOT NULL,
    gf integer DEFAULT 0 NOT NULL,
    gc integer DEFAULT 0 NOT NULL,
    dg integer GENERATED ALWAYS AS ((gf - gc)) STORED,
    pts integer DEFAULT 0 NOT NULL
);


--
-- Name: TABLE clasificaciones; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.clasificaciones IS 'Tabla de posiciones por grupo (se recalcula con triggers)';


--
-- Name: clasificaciones_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.clasificaciones_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: clasificaciones_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.clasificaciones_id_seq OWNED BY public.clasificaciones.id;


--
-- Name: continentes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.continentes (
    id_continente integer NOT NULL,
    nombre character varying(60) NOT NULL,
    confederacion character varying(20) NOT NULL,
    descripcion text
);


--
-- Name: TABLE continentes; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.continentes IS 'Continentes y su confederacion FIFA correspondiente';


--
-- Name: continentes_id_continente_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.continentes_id_continente_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: continentes_id_continente_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.continentes_id_continente_seq OWNED BY public.continentes.id_continente;


--
-- Name: estadios; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.estadios (
    id integer NOT NULL,
    nombre character varying(100) NOT NULL,
    ciudad character varying(80) NOT NULL,
    pais character varying(60) NOT NULL,
    latitud numeric(9,6) NOT NULL,
    longitud numeric(9,6) NOT NULL,
    capacidad integer,
    CONSTRAINT estadios_capacidad_check CHECK ((capacidad > 0))
);


--
-- Name: TABLE estadios; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.estadios IS 'Estadios sede con geolocalizacion';


--
-- Name: estadios_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.estadios_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: estadios_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.estadios_id_seq OWNED BY public.estadios.id;


--
-- Name: fase_final; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.fase_final (
    id integer NOT NULL,
    nombre_fase character varying(20) NOT NULL,
    llave character varying(20),
    id_seleccion_local integer,
    id_seleccion_visitante integer,
    id_estadio integer,
    fecha date,
    horario time without time zone,
    id_partido integer,
    CONSTRAINT fase_final_nombre_fase_check CHECK (((nombre_fase)::text = ANY ((ARRAY['Dieciseisavos'::character varying, 'Octavos'::character varying, 'Cuartos'::character varying, 'Semifinal'::character varying, 'Tercer Lugar'::character varying, 'Final'::character varying])::text[])))
);


--
-- Name: TABLE fase_final; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.fase_final IS 'Cuadro de eliminatorias con sedes asignadas';


--
-- Name: fase_final_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.fase_final_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: fase_final_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.fase_final_id_seq OWNED BY public.fase_final.id;


--
-- Name: grupos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.grupos (
    id integer NOT NULL,
    nombre character varying(5) NOT NULL
);


--
-- Name: TABLE grupos; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.grupos IS '12 grupos de la fase de grupos';


--
-- Name: grupos_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.grupos_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: grupos_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.grupos_id_seq OWNED BY public.grupos.id;


--
-- Name: partidos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.partidos (
    id integer NOT NULL,
    fase character varying(20) DEFAULT 'Grupos'::character varying NOT NULL,
    id_grupo integer,
    id_equipo_local integer NOT NULL,
    id_equipo_visitante integer NOT NULL,
    goles_local integer,
    goles_visitante integer,
    fecha date,
    horario time without time zone,
    id_estadio integer,
    jugado boolean DEFAULT false NOT NULL,
    CONSTRAINT chk_equipos_distintos CHECK ((id_equipo_local <> id_equipo_visitante)),
    CONSTRAINT partidos_fase_check CHECK (((fase)::text = ANY ((ARRAY['Grupos'::character varying, 'Dieciseisavos'::character varying, 'Octavos'::character varying, 'Cuartos'::character varying, 'Semifinal'::character varying, 'Tercer Lugar'::character varying, 'Final'::character varying])::text[]))),
    CONSTRAINT partidos_goles_local_check CHECK ((goles_local >= 0)),
    CONSTRAINT partidos_goles_visitante_check CHECK ((goles_visitante >= 0))
);


--
-- Name: TABLE partidos; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.partidos IS 'Partidos de todas las fases del torneo';


--
-- Name: partidos_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.partidos_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: partidos_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.partidos_id_seq OWNED BY public.partidos.id;


--
-- Name: selecciones; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.selecciones (
    id integer NOT NULL,
    nombre character varying(80) NOT NULL,
    id_continente integer NOT NULL,
    pais character varying(80) NOT NULL,
    capital character varying(80),
    historia text,
    ventajas text,
    desventajas text,
    ranking integer,
    bandera character varying(16),
    latitud numeric(9,6),
    longitud numeric(9,6),
    CONSTRAINT selecciones_ranking_check CHECK ((ranking > 0))
);


--
-- Name: TABLE selecciones; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.selecciones IS 'Selecciones nacionales participantes con geolocalizacion';


--
-- Name: selecciones_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.selecciones_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: selecciones_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.selecciones_id_seq OWNED BY public.selecciones.id;


--
-- Name: usuarios; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.usuarios (
    id integer NOT NULL,
    nombre character varying(120) NOT NULL,
    email character varying(160),
    creado_en timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE usuarios; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.usuarios IS 'Usuarios del sistema (compradores de boletos)';


--
-- Name: usuarios_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.usuarios_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: usuarios_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.usuarios_id_seq OWNED BY public.usuarios.id;


--
-- Name: v_clasificacion; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_clasificacion AS
 SELECT g.nombre AS grupo,
    s.bandera,
    s.nombre AS seleccion,
    c.pj,
    c.pg,
    c.pe,
    c.pp,
    c.gf,
    c.gc,
    c.dg,
    c.pts,
    rank() OVER (PARTITION BY c.id_grupo ORDER BY c.pts DESC, c.dg DESC, c.gf DESC) AS posicion
   FROM ((public.clasificaciones c
     JOIN public.grupos g ON ((g.id = c.id_grupo)))
     JOIN public.selecciones s ON ((s.id = c.id_seleccion)));


--
-- Name: v_paises; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_paises AS
 SELECT co.id_continente,
    co.nombre AS continente,
    co.confederacion,
    s.pais,
    s.nombre AS seleccion,
    s.ranking,
    s.bandera
   FROM (public.selecciones s
     JOIN public.continentes co ON ((co.id_continente = s.id_continente)));


--
-- Name: v_partidos; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_partidos AS
 SELECT p.id,
    p.fase,
    g.nombre AS grupo,
    sl.nombre AS local,
    sl.bandera AS bandera_local,
    sv.nombre AS visitante,
    sv.bandera AS bandera_visitante,
    p.goles_local,
    p.goles_visitante,
    p.fecha,
    p.horario,
    e.nombre AS estadio,
    e.ciudad,
    e.pais,
    p.jugado
   FROM ((((public.partidos p
     JOIN public.selecciones sl ON ((sl.id = p.id_equipo_local)))
     JOIN public.selecciones sv ON ((sv.id = p.id_equipo_visitante)))
     LEFT JOIN public.grupos g ON ((g.id = p.id_grupo)))
     LEFT JOIN public.estadios e ON ((e.id = p.id_estadio)));


--
-- Name: boletos id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.boletos ALTER COLUMN id SET DEFAULT nextval('public.boletos_id_seq'::regclass);


--
-- Name: clasificaciones id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clasificaciones ALTER COLUMN id SET DEFAULT nextval('public.clasificaciones_id_seq'::regclass);


--
-- Name: continentes id_continente; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.continentes ALTER COLUMN id_continente SET DEFAULT nextval('public.continentes_id_continente_seq'::regclass);


--
-- Name: estadios id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.estadios ALTER COLUMN id SET DEFAULT nextval('public.estadios_id_seq'::regclass);


--
-- Name: fase_final id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fase_final ALTER COLUMN id SET DEFAULT nextval('public.fase_final_id_seq'::regclass);


--
-- Name: grupos id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.grupos ALTER COLUMN id SET DEFAULT nextval('public.grupos_id_seq'::regclass);


--
-- Name: partidos id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.partidos ALTER COLUMN id SET DEFAULT nextval('public.partidos_id_seq'::regclass);


--
-- Name: selecciones id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.selecciones ALTER COLUMN id SET DEFAULT nextval('public.selecciones_id_seq'::regclass);


--
-- Name: usuarios id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usuarios ALTER COLUMN id SET DEFAULT nextval('public.usuarios_id_seq'::regclass);


--
-- Data for Name: boletos; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.boletos (id, id_usuario, id_estadio, id_partido, id_seleccion, dia, fecha, horario, costo) FROM stdin;
1	1	1	1	2	Jueves	2026-06-24	12:00:00	1200.00
2	2	2	2	4	Viernes	2026-06-17	15:00:00	1800.00
3	3	3	3	3	Sabado	2026-06-11	18:00:00	2500.00
4	4	4	4	2	Domingo	2026-06-11	21:00:00	3200.00
5	5	5	5	1	Miercoles	2026-06-17	12:00:00	4500.00
6	6	6	6	4	Jueves	2026-06-24	15:00:00	6000.00
7	7	7	7	7	Viernes	2026-06-12	18:00:00	1200.00
8	8	8	8	8	Sabado	2026-06-24	21:00:00	1800.00
9	1	9	9	6	Domingo	2026-06-18	12:00:00	2500.00
10	2	10	10	7	Miercoles	2026-06-18	15:00:00	3200.00
11	3	11	11	6	Jueves	2026-06-24	18:00:00	4500.00
12	4	12	12	6	Viernes	2026-06-12	21:00:00	6000.00
13	5	13	13	11	Sabado	2026-06-13	12:00:00	1200.00
14	6	14	14	11	Domingo	2026-06-24	15:00:00	1800.00
15	7	15	15	9	Miercoles	2026-06-19	18:00:00	2500.00
16	8	16	16	12	Jueves	2026-06-19	21:00:00	3200.00
17	1	1	17	9	Viernes	2026-06-24	12:00:00	4500.00
18	2	2	18	10	Sabado	2026-06-13	15:00:00	6000.00
19	3	3	19	14	Domingo	2026-06-26	18:00:00	1200.00
20	4	4	20	16	Miercoles	2026-06-20	21:00:00	1800.00
\.


--
-- Data for Name: clasificaciones; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.clasificaciones (id, id_grupo, id_seleccion, pj, pg, pe, pp, gf, gc, pts) FROM stdin;
1	1	1	3	3	0	0	6	0	9
2	1	2	3	1	1	1	2	3	4
3	1	3	3	1	0	2	2	3	3
4	1	4	3	0	1	2	2	6	1
7	2	7	3	1	1	1	5	6	4
8	2	8	3	0	1	2	2	10	1
5	2	5	3	2	1	0	7	3	7
6	2	6	3	1	1	1	8	3	4
9	3	9	3	2	1	0	7	1	7
10	3	10	3	2	1	0	6	3	7
11	3	11	3	1	0	2	1	4	3
12	3	12	3	0	0	3	2	8	0
13	4	13	3	2	0	1	8	4	6
14	4	14	3	1	1	1	2	2	4
15	4	15	3	1	1	1	2	4	4
16	4	16	3	1	0	2	3	5	3
17	5	17	3	2	0	1	10	4	6
18	5	18	3	2	0	1	4	2	6
19	5	19	3	1	1	1	2	2	4
20	5	20	3	0	1	2	1	9	1
21	6	21	3	2	1	0	10	4	7
22	6	22	3	1	2	0	7	3	5
23	6	23	3	1	1	1	7	7	4
24	6	24	3	0	0	3	2	12	0
25	7	25	2	1	1	0	4	2	4
26	7	26	2	0	2	0	2	2	2
27	7	27	2	0	2	0	1	1	2
28	7	28	2	0	1	1	3	5	1
29	8	29	2	1	1	0	4	0	4
30	8	30	2	0	2	0	3	3	2
31	8	31	2	0	2	0	2	2	2
32	8	32	2	0	1	1	1	5	1
35	9	35	2	0	0	2	3	6	0
36	9	36	2	0	0	2	1	7	0
33	9	33	2	2	0	0	6	1	6
34	9	34	2	2	0	0	7	3	6
37	10	37	2	2	0	0	5	0	6
38	10	38	2	1	0	1	3	3	3
39	10	39	2	1	0	1	2	4	3
40	10	40	2	0	0	2	2	5	0
41	11	41	2	2	0	0	4	1	6
42	11	42	2	1	1	0	6	1	4
43	11	43	2	0	1	1	1	2	1
44	11	44	2	0	0	2	1	8	0
45	12	45	2	1	1	0	4	2	4
46	12	46	2	1	1	0	1	0	4
47	12	47	2	1	0	1	3	4	3
48	12	48	2	0	0	2	0	2	0
\.


--
-- Data for Name: continentes; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.continentes (id_continente, nombre, confederacion, descripcion) FROM stdin;
1	Europa	UEFA	Union de Asociaciones Europeas de Futbol
2	America del Sur	CONMEBOL	Confederacion Sudamericana de Futbol
3	America del Norte	CONCACAF	Confederacion de Norteamerica, Centroamerica y el Caribe
4	Africa	CAF	Confederacion Africana de Futbol
5	Asia	AFC	Confederacion Asiatica de Futbol
6	Oceania	OFC	Confederacion de Futbol de Oceania
\.


--
-- Data for Name: estadios; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.estadios (id, nombre, ciudad, pais, latitud, longitud, capacidad) FROM stdin;
1	Estadio Azteca	Ciudad de Mexico	Mexico	19.302889	-99.150528	80824
2	Estadio Akron	Zapopan	Mexico	20.681944	-103.462778	45664
3	Estadio BBVA	Guadalupe	Mexico	25.669167	-100.244722	51243
4	BMO Field	Toronto	Canada	43.633056	-79.418611	43036
5	BC Place	Vancouver	Canada	49.276667	-123.111944	52497
6	SoFi Stadium	Inglewood	Estados Unidos	33.953333	-118.339167	70492
7	MetLife Stadium	East Rutherford	Estados Unidos	40.813611	-74.074444	80663
8	AT&T Stadium	Arlington	Estados Unidos	32.747778	-97.092778	70649
9	Mercedes-Benz Stadium	Atlanta	Estados Unidos	33.755556	-84.400833	68239
10	Hard Rock Stadium	Miami Gardens	Estados Unidos	25.957958	-80.238889	64478
11	NRG Stadium	Houston	Estados Unidos	29.684722	-95.410833	68777
12	Arrowhead Stadium	Kansas City	Estados Unidos	39.048889	-94.483889	69045
13	Lumen Field	Seattle	Estados Unidos	47.595278	-122.331667	66925
14	Levi's Stadium	Santa Clara	Estados Unidos	37.403000	-121.969722	68827
15	Gillette Stadium	Foxborough	Estados Unidos	42.090944	-71.264344	64146
16	Lincoln Financial Field	Philadelphia	Estados Unidos	39.900833	-75.167500	68324
\.


--
-- Data for Name: fase_final; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.fase_final (id, nombre_fase, llave, id_seleccion_local, id_seleccion_visitante, id_estadio, fecha, horario, id_partido) FROM stdin;
\.


--
-- Data for Name: grupos; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.grupos (id, nombre) FROM stdin;
1	A
2	B
3	C
4	D
5	E
6	F
7	G
8	H
9	I
10	J
11	K
12	L
\.


--
-- Data for Name: partidos; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.partidos (id, fase, id_grupo, id_equipo_local, id_equipo_visitante, goles_local, goles_visitante, fecha, horario, id_estadio, jugado) FROM stdin;
1	Grupos	1	2	3	1	0	2026-06-24	12:00:00	1	t
2	Grupos	1	2	4	1	1	2026-06-17	15:00:00	2	t
3	Grupos	1	3	4	2	1	2026-06-11	18:00:00	3	t
4	Grupos	1	1	2	2	0	2026-06-11	21:00:00	4	t
5	Grupos	1	1	3	1	0	2026-06-17	12:00:00	5	t
6	Grupos	1	1	4	3	0	2026-06-24	15:00:00	6	t
7	Grupos	2	7	8	2	0	2026-06-12	18:00:00	7	t
8	Grupos	2	5	8	2	2	2026-06-24	21:00:00	8	t
9	Grupos	2	6	8	6	0	2026-06-18	12:00:00	9	t
10	Grupos	2	5	7	4	1	2026-06-18	15:00:00	10	t
11	Grupos	2	6	7	2	2	2026-06-24	18:00:00	11	t
12	Grupos	2	5	6	1	0	2026-06-12	21:00:00	12	t
13	Grupos	3	11	12	1	0	2026-06-13	12:00:00	13	t
14	Grupos	3	10	11	1	0	2026-06-24	15:00:00	14	t
15	Grupos	3	9	11	3	0	2026-06-19	18:00:00	15	t
16	Grupos	3	10	12	4	2	2026-06-19	21:00:00	16	t
17	Grupos	3	9	12	3	0	2026-06-24	12:00:00	1	t
18	Grupos	3	9	10	1	1	2026-06-13	15:00:00	2	t
19	Grupos	4	14	15	0	0	2026-06-26	18:00:00	3	t
20	Grupos	4	14	16	0	1	2026-06-20	21:00:00	4	t
21	Grupos	4	15	16	2	0	2026-06-14	12:00:00	5	t
22	Grupos	4	13	14	1	2	2026-06-14	15:00:00	6	t
23	Grupos	4	13	15	4	0	2026-06-20	18:00:00	7	t
24	Grupos	4	13	16	3	2	2026-06-26	21:00:00	8	t
25	Grupos	5	19	20	0	0	2026-06-11	12:00:00	9	t
26	Grupos	5	18	20	2	0	2026-06-17	15:00:00	10	t
27	Grupos	5	18	19	0	1	2026-06-26	18:00:00	11	t
28	Grupos	5	17	20	7	1	2026-06-26	21:00:00	12	t
29	Grupos	5	17	19	2	1	2026-06-17	12:00:00	13	t
30	Grupos	5	17	18	1	2	2026-06-11	15:00:00	14	t
31	Grupos	6	22	24	4	0	2026-06-18	18:00:00	15	t
32	Grupos	6	23	24	2	0	2026-06-12	21:00:00	16	t
33	Grupos	6	21	24	6	2	2026-06-26	12:00:00	1	t
34	Grupos	6	22	23	3	3	2026-06-26	15:00:00	2	t
35	Grupos	6	21	22	0	0	2026-06-12	18:00:00	3	t
36	Grupos	6	21	23	4	2	2026-06-18	21:00:00	4	t
37	Grupos	7	26	27	0	0	2026-06-13	12:00:00	5	t
38	Grupos	7	25	27	1	1	2026-06-13	15:00:00	6	t
39	Grupos	7	26	28	2	2	2026-06-19	18:00:00	7	t
40	Grupos	7	25	28	3	1	2026-06-19	21:00:00	8	t
41	Grupos	7	25	26	\N	\N	2026-06-27	12:00:00	9	f
42	Grupos	7	27	28	\N	\N	2026-06-27	15:00:00	10	f
43	Grupos	8	30	32	1	1	2026-06-14	18:00:00	11	t
44	Grupos	8	29	32	4	0	2026-06-14	21:00:00	12	t
45	Grupos	8	30	31	2	2	2026-06-20	12:00:00	13	t
46	Grupos	8	29	31	0	0	2026-06-20	15:00:00	14	t
47	Grupos	8	29	30	\N	\N	2026-06-27	18:00:00	15	f
48	Grupos	8	31	32	\N	\N	2026-06-27	21:00:00	16	f
49	Grupos	9	33	36	3	0	2026-06-11	12:00:00	1	t
50	Grupos	9	34	36	4	1	2026-06-11	15:00:00	2	t
51	Grupos	9	33	35	3	1	2026-06-17	18:00:00	3	t
52	Grupos	9	34	35	3	2	2026-06-17	21:00:00	4	t
53	Grupos	9	33	34	\N	\N	2026-06-27	12:00:00	5	f
54	Grupos	9	35	36	\N	\N	2026-06-27	15:00:00	6	f
55	Grupos	10	39	40	2	0	2026-06-12	18:00:00	7	t
56	Grupos	10	38	40	3	2	2026-06-12	21:00:00	8	t
57	Grupos	10	37	39	4	0	2026-06-18	12:00:00	9	t
58	Grupos	10	37	38	1	0	2026-06-18	15:00:00	10	t
59	Grupos	10	37	40	\N	\N	2026-06-27	18:00:00	11	f
60	Grupos	10	38	39	\N	\N	2026-06-27	21:00:00	12	f
61	Grupos	11	41	43	1	0	2026-06-13	12:00:00	13	t
62	Grupos	11	41	44	3	1	2026-06-13	15:00:00	14	t
63	Grupos	11	42	43	1	1	2026-06-19	18:00:00	15	t
64	Grupos	11	42	44	5	0	2026-06-19	21:00:00	16	t
65	Grupos	11	41	42	\N	\N	2026-06-27	12:00:00	1	f
66	Grupos	11	43	44	\N	\N	2026-06-27	15:00:00	2	f
67	Grupos	12	46	48	1	0	2026-06-14	18:00:00	3	t
68	Grupos	12	47	48	1	0	2026-06-14	21:00:00	4	t
69	Grupos	12	45	46	0	0	2026-06-20	12:00:00	5	t
70	Grupos	12	45	47	4	2	2026-06-20	15:00:00	6	t
71	Grupos	12	45	48	\N	\N	2026-06-27	18:00:00	7	f
72	Grupos	12	46	47	\N	\N	2026-06-27	21:00:00	8	f
\.


--
-- Data for Name: selecciones; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.selecciones (id, nombre, id_continente, pais, capital, historia, ventajas, desventajas, ranking, bandera, latitud, longitud) FROM stdin;
1	Mexico	3	Mexico	Ciudad de Mexico	Mexico es la potencia historica de la CONCACAF y uno de los participantes mas constantes de los mundiales. Alcanzo los cuartos de final en 1970 y 1986, ambos como anfitrion, su mejor resultado historico. En 2026 vuelve a ser sede mundialista por tercera vez.	Gran experiencia mundialista, aficion extremadamente solida y plantel competitivo con jugadores en ligas europeas.	Recurrente incapacidad para superar los octavos de final, la llamada maldicion del quinto partido.	14	🇲🇽	19.432600	-99.133200
2	Sudafrica	4	Sudafrica	Pretoria	Sudafrica organizo el Mundial de 2010, el primero en suelo africano. Gano la Copa Africana de Naciones en 1996 como anfitriona. Los Bafana Bafana regresan a la elite mundial.	Velocidad, juego colectivo dinamico y buen estado fisico.	Irregularidad y poca experiencia mundialista reciente.	56	🇿🇦	-25.747900	28.229300
3	Corea del Sur	5	Corea del Sur	Seul	Corea del Sur es el equipo asiatico con mas participaciones mundialistas y alcanzo las semifinales como anfitrion en 2002, su mejor resultado historico. Clasifica a los Mundiales de manera regular desde 1986. Liderada por figuras como Son Heung-min, mantiene un nivel competitivo constante.	Intensidad fisica, gran capacidad de presion y el talento individual de Son Heung-min.	Defensa vulnerable ante rivales tecnicos y dependencia excesiva de sus estrellas.	23	🇰🇷	37.566500	126.978000
4	Republica Checa	1	Republica Checa	Praga	Heredera de la escuela checoslovaca, fue subcampeona de la Eurocopa 1996 y semifinalista mundialista en 1934 y 1962. Mantiene una solida tradicion en Europa central.	Orden tactico y buena tecnica individual.	Generacion en transicion sin grandes estrellas.	40	🇨🇿	50.075500	14.437800
5	Suiza	1	Suiza	Berna	Suiza es una participante habitual de los Mundiales, alcanzando octavos en 2014, 2018 y 2022. Llego a cuartos en la Eurocopa 2020 y 2024. Destaca por su solidez y regularidad.	Equipo ordenado, disciplinado y dificil de batir.	Le falta jerarquia ofensiva para pelear titulos.	19	🇨🇭	46.948000	7.447400
6	Canada	3	Canada	Ottawa	Canada disputo su primer Mundial en 1986 sin anotar goles y volvio a la cita tras 36 anos en 2022. Ha crecido enormemente impulsado por figuras como Alphonso Davies y Jonathan David. En 2026 sera anfitrion por primera vez en su historia.	Velocidad y dinamismo ofensivo con figuras de talla mundial y proyeccion en ascenso.	Poca profundidad de plantel y limitada experiencia en fases finales mundialistas.	30	🇨🇦	45.421500	-75.697200
7	Bosnia y Herzegovina	1	Bosnia y Herzegovina	Sarajevo	Debuto en el Mundial de Brasil 2014 con figuras como Edin Dzeko. Es una seleccion competitiva del sureste europeo que vuelve a la cita mundialista.	Poder ofensivo y caracter competitivo.	Defensa vulnerable y poca profundidad de plantel.	74	🇧🇦	43.856300	18.413100
8	Catar	5	Catar	Doha	Catar fue anfitrion del Mundial 2022 y es el vigente bicampeon de la Copa Asiatica (2019 y 2023). Aunque su debut mundialista fue discreto, ha invertido fuertemente en su desarrollo futbolistico. Es una de las selecciones emergentes mas fuertes del continente.	Generacion talentosa y campeona continental con buen toque y movilidad.	Escasa experiencia ganadora a nivel mundial y bajo rendimiento ante selecciones de elite.	36	🇶🇦	25.285400	51.531000
9	Brasil	2	Brasil	Brasilia	Brasil es la unica seleccion pentacampeona del mundo (1958, 1962, 1970, 1994 y 2002). Es el equipo con mas participaciones mundialistas y nunca ha faltado a una Copa del Mundo. Representa la maxima tradicion del jogo bonito.	Abundante talento ofensivo individual y una cantera inagotable de futbolistas de elite.	Inestabilidad reciente y falta de un proyecto solido tras varios cambios de entrenador.	6	🇧🇷	-15.793900	-47.882800
10	Marruecos	4	Marruecos	Rabat	Marruecos hizo historia en Catar 2022 al convertirse en la primera seleccion africana en alcanzar las semifinales de un Mundial. Debutaron en 1970 y en 1986 fueron el primer pais africano en superar la fase de grupos. Son hoy el referente del futbol del continente.	Defensa solida y bloque compacto con jugadores de elite europea como Hakimi y Amrabat.	Dependen mucho de su solidez defensiva y a veces les falta contundencia en ataque.	7	🇲🇦	34.020900	-6.841700
11	Escocia	1	Escocia	Edimburgo	Escocia es pionera del futbol y disputo varios Mundiales entre 1954 y 1998. No supera la fase de grupos en su historia mundialista. Resurgio clasificando a las Eurocopas 2020 y 2024.	Espiritu combativo y solido funcionamiento colectivo.	Limitado talento individual frente a las grandes potencias.	39	🏴󠁧󠁢󠁳󠁣󠁴󠁿	55.953300	-3.188300
12	Haiti	3	Haiti	Puerto Principe	Haiti disputo su unico Mundial en Alemania 1974. Es una de las selecciones historicas del Caribe que regresa a la maxima cita pese a sus dificultades.	Talento individual y velocidad en ataque.	Falta de recursos e infraestructura futbolistica.	86	🇭🇹	18.594400	-72.307400
13	Estados Unidos	3	Estados Unidos	Washington D. C.	Estados Unidos fue semifinalista en el primer Mundial de 1930 y resurgio como potencia regional tras organizar el torneo de 1994. Llego a cuartos de final en 2002, su mejor actuacion moderna. Coorganiza el Mundial 2026 con una generacion joven y talentosa.	Generacion joven con muchos jugadores en clubes europeos de primer nivel y condicion de local.	Inconsistencia ante rivales fuertes y falta de un goleador de elite consolidado.	17	🇺🇸	38.907200	-77.036900
14	Australia	5	Australia	Canberra	Australia se integro a la AFC en 2006 y desde entonces es habitual en los Mundiales. En 2022 alcanzo los octavos de final tras una destacada fase de grupos. Los Socceroos combinan fisico europeo con experiencia internacional.	Fortaleza fisica, gran mentalidad competitiva y juego aereo dominante.	Plantilla con poca profundidad de talento de primer nivel y limitaciones tecnicas.	25	🇦🇺	-35.280900	149.130000
15	Paraguay	2	Paraguay	Asuncion	Paraguay alcanzo los cuartos de final en Sudafrica 2010, su mejor actuacion mundialista. Es una seleccion historicamente dura y combativa en eliminatorias sudamericanas. Regresa a un Mundial tras varias ausencias.	Solidez defensiva y caracter competitivo con orden tactico bajo su cuerpo tecnico.	Escasa generacion de juego ofensivo y dependencia de resultados ajustados.	41	🇵🇾	-25.263700	-57.575900
16	Turquia	1	Turquia	Ankara	Turquia logro un historico tercer puesto en el Mundial 2002. Llego a cuartos en la Eurocopa 2024 con una generacion prometedora. Es un equipo con creciente proyeccion.	Juventud talentosa y gran ambiente de aficion.	Inconsistencia y falta de regularidad en torneos largos.	26	🇹🇷	39.933400	32.859700
17	Alemania	1	Alemania	Berlin	Alemania es tetracampeona del mundo (1954, 1974, 1990 y 2014). Es una de las selecciones mas exitosas de la historia. Tras fracasos en 2018 y 2022 busca recuperar su jerarquia.	Mentalidad competitiva y estructura tactica solida.	Reconstruccion en marcha tras dos Mundiales decepcionantes.	9	🇩🇪	52.520000	13.405000
18	Costa de Marfil	4	Costa de Marfil	Yamusukro	Costa de Marfil vivio su epoca dorada con la generacion de Drogba, clasificando a tres Mundiales consecutivos. Conquistaron la Copa Africana de Naciones en 1992, 2015 y como anfitriones en 2024. Mantienen una camada talentosa de jugadores en Europa.	Plantel equilibrado y campeon continental vigente con confianza renovada.	Historial de bajo rendimiento en fases de grupos mundialistas.	33	🇨🇮	6.827600	-5.289300
19	Ecuador	2	Ecuador	Quito	Ecuador ha clasificado a varios mundiales desde 2002, alcanzando los octavos de final en Alemania 2006. En las eliminatorias recientes mostro solidez pese a deducciones de puntos. Su altura en Quito es un factor diferencial como local.	Defensa joven y robusta con gran fortaleza fisica y equipo bien estructurado.	Falta de pegada ofensiva y poca experiencia en instancias decisivas mundialistas.	23	🇪🇨	-0.180700	-78.467800
20	Curazao	3	Curazao	Willemstad	Pequena isla del Caribe, Curazao gano la Copa del Caribe 2017 y vive una clasificacion historica aprovechando jugadores de origen neerlandes.	Jugadores formados en ligas europeas.	Escasa poblacion y nula experiencia mundialista.	82	🇨🇼	12.108400	-68.933500
21	Paises Bajos	1	Paises Bajos	Amsterdam	Paises Bajos fue subcampeona del mundo en 1974, 1978 y 2010. Es famosa por el 'futbol total'. Pese a su gran historia, nunca ha levantado la Copa del Mundo.	Estilo ofensivo y solida defensa con jugadores de top.	Inconsistencia y falta de un cierre de torneos ganador.	7	🇳🇱	52.367600	4.904100
22	Japon	5	Japon	Tokio	Japon disputa Mundiales de forma ininterrumpida desde 1998 y ha alcanzado los octavos de final en cuatro ediciones. En Catar 2022 sorprendio al vencer a Alemania y Espana en la fase de grupos. Es considerada la potencia futbolistica mas consistente de Asia.	Juego colectivo muy organizado, ritmo alto y un bloque de jugadores formados en las mejores ligas europeas.	Falta de un goleador de elite y dificultad historica para superar la barrera de los octavos de final.	17	🇯🇵	35.676200	139.650300
23	Suecia	1	Suecia	Estocolmo	Suecia fue subcampeona del mundo en 1958 como anfitriona y tercera en 1950 y 1994. Es una potencia tradicional del futbol nordico que llego a cuartos en 2018.	Fortaleza fisica y solidez defensiva.	Dependencia de transiciones y poca posesion.	27	🇸🇪	59.329300	18.068600
24	Tunez	4	Tunez	Tunez	Tunez fue el primer pais africano en ganar un partido en un Mundial, en 1978 ante Mexico. Conquistaron la Copa Africana de Naciones en 2004 como anfitriones. En Catar 2022 vencieron a la campeona Francia en fase de grupos.	Orden tactico y disciplina defensiva muy consolidada.	Escasa capacidad goleadora que les impide superar la fase de grupos.	50	🇹🇳	36.806500	10.181500
25	Egipto	4	Egipto	El Cairo	Egipto es la seleccion mas laureada de la Copa Africana de Naciones con siete titulos. Disputaron su primer Mundial en 1934, siendo pioneros africanos en el torneo. Han dependido en gran medida del talento de Mohamed Salah en la ultima decada.	Cuentan con Mohamed Salah, uno de los mejores delanteros del mundo.	Excesiva dependencia de Salah y poca regularidad para clasificar a Mundiales.	29	🇪🇬	30.044400	31.235700
26	Iran	5	Iran	Teheran	Iran es una de las selecciones mas dominantes de Asia y suele clasificar con holgura a las eliminatorias finales. Ha participado en multiples Mundiales aunque nunca ha superado la fase de grupos. Cuenta con jugadores destacados en ligas europeas.	Solidez defensiva y orden tactico que la convierten en un rival muy dificil de batir.	Limitada creatividad ofensiva y poca pegada en momentos decisivos.	20	🇮🇷	35.689200	51.389000
27	Belgica	1	Belgica	Bruselas	Belgica vivio su mejor epoca con la 'generacion dorada', logrando el tercer puesto en el Mundial 2018. Nunca ha conquistado un titulo mayor. Atraviesa una transicion generacional.	Jugadores tecnicos con experiencia en grandes ligas.	El recambio aun no iguala a la generacion anterior.	8	🇧🇪	50.850300	4.351700
28	Nueva Zelanda	6	Nueva Zelanda	Wellington	Nueva Zelanda, apodada los 'All Whites', es la potencia dominante de la OFC y ha clasificado a los Mundiales de 1982 y 2010. En Sudafrica 2010 logro la hazana de terminar invicta en fase de grupos con tres empates, aunque sin avanzar. Para 2026 son los grandes favoritos de Oceania, que por primera vez tiene un cupo directo garantizado.	Dominio absoluto de su confederacion con jugadores fisicos y experiencia europea como Chris Wood.	Escaso roce competitivo internacional por la debilidad general de los rivales de la OFC.	86	🇳🇿	-41.286500	174.776200
29	Espana	1	Espana	Madrid	Espana fue campeona del mundo en 2010 en Sudafrica, su unico titulo mundialista. Domino el futbol entre 2008 y 2012 con dos Eurocopas. Reciente campeona de la Eurocopa 2024.	Posesion dominante y un mediocampo creativo de elite.	A veces le falta contundencia y un goleador nato.	3	🇪🇸	40.416800	-3.703800
30	Uruguay	2	Uruguay	Montevideo	Uruguay fue el primer campeon del mundo en 1930 y volvio a conquistar el titulo en 1950 con el historico Maracanazo. Es una potencia tradicional con cuatro estrellas oficiales reconocidas por FIFA. Su garra charrua es legendaria.	Renovacion generacional prometedora bajo un esquema tactico ordenado y competitivo.	Plantel corto en profundidad y presion por mantener el legado de jugadores historicos.	16	🇺🇾	-34.901100	-56.164500
31	Cabo Verde	4	Cabo Verde	Praia	Los Tiburones Azules son una de las grandes sorpresas del futbol africano, con un crecimiento notable en el ranking FIFA y una clasificacion historica.	Cohesion grupal y crecimiento sostenido.	Plantel limitado por el tamano del pais.	70	🇨🇻	14.921500	-23.508700
32	Arabia Saudita	5	Arabia Saudita	Riad	Arabia Saudita es una potencia tradicional del futbol asiatico con varias participaciones mundialistas. En Catar 2022 protagonizo una de las mayores sorpresas al vencer a la Argentina campeona. Su liga local ha crecido enormemente atrayendo a estrellas mundiales.	Equipo veloz y atrevido, capaz de dar grandes golpes ante favoritos.	Inconsistencia y fragilidad defensiva que suele costarle goleadas.	58	🇸🇦	24.713600	46.675300
33	Francia	1	Francia	Paris	Francia conquisto la Copa del Mundo en 1998 como anfitriona y en 2018 en Rusia. Finalista en 2022 cayendo ante Argentina en penales. Es una de las potencias dominantes del futbol moderno.	Plantilla profunda con talento de clase mundial en todas las lineas.	Tensiones internas y exceso de confianza pueden afectar al grupo.	2	🇫🇷	48.856600	2.352200
34	Noruega	1	Noruega	Oslo	Noruega participo en los Mundiales de 1994 y 1998, alcanzando octavos. Tras anos de ausencia, resurge con una generacion liderada por estrellas mundiales. Busca volver a una cita mundialista.	Poder ofensivo con figuras de talla mundial.	Poca experiencia reciente en fases finales de Mundial.	33	🇳🇴	59.913900	10.752200
35	Senegal	4	Senegal	Dakar	Senegal sorprendio al mundo en su debut en 2002 llegando a cuartos de final tras vencer a Francia. Conquistaron la Copa Africana de Naciones en 2021, su primer titulo continental. Se han consolidado como una de las potencias estables de Africa.	Plantel fisicamente potente y profundo con figuras como Sadio Mane y Koulibaly.	Irregularidad en momentos clave y exceso de confianza ante rivales menores.	15	🇸🇳	14.692800	-17.446700
36	Iraq	5	Iraq	Bagdad	Iraq fue campeon de la Copa Asiatica en 2007 en una gesta emotiva tras anos de conflicto. Pese a las dificultades para jugar de local, mantiene una base solida de talento. Pelea por regresar a un Mundial tras su unica participacion en 1986.	Caracter combativo y jugadores tecnicos con creciente proyeccion internacional.	Inestabilidad institucional y falta de continuidad en sus procesos deportivos.	56	🇮🇶	33.315200	44.366100
37	Argentina	2	Argentina	Buenos Aires	Argentina es tricampeona del mundo, con titulos en 1978, 1986 y 2022. La conquista en Qatar 2022 de la mano de Lionel Messi consolido una generacion dorada. Es una de las potencias historicas del futbol mundial.	Cuenta con Lionel Messi y una columna vertebral campeona del mundo con gran jerarquia.	Dependencia de jugadores veteranos cuya edad avanzada genera dudas sobre su rendimiento.	1	🇦🇷	-34.603700	-58.381600
38	Austria	1	Austria	Viena	Austria tuvo su epoca dorada en los anos 30 con el 'Wunderteam', logrando el cuarto puesto en 1934. En la era moderna ha vuelto a ser competitiva. Hizo buen papel en la Euro 2024.	Intensidad y presion alta bajo esquemas modernos.	Falta de experiencia en grandes citas mundialistas recientes.	22	🇦🇹	48.208200	16.373800
39	Argelia	4	Argelia	Argel	Argelia protagonizo el famoso partido ante Alemania Occidental en 1982 y alcanzo los octavos de final en Brasil 2014. Fueron campeones de Africa en 1990 y 2019. Cuentan con una generacion talentosa formada en ligas europeas.	Medio campo creativo y jugadores tecnicos con experiencia europea.	Fragilidad mental y baja productividad tras su titulo continental de 2019.	28	🇩🇿	36.753800	3.058800
40	Jordania	5	Jordania	Aman	Jordania alcanzo la final de la Copa Asiatica 2023, su mejor resultado historico, y debuta en una Copa del Mundo con gran ambicion.	Orden defensivo y juego directo.	Poca experiencia ante potencias mundiales.	62	🇯🇴	31.953900	35.910600
41	Colombia	2	Colombia	Bogota	Colombia vivio su epoca dorada en los anos noventa y alcanzo los cuartos de final en Brasil 2014. Fue subcampeona de la Copa America 2024 mostrando un gran nivel. Cuenta con una generacion talentosa liderada por James Rodriguez.	Mediocampo creativo y juego asociativo de gran calidad con James Rodriguez en su mejor forma.	Irregularidad defensiva y falta de un goleador consistente de area.	13	🇨🇴	4.711000	-74.072100
42	Portugal	1	Portugal	Lisboa	Portugal gano la Eurocopa 2016 y la Liga de Naciones 2019 y 2025. Nunca ha sido campeona del mundo pese a generaciones doradas. Llego a semifinales del Mundial en 1966 y 2006.	Talento ofensivo abundante y experiencia ganadora.	Dependencia historica de figuras veteranas.	6	🇵🇹	38.722300	-9.139300
43	Republica Democratica del Congo	4	Republica Democratica del Congo	Kinshasa	La RD Congo (como Zaire) gano dos Copas Africanas (1968 y 1974) y disputo el Mundial de 1974. Es una cantera de gran talento fisico que resurge en Africa.	Potencia fisica y talento individual.	Inestabilidad institucional y federativa.	57	🇨🇩	-4.441900	15.266300
44	Uzbekistan	5	Uzbekistan	Tashkent	Uzbekistan logro su clasificacion historica al primer Mundial de su historia rumbo a 2026, un hito para el pais. Durante anos estuvo cerca de clasificar pero quedaba eliminado en repechajes. Su generacion actual es la mas talentosa que ha producido.	Juventud, hambre competitiva y un bloque cohesionado que crecio juntos.	Falta total de experiencia mundialista y poca jerarquia ante grandes rivales.	57	🇺🇿	41.299500	69.240100
45	Inglaterra	1	Inglaterra	Londres	Inglaterra gano su unico Mundial en 1966 como local. Ha sido constante en fases finales recientes, con semifinal en 2018 y cuartos en 2022. Sufre una larga sequia de titulos.	Generacion joven y talentosa con gran ataque.	Historico bloqueo mental en instancias decisivas.	4	🏴󠁧󠁢󠁥󠁮󠁧󠁿	51.507400	-0.127800
46	Ghana	4	Ghana	Accra	Las Estrellas Negras llegaron a cuartos en Sudafrica 2010, rozando la semifinal, y han ganado cuatro Copas Africanas. Son una seleccion muy respetada del continente.	Fisico, juventud y tradicion mundialista.	Inconsistencia y conflictos internos recurrentes.	73	🇬🇭	5.603700	-0.187000
47	Croacia	1	Croacia	Zagreb	Croacia fue subcampeona del mundo en 2018 y tercera en 2022. Para un pais pequeno, sus resultados son extraordinarios. Su mediocampo ha sido referencia mundial.	Mediocampo de elite y enorme caracter competitivo.	Plantilla envejecida en sus figuras clave.	11	🇭🇷	45.815000	15.981900
48	Panama	3	Panama	Ciudad de Panama	Panama vivio un hito historico al clasificar por primera vez a un Mundial en Rusia 2018. Aunque cayo en la fase de grupos, anoto sus primeros goles mundialistas. Desde entonces se ha consolidado como un rival exigente en la CONCACAF.	Intensidad fisica, garra competitiva y un bloque defensivo aguerrido.	Falta de jerarquia ofensiva ante selecciones de mayor nivel.	34	🇵🇦	8.982400	-79.519900
\.


--
-- Data for Name: usuarios; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.usuarios (id, nombre, email, creado_en) FROM stdin;
1	Gustavo Ramirez	gustavo@example.com	2026-06-26 01:13:45.365801
2	Maria Hernandez	maria@example.com	2026-06-26 01:13:45.365801
3	Carlos Mendoza	carlos@example.com	2026-06-26 01:13:45.365801
4	Ana Torres	ana@example.com	2026-06-26 01:13:45.365801
5	Luis Gomez	luis@example.com	2026-06-26 01:13:45.365801
6	Sofia Martinez	sofia@example.com	2026-06-26 01:13:45.365801
7	Diego Flores	diego@example.com	2026-06-26 01:13:45.365801
8	Valeria Cruz	valeria@example.com	2026-06-26 01:13:45.365801
\.


--
-- Name: boletos_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.boletos_id_seq', 20, true);


--
-- Name: clasificaciones_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.clasificaciones_id_seq', 48, true);


--
-- Name: continentes_id_continente_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.continentes_id_continente_seq', 6, true);


--
-- Name: estadios_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.estadios_id_seq', 16, true);


--
-- Name: fase_final_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.fase_final_id_seq', 1, false);


--
-- Name: grupos_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.grupos_id_seq', 12, true);


--
-- Name: partidos_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.partidos_id_seq', 72, true);


--
-- Name: selecciones_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.selecciones_id_seq', 48, true);


--
-- Name: usuarios_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.usuarios_id_seq', 8, true);


--
-- Name: boletos boletos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.boletos
    ADD CONSTRAINT boletos_pkey PRIMARY KEY (id);


--
-- Name: clasificaciones clasificaciones_id_grupo_id_seleccion_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clasificaciones
    ADD CONSTRAINT clasificaciones_id_grupo_id_seleccion_key UNIQUE (id_grupo, id_seleccion);


--
-- Name: clasificaciones clasificaciones_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clasificaciones
    ADD CONSTRAINT clasificaciones_pkey PRIMARY KEY (id);


--
-- Name: continentes continentes_confederacion_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.continentes
    ADD CONSTRAINT continentes_confederacion_key UNIQUE (confederacion);


--
-- Name: continentes continentes_nombre_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.continentes
    ADD CONSTRAINT continentes_nombre_key UNIQUE (nombre);


--
-- Name: continentes continentes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.continentes
    ADD CONSTRAINT continentes_pkey PRIMARY KEY (id_continente);


--
-- Name: estadios estadios_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.estadios
    ADD CONSTRAINT estadios_pkey PRIMARY KEY (id);


--
-- Name: fase_final fase_final_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fase_final
    ADD CONSTRAINT fase_final_pkey PRIMARY KEY (id);


--
-- Name: grupos grupos_nombre_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.grupos
    ADD CONSTRAINT grupos_nombre_key UNIQUE (nombre);


--
-- Name: grupos grupos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.grupos
    ADD CONSTRAINT grupos_pkey PRIMARY KEY (id);


--
-- Name: partidos partidos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.partidos
    ADD CONSTRAINT partidos_pkey PRIMARY KEY (id);


--
-- Name: selecciones selecciones_nombre_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.selecciones
    ADD CONSTRAINT selecciones_nombre_key UNIQUE (nombre);


--
-- Name: selecciones selecciones_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.selecciones
    ADD CONSTRAINT selecciones_pkey PRIMARY KEY (id);


--
-- Name: usuarios usuarios_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usuarios
    ADD CONSTRAINT usuarios_email_key UNIQUE (email);


--
-- Name: usuarios usuarios_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usuarios
    ADD CONSTRAINT usuarios_pkey PRIMARY KEY (id);


--
-- Name: idx_partidos_estadio; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_partidos_estadio ON public.partidos USING btree (id_estadio);


--
-- Name: idx_partidos_fase; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_partidos_fase ON public.partidos USING btree (fase);


--
-- Name: idx_partidos_grupo; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_partidos_grupo ON public.partidos USING btree (id_grupo);


--
-- Name: idx_selecciones_continente; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_selecciones_continente ON public.selecciones USING btree (id_continente);


--
-- Name: idx_selecciones_ranking; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_selecciones_ranking ON public.selecciones USING btree (ranking);


--
-- Name: partidos tg_partido_clasificacion; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER tg_partido_clasificacion AFTER INSERT OR DELETE OR UPDATE ON public.partidos FOR EACH ROW EXECUTE FUNCTION public.trg_partido_clasificacion();


--
-- Name: boletos boletos_id_estadio_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.boletos
    ADD CONSTRAINT boletos_id_estadio_fkey FOREIGN KEY (id_estadio) REFERENCES public.estadios(id);


--
-- Name: boletos boletos_id_partido_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.boletos
    ADD CONSTRAINT boletos_id_partido_fkey FOREIGN KEY (id_partido) REFERENCES public.partidos(id) ON DELETE SET NULL;


--
-- Name: boletos boletos_id_seleccion_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.boletos
    ADD CONSTRAINT boletos_id_seleccion_fkey FOREIGN KEY (id_seleccion) REFERENCES public.selecciones(id);


--
-- Name: boletos boletos_id_usuario_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.boletos
    ADD CONSTRAINT boletos_id_usuario_fkey FOREIGN KEY (id_usuario) REFERENCES public.usuarios(id) ON DELETE CASCADE;


--
-- Name: clasificaciones clasificaciones_id_grupo_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clasificaciones
    ADD CONSTRAINT clasificaciones_id_grupo_fkey FOREIGN KEY (id_grupo) REFERENCES public.grupos(id) ON DELETE CASCADE;


--
-- Name: clasificaciones clasificaciones_id_seleccion_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clasificaciones
    ADD CONSTRAINT clasificaciones_id_seleccion_fkey FOREIGN KEY (id_seleccion) REFERENCES public.selecciones(id) ON DELETE CASCADE;


--
-- Name: fase_final fase_final_id_estadio_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fase_final
    ADD CONSTRAINT fase_final_id_estadio_fkey FOREIGN KEY (id_estadio) REFERENCES public.estadios(id);


--
-- Name: fase_final fase_final_id_partido_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fase_final
    ADD CONSTRAINT fase_final_id_partido_fkey FOREIGN KEY (id_partido) REFERENCES public.partidos(id) ON DELETE SET NULL;


--
-- Name: fase_final fase_final_id_seleccion_local_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fase_final
    ADD CONSTRAINT fase_final_id_seleccion_local_fkey FOREIGN KEY (id_seleccion_local) REFERENCES public.selecciones(id);


--
-- Name: fase_final fase_final_id_seleccion_visitante_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fase_final
    ADD CONSTRAINT fase_final_id_seleccion_visitante_fkey FOREIGN KEY (id_seleccion_visitante) REFERENCES public.selecciones(id);


--
-- Name: partidos partidos_id_equipo_local_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.partidos
    ADD CONSTRAINT partidos_id_equipo_local_fkey FOREIGN KEY (id_equipo_local) REFERENCES public.selecciones(id);


--
-- Name: partidos partidos_id_equipo_visitante_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.partidos
    ADD CONSTRAINT partidos_id_equipo_visitante_fkey FOREIGN KEY (id_equipo_visitante) REFERENCES public.selecciones(id);


--
-- Name: partidos partidos_id_estadio_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.partidos
    ADD CONSTRAINT partidos_id_estadio_fkey FOREIGN KEY (id_estadio) REFERENCES public.estadios(id);


--
-- Name: partidos partidos_id_grupo_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.partidos
    ADD CONSTRAINT partidos_id_grupo_fkey FOREIGN KEY (id_grupo) REFERENCES public.grupos(id) ON DELETE SET NULL;


--
-- Name: selecciones selecciones_id_continente_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.selecciones
    ADD CONSTRAINT selecciones_id_continente_fkey FOREIGN KEY (id_continente) REFERENCES public.continentes(id_continente);


--
-- PostgreSQL database dump complete
--

\unrestrict jZiiDc5zQ8oBp1N4lhTfjZ6JbigG5DQldaVscVh9iqWNUlHbffBtRZ1xYLcfE3t

