// Ensambla el documento de la 2.a entrega (docs/entrega-2.md y .html) tomando
// los datos directamente de la base de datos y EJECUTANDO demostraciones
// reales contra la API:
//   1) se modifica un resultado de la fase de grupos y se documenta como
//      cambian los dieciseisavos;
//   2) se captura una llave de eliminatorias y se documenta la propagacion.
// Al final se restaura el ESTADO DE ENTREGA (torneo jugado hasta Semifinales,
// Tercer Lugar y Final pendientes) y se documenta el cuadro completo.
//
// Requisitos: BD arriba (docker) y servidor corriendo en http://localhost:3000
// Uso: node scripts/generar-entrega2.mjs
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const { Pool } = pg;
const pool = new Pool({
  host: process.env.PGHOST || 'localhost',
  port: Number(process.env.PGPORT) || 55432,
  user: process.env.PGUSER || 'mundial',
  password: process.env.PGPASSWORD || 'mundial2026',
  database: process.env.PGDATABASE || 'mundial2026',
});
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

const API = 'http://localhost:3000/api';
const jget = (p) => fetch(API + p).then((r) => r.json());
const jput = (p, b) => fetch(API + p, {
  method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(b),
}).then((r) => r.json());
const jpost = (p) => fetch(API + p, { method: 'POST' }).then((r) => r.json());

function tablaMD(rows, cols, headers) {
  let out = '| ' + headers.join(' | ') + ' |\n| ' + headers.map(() => '---').join(' | ') + ' |\n';
  for (const r of rows) out += '| ' + cols.map((c) => (r[c] == null ? '' : String(r[c]))).join(' | ') + ' |\n';
  return out;
}

const clasifGrupo = async (id) => (await pool.query(`
  SELECT posicion, bandera, seleccion, pj, pg, pe, pp, gf, gc, dg, pts
    FROM v_clasificacion vc JOIN grupos g ON g.nombre = vc.grupo
   WHERE g.id = $1 ORDER BY posicion`, [id])).rows;

const dieciseisavos = async () => (await pool.query(`
  SELECT ff.llave,
         COALESCE(sl.bandera || ' ' || sl.nombre, 'Por definir') AS local,
         COALESCE(sv.bandera || ' ' || sv.nombre, 'Por definir') AS visitante,
         e.nombre AS estadio, ff.fecha::text AS fecha, ff.horario::text AS horario
    FROM fase_final ff
    LEFT JOIN selecciones sl ON sl.id = ff.id_seleccion_local
    LEFT JOIN selecciones sv ON sv.id = ff.id_seleccion_visitante
    LEFT JOIN estadios e ON e.id = ff.id_estadio
   WHERE ff.nombre_fase = 'Dieciseisavos'
   ORDER BY ff.id`)).rows;

const cuadroFase = async (fase) => (await pool.query(`
  SELECT ff.llave,
         COALESCE(sl.bandera || ' ' || sl.nombre, 'Por definir') AS local,
         CASE WHEN ff.jugado
              THEN ff.goles_local || ' – ' || ff.goles_visitante ||
                   COALESCE(' (pen ' || ff.penales_local || '–' || ff.penales_visitante || ')', '')
              ELSE '**por jugar**' END AS marcador,
         COALESCE(sv.bandera || ' ' || sv.nombre, 'Por definir') AS visitante,
         e.nombre AS estadio, ff.fecha::text AS fecha
    FROM fase_final ff
    LEFT JOIN selecciones sl ON sl.id = ff.id_seleccion_local
    LEFT JOIN selecciones sv ON sv.id = ff.id_seleccion_visitante
    LEFT JOIN estadios e ON e.id = ff.id_estadio
   WHERE ff.nombre_fase = $1
   ORDER BY ff.id`, [fase])).rows;

