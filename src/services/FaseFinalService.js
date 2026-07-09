// ============================================================================
//  FaseFinalService
//  Genera el cuadro de eliminatorias a partir de la tabla de posiciones y
//  ASIGNA AUTOMATICAMENTE LAS SEDES (requisito: "Despues de la fase de grupos
//  se asignara automaticamente las Sedes").
//
//  Formato Mundial 2026 (48 equipos): clasifican los 2 primeros de cada grupo
//  (24) + los 8 mejores terceros = 32 equipos -> Dieciseisavos de final.
//
//  Ademas administra los RESULTADOS de la fase final:
//   - registrarResultado(): guarda marcador (y penales si hay empate) y
//     PROPAGA al ganador a la siguiente ronda (D -> O -> C -> S -> F, y los
//     perdedores de semifinal al Tercer Lugar).
//   - sincronizarDieciseisavos(): cuando el administrador modifica un
//     resultado de la fase de grupos, recalcula los 32 clasificados y
//     actualiza las llaves de dieciseisavos (y todo lo que dependa de ellas),
//     de modo que se VEA como un cambio en grupos repercute hasta la fase
//     final.
// ============================================================================
import { pool } from '../db/pool.js';

const ROL_FECHAS = {
  Dieciseisavos: ['2026-06-28', '2026-06-29', '2026-06-30', '2026-07-01'],
  Octavos: ['2026-07-03', '2026-07-04', '2026-07-05', '2026-07-06'],
  Cuartos: ['2026-07-09', '2026-07-10', '2026-07-11'],
  Semifinal: ['2026-07-14', '2026-07-15'],
  'Tercer Lugar': ['2026-07-18'],
  Final: ['2026-07-19'],
};
const HORARIOS = ['12:00', '16:00', '19:00'];

// Alimentadores de cada llave: [llaveLocal, llaveVisitante, 'ganador'|'perdedor']
const FEEDERS = {};
for (let i = 1; i <= 8; i++) FEEDERS[`O${i}`] = [`D${2 * i - 1}`, `D${2 * i}`, 'ganador'];
for (let i = 1; i <= 4; i++) FEEDERS[`C${i}`] = [`O${2 * i - 1}`, `O${2 * i}`, 'ganador'];
for (let i = 1; i <= 2; i++) FEEDERS[`S${i}`] = [`C${2 * i - 1}`, `C${2 * i}`, 'ganador'];
FEEDERS['T1'] = ['S1', 'S2', 'perdedor'];
FEEDERS['F1'] = ['S1', 'S2', 'ganador'];

const ORDEN_LLAVES = [
  ...Array.from({ length: 8 }, (_, i) => `O${i + 1}`),
  ...Array.from({ length: 4 }, (_, i) => `C${i + 1}`),
  'S1', 'S2', 'T1', 'F1',
];

export default class FaseFinalService {
  /** Devuelve la clasificacion con id de seleccion y posicion por grupo. */
  static async _posiciones() {
    const { rows } = await pool.query(`
      SELECT c.id_grupo, g.nombre AS grupo, s.id AS id_seleccion,
             s.nombre, s.bandera, c.pts, c.dg, c.gf,
             RANK() OVER (PARTITION BY c.id_grupo
                          ORDER BY c.pts DESC, c.dg DESC, c.gf DESC) AS posicion
        FROM clasificaciones c
        JOIN grupos g      ON g.id = c.id_grupo
        JOIN selecciones s ON s.id = c.id_seleccion
    `);
    return rows.map((r) => ({ ...r, posicion: Number(r.posicion) }));
  }

  /** Los 32 clasificados en orden de siembra (1ros, 2dos, mejores 3ros). */
  static async _clasificados() {
    const posiciones = await this._posiciones();
    const orden = (a, b) => b.pts - a.pts || b.dg - a.dg || b.gf - a.gf;
    const primeros = posiciones.filter((p) => p.posicion === 1).sort(orden);
    const segundos = posiciones.filter((p) => p.posicion === 2).sort(orden);
    const terceros = posiciones.filter((p) => p.posicion === 3).sort(orden).slice(0, 8);
    return [...primeros, ...segundos, ...terceros];
  }

  /** Emparejamientos de dieciseisavos: siembra fuerte vs debil (1-32, 2-31, ...). */
  static _emparejar(clasificados) {
    const llaves = [];
    for (let i = 0; i < 16; i++) {
      llaves.push({
        llave: `D${i + 1}`,
        id_local: clasificados[i].id_seleccion,
        id_visitante: clasificados[31 - i].id_seleccion,
      });
    }
    return llaves;
  }

