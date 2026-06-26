import BaseModel from './BaseModel.js';

export default class Seleccion extends BaseModel {
  static tabla = 'selecciones';
  static pk = 'id';
  static columnas = [
    'nombre', 'id_continente', 'pais', 'capital', 'historia',
    'ventajas', 'desventajas', 'ranking', 'bandera', 'latitud', 'longitud',
  ];

  /** Selecciones con su continente y confederacion. */
  static async conContinente() {
    return this.run(`
      SELECT s.id, s.nombre, s.pais, s.bandera, s.ranking,
             s.latitud, s.longitud, s.historia, s.ventajas, s.desventajas,
             co.nombre AS continente, co.confederacion
        FROM selecciones s
        JOIN continentes co ON co.id_continente = s.id_continente
       ORDER BY s.nombre
    `);
  }

  /** Mejores N selecciones por ranking FIFA (consulta solicitada). */
  static async mejoresRankeados(limite = 10) {
    return this.run(`
      SELECT s.id, s.nombre AS seleccion, s.bandera,
             co.nombre AS continente, co.confederacion,
             s.historia, s.ventajas, s.desventajas, s.ranking
        FROM selecciones s
        JOIN continentes co ON co.id_continente = s.id_continente
       ORDER BY s.ranking ASC
       LIMIT $1
    `, [limite]);
  }
}
