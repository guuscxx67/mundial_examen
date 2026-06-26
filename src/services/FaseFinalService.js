// ============================================================================
//  FaseFinalService
//  Genera el cuadro de eliminatorias a partir de la tabla de posiciones y
//  ASIGNA AUTOMATICAMENTE LAS SEDES (requisito: "Despues de la fase de grupos
//  se asignara automaticamente las Sedes").
//
//  Formato Mundial 2026 (48 equipos): clasifican los 2 primeros de cada grupo
//  (24) + los 8 mejores terceros = 32 equipos -> Dieciseisavos de final.
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

  /**
   * Genera (o regenera) el cuadro completo de la fase final.
   * Asigna sedes automaticamente rotando los estadios disponibles.
   */
  static async generar() {
    const posiciones = await this._posiciones();
    const orden = (a, b) => b.pts - a.pts || b.dg - a.dg || b.gf - a.gf;

    const primeros = posiciones.filter((p) => p.posicion === 1).sort(orden);
    const segundos = posiciones.filter((p) => p.posicion === 2).sort(orden);
    const terceros = posiciones.filter((p) => p.posicion === 3).sort(orden).slice(0, 8);

    const clasificados = [...primeros, ...segundos, ...terceros]; // 32 sembrados
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
    for (let i = 0; i < 16; i++) {
      const local = clasificados[i];
      const visitante = clasificados[31 - i];
      await insertar(
        'Dieciseisavos', `D${i + 1}`,
        local.id_seleccion, visitante.id_seleccion,
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
}