  /**
   * Genera (o regenera) el cuadro completo de la fase final.
   * Asigna sedes automaticamente rotando los estadios disponibles.
   */
  static async generar() {
    const clasificados = await this._clasificados();
    if (clasificados.length < 32) {
      throw new Error(`Aun no hay 32 clasificados (hay ${clasificados.length}). Completa la fase de grupos.`);
    }

    // Estadios ordenados por capacidad (la Final en el mas grande)
    const { rows: estadios } = await pool.query('SELECT id, nombre, capacidad FROM estadios ORDER BY capacidad DESC');

    await pool.query('DELETE FROM fase_final');

    let sedeIdx = 0;
    const tomarSede = () => estadios[(sedeIdx++) % estadios.length].id;
    const insertar = async (fase, llave, idL, idV, idEstadio, fecha, horario) => {
      await pool.query(`
        INSERT INTO fase_final (nombre_fase, llave, id_seleccion_local, id_seleccion_visitante, id_estadio, fecha, horario)
        VALUES ($1,$2,$3,$4,$5,$6,$7)
      `, [fase, llave, idL, idV, idEstadio, fecha, horario]);
    };

    // Dieciseisavos: sembrado fuerte vs debil (1-32, 2-31, ...)
    const fechasD = ROL_FECHAS.Dieciseisavos;
    const pares = this._emparejar(clasificados);
    for (let i = 0; i < pares.length; i++) {
      await insertar(
        'Dieciseisavos', pares[i].llave,
        pares[i].id_local, pares[i].id_visitante,
        tomarSede(), fechasD[i % fechasD.length], HORARIOS[i % HORARIOS.length],
      );
    }

    // Rondas siguientes: estructura con sede asignada (equipos por definir)
    const rondas = [
      ['Octavos', 8],
      ['Cuartos', 4],
      ['Semifinal', 2],
      ['Tercer Lugar', 1],
      ['Final', 1],
    ];
    for (const [fase, n] of rondas) {
      const fechas = ROL_FECHAS[fase];
      // La Final y el 3er lugar usan los estadios de mayor capacidad
      for (let i = 0; i < n; i++) {
        const idEstadio = (fase === 'Final')
          ? estadios[0].id
          : (fase === 'Tercer Lugar' ? estadios[1].id : tomarSede());
        await insertar(
          fase, `${fase[0]}${i + 1}`,
          null, null, idEstadio,
          fechas[i % fechas.length], HORARIOS[i % HORARIOS.length],
        );
      }
    }

    return { clasificados: clasificados.length, mensaje: 'Cuadro de fase final generado con sedes asignadas automaticamente.' };
  }

  // --------------------------------------------------------------------------
  //  Resultados y propagacion
  // --------------------------------------------------------------------------

  static _ganador(m) {
    if (!m || !m.jugado || m.id_seleccion_local == null || m.id_seleccion_visitante == null) return null;
    if (m.goles_local > m.goles_visitante) return m.id_seleccion_local;
    if (m.goles_visitante > m.goles_local) return m.id_seleccion_visitante;
    if (m.penales_local == null || m.penales_visitante == null) return null;
    return m.penales_local > m.penales_visitante ? m.id_seleccion_local : m.id_seleccion_visitante;
  }

  static _perdedor(m) {
    const g = this._ganador(m);
    if (g == null) return null;
    return g === m.id_seleccion_local ? m.id_seleccion_visitante : m.id_seleccion_local;
  }

  /**
   * Recorre el cuadro y coloca en cada llave a los equipos que salen de sus
   * llaves alimentadoras (ganadores, o perdedores para el Tercer Lugar).
   * Si el equipo esperado cambia, la llave se actualiza y su resultado se
   * borra (porque el partido ya no es el mismo). Devuelve las llaves tocadas.
   */
  static async propagar() {
    const { rows } = await pool.query('SELECT * FROM fase_final');
    if (!rows.length) return [];
    const porLlave = Object.fromEntries(rows.map((r) => [r.llave, r]));
    const tocadas = [];

    for (const llave of ORDEN_LLAVES) {
      const m = porLlave[llave];
      const feed = FEEDERS[llave];
      if (!m || !feed) continue;
      const [fA, fB, tipo] = feed;
      const saca = (f) => (tipo === 'perdedor' ? this._perdedor(porLlave[f]) : this._ganador(porLlave[f]));
      const espL = saca(fA);
      const espV = saca(fB);

      if (m.id_seleccion_local !== espL || m.id_seleccion_visitante !== espV) {
        await pool.query(`
          UPDATE fase_final
             SET id_seleccion_local = $2, id_seleccion_visitante = $3,
                 goles_local = NULL, goles_visitante = NULL,
                 penales_local = NULL, penales_visitante = NULL, jugado = FALSE
           WHERE id = $1
        `, [m.id, espL, espV]);
        // Reflejar el cambio en memoria para que la cascada continue
        Object.assign(m, {
          id_seleccion_local: espL, id_seleccion_visitante: espV,
          goles_local: null, goles_visitante: null,
          penales_local: null, penales_visitante: null, jugado: false,
        });
        tocadas.push(llave);
      }
    }
    return tocadas;
  }

