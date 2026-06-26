import BaseModel from './BaseModel.js';

export default class Partido extends BaseModel {
  static tabla = 'partidos';
  static pk = 'id';
  static columnas = [
    'fase', 'id_grupo', 'id_equipo_local', 'id_equipo_visitante',
    'goles_local', 'goles_visitante', 'fecha', 'horario', 'id_estadio', 'jugado',
  ];

  /** Todos los partidos con nombres (vista v_partidos). */
  static async detallados(fase = null) {
    if (fase) {
      return this.run('SELECT * FROM v_partidos WHERE fase = $1 ORDER BY fecha, horario', [fase]);
    }
    return this.run('SELECT * FROM v_partidos ORDER BY fecha, horario');
  }

  /**
   * Registra el resultado de un partido. El trigger de la BD recalcula
   * automaticamente la tabla de posiciones del grupo afectado.
   */
  static async registrarResultado(id, golesLocal, golesVisitante) {
    const rows = await this.run(`
      UPDATE partidos
         SET goles_local = $2, goles_visitante = $3, jugado = TRUE
       WHERE id = $1
       RETURNING *
    `, [id, golesLocal, golesVisitante]);
    return rows[0] || null;
  }
}
