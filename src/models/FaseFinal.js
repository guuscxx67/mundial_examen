import BaseModel from './BaseModel.js';

export default class FaseFinal extends BaseModel {
  static tabla = 'fase_final';
  static pk = 'id';
  static columnas = [
    'nombre_fase', 'llave', 'id_seleccion_local', 'id_seleccion_visitante',
    'id_estadio', 'fecha', 'horario', 'id_partido',
  ];

  /** Cuadro de eliminatorias con nombres de selecciones y sede. */
  static async cuadro() {
    return this.run(`
      SELECT ff.id, ff.nombre_fase, ff.llave,
             sl.nombre AS local, sl.bandera AS bandera_local,
             sv.nombre AS visitante, sv.bandera AS bandera_visitante,
             e.nombre AS estadio, e.ciudad, e.pais, e.latitud, e.longitud,
             ff.fecha, ff.horario,
             ff.goles_local, ff.goles_visitante,
             ff.penales_local, ff.penales_visitante, ff.jugado
        FROM fase_final ff
        LEFT JOIN selecciones sl ON sl.id = ff.id_seleccion_local
        LEFT JOIN selecciones sv ON sv.id = ff.id_seleccion_visitante
        LEFT JOIN estadios e     ON e.id = ff.id_estadio
       ORDER BY ff.id
    `);
  }

  /** Borra todo el cuadro (para regenerarlo). */
  static async limpiar() {
    await this.run('DELETE FROM fase_final');
  }
}
