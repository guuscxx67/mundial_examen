// ============================================================================
//  EstadisticasService  -  Estadisticas del torneo (requisito "Estadisticas")
// ============================================================================
import { pool } from '../db/pool.js';

export default class EstadisticasService {
  /** Resumen general del torneo. */
  static async resumen() {
    const { rows } = await pool.query(`
      SELECT
        (SELECT COUNT(*) FROM selecciones)                         AS total_selecciones,
        (SELECT COUNT(*) FROM estadios)                            AS total_estadios,
        (SELECT COUNT(*) FROM partidos WHERE jugado)               AS partidos_jugados,
        (SELECT COALESCE(SUM(goles_local + goles_visitante),0)
           FROM partidos WHERE jugado)                             AS goles_totales,
        ROUND((SELECT AVG(goles_local + goles_visitante)
           FROM partidos WHERE jugado), 2)                         AS promedio_goles_partido
    `);
    return rows[0];
  }

  /** Selecciones mas goleadoras (goles a favor en fase de grupos). */
  static async maximosGoleadores(limite = 10) {
    const { rows } = await pool.query(`
      SELECT s.nombre AS seleccion, s.bandera, SUM(c.gf) AS goles_favor
        FROM clasificaciones c
        JOIN selecciones s ON s.id = c.id_seleccion
       GROUP BY s.nombre, s.bandera
       ORDER BY goles_favor DESC, seleccion
       LIMIT $1
    `, [limite]);
    return rows;
  }

  /** Mejores defensas (menos goles en contra). */
  static async mejoresDefensas(limite = 10) {
    const { rows } = await pool.query(`
      SELECT s.nombre AS seleccion, s.bandera, SUM(c.gc) AS goles_contra
        FROM clasificaciones c
        JOIN selecciones s ON s.id = c.id_seleccion
       GROUP BY s.nombre, s.bandera
       ORDER BY goles_contra ASC, seleccion
       LIMIT $1
    `, [limite]);
    return rows;
  }

  /** Partidos con mas goles. */
  static async partidosMasGoleados(limite = 10) {
    const { rows } = await pool.query(`
      SELECT local, visitante, goles_local, goles_visitante,
             (goles_local + goles_visitante) AS total_goles, estadio, fecha
        FROM v_partidos
       WHERE jugado
       ORDER BY total_goles DESC, fecha
       LIMIT $1
    `, [limite]);
    return rows;
  }

  /** Goles y partidos por confederacion. */
  static async porConfederacion() {
    const { rows } = await pool.query(`
      SELECT co.confederacion,
             COUNT(DISTINCT s.id) AS selecciones,
             SUM(c.gf)            AS goles_favor,
             SUM(c.pts)           AS puntos_totales
        FROM clasificaciones c
        JOIN selecciones s  ON s.id = c.id_seleccion
        JOIN continentes co ON co.id_continente = s.id_continente
       GROUP BY co.confederacion
       ORDER BY goles_favor DESC
    `);
    return rows;
  }
}
