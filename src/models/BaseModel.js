// ============================================================================
//  BaseModel  -  Clase base (Programacion Orientada a Objetos)
//  Implementa el patron Repositorio: operaciones CRUD genericas reutilizables
//  por todos los modelos del dominio mediante herencia.
// ============================================================================
import { pool } from '../db/pool.js';

export default class BaseModel {
  /** Nombre de la tabla en la BD (lo sobreescribe cada subclase). */
  static tabla = '';
  /** Llave primaria. */
  static pk = 'id';
  /** Columnas que se pueden insertar/actualizar (lista blanca de seguridad). */
  static columnas = [];

  /** Ejecuta una consulta SQL parametrizada y devuelve las filas. */
  static async run(text, params = []) {
    const { rows } = await pool.query(text, params);
    return rows;
  }

  /** Devuelve todos los registros, opcionalmente ordenados. */
  static async todos(orden = this.pk) {
    return this.run(`SELECT * FROM ${this.tabla} ORDER BY ${orden}`);
  }

  /** Busca un registro por su llave primaria. */
  static async porId(id) {
    const rows = await this.run(
      `SELECT * FROM ${this.tabla} WHERE ${this.pk} = $1`, [id]
    );
    return rows[0] || null;
  }

  /** Inserta un registro a partir de un objeto (solo columnas permitidas). */
  static async crear(data) {
    const cols = this.columnas.filter((c) => data[c] !== undefined);
    if (cols.length === 0) throw new Error('No hay columnas validas para insertar');
    const valores = cols.map((c) => data[c]);
    const params = cols.map((_, i) => `$${i + 1}`);
    const sql = `INSERT INTO ${this.tabla} (${cols.join(', ')})
                 VALUES (${params.join(', ')}) RETURNING *`;
    const rows = await this.run(sql, valores);
    return rows[0];
  }

  /** Actualiza un registro por su llave primaria. */
  static async actualizar(id, data) {
    const cols = this.columnas.filter((c) => data[c] !== undefined);
    if (cols.length === 0) return this.porId(id);
    const sets = cols.map((c, i) => `${c} = $${i + 1}`);
    const valores = cols.map((c) => data[c]);
    valores.push(id);
    const sql = `UPDATE ${this.tabla} SET ${sets.join(', ')}
                 WHERE ${this.pk} = $${valores.length} RETURNING *`;
    const rows = await this.run(sql, valores);
    return rows[0] || null;
  }

  /** Elimina un registro por su llave primaria. */
  static async eliminar(id) {
    const rows = await this.run(
      `DELETE FROM ${this.tabla} WHERE ${this.pk} = $1 RETURNING *`, [id]
    );
    return rows[0] || null;
  }
}
