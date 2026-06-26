import BaseModel from './BaseModel.js';

export default class Clasificacion extends BaseModel {
  static tabla = 'clasificaciones';
  static pk = 'id';
  static columnas = ['id_grupo', 'id_seleccion', 'pj', 'pg', 'pe', 'pp', 'gf', 'gc', 'pts'];

  /** Tabla de posiciones global ordenada (todas las posiciones de la vista). */
  static async general() {
    return this.run('SELECT * FROM v_clasificacion ORDER BY grupo, posicion');
  }

  /** Clasificados directos (1ro y 2do de cada grupo). */
  static async clasificados() {
    return this.run(`
      SELECT * FROM v_clasificacion
       WHERE posicion <= 2
       ORDER BY grupo, posicion
    `);
  }
}
