# ⚽ Copa Mundial FIFA 2026 — Simulación, Administración y Geolocalización

Aplicación web full‑stack para **simular, administrar y geolocalizar** la Copa Mundial
FIFA 2026 (sedes: México 🇲🇽, Estados Unidos 🇺🇸 y Canadá 🇨🇦).

Base de datos asignada: **PostgreSQL**.

El mismo frontend (HTML + CSS + JavaScript) puede consumir un backend de **MySQL,
PostgreSQL o MongoDB**; este equipo implementa **PostgreSQL**.

---

## 🧩 Módulos del frontend (14)

Una sola aplicación de página única (SPA) con estos módulos, según la especificación:

| # | Módulo | Contenido |
|---|--------|-----------|
| 1 | **Inicio** | Logo, países sede, contadores animados, cuenta regresiva a la Final, video introductorio, noticias |
| 2 | **Confederaciones** | Menú por confederación (UEFA, CONMEBOL, CONCACAF, CAF, AFC, OFC) y **ficha emergente** por selección (nombre, bandera, ranking, historia, ventajas, desventajas, entrenador, grupo y estadios con Google Maps) |
| 3 | **Selecciones** | Ranking FIFA top 10 y listado completo con buscador |
| 4 | **Grupos** | Tabla por grupo: Bandera · Selección · PJ · PG · PE · PP · GF · GC · DG · PT + partidos |
| 5 | **Calendario** | Partidos agrupados por fecha, con filtros por fase y estado |
| 6 | **Clasificación** | Posiciones de todos los grupos + clasificados a la fase final |
| 7 | **Simulador** | Registrar/simular resultados (el trigger recalcula la tabla) y generar la fase final |
| 8 | **Resultados** | **Carga de resultados de TODAS las fases** (usuario/administrador): modificar un marcador de grupos **re-siembra los dieciseisavos** automáticamente; en eliminatorias el **ganador avanza solo** a la siguiente ronda (empates definidos por penales) |
| 9 | **Fase Final** | Cuadro de eliminatorias (32 equipos) con sedes, fechas, horarios y costo |
| 10 | **Estadios** | Historia, año de apertura, superficie, techo, equipo local, capacidad, equipos que jugarán, fechas, horarios, costo de boletos por fase, Google Maps y compartir |
| 11 | **Geolocalización** | Mapa interactivo (Leaflet) con estadios y capitales, ruta y compartir |
| 12 | **Boletos** | Compra de boletos y usuarios |
| 13 | **Administrador** | Altas y gestión (CRUD) de selecciones, estadios, grupos y partidos |
| 14 | **Acerca del Proyecto** | Descripción, stack, módulos y requisitos cubiertos |

### 🔁 Flujo de resultados (grupos → dieciseisavos → ... → final)

1. La fase de grupos viene **precargada** con los 72 resultados y el cuadro de
   fase final viene **jugado hasta Semifinales** (`db/seed-fasefinal.sql`): el
   **Tercer Lugar y la Final** quedan con sus equipos definidos, **pendientes de
   capturar**. (Si el cuadro no existiera, el servidor lo genera solo al arrancar.)
2. En el módulo **Resultados**, el administrador puede corregir cualquier marcador
   de grupos: el *trigger* recalcula la tabla de posiciones y el backend
   **re-siembra las llaves de dieciseisavos afectadas** (las llaves cuyo cruce
   cambia pierden su resultado; las demás lo conservan).
3. En eliminatorias, al capturar un marcador el **ganador se propaga** a la
   siguiente ronda (D→O→C→S→F); los perdedores de semifinal van al Tercer Lugar.
   Un empate exige **definición por penales**.

---

## 🌐 Trabajo en red y TIEMPO REAL (un equipo como servidor)

El sistema está preparado para que **un equipo funcione como servidor** y los
demás equipos trabajen contra él **viendo las modificaciones en tiempo real**:

