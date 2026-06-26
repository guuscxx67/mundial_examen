# ⚽ Copa Mundial FIFA 2026 — Simulación, Administración y Geolocalización

Aplicación web full‑stack para **simular, administrar y geolocalizar** la Copa Mundial
FIFA 2026 (sedes: México 🇲🇽, Estados Unidos 🇺🇸 y Canadá 🇨🇦).

Base de datos asignada: **PostgreSQL**.

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
| GET | `/api/continentes/paises` | Países por confederación |
| GET | `/api/grupos/:id/clasificacion` | Tabla de posiciones de un grupo |
| POST | `/api/grupos/:id/asignar` | Asignar selección a un grupo |
| GET/POST | `/api/estadios` | CRUD de estadios |
| GET/POST | `/api/partidos` | CRUD de partidos |
| PUT | `/api/partidos/:id/resultado` | Registrar resultado (recalcula clasificación) |
| POST | `/api/fase-final/generar` | Genera el cuadro con **sedes automáticas** |
| GET | `/api/estadisticas/*` | Estadísticas del torneo |
| GET | `/api/compartir/{grupo\|clasificacion\|estadio\|ruta}` | Enlaces para redes sociales |

---

## 📄 Entrega 1

Ver [`docs/entrega-1.md`](docs/entrega-1.md) (contenido para el PDF),
[`docs/diagrama-ER.md`](docs/diagrama-ER.md) (diagrama entidad–relación) y
[`docs/resultados-consultas.txt`](docs/resultados-consultas.txt) (resultados de las consultas).