const COLS_CL = ['posicion', 'bandera', 'seleccion', 'pj', 'pg', 'pe', 'pp', 'gf', 'gc', 'dg', 'pts'];
const HDRS_CL = ['Pos', 'Bandera', 'Selección', 'PJ', 'PG', 'PE', 'PP', 'GF', 'GC', 'DG', 'Pts'];
const COLS_D = ['llave', 'local', 'visitante', 'estadio', 'fecha', 'horario'];
const HDRS_D = ['Llave', 'Local', 'Visitante', 'Estadio (sede automática)', 'Fecha', 'Horario'];
const COLS_F = ['llave', 'local', 'marcador', 'visitante', 'estadio', 'fecha'];
const HDRS_F = ['Llave', 'Local', 'Marcador', 'Visitante', 'Estadio', 'Fecha'];

// ============================================================================
//  Cuadro nuevo para que las demostraciones partan de un estado limpio
// ============================================================================
await jpost('/fase-final/generar');

// ============================================================================
//  DEMOSTRACION 1: cambio en la fase de grupos -> re-siembra de dieciseisavos
// ============================================================================
const clsAntes = await clasifGrupo(1);
const dAntes = await dieciseisavos();

const partidos = await jget('/partidos/detalle');
const grupoA = partidos.filter((p) => p.grupo === 'A');
const ultimo = clsAntes[clsAntes.length - 1].seleccion;
const partido = grupoA.find((p) => p.local === ultimo || p.visitante === ultimo);
const esLocal = partido.local === ultimo;
const marcadorOriginal = `${partido.goles_local}-${partido.goles_visitante}`;
const marcadorNuevo = esLocal ? '9-0' : '0-9';

const resp = await jput(`/partidos/${partido.id}/resultado`, {
  goles_local: esLocal ? 9 : 0, goles_visitante: esLocal ? 0 : 9,
});
const llavesResembradas = resp.fase_final?.llaves_dieciseisavos ?? [];

const clsDespues = await clasifGrupo(1);
const dDespues = await dieciseisavos();
const cambiadas = new Set(llavesResembradas);
const dDespuesMarcado = dDespues.map((r) => cambiadas.has(r.llave)
  ? { ...r, llave: `**${r.llave}**`, local: `**${r.local}**`, visitante: `**${r.visitante}**` }
  : r);

// Restaurar el marcador original (la re-siembra regresa sola)
await jput(`/partidos/${partido.id}/resultado`, {
  goles_local: partido.goles_local, goles_visitante: partido.goles_visitante,
});

// ============================================================================
//  DEMOSTRACION 2: captura en eliminatorias -> el ganador avanza a octavos
// ============================================================================
const cuadro0 = await jget('/fase-final');
const d1 = cuadro0.find((x) => x.llave === 'D1');
const d2 = cuadro0.find((x) => x.llave === 'D2');
const o1Antes = cuadro0.find((x) => x.llave === 'O1');

const rD1 = await jput(`/fase-final/${d1.id}/resultado`, { goles_local: 2, goles_visitante: 1 });
const rEmpate = await jput(`/fase-final/${d2.id}/resultado`, { goles_local: 1, goles_visitante: 1 });
const rD2 = await jput(`/fase-final/${d2.id}/resultado`, {
  goles_local: 1, goles_visitante: 1, penales_local: 3, penales_visitante: 4,
});
const cuadro1 = await jget('/fase-final');
const o1Despues = cuadro1.find((x) => x.llave === 'O1');

// ============================================================================
//  ESTADO DE ENTREGA: torneo jugado (determinista) hasta Semifinales
// ============================================================================
execSync('node scripts/jugar-hasta-semifinales.mjs', { cwd: root, stdio: 'pipe' });

const fasesEstado = {};
for (const f of ['Dieciseisavos', 'Octavos', 'Cuartos', 'Semifinal', 'Tercer Lugar', 'Final']) {
  fasesEstado[f] = await cuadroFase(f);
}

// ============================================================================
//  Datos de estadios ampliados
// ============================================================================
const estadios = (await pool.query(`
  SELECT nombre, ciudad, pais, capacidad, anio_apertura, superficie, techo, equipo_local
    FROM estadios ORDER BY pais, nombre`)).rows;
const azteca = (await pool.query(
  "SELECT descripcion FROM estadios WHERE nombre = 'Estadio Azteca'")).rows[0];