1. **Equipo servidor:** levanta la BD y el servidor (`docker compose up -d` +
   `npm start`). La consola muestra las direcciones de red local, por ejemplo
   `http://192.168.1.50:3000`.
2. **Los demás equipos:** solo abren esa dirección en su navegador — no
   necesitan instalar nada.
3. **Tiempo real:** cada navegador se suscribe a `GET /api/eventos`
   (**Server-Sent Events**). Cualquier modificación (resultados de grupos o de
   fase final, altas, boletos, regeneración del cuadro) se **difunde a todos
   los clientes conectados**, que actualizan su vista automáticamente y
   muestran una notificación — sin recargar la página. El indicador **“En
   vivo”** de la barra superior muestra el estado de la conexión.
4. Cada navegador manda un identificador (`X-Cliente`) en sus peticiones para
   ignorar sus propios eventos y no recargarse dos veces.

> 🔥 Si los demás equipos no pueden conectarse, en el equipo servidor hay que
> permitir **Node.js** en el Firewall de Windows (o el puerto 3000, TCP,
> redes privadas).

---

## ✔️ Requisitos del proyecto cubiertos

| Requisito | Dónde se implementa |
|-----------|---------------------|
| **Programación Orientada a Objetos** | `src/models/` (clase base `BaseModel` + herencia por entidad) y `src/services/` |
| **Bases de Datos** | PostgreSQL: `db/schema.sql`, `db/seed.sql`, funciones, triggers y vistas |
| **APIs REST** | `src/routes/` + `src/server.js` (Express) |
| **Geolocalización** | Latitud/longitud de selecciones y estadios; `src/utils/geo.js` (Haversine, Google Maps) |
| **Algoritmos de clasificación** | `src/services/ClasificacionService.js` + trigger `fn_recalcular_clasificacion` |
| **Estructuras de datos** | `Map` en `ClasificacionService` para acumular y ordenar la tabla de posiciones |
| **Estadísticas** | `src/services/EstadisticasService.js` (goleadores, defensas, por confederación) |
| **Visualización en mapas** | `public/js/mapa.js` con **Leaflet** + marcadores de estadios y capitales |
| **Redes sociales** | `src/services/CompartirService.js` (WhatsApp, Facebook, Instagram, Telegram) |

### Altas disponibles
Equipos (selecciones), estadios, partidos, asignación de grupos y resultados.

### Compartir en redes
Grupo, clasificación, estadio y ruta (con enlace de Google Maps).

---

## 🧱 Arquitectura y stack

- **Backend:** Node.js + Express + `pg` (node‑postgres) — modelos POO.
- **Base de datos:** PostgreSQL 16 (en contenedor Docker).
- **Frontend:** HTML + CSS + JavaScript *vanilla* + **Leaflet** (mapas).

```
mundial_examen/
├── db/
│   ├── schema.sql        # DDL: 9 tablas + función + trigger + vistas
│   ├── seed.sql          # Datos reales al 26/06/2026: 48 selecciones, 16 estadios, 12 grupos, 72 partidos
│   ├── queries.sql       # Consultas solicitadas + 5 adicionales
│   └── dataset.json       # Dataset verificado (origen de los datos)
├── src/
│   ├── server.js         # Servidor Express (API + frontend)
│   ├── db/pool.js        # Pool de conexiones PostgreSQL
│   ├── models/           # POO: BaseModel + Continente, Seleccion, Grupo, ...
│   ├── services/         # Clasificación, FaseFinal, Estadísticas, Compartir
│   ├── routes/           # API REST (CRUD genérico + endpoints específicos)
│   └── utils/geo.js      # Geolocalización y enlaces a mapas/redes
├── public/               # Frontend (index.html, css, js)
├── docs/                 # Diagrama ER, entrega 1, resultados de consultas
├── scripts/generar-seed.mjs   # Generador del seed.sql
└── docker-compose.yml    # Servicio PostgreSQL
```

---

## 🚀 Puesta en marcha

