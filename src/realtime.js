// ============================================================================
//  Tiempo real (Server-Sent Events)
//  Un equipo funciona como SERVIDOR y los demas equipos abren la aplicacion
//  desde su IP. Cada navegador conectado se suscribe a /api/eventos y, cuando
//  cualquier cliente realiza una modificacion (resultados, altas, cuadro de
//  fase final, boletos...), el servidor difunde el evento y todos los demas
//  actualizan su vista al instante, sin recargar la pagina.
// ============================================================================
const clientes = new Set();

/** Handler de GET /api/eventos: mantiene abierta la conexion SSE. */
export function sseHandler(req, res) {
  res.set({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });
  res.flushHeaders();
  res.write('retry: 3000\n\n');
  res.write(`data: ${JSON.stringify({ tipo: 'conectado', clientes: clientes.size + 1 })}\n\n`);
  clientes.add(res);

  // Latido para que proxies/antivirus no corten la conexion inactiva
  const ping = setInterval(() => res.write(': ping\n\n'), 25000);
  req.on('close', () => {
    clearInterval(ping);
    clientes.delete(res);
  });
}

/**
 * Difunde un evento a todos los navegadores conectados.
 * `origen` es el identificador del cliente que hizo el cambio (cabecera
 * X-Cliente): asi cada navegador puede ignorar sus propios eventos.
 */
export function difundir(tipo, datos = {}, origen = null) {
  const msg = `data: ${JSON.stringify({ tipo, origen, ...datos })}\n\n`;
  for (const c of clientes) {
    try { c.write(msg); } catch { clientes.delete(c); }
  }
}

/** Middleware que difunde automaticamente las mutaciones CRUD exitosas. */
export function difundirCrud(recurso) {
  return (req, res, next) => {
    if (!['POST', 'PUT', 'DELETE'].includes(req.method)) return next();
    const fin = res.json.bind(res);
    res.json = (body) => {
      if (res.statusCode < 400) {
        difundir('crud', { recurso, metodo: req.method }, req.get('x-cliente'));
      }
      return fin(body);
    };
    next();
  };
}
