// ============================================================================
//  ClasificacionService
//  Algoritmo de clasificacion implementado en la aplicacion (ademas del
//  trigger en la BD). Demuestra el uso de ESTRUCTURAS DE DATOS (Map) y un
//  ALGORITMO DE ORDENAMIENTO con criterios de desempate.
// ============================================================================
import { pool } from '../db/pool.js';

/** Fila de la tabla de posiciones de un equipo. */
class FilaPosicion {
  constructor(idSeleccion, nombre, bandera) {
    this.id_seleccion = idSeleccion;
    this.seleccion = nombre;
    this.bandera = bandera;
    this.pj = 0; this.pg = 0; this.pe = 0; this.pp = 0;
    this.gf = 0; this.gc = 0; this.pts = 0;
  }
  get dg() { return this.gf - this.gc; }

  registrar(golesFavor, golesContra) {
    this.pj += 1;
    this.gf += golesFavor;
    this.gc += golesContra;
    if (golesFavor > golesContra) { this.pg += 1; this.pts += 3; }
    else if (golesFavor === golesContra) { this.pe += 1; this.pts += 1; }
    else { this.pp += 1; }
  }
}

export default class ClasificacionService {
  /**
   * Calcula la tabla de posiciones de un grupo a partir de sus partidos.
   * Estructura de datos: Map<idSeleccion, FilaPosicion>.
   * Desempate: Puntos -> Diferencia de goles -> Goles a favor -> nombre.
   */
  static async calcularGrupo(idGrupo) {
    // Equipos del grupo
    const { rows: equipos } = await pool.query(`
      SELECT s.id, s.nombre, s.bandera
        FROM clasificaciones c
        JOIN selecciones s ON s.id = c.id_seleccion
       WHERE c.id_grupo = $1
    `, [idGrupo]);

    const tabla = new Map();
    for (const e of equipos) tabla.set(e.id, new FilaPosicion(e.id, e.nombre, e.bandera));

    // Partidos jugados del grupo
    const { rows: partidos } = await pool.query(`
      SELECT id_equipo_local, id_equipo_visitante, goles_local, goles_visitante
        FROM partidos
       WHERE id_grupo = $1 AND jugado = TRUE
    `, [idGrupo]);

    for (const p of partidos) {
      tabla.get(p.id_equipo_local)?.registrar(p.goles_local, p.goles_visitante);
      tabla.get(p.id_equipo_visitante)?.registrar(p.goles_visitante, p.goles_local);
    }

    // Ordenamiento con criterios de desempate
    const filas = [...tabla.values()].sort((a, b) =>
      b.pts - a.pts ||
      b.dg - a.dg ||
      b.gf - a.gf ||
      a.seleccion.localeCompare(b.seleccion)
    );

    return filas.map((f, i) => ({
      posicion: i + 1,
      ...f,
      dg: f.dg,
    }));
  }

  /** Fuerza el recalculo en la BD (invoca la funcion almacenada). */
  static async recalcularEnBD(idGrupo) {
    await pool.query('SELECT fn_recalcular_clasificacion($1)', [idGrupo]);
  }
}