### Requisitos previos
- [Docker Desktop](https://www.docker.com/) en ejecución
- [Node.js](https://nodejs.org/) 18 o superior

### Pasos

```bash
# 1) Levantar la base de datos PostgreSQL (carga schema.sql + seed.sql automáticamente)
docker compose up -d

# 2) Configurar variables de entorno
cp .env.example .env

# 3) Instalar dependencias y arrancar el servidor
npm install
npm start
```

Abrir **http://localhost:3000** en el navegador.

> ♻️ **Si ya habías levantado la base de datos antes**, ejecuta `npm run db:reset`
> para recrear el volumen y aplicar el esquema actualizado (se añadieron las
> columnas `descripcion`, `anio_apertura`, `superficie`, `techo` y `equipo_local`
> a `estadios`). Los scripts de inicialización de Docker solo se ejecutan la
> **primera** vez que se crea el volumen.

> ⚠️ **Nota sobre el puerto:** la base de datos del contenedor se publica en el puerto
> **55432** del host (para no chocar con instalaciones nativas de PostgreSQL que suelen
> usar 5432–5434). El contenedor internamente sigue usando 5432.

### Scripts útiles

| Comando | Acción |
|---------|--------|
| `npm start` | Inicia el servidor web/API |
| `npm run dev` | Inicia con recarga automática (`node --watch`) |
| `npm run db:up` | Levanta el contenedor de PostgreSQL |
| `npm run db:reset` | Reinicia la BD desde cero (borra y recarga datos) |
| `node scripts/generar-seed.mjs` | Regenera `db/seed.sql` desde `db/dataset.json` |
| `node scripts/jugar-hasta-semifinales.mjs` | Regenera el cuadro y lo juega (determinista) hasta Semifinales |
| `node scripts/generar-instalar.mjs` | Regenera `db/instalar.sql` y `db/seed-fasefinal.sql` desde la BD viva |
| `npm run entrega:estado` | Los dos anteriores en cadena: deja el estado de entrega y sus SQL |

### Ejecutar las consultas del examen

```bash
docker exec -i mundial2026_db psql -U mundial -d mundial2026 < db/queries.sql
```

---

## 🔌 API REST (resumen)

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/health` | Estado del sistema |
| GET/POST/PUT/DELETE | `/api/selecciones` | CRUD de selecciones |
| GET | `/api/selecciones/ranking/top?limite=10` | Top de ranking FIFA |
| GET | `/api/selecciones/:id/perfil` | Ficha completa (grupo, estadios donde juega, entrenador) para el cuadro emergente |
| GET | `/api/continentes/paises` | Países por confederación |
| GET | `/api/grupos/:id/clasificacion` | Tabla de posiciones de un grupo |
| POST | `/api/grupos/:id/asignar` | Asignar selección a un grupo |
| GET/POST | `/api/estadios` | CRUD de estadios (con historia, año, superficie, techo y equipo local) |
| GET | `/api/estadios/:id/partidos` | Partidos del estadio (grupos **y** eliminatorias) |
| GET/POST | `/api/partidos` | CRUD de partidos |
| PUT | `/api/partidos/:id/resultado` | Registrar resultado (recalcula clasificación y **re-siembra dieciseisavos**) |
| POST | `/api/fase-final/generar` | Genera el cuadro con **sedes automáticas** |
| PUT | `/api/fase-final/:id/resultado` | Resultado de una llave (con penales) → **propaga al ganador** |
| POST | `/api/fase-final/simular` | Simula la primera ronda pendiente de eliminatorias |
| GET | `/api/estadisticas/*` | Estadísticas del torneo |
| GET | `/api/compartir/{grupo\|clasificacion\|estadio\|ruta}` | Enlaces para redes sociales |

---

## 📄 Entrega 1

Ver [`docs/entrega-1.md`](docs/entrega-1.md) (contenido para el PDF),
[`docs/diagrama-ER.md`](docs/diagrama-ER.md) (diagrama entidad–relación) y
[`docs/resultados-consultas.txt`](docs/resultados-consultas.txt) (resultados de las consultas).
