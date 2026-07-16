// ============================================================================
//  Router principal de la API REST.  Monta el CRUD de cada recurso y agrega
//  los endpoints especificos (consultas, geolocalizacion, redes sociales).
// ============================================================================
import { Router } from 'express';
import crudRouter from './crud.js';

import Continente from '../models/Continente.js';
import Seleccion from '../models/Seleccion.js';
import Grupo from '../models/Grupo.js';
import Estadio from '../models/Estadio.js';
import Partido from '../models/Partido.js';
import Clasificacion from '../models/Clasificacion.js';
import FaseFinal from '../models/FaseFinal.js';
import Usuario from '../models/Usuario.js';
import Boleto from '../models/Boleto.js';

import ClasificacionService from '../services/ClasificacionService.js';
import FaseFinalService from '../services/FaseFinalService.js';
import EstadisticasService from '../services/EstadisticasService.js';
import CompartirService from '../services/CompartirService.js';
import { sseHandler, difundir, difundirCrud } from '../realtime.js';

const api = Router();
const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// --------------------------------------------------------------------------
//  TIEMPO REAL: los navegadores conectados se suscriben aqui (SSE) y reciben
//  cualquier modificacion hecha por otros equipos al instante.
// --------------------------------------------------------------------------
api.get('/eventos', sseHandler);

// --------------------------------------------------------------------------
//  CONTINENTES
// --------------------------------------------------------------------------
api.get('/continentes/paises', wrap(async (req, res) => res.json(await Continente.paisesPorConfederacion())));
api.use('/continentes', difundirCrud('continentes'), crudRouter(Continente, { orden: 'id_continente' }));

// --------------------------------------------------------------------------
//  SELECCIONES
// --------------------------------------------------------------------------
api.get('/selecciones/detalle', wrap(async (req, res) => res.json(await Seleccion.conContinente())));
api.get('/selecciones/ranking/top', wrap(async (req, res) =>
  res.json(await Seleccion.mejoresRankeados(Number(req.query.limite) || 10))));
api.get('/selecciones/:id/perfil', wrap(async (req, res) => {
  const perfil = await Seleccion.perfil(req.params.id);
  if (!perfil) return res.status(404).json({ error: 'Seleccion no encontrada' });
  res.json(perfil);
}));
api.use('/selecciones', difundirCrud('selecciones'), crudRouter(Seleccion));

// --------------------------------------------------------------------------
//  GRUPOS  (+ clasificacion, asignacion de selecciones)
// --------------------------------------------------------------------------
api.get('/grupos/:id/clasificacion', wrap(async (req, res) => res.json(await Grupo.clasificacion(req.params.id))));
api.get('/grupos/:id/clasificacion-calc', wrap(async (req, res) =>
  res.json(await ClasificacionService.calcularGrupo(req.params.id))));
api.get('/grupos/:id/selecciones', wrap(async (req, res) => res.json(await Grupo.selecciones(req.params.id))));
api.post('/grupos/:id/asignar', wrap(async (req, res) => {
  const r = await Grupo.asignarSeleccion(req.params.id, req.body.id_seleccion);
  difundir('crud', { recurso: 'grupos', metodo: 'POST' }, req.get('x-cliente'));
  res.status(201).json(r);
}));
api.use('/grupos', difundirCrud('grupos'), crudRouter(Grupo));

// --------------------------------------------------------------------------
//  ESTADIOS
// --------------------------------------------------------------------------
api.get('/estadios/capacidad', wrap(async (req, res) => res.json(await Estadio.porCapacidad())));
api.get('/estadios/:id/partidos', wrap(async (req, res) => res.json(await Estadio.partidos(req.params.id))));
api.use('/estadios', difundirCrud('estadios'), crudRouter(Estadio));

