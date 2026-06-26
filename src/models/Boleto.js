import BaseModel from './BaseModel.js';

export default class Boleto extends BaseModel {
  static tabla = 'boletos';
  static pk = 'id';
  static columnas = [
    'id_usuario', 'id_estadio', 'id_partido', 'id_seleccion',
    'dia', 'fecha', 'horario', 'costo',
  ];

  /** Boletos con todo el detalle (usuario, estadio, seleccion, partido). */
  static async detallados() {
    return this.run(`
      SELECT b.id, u.nombre AS usuario,
             e.nombre AS estadio, e.ciudad, e.pais,
             e.latitud, e.longitud, e.capacidad,
             s.nombre AS seleccion, s.bandera,
             b.dia, b.fecha, b.horario, b.costo
        FROM boletos b
        JOIN usuarios u    ON u.id = b.id_usuario
        JOIN estadios e    ON e.id = b.id_estadio
        LEFT JOIN selecciones s ON s.id = b.id_seleccion
       ORDER BY b.fecha, b.horario
    `);
  }
}
