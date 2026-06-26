# Diagrama Entidad–Relación — Copa Mundial FIFA 2026

Base de datos: **PostgreSQL** · 9 tablas principales.

> Este diagrama está en formato **Mermaid**. Se visualiza automáticamente en GitHub,
> en VS Code (extensión *Markdown Preview Mermaid*) o en <https://mermaid.live> para
> exportarlo como imagen/PDF.

```mermaid
erDiagram
    CONTINENTES ||--o{ SELECCIONES : "agrupa"
    SELECCIONES ||--o{ CLASIFICACIONES : "figura en"
    GRUPOS      ||--o{ CLASIFICACIONES : "contiene"
    GRUPOS      ||--o{ PARTIDOS : "programa"
    SELECCIONES ||--o{ PARTIDOS : "juega (local)"
    SELECCIONES ||--o{ PARTIDOS : "juega (visitante)"
    ESTADIOS    ||--o{ PARTIDOS : "alberga"
    ESTADIOS    ||--o{ FASE_FINAL : "sede de"
    SELECCIONES ||--o{ FASE_FINAL : "clasifica a"
    PARTIDOS    ||--o| FASE_FINAL : "corresponde"
    USUARIOS    ||--o{ BOLETOS : "compra"
    ESTADIOS    ||--o{ BOLETOS : "accede a"
    PARTIDOS    ||--o{ BOLETOS : "ampara"
    SELECCIONES ||--o{ BOLETOS : "apoya"

    CONTINENTES {
        serial   id_continente PK
        varchar  nombre
        varchar  confederacion
        text     descripcion
    }
    SELECCIONES {
        serial   id PK
        varchar  nombre
        int      id_continente FK
        varchar  pais
        varchar  capital
        text     historia
        text     ventajas
        text     desventajas
        int      ranking
        varchar  bandera
        numeric  latitud
        numeric  longitud
    }
    GRUPOS {
        serial   id PK
        varchar  nombre
    }
    ESTADIOS {
        serial   id PK
        varchar  nombre
        varchar  ciudad
        varchar  pais
        numeric  latitud
        numeric  longitud
        int      capacidad
    }
    PARTIDOS {
        serial   id PK
        varchar  fase
        int      id_grupo FK
        int      id_equipo_local FK
        int      id_equipo_visitante FK
        int      goles_local
        int      goles_visitante
        date     fecha
        time     horario
        int      id_estadio FK
        boolean  jugado
    }
    CLASIFICACIONES {
        serial   id PK
        int      id_grupo FK
        int      id_seleccion FK
        int      pj
        int      pg
        int      pe
        int      pp
        int      gf
        int      gc
        int      dg "generada = gf - gc"
        int      pts
    }
    FASE_FINAL {
        serial   id PK
        varchar  nombre_fase
        varchar  llave
        int      id_seleccion_local FK
        int      id_seleccion_visitante FK
        int      id_estadio FK
        date     fecha
        time     horario
        int      id_partido FK
    }
    USUARIOS {
        serial    id PK
        varchar   nombre
        varchar   email
        timestamp creado_en
    }
    BOLETOS {
        serial   id PK
        int      id_usuario FK
        int      id_estadio FK
        int      id_partido FK
        int      id_seleccion FK
        varchar  dia
        date     fecha
        time     horario
        numeric  costo
    }
```

## Relaciones (cardinalidad)

| Relación | Tipo | Descripción |
|----------|------|-------------|
| Continentes → Selecciones | 1 : N | Cada selección pertenece a un continente/confederación |
| Grupos → Clasificaciones | 1 : N | Un grupo tiene 4 filas de clasificación |
| Selecciones → Clasificaciones | 1 : N | Una selección aparece en la tabla de su grupo |
| Grupos → Partidos | 1 : N | Los partidos de la fase de grupos pertenecen a un grupo |
| Selecciones → Partidos | 1 : N (×2) | Como equipo local y como visitante |
| Estadios → Partidos | 1 : N | Cada partido se juega en un estadio |
| Estadios → Fase_final | 1 : N | Sede asignada automáticamente a cada llave |
| Selecciones → Fase_final | 1 : N (×2) | Clasificados local/visitante de cada llave |
| Usuarios → Boletos | 1 : N | Un usuario compra varios boletos |
| Estadios/Partidos/Selecciones → Boletos | 1 : N | Detalle del boleto |

## Reglas de negocio implementadas en la BD

- **Columna generada** `dg = gf - gc` en `clasificaciones` (siempre consistente).
- **Función** `fn_recalcular_clasificacion(grupo)`: recalcula PJ/PG/PE/PP/GF/GC/Pts
  desde los partidos jugados (victoria=3, empate=1, derrota=0).
- **Trigger** `tg_partido_clasificacion`: ante cualquier alta/cambio/baja de un
  partido de grupos, recalcula automáticamente la tabla de posiciones.
- **Vistas**: `v_clasificacion` (posiciones ordenadas con desempate),
  `v_paises` (país + continente + confederación) y `v_partidos` (partidos con nombres).
