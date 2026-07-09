import BaseModel from './BaseModel.js';

export default class Estadio extends BaseModel {
  static tabla = 'estadios';
  static pk = 'id';
  static columnas = [
    'nombre', 'ciudad', 'pais', 'latitud', 'longitud', 'capacidad',
    'descripcion', 'anio_apertura', 'superficie', 'techo', 'equipo_local',
  ];

  /** Estadios ordenados por capacidad (descendente). */
  static async porCapacidad() {
    return this.run('SELECT * FROM estadios ORDER BY capacidad DESC');
  }

  /** Partidos programados en un estadio (fase de grupos + eliminatorias). */
  static async partidos(idEstadio) {
    return this.run(`
      SELECT p.fase,
             sl.nombre AS local, sl.bandera AS bandera_local,
             sv.nombre AS visitante, sv.bandera AS bandera_visitante,
             p.goles_local, p.goles_visitante, p.fecha, p.horario, p.jugado
        FROM partidos p
        JOIN selecciones sl ON sl.id = p.id_equipo_local
        JOIN selecciones sv ON sv.id = p.id_equipo_visitante
       WHERE p.id_estadio = $1
      UNION ALL
      SELECT ff.nombre_fase,
             COALESCE(sl.nombre, 'Por definir'), sl.bandera,
             COALESCE(sv.nombre, 'Por definir'), sv.bandera,
             ff.goles_local, ff.goles_visitante, ff.fecha, ff.horario, ff.jugado
        FROM fase_final ff
        LEFT JOIN selecciones sl ON sl.id = ff.id_seleccion_local
        LEFT JOIN selecciones sv ON sv.id = ff.id_seleccion_visitante
       WHERE ff.id_estadio = $1
       ORDER BY fecha, horario
    `, [idEstadio]);
  }
}
