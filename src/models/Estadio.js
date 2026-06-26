import BaseModel from './BaseModel.js';

export default class Estadio extends BaseModel {
  static tabla = 'estadios';
  static pk = 'id';
  static columnas = ['nombre', 'ciudad', 'pais', 'latitud', 'longitud', 'capacidad'];

  /** Estadios ordenados por capacidad (descendente). */
  static async porCapacidad() {
    return this.run('SELECT * FROM estadios ORDER BY capacidad DESC');
  }

  /** Partidos programados en un estadio. */
  static async partidos(idEstadio) {
    return this.run('SELECT * FROM v_partidos WHERE estadio = (SELECT nombre FROM estadios WHERE id = $1) ORDER BY fecha, horario', [idEstadio]);
  }
}