const partidosAzteca = (await jget('/estadios/1/partidos'));

// ============================================================================
//  Documento
// ============================================================================
const doc = `# Copa Mundial FIFA 2026
## Sistema de Simulación, Administración y Geolocalización
### Segunda Entrega — Resultados por fase, sistema completo hasta la Final, estadios ampliados, tiempo real en red y nuevas vistas

---

| Campo | Dato |
|-------|------|
| **Universidad** | _______________________________ |
| **Materia** | _______________________________ |
| **Maestro(a)** | _______________________________ |
| **Equipo** | _______________________________ |
| **Integrantes** | _______________________________ |
| | _______________________________ |
| | _______________________________ |
| **Base de datos asignada** | **PostgreSQL** |
| **Fecha de entrega** | Julio de 2026 |

---

## Índice

1. Atención a las observaciones del profesor
2. Módulo de carga de resultados (todas las fases, con propagación)
3. Demostración real: un cambio en grupos modifica los dieciseisavos
4. Demostración real: en eliminatorias el ganador avanza solo
5. Sistema completo hasta la Final — datos precargados hasta Semifinales
6. Trabajo en red en TIEMPO REAL (un equipo como servidor)
7. Módulo de estadios ampliado
8. Rediseño de las vistas
9. Estado de los módulos del sistema
10. Cómo ejecutar y probar el sistema

---

## 1. Atención a las observaciones del profesor

| # | Observación | Solución implementada |
|---|-------------|------------------------|
| 1 | Desarrollar el módulo donde se actualizan los resultados y ver cómo un cambio en la fase de grupos se refleja **hasta la fase de dieciseisavos**. | Nuevo módulo **Resultados**: al corregir un marcador de grupos, un *trigger* de PostgreSQL recalcula la tabla de posiciones y el backend **re-siembra automáticamente las llaves de dieciseisavos** afectadas (sección 3, con evidencia real). |
| 2 | La parte de estadios está muy simple; dar más información además de los mínimos solicitados. | La tabla \`estadios\` se amplió con **historia, año de apertura, superficie, techo y equipo local**, además de los mínimos (nombre, ubicación con Google Maps, equipos, fechas, horarios y costo de boletos). Ahora también se listan los **partidos de eliminatorias** de cada estadio (sección 7). |
| 3 | Hay equipos que no han metido los resultados de grupos y no se ve cómo se liga con dieciseisavos. | Los **72 resultados** de la fase de grupos vienen precargados y el cuadro de fase final viene **jugado hasta Semifinales**: la liga grupos → dieciseisavos → … → Final es visible desde el primer arranque y reacciona en vivo a cualquier corrección. |
| 4 | Las vistas están muy simples; ser más creativos. | Rediseño completo de la interfaz: nueva tipografía, fondo con los colores de los tres países sede, tarjetas con animaciones, cuenta regresiva en vivo a la Final, navegación tipo píldora y cuadro de eliminatorias con ganadores resaltados (sección 8). |
| 5 | Entregar el sistema completo hasta la fase final (octavos, cuartos, semifinales, tercer lugar y final), **ya con todos los datos hasta Semifinales**. | El sistema cubre y trae **capturadas** todas las rondas hasta Semifinal; el **Tercer Lugar y la Final quedan con sus equipos definidos, pendientes de capturar** en la revisión (sección 5). |
| 6 | Un equipo funciona como **servidor** y los demás realizan modificaciones **en tiempo real** viendo los cambios. | El servidor escucha en la red local (muestra sus direcciones al arrancar) y difunde cada modificación por **Server-Sent Events**: todos los navegadores conectados actualizan su vista al instante, sin recargar (sección 6). |

---

## 2. Módulo de carga de resultados (todas las fases)

El módulo **Resultados** (pestaña propia en el menú) permite al usuario o
administrador **capturar y corregir marcadores de las 7 fases** del torneo:
Grupos, Dieciseisavos, Octavos, Cuartos, Semifinal, Tercer Lugar y Final.

**Comportamiento por fase:**

- **Grupos** — al guardar, el *trigger* \`tg_partido_clasificacion\` recalcula la
  tabla de posiciones del grupo y el servicio
  \`FaseFinalService.sincronizarDieciseisavos()\` recalcula los 32 clasificados
  (2 primeros de cada grupo + 8 mejores terceros) y **re-siembra las llaves
  cuyo cruce cambió** (las que no cambian conservan su resultado).
- **Eliminatorias** — al guardar una llave, el **ganador se propaga
  automáticamente** a la ronda siguiente (D→O→C→S→Final); los perdedores de
  semifinal pasan al partido por el **Tercer Lugar**. Un **empate exige
  definición por penales** (el sistema lo valida). Si se **corrige** una llave
  ya jugada, las rondas posteriores que dependían de ella se limpian y
  recalculan en cascada.
- Cada fase muestra su avance (partidos jugados / totales) y un botón para
  **simular la ronda pendiente** con marcadores aleatorios.
- Toda modificación se **difunde en tiempo real** a los demás equipos
  conectados (sección 6).

\`\`\`mermaid
flowchart LR
    G["Fase de grupos<br/>72 partidos"] -->|trigger recalcula<br/>clasificaciones| C["Tabla de posiciones<br/>12 grupos"]
    C -->|"re-siembra automática<br/>(24 + 8 mejores terceros)"| D["Dieciseisavos<br/>16 llaves"]
    D -->|ganador| O["Octavos<br/>8 llaves"]
    O -->|ganador| Q["Cuartos<br/>4 llaves"]
    Q -->|ganador| S["Semifinal<br/>2 llaves"]
    S -->|ganadores| F["FINAL"]
    S -->|perdedores| T["Tercer Lugar"]
\`\`\`

**Endpoints del módulo:**

| Método | Ruta | Función |
|--------|------|---------|
| PUT | \`/api/partidos/:id/resultado\` | Marcador de grupos → recalcula clasificación y re-siembra dieciseisavos |
| PUT | \`/api/fase-final/:id/resultado\` | Marcador de una llave (con penales si hay empate) → propaga al ganador |
| POST | \`/api/fase-final/generar\` | Genera/regenera el cuadro completo con sedes automáticas |
| POST | \`/api/fase-final/simular\` | Simula la primera ronda pendiente |
| GET | \`/api/eventos\` | Flujo de eventos en tiempo real (SSE) para todos los clientes |

---

## 3. Demostración real: un cambio en grupos modifica los dieciseisavos

> Las tablas siguientes **no son un ejemplo inventado**: fueron generadas
> ejecutando la operación contra el sistema en vivo al momento de crear este
> documento.

### 3.1 Estado inicial del Grupo A

${tablaMD(clsAntes, COLS_CL, HDRS_CL)}

### 3.2 Dieciseisavos generados a partir de esa clasificación (antes del cambio)

${tablaMD(dAntes, COLS_D, HDRS_D)}

### 3.3 El administrador corrige un resultado

En el módulo **Resultados**, se corrige el partido
**${partido.local} vs ${partido.visitante}** del Grupo A: el marcador pasa de
**${marcadorOriginal}** a **${marcadorNuevo}** (ahora gana **${ultimo}**, que era último
de su grupo).

### 3.4 Nueva clasificación del Grupo A (recalculada por el trigger)

${tablaMD(clsDespues, COLS_CL, HDRS_CL)}

### 3.5 Dieciseisavos re-sembrados automáticamente

El backend respondió que se re-sembraron **${llavesResembradas.length} llaves**
(${llavesResembradas.join(', ')}), marcadas en **negritas**:

${tablaMD(dDespuesMarcado, COLS_D, HDRS_D)}

Al restaurar el marcador original, el sistema regresó solo al cuadro inicial.

---

## 4. Demostración real: en eliminatorias el ganador avanza solo

Estado inicial de la llave **O1** de octavos: local = *${o1Antes.local ?? 'Por definir'}*,
visitante = *${o1Antes.visitante ?? 'Por definir'}* (ambos por definir).

1. Se captura **D1: ${d1.local} 2 – 1 ${d1.visitante}** → el sistema responde
   \`llaves_actualizadas: ${JSON.stringify(rD1.llaves_actualizadas)}\` y coloca a
   **${d1.local}** como local de O1.
2. Se intenta capturar **D2: ${d2.local} 1 – 1 ${d2.visitante}** *sin penales* →
   el sistema lo **rechaza**: “${rEmpate.error}”.
3. Se captura **D2: 1 – 1 (penales 3 – 4)** → gana **${d2.visitante}** y el sistema
   responde \`llaves_actualizadas: ${JSON.stringify(rD2.llaves_actualizadas)}\`.

**Resultado:** la llave O1 de octavos quedó **${o1Despues.local} vs ${o1Despues.visitante}**,
sin intervención manual. La misma cascada continúa hasta la Final: los ganadores
de semifinal se colocan en la Final y los perdedores en el Tercer Lugar.

---

## 5. Sistema completo hasta la Final — datos precargados hasta Semifinales

El sistema se entrega con el torneo **capturado hasta las Semifinales**
(marcadores deterministas basados en el ranking FIFA, cargados a través del
mismo módulo de resultados). El **Tercer Lugar y la Final** tienen a sus
equipos definidos por la propagación automática y quedan **pendientes de
capturar**, listos para demostrarse en la revisión. Este estado viene incluido
en la base de datos (\`db/seed-fasefinal.sql\` con Docker, o \`db/instalar.sql\`
con pgAdmin).

### Dieciseisavos de final

${tablaMD(fasesEstado['Dieciseisavos'], COLS_F, HDRS_F)}

### Octavos de final

${tablaMD(fasesEstado['Octavos'], COLS_F, HDRS_F)}

### Cuartos de final

${tablaMD(fasesEstado['Cuartos'], COLS_F, HDRS_F)}

### Semifinales

${tablaMD(fasesEstado['Semifinal'], COLS_F, HDRS_F)}

### Tercer Lugar y Final (pendientes de capturar)

${tablaMD([...fasesEstado['Tercer Lugar'], ...fasesEstado['Final']], COLS_F, HDRS_F)}

---

## 6. Trabajo en red en TIEMPO REAL (un equipo como servidor)

El requisito de que *“un equipo funcione como el servidor y los demás equipos
puedan realizar modificaciones en tiempo real y se vean los cambios”* está
resuelto con **Server-Sent Events (SSE)**:

- El equipo servidor ejecuta \`npm start\`; la consola imprime sus direcciones
  de red local (por ejemplo \`http://192.168.1.50:3000\`).
- Los demás equipos **solo abren esa dirección en su navegador**; no instalan
  nada. El indicador **“En vivo”** de la barra superior confirma la conexión.
- Cada navegador se suscribe a \`GET /api/eventos\`. Cuando cualquier cliente
  guarda un resultado, da un alta o regenera el cuadro, el servidor **difunde
  el evento a todos los conectados**: la vista activa de cada uno se actualiza
  sola y muestra una notificación (por ejemplo, *“⚡ Otro equipo capturó una
  llave de la fase final”*).
- Cada navegador envía un identificador propio (cabecera \`X-Cliente\`) para
  ignorar sus propios eventos; si el usuario está escribiendo en un campo, la
  recarga se pospone hasta que lo suelta, para no borrarle lo capturado.

\`\`\`mermaid
sequenceDiagram
    participant B as Equipo B (navegador)
    participant S as Equipo A (servidor Express + PostgreSQL)
    participant C as Equipo C (navegador)
    B->>S: GET /api/eventos (suscripción SSE)
    C->>S: GET /api/eventos (suscripción SSE)
    C->>S: PUT /api/fase-final/31/resultado {2-1}
    S->>S: Guarda marcador y propaga al ganador
    S-->>B: evento "resultado-fase-final" (SSE)
    S-->>C: evento (ignorado: es su propio cambio)
    B->>B: Actualiza la vista y muestra "⚡ Otro equipo..."
\`\`\`

---

## 7. Módulo de estadios ampliado

Cada estadio cumple los **mínimos solicitados** (nombre en cuadro emergente,
ubicación con Google Maps por latitud/longitud, equipos que jugarán, fechas,
horarios y costo de boletos) y ahora se amplió con **historia, año de apertura,
tipo de superficie, tipo de techo, equipo local, fases que alberga, costo de
boletos por fase y compartir en redes sociales**. Los partidos listados incluyen
también los de **eliminatorias** (por ejemplo, el Estadio Azteca tiene
**${partidosAzteca.length} partidos**, incluyendo fase final).

**Ejemplo de la información histórica capturada (Estadio Azteca):**

> ${azteca.descripcion}

### Los 16 estadios sede con su información ampliada

${tablaMD(estadios,
    ['nombre', 'ciudad', 'pais', 'capacidad', 'anio_apertura', 'superficie', 'techo', 'equipo_local'],
    ['Estadio', 'Ciudad', 'País', 'Capacidad', 'Apertura', 'Superficie', 'Techo', 'Equipo local'])}

---

## 8. Rediseño de las vistas

La interfaz se rediseñó por completo para atender la observación 4:

- **Tipografías** Outfit (títulos y cifras) e Inter (texto), vía Google Fonts.
- **Identidad visual de los 3 países sede**: fondo nocturno con gradientes en
  verde (México), azul (EE. UU.) y rojo (Canadá); franja tricolor en la barra
  superior y balón giratorio en el logotipo.
- **Portada** con gradientes animados, contadores animados y **cuenta regresiva
  en vivo a la Gran Final** (días, horas, minutos y segundos).
- **Navegación tipo píldora** con pestaña activa dorada e indicador **“En
  vivo”** del estado de la conexión en tiempo real.
- **Tarjetas con animaciones** (elevación al pasar el cursor) en selecciones,
  estadios y cifras del torneo.
- **Tablas** con encabezados destacados, filas cebra y los clasificados
  marcados con barra verde.
- **Estadios**: encabezado con gradiente del país sede y bandera en marca de
  agua, insignias de capacidad/año/partidos y reseña histórica resaltada.
- **Cuadro de eliminatorias** con llaves jugadas resaltadas, ganador en verde y
  marcadores con penales.
- **Módulo de resultados** con chips de fase (avance jugados/totales) y
  captura en línea con validación de penales.

---

## 9. Estado de los módulos del sistema

| # | Módulo | Estado |
|---|--------|--------|
| 1 | Inicio | ✔ Terminado |
| 2 | Confederaciones | ✔ Terminado |
| 3 | Selecciones | ✔ Terminado |
| 4 | Grupos | ✔ Terminado |
| 5 | Calendario | ✔ Terminado (incluye eliminatorias) |
| 6 | Clasificación | ✔ Terminado |
| 7 | Simulador | ✔ Terminado |
| 8 | **Resultados (nuevo)** | ✔ Terminado |
| 9 | Fase Final | ✔ Terminado (completo hasta la Final, con datos hasta Semifinales) |
| 10 | Estadios | ✔ Terminado (información ampliada) |
| 11 | Geolocalización | ✔ Terminado |
| 12 | Boletos | ✔ Terminado |
| 13 | Administrador | ✔ Terminado |
| 14 | Acerca del Proyecto | ✔ Terminado |

Adicionalmente, el **tiempo real multi-equipo** (sección 6) funciona de forma
transversal en todos los módulos que modifican datos.

---

## 10. Cómo ejecutar y probar el sistema

**Equipo servidor:**

\`\`\`bash
docker compose up -d      # 1) BD (carga schema + seed + fase final hasta semifinales)
npm install               # 2) Dependencias
npm start                 # 3) Servidor -> muestra las direcciones de red local
\`\`\`

**Demás equipos:** abrir en el navegador la dirección que muestra el servidor
(por ejemplo \`http://192.168.1.50:3000\`).

**Guion de demostración sugerido:**

1. Pestaña **Fase Final**: el torneo está jugado hasta Semifinales; el Tercer
   Lugar y la Final esperan resultado.
2. Pestaña **Resultados** → fase **Final**: capturar el marcador de la Final
   (si hay empate, el sistema pide penales). Todos los equipos conectados ven
   el campeón **al instante**.
3. Fase **Grupos**: corregir cualquier marcador; la notificación indica
   cuántas llaves de dieciseisavos se re-sembraron y las rondas posteriores
   afectadas se limpian en cascada (verificable en **Fase Final**).
4. Botón **“Simular ronda pendiente”** para volver a completar el torneo
   ronda por ronda.
5. Para regresar exactamente al estado de entrega:
   \`npm run entrega:estado\` (o \`npm run db:reset\` + reiniciar el servidor).

> Instalación alternativa sin Docker: ejecutar \`db/instalar.sql\` (esquema +
> datos + cuadro hasta semifinales) en una base nueva desde pgAdmin.
`;

