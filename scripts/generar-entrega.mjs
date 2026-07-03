// Ensambla el documento de la 1.a entrega (docs/entrega-1.md) tomando los datos
// directamente de la base de datos PostgreSQL.
// Uso: node scripts/generar-entrega.mjs
import fs from 'node:fs';
import path from 'node:path';
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
const lee = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const sinH1 = (txt) => txt.replace(/^#\s.*\n/, '');

const PORTADA = `# Copa Mundial FIFA 2026
## Sistema de Simulación, Administración y Geolocalización
### Primera Entrega — Base de Datos

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
| **Datos actualizados al** | 26 de junio de 2026 |

---

## Índice

1. Base de datos completa del sistema
2. Diagrama Entidad–Relación
3. Grupos capturados con su información
4. Consultas solicitadas en clase (con resultados)
5. Consultas adicionales (con resultados)

---
`;

const SECCION_ARQ = `## Arquitectura general del sistema

El sistema es una aplicación web full‑stack. El navegador consume una **API REST**
(Express) que aplica **Programación Orientada a Objetos** (modelos y servicios) sobre
una base de datos **PostgreSQL**.

\`\`\`mermaid
flowchart TD
    U["Usuario / Navegador"] -->|HTTP| F["Frontend SPA<br/>HTML + CSS + JS + Leaflet"]
    F -->|fetch JSON| API["API REST<br/>Express (src/routes)"]
    API --> SV["Servicios<br/>Clasificacion · FaseFinal · Estadisticas · Compartir"]
    API --> MD["Modelos POO<br/>BaseModel + entidades"]
    SV --> MD
    MD -->|node-postgres| DB[("PostgreSQL<br/>9 tablas · trigger · vistas")]
    F -.->|Geolocalizacion| GM["Leaflet / Google Maps"]
    F -.->|Compartir| RS["WhatsApp · Facebook · Instagram"]
\`\`\`

---
`;

const SECCION_BD = `## 1. Base de datos completa del sistema

La base de datos fue desarrollada en **PostgreSQL**. Se entregan los siguientes archivos:

- **\`db/schema.sql\`** — Estructura completa: 9 tablas, restricciones (PK, FK, CHECK, UNIQUE),
  una **columna generada** (\`dg = gf - gc\`), una **función almacenada**
  (\`fn_recalcular_clasificacion\`), un **trigger** que recalcula la tabla de posiciones
  automáticamente y tres **vistas** de apoyo.
- **\`db/seed.sql\`** — Datos **reales del Mundial 2026 al 26/06/2026**: **48 selecciones**
  (con geolocalización), **16 estadios** sede, **12 grupos**, **72 partidos** de la fase de grupos
  (**60 ya jugados** + 12 programados) y **20 boletos**. Los grupos A–F completaron las 3
  jornadas; los grupos G–L llevan 2 jornadas (la 3.ª queda programada).

### Tablas del sistema

| # | Tabla | Descripción |
|---|-------|-------------|
| 1 | \`continentes\` | Continentes y su confederación FIFA |
| 2 | \`selecciones\` | Selecciones nacionales con geolocalización (lat/lon de la capital) |
| 3 | \`grupos\` | 12 grupos (A–L) |
| 4 | \`estadios\` | Estadios sede en México, EE. UU. y Canadá con geolocalización |
| 5 | \`partidos\` | Partidos de la fase de grupos y de la fase final |
| 6 | \`clasificaciones\` | Tabla de posiciones por grupo (PJ, PG, PE, PP, GF, GC, DG, Pts) |
| 7 | \`fase_final\` | Cuadro de eliminatorias con sedes asignadas automáticamente |
| 8 | \`usuarios\` | Usuarios del sistema |
| 9 | \`boletos\` | Boletos comprados por los usuarios |

### Importación de la base de datos

\`\`\`bash
# Con Docker (recomendado): el contenedor carga schema.sql y seed.sql automáticamente
docker compose up -d

# O de forma manual sobre un PostgreSQL existente:
psql -U usuario -d mundial2026 -f db/schema.sql
psql -U usuario -d mundial2026 -f db/seed.sql
\`\`\`

---
`;

function tablaMD(rows, cols, headers) {
  let out = '| ' + headers.join(' | ') + ' |\n| ' + headers.map(() => '---').join(' | ') + ' |\n';
  for (const r of rows) out += '| ' + cols.map((c) => (r[c] == null ? '' : String(r[c]))).join(' | ') + ' |\n';
  return out;
}

async function seccionGrupos() {
  const { rows: grupos } = await pool.query('SELECT id, nombre FROM grupos ORDER BY nombre');
  let out = '## 3. Grupos capturados con su información\n\n';
  out += 'Se capturaron los **12 grupos** reales del Mundial 2026 (el examen pedía al menos 6), ';
  out += 'con las posiciones oficiales al **26/06/2026**. Los grupos A–F ya disputaron las 3 jornadas; ';
  out += 'los grupos G–L llevan 2 jornadas jugadas. Para cada selección se incluye su confederación, ranking FIFA, ';
  out += 'capital, geolocalización (latitud/longitud), historia, ventajas y desventajas. Debajo de cada grupo se ';
  out += 'muestra su tabla de posiciones calculada por el sistema.\n\n';

  for (const g of grupos) {
    const { rows: equipos } = await pool.query(`
      SELECT s.bandera, s.nombre, s.pais, co.confederacion, s.ranking, s.capital,
             s.latitud, s.longitud, s.historia, s.ventajas, s.desventajas
        FROM clasificaciones c
        JOIN selecciones s  ON s.id = c.id_seleccion
        JOIN continentes co ON co.id_continente = s.id_continente
       WHERE c.id_grupo = $1
       ORDER BY s.ranking`, [g.id]);

    out += `### Grupo ${g.nombre}\n\n`;
    out += tablaMD(equipos,
      ['bandera', 'nombre', 'pais', 'confederacion', 'ranking', 'capital', 'latitud', 'longitud'],
      ['Bandera', 'Selección', 'País', 'Confed.', 'Ranking', 'Capital', 'Latitud', 'Longitud']);
    out += '\n';
    for (const e of equipos) {
      out += `- **${e.bandera} ${e.nombre}** — ${e.historia} _Ventajas:_ ${e.ventajas} _Desventajas:_ ${e.desventajas}\n`;
    }
    out += '\n';

    const { rows: tabla } = await pool.query(`
      SELECT posicion, bandera, seleccion, pj, pg, pe, pp, gf, gc, dg, pts
        FROM v_clasificacion vc JOIN grupos gr ON gr.nombre = vc.grupo
       WHERE gr.id = $1 ORDER BY posicion`, [g.id]);
    out += `**Tabla de posiciones — Grupo ${g.nombre}:**\n\n`;
    out += tablaMD(tabla,
      ['posicion', 'bandera', 'seleccion', 'pj', 'pg', 'pe', 'pp', 'gf', 'gc', 'dg', 'pts'],
      ['Pos', 'Bandera', 'Selección', 'PJ', 'PG', 'PE', 'PP', 'GF', 'GC', 'DG', 'Pts']);
    out += '\n---\n\n';
  }
  return out;
}

const SECCION_ER = '## 2. Diagrama Entidad–Relación\n\n' + sinH1(lee('docs/diagrama-ER.md')) + '\n---\n\n';

// Consultas: tomamos el archivo ya generado y lo dividimos en solicitadas / adicionales
const consultas = sinH1(lee('docs/consultas-resultados.md'))
  .replace(/^>.*\n/gm, '')   // quitar las notas iniciales
  .trim();
const idxAdic = consultas.indexOf('## Adicional 1');
const solicitadas = consultas.slice(0, idxAdic).trim();
const adicionales = consultas.slice(idxAdic).trim();

const SECCION_4 = `## 4. Las 8 consultas solicitadas en clase (con resultados)\n\n${solicitadas}\n\n---\n\n`;
const SECCION_5 = `## 5. Consultas adicionales (con resultados)\n\n${adicionales}\n`;

const grupos = await seccionGrupos();
// Incrustar el script SQL completo de la base de datos dentro de la Seccion 1
const schemaSQL = lee('db/schema.sql').trim();
const SECCION_1 = SECCION_BD.replace(/\n---\n$/, '\n\n')
  + '### Script SQL completo de creación de la base de datos (`schema.sql`)\n\n'
  + 'A continuación se incluye el **script completo** que genera toda la base de datos en PostgreSQL '
  + '(las 9 tablas con sus restricciones PK/FK/CHECK/UNIQUE, la columna generada, la función almacenada, '
  + 'el disparador/trigger de clasificación y las vistas). Este mismo script se entrega como archivo '
  + '`db/schema.sql`, y junto con los datos en `db/instalar.sql`.\n\n'
  + '```sql\n' + schemaSQL + '\n```\n\n---\n\n';

const doc = PORTADA + '\n' + SECCION_1 + SECCION_ER + grupos + SECCION_4 + SECCION_5;
fs.writeFileSync(path.join(root, 'docs', 'entrega-1.md'), doc);
console.log('docs/entrega-1.md generado:', doc.length, 'caracteres');
await pool.end();
