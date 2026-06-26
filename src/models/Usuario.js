import BaseModel from './BaseModel.js';

export default class Usuario extends BaseModel {
  static tabla = 'usuarios';
  static pk = 'id';
  static columnas = ['nombre', 'email'];

  /** Boletos de un usuario con detalle de estadio y seleccion. */
  static async boletos(idUsuario) {
    return this.run(`
      SELECT b.id, b.dia, b.fecha, b.horario, b.costo,
             e.nombre AS estadio, e.ciudad, e.pais,
             s.nombre AS seleccion, s.bandera
        FROM boletos b
        JOIN estadios e    ON e.id = b.id_estadio
        LEFT JOIN selecciones s ON s.id = b.id_seleccion
       WHERE b.id_usuario = $1
       ORDER BY b.fecha, b.horario
    `, [idUsuario]);
  }
}