// --------------------------------------------------------------------------
//  PARTIDOS  (+ registrar resultado -> recalcula clasificacion por trigger)
// --------------------------------------------------------------------------
api.get('/partidos/detalle', wrap(async (req, res) => res.json(await Partido.detallados(req.query.fase))));
api.put('/partidos/:id/resultado', wrap(async (req, res) => {
  const { goles_local, goles_visitante } = req.body;
  const p = await Partido.registrarResultado(req.params.id, goles_local, goles_visitante);
  if (!p) return res.status(404).json({ error: 'Partido no encontrado' });
  // Si el cuadro de fase final ya existe, un cambio en grupos re-siembra los
  // dieciseisavos (y la cascada de rondas siguientes) automaticamente.
  let sync = null;
  if (p.fase === 'Grupos') sync = await FaseFinalService.sincronizarDieciseisavos();
  difundir('resultado-grupos', { partido: p.id, grupo: p.id_grupo }, req.get('x-cliente'));
  res.json({ ...p, fase_final: sync });
}));
api.use('/partidos', difundirCrud('partidos'), crudRouter(Partido));

// --------------------------------------------------------------------------
//  CLASIFICACIONES
// --------------------------------------------------------------------------
api.get('/clasificaciones', wrap(async (req, res) => res.json(await Clasificacion.general())));
api.get('/clasificaciones/clasificados', wrap(async (req, res) => res.json(await Clasificacion.clasificados())));

// --------------------------------------------------------------------------
//  FASE FINAL  (asignacion automatica de sedes)
// --------------------------------------------------------------------------
api.post('/fase-final/generar', wrap(async (req, res) => {
  const r = await FaseFinalService.generar();
  difundir('fase-final-generada', {}, req.get('x-cliente'));
  res.json(r);
}));
api.post('/fase-final/simular', wrap(async (req, res) => {
  const r = await FaseFinalService.simularRondaPendiente();
  difundir('fase-final-simulada', { fase: r.fase }, req.get('x-cliente'));
  res.json(r);
}));
api.put('/fase-final/:id/resultado', wrap(async (req, res) => {
  const { goles_local, goles_visitante, penales_local, penales_visitante } = req.body;
  const r = await FaseFinalService.registrarResultado(
    req.params.id, goles_local, goles_visitante, penales_local, penales_visitante);
  if (!r) return res.status(404).json({ error: 'Llave no encontrada' });
  difundir('resultado-fase-final', { llave: r.llave, fase: r.nombre_fase }, req.get('x-cliente'));
  res.json(r);
}));
api.get('/fase-final', wrap(async (req, res) => res.json(await FaseFinal.cuadro())));

// --------------------------------------------------------------------------
//  USUARIOS y BOLETOS
// --------------------------------------------------------------------------
api.get('/usuarios/:id/boletos', wrap(async (req, res) => res.json(await Usuario.boletos(req.params.id))));
api.use('/usuarios', difundirCrud('usuarios'), crudRouter(Usuario));
api.get('/boletos/detalle', wrap(async (req, res) => res.json(await Boleto.detallados())));
api.use('/boletos', difundirCrud('boletos'), crudRouter(Boleto));

// --------------------------------------------------------------------------
//  ESTADISTICAS
// --------------------------------------------------------------------------
api.get('/estadisticas/resumen', wrap(async (req, res) => res.json(await EstadisticasService.resumen())));
api.get('/estadisticas/goleadores', wrap(async (req, res) => res.json(await EstadisticasService.maximosGoleadores())));
api.get('/estadisticas/defensas', wrap(async (req, res) => res.json(await EstadisticasService.mejoresDefensas())));
api.get('/estadisticas/partidos-goleados', wrap(async (req, res) => res.json(await EstadisticasService.partidosMasGoleados())));
api.get('/estadisticas/confederaciones', wrap(async (req, res) => res.json(await EstadisticasService.porConfederacion())));

// --------------------------------------------------------------------------
//  COMPARTIR EN REDES SOCIALES
// --------------------------------------------------------------------------
api.get('/compartir/grupo/:id', wrap(async (req, res) => res.json(await CompartirService.grupo(req.params.id))));
api.get('/compartir/clasificacion', wrap(async (req, res) => res.json(await CompartirService.clasificacion())));
api.get('/compartir/estadio/:id', wrap(async (req, res) => res.json(await CompartirService.estadio(req.params.id))));
api.get('/compartir/ruta', wrap(async (req, res) =>
  res.json(await CompartirService.ruta(req.query.lat, req.query.lon, req.query.estadio))));

export default api;
