// ============================================================================
//  CompartirService
//  Genera el contenido y los enlaces para compartir en redes sociales
//  (WhatsApp, Facebook, Instagram) los 4 elementos requeridos:
//  grupo, clasificacion, estadio y ruta.
// ============================================================================
import { pool } from '../db/pool.js';
import { enlacesParaCompartir, googleMapsPunto, googleMapsRuta, distanciaKm } from '../utils/geo.js';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

export default class CompartirService {
  /** Compartir un grupo (equipos + tabla de posiciones). */
  static async grupo(idGrupo) {
    const { rows: g } = await pool.query('SELECT nombre FROM grupos WHERE id = $1', [idGrupo]);
    if (!g.length) throw new Error('Grupo no encontrado');
    const { rows } = await pool.query(`
      SELECT seleccion, bandera, pts, posicion FROM v_clasificacion
        JOIN grupos gr ON gr.nombre = v_clasificacion.grupo
       WHERE gr.id = $1 ORDER BY posicion
    `, [idGrupo]);
    const lineas = rows.map((r) => `${r.posicion}. ${r.bandera} ${r.seleccion} - ${r.pts} pts`).join('\n');
    const texto = `Grupo ${g[0].nombre} - Mundial FIFA 2026\n${lineas}`;
    return { tipo: 'grupo', texto, enlaces: enlacesParaCompartir(texto, `${BASE_URL}/?grupo=${idGrupo}`) };
  }

  /** Compartir la clasificacion general (clasificados directos). */
  static async clasificacion() {
    const { rows } = await pool.query(`
      SELECT grupo, posicion, bandera, seleccion, pts FROM v_clasificacion
       WHERE posicion <= 2 ORDER BY grupo, posicion
    `);
    const lineas = rows.map((r) => `${r.grupo}${r.posicion}: ${r.bandera} ${r.seleccion} (${r.pts})`).join('\n');
    const texto = `Clasificados - Mundial FIFA 2026\n${lineas}`;
    return { tipo: 'clasificacion', texto, enlaces: enlacesParaCompartir(texto, `${BASE_URL}/#clasificacion`) };
  }

  /** Compartir un estadio (con ubicacion en Google Maps). */
  static async estadio(idEstadio) {
    const { rows } = await pool.query('SELECT * FROM estadios WHERE id = $1', [idEstadio]);
    if (!rows.length) throw new Error('Estadio no encontrado');
    const e = rows[0];
    const maps = googleMapsPunto(e.latitud, e.longitud, e.nombre);
    const texto = `${e.nombre} - ${e.ciudad}, ${e.pais}\nCapacidad: ${e.capacidad} | Ubicacion: ${maps}`;
    return { tipo: 'estadio', estadio: e, google_maps: maps, texto, enlaces: enlacesParaCompartir(texto, maps) };
  }

  /** Compartir una ruta entre un punto de origen y un estadio. */
  static async ruta(latOrigen, lonOrigen, idEstadio) {
    const { rows } = await pool.query('SELECT * FROM estadios WHERE id = $1', [idEstadio]);
    if (!rows.length) throw new Error('Estadio no encontrado');
    const e = rows[0];
    const ruta = googleMapsRuta(latOrigen, lonOrigen, e.latitud, e.longitud);
    const km = distanciaKm(Number(latOrigen), Number(lonOrigen), Number(e.latitud), Number(e.longitud));
    const texto = `Ruta hacia ${e.nombre} (${e.ciudad}) - ${km} km aprox.\n${ruta}`;
    return { tipo: 'ruta', km, google_maps: ruta, texto, enlaces: enlacesParaCompartir(texto, ruta) };
  }
}
