// ============================================================================
//  Fabrica de routers CRUD genericos (REST) a partir de un modelo POO.
//  Reutilizada por todos los recursos -> menos codigo, API consistente.
// ============================================================================
import { Router } from 'express';

export default function crudRouter(Modelo, opciones = {}) {
  const router = Router();
  const orden = opciones.orden;

  // GET /            -> listar todos
  router.get('/', async (req, res, next) => {
    try { res.json(await Modelo.todos(orden)); } catch (e) { next(e); }
  });

  // GET /:id         -> obtener uno
  router.get('/:id', async (req, res, next) => {
    try {
      const item = await Modelo.porId(req.params.id);
      if (!item) return res.status(404).json({ error: 'No encontrado' });
      res.json(item);
    } catch (e) { next(e); }
  });

  // POST /           -> crear
  router.post('/', async (req, res, next) => {
    try { res.status(201).json(await Modelo.crear(req.body)); } catch (e) { next(e); }
  });

  // PUT /:id         -> actualizar
  router.put('/:id', async (req, res, next) => {
    try {
      const item = await Modelo.actualizar(req.params.id, req.body);
      if (!item) return res.status(404).json({ error: 'No encontrado' });
      res.json(item);
    } catch (e) { next(e); }
  });

  // DELETE /:id      -> eliminar
  router.delete('/:id', async (req, res, next) => {
    try {
      const item = await Modelo.eliminar(req.params.id);
      if (!item) return res.status(404).json({ error: 'No encontrado' });
      res.json({ eliminado: true, item });
    } catch (e) { next(e); }
  });

  return router;
}