fs.writeFileSync(path.join(root, 'docs', 'entrega-2.md'), doc);

// ============================================================================
//  HTML autocontenido (mismo formato que la entrega 1)
// ============================================================================
const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Entrega 2 - Mundial FIFA 2026</title>
<script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
<script type="module">
  import mermaid from 'https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.esm.min.mjs';
  window.__mermaid = mermaid;
</script>
<style>
  body { font-family: "Segoe UI", system-ui, sans-serif; max-width: 980px; margin: 0 auto;
         padding: 2rem; color: #1a2330; line-height: 1.55; }
  h1 { color: #00833f; border-bottom: 3px solid #00833f; padding-bottom: .3rem; }
  h2 { color: #002868; border-bottom: 1px solid #ccc; padding-bottom: .2rem; margin-top: 2rem; }
  h3 { color: #d52b1e; margin-top: 1.4rem; }
  table { border-collapse: collapse; width: 100%; margin: .8rem 0; font-size: .85rem; }
  th, td { border: 1px solid #cdd6e0; padding: .35rem .5rem; text-align: left; }
  th { background: #eef3f8; }
  code { background: #f0f3f7; padding: .1rem .3rem; border-radius: 3px; font-size: .85em; }
  pre { background: #0f1620; color: #e8eef5; padding: 1rem; border-radius: 8px; overflow-x: auto; font-size: .82rem; }
  pre code { background: none; color: inherit; }
  blockquote { border-left: 4px solid #f5c518; background: #fffbea; margin: .8rem 0;
               padding: .5rem .9rem; border-radius: 0 6px 6px 0; }
  .mermaid { background: #fff; text-align: center; margin: 1rem 0; }
  hr { border: none; border-top: 1px solid #ddd; margin: 1.5rem 0; }
  @media print {
    body { padding: 0; max-width: none; }
    .no-print { display: none; }
    table, .mermaid { page-break-inside: avoid; }
    pre { white-space: pre-wrap; word-wrap: break-word; }
  }
  .aviso { background: #fff8e1; border: 1px solid #f5c518; padding: .6rem 1rem; border-radius: 6px;
           font-size: .9rem; }
</style>
</head>
<body>
<div class="aviso no-print">Para generar el PDF: pulse <b>Ctrl + P</b> y elija <b>Guardar como PDF</b>.</div>
<div id="contenido"></div>
<script>
  const MD = ${JSON.stringify(doc)};
  document.getElementById('contenido').innerHTML = marked.parse(MD);
  document.querySelectorAll('code.language-mermaid').forEach((c) => {
    const div = document.createElement('div');
    div.className = 'mermaid';
    div.textContent = c.textContent;
    c.closest('pre').replaceWith(div);
  });
  const esperar = setInterval(() => {
    if (window.__mermaid) {
      clearInterval(esperar);
      window.__mermaid.initialize({ startOnLoad: false, theme: 'neutral' });
      window.__mermaid.run({ querySelector: '.mermaid' });
    }
  }, 60);
</script>
</body>
</html>
`;
fs.writeFileSync(path.join(root, 'docs', 'entrega-2.html'), html);

console.log('docs/entrega-2.md generado:', doc.length, 'caracteres');
console.log('docs/entrega-2.html generado.');
console.log('Llaves re-sembradas en la demo:', llavesResembradas.join(', '));
console.log('Estado de entrega restaurado (jugado hasta Semifinales).');
await pool.end();