  /**
   * Registra el resultado de un partido de la fase final. Si hay empate se
   * exige definicion por penales. Luego propaga ganadores/perdedores a las
   * rondas siguientes.
   */
  static async registrarResultado(id, golesLocal, golesVisitante, penalesLocal = null, penalesVisitante = null) {
    const gl = Number(golesLocal), gv = Number(golesVisitante);
    if (!Number.isInteger(gl) || !Number.isInteger(gv) || gl < 0 || gv < 0) {
      throw new Error('Marcador invalido.');
    }
    const { rows } = await pool.query('SELECT * FROM fase_final WHERE id = $1', [id]);
    const m = rows[0];
    if (!m) return null;
    if (m.id_seleccion_local == null || m.id_seleccion_visitante == null) {
      throw new Error('Esta llave aun no tiene equipos definidos: captura primero la ronda anterior.');
    }

    let pl = null, pv = null;
    if (gl === gv) {
      pl = Number(penalesLocal); pv = Number(penalesVisitante);
      if (!Number.isInteger(pl) || !Number.isInteger(pv) || pl < 0 || pv < 0 || pl === pv) {
        throw new Error('En eliminatorias un empate se define por penales: captura penales distintos para cada equipo.');
      }
    }

    await pool.query(`
      UPDATE fase_final
         SET goles_local = $2, goles_visitante = $3,
             penales_local = $4, penales_visitante = $5, jugado = TRUE
       WHERE id = $1
    `, [id, gl, gv, pl, pv]);

    const tocadas = await this.propagar();
    return { id: m.id, llave: m.llave, nombre_fase: m.nombre_fase, llaves_actualizadas: tocadas };
  }

  /**
   * Recalcula los 32 clasificados y actualiza las llaves de dieciseisavos
   * tras un cambio en la fase de grupos. No toca las sedes ya asignadas.
   * Devuelve null si el cuadro aun no existe.
   */
  static async sincronizarDieciseisavos() {
    const { rows } = await pool.query("SELECT * FROM fase_final WHERE nombre_fase = 'Dieciseisavos'");
    if (!rows.length) return null;

    const clasificados = await this._clasificados();
    if (clasificados.length < 32) return null;

    const pares = this._emparejar(clasificados);
    const porLlave = Object.fromEntries(rows.map((r) => [r.llave, r]));
    const cambiadas = [];

    for (const p of pares) {
      const m = porLlave[p.llave];
      if (!m) continue;
      if (m.id_seleccion_local !== p.id_local || m.id_seleccion_visitante !== p.id_visitante) {
        await pool.query(`
          UPDATE fase_final
             SET id_seleccion_local = $2, id_seleccion_visitante = $3,
                 goles_local = NULL, goles_visitante = NULL,
                 penales_local = NULL, penales_visitante = NULL, jugado = FALSE
           WHERE id = $1
        `, [m.id, p.id_local, p.id_visitante]);
        cambiadas.push(p.llave);
      }
    }

    const propagadas = await this.propagar();
    return { llaves_dieciseisavos: cambiadas, llaves_propagadas: propagadas };
  }

  /**
   * Simula (marcadores aleatorios) todos los partidos pendientes de la
   * primera ronda que tenga equipos definidos y llaves sin jugar.
   */
  static async simularRondaPendiente() {
    const { rows } = await pool.query(`
      SELECT * FROM fase_final
       WHERE jugado = FALSE
         AND id_seleccion_local IS NOT NULL
         AND id_seleccion_visitante IS NOT NULL
       ORDER BY id
    `);
    if (!rows.length) throw new Error('No hay llaves pendientes con equipos definidos. Genera el cuadro o captura la ronda anterior.');

    const fase = rows[0].nombre_fase;
    const deFase = rows.filter((r) => r.nombre_fase === fase);
    for (const m of deFase) {
      const gl = Math.floor(Math.random() * 4);
      const gv = Math.floor(Math.random() * 4);
      let pl = null, pv = null;
      if (gl === gv) {
        pl = 3 + Math.floor(Math.random() * 3);
        pv = pl + (Math.random() < 0.5 ? 1 : -1);
      }
      await pool.query(`
        UPDATE fase_final
           SET goles_local = $2, goles_visitante = $3,
               penales_local = $4, penales_visitante = $5, jugado = TRUE
         WHERE id = $1
      `, [m.id, gl, gv, pl, pv]);
    }
    await this.propagar();
    return { fase, simulados: deFase.length };
  }
}
