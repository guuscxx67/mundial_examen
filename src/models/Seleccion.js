import BaseModel from './BaseModel.js';

export default class Seleccion extends BaseModel {
  static tabla = 'selecciones';
  static pk = 'id';
  static columnas = [
    'nombre', 'id_continente', 'pais', 'capital', 'historia',
    'ventajas', 'desventajas', 'entrenador', 'ranking', 'bandera',
    'latitud', 'longitud',
  ];

  /** Selecciones con su continente y confederacion. */
  static async conContinente() {
    return this.run(`
      SELECT s.id, s.nombre, s.pais, s.bandera, s.ranking, s.capital,
             s.latitud, s.longitud, s.historia, s.ventajas, s.desventajas,
             s.entrenador, co.nombre AS continente, co.confederacion
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
             s.historia, s.ventajas, s.desventajas, s.entrenador, s.ranking
        FROM selecciones s
        JOIN continentes co ON co.id_continente = s.id_continente
       ORDER BY s.ranking ASC
       LIMIT $1
    `, [limite]);
  }

  /**
   * Perfil completo de una seleccion para el "cuadro emergente" de la vista
   * Confederaciones: datos, confederacion, grupo y estadios donde juega
   * (con su geolocalizacion para el enlace a Google Maps).
   */
  static async perfil(id) {
    const base = await this.run(`
      SELECT s.id, s.nombre, s.pais, s.capital, s.bandera, s.ranking,
             s.historia, s.ventajas, s.desventajas, s.entrenador,
             s.latitud, s.longitud,
             co.nombre AS continente, co.confederacion,
             g.nombre  AS grupo
        FROM selecciones s
        JOIN continentes co ON co.id_continente = s.id_continente
        LEFT JOIN clasificaciones c ON c.id_seleccion = s.id
        LEFT JOIN grupos g          ON g.id = c.id_grupo
       WHERE s.id = $1
    `, [id]);
    if (!base.length) return null;

    // Estadios donde juega esta seleccion (como local o visitante)
    const estadios = await this.run(`
      SELECT e.id, e.nombre, e.ciudad, e.pais, e.latitud, e.longitud,
             p.fecha, p.horario, p.fase,
             CASE WHEN p.id_equipo_local = $1 THEN sv.nombre  ELSE sl.nombre  END AS rival,
             CASE WHEN p.id_equipo_local = $1 THEN sv.bandera ELSE sl.bandera END AS rival_bandera
        FROM partidos p
        JOIN estadios    e  ON e.id = p.id_estadio
        JOIN selecciones sl ON sl.id = p.id_equipo_local
        JOIN selecciones sv ON sv.id = p.id_equipo_visitante
       WHERE p.id_equipo_local = $1 OR p.id_equipo_visitante = $1
       ORDER BY p.fecha, p.horario
    `, [id]);

    return { ...base[0], estadios };
  }
}
