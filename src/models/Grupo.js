import BaseModel from './BaseModel.js';

export default class Grupo extends BaseModel {
  static tabla = 'grupos';
  static pk = 'id';
  static columnas = ['nombre'];

  /** Tabla de posiciones ordenada de un grupo (usa la vista v_clasificacion). */
  static async clasificacion(idGrupo) {
    return this.run(`
      SELECT vc.* FROM v_clasificacion vc
        JOIN grupos g ON g.nombre = vc.grupo
       WHERE g.id = $1
       ORDER BY vc.posicion
    `, [idGrupo]);
  }

  /** Selecciones que integran un grupo, con su geolocalizacion. */
  static async selecciones(idGrupo) {
    return this.run(`
      SELECT s.id, s.nombre, s.bandera, s.ranking, s.latitud, s.longitud,
             co.confederacion
        FROM clasificaciones c
        JOIN selecciones s  ON s.id = c.id_seleccion
        JOIN continentes co ON co.id_continente = s.id_continente
       WHERE c.id_grupo = $1
       ORDER BY s.ranking
    `, [idGrupo]);
  }

  /** Asigna una seleccion a un grupo (alta de "Asignacion de grupos"). */
  static async asignarSeleccion(idGrupo, idSeleccion) {
    const rows = await this.run(`
      INSERT INTO clasificaciones (id_grupo, id_seleccion)
      VALUES ($1, $2)
      ON CONFLICT (id_grupo, id_seleccion) DO NOTHING
      RETURNING *
    `, [idGrupo, idSeleccion]);
    return rows[0] || null;
  }
}
