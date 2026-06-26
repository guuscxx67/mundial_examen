import BaseModel from './BaseModel.js';

export default class Continente extends BaseModel {
  static tabla = 'continentes';
  static pk = 'id_continente';
  static columnas = ['nombre', 'confederacion', 'descripcion'];

  /** Paises agrupados por confederacion (consulta solicitada). */
  static async paisesPorConfederacion() {
    return this.run(`
      SELECT id_continente, continente, confederacion, pais, seleccion, ranking
        FROM v_paises
       ORDER BY confederacion, pais
    `);
  }
}
