// ============================================================================
//  Deja el torneo en el ESTADO DE ENTREGA: regenera el cuadro de fase final y
//  captura (via la API, igual que lo haria el administrador) los resultados de
//  Dieciseisavos, Octavos, Cuartos y Semifinal con marcadores DETERMINISTAS
//  basados en el ranking FIFA. El Tercer Lugar y la Final quedan con sus
//  equipos definidos por la propagacion automatica, listos para capturarse.
//
//  Requisitos: BD arriba (docker) y servidor corriendo en http://localhost:3000
//  Uso: node scripts/jugar-hasta-semifinales.mjs
// ============================================================================
const API = process.env.API_BASE || 'http://localhost:3000/api';
const jget = (p) => fetch(API + p).then((r) => r.json());
const jput = (p, b) => fetch(API + p, {
  method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(b),
}).then((r) => r.json());
const jpost = (p) => fetch(API + p, { method: 'POST' }).then((r) => r.json());

// RNG determinista (mulberry32): mismos marcadores en cada ejecucion
function mulberry32(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// 1) Cuadro nuevo (dieciseisavos sembrados desde la clasificacion real)
const gen = await jpost('/fase-final/generar');
if (gen.error) throw new Error(gen.error);
console.log(gen.mensaje);

// 2) Rankings para que el marcador favorezca al mejor clasificado
const sels = await jget('/selecciones/detalle');
const rankDe = new Map(sels.map((s) => [s.nombre, s.ranking ?? 60]));

const FASES = ['Dieciseisavos', 'Octavos', 'Cuartos', 'Semifinal'];
let semilla = 20260710;

for (const fase of FASES) {
  const cuadro = await jget('/fase-final');
  const llaves = cuadro.filter((x) => x.nombre_fase === fase);
  for (const m of llaves) {
    const rnd = mulberry32(semilla++);
    const rL = rankDe.get(m.local) ?? 60;
    const rV = rankDe.get(m.visitante) ?? 60;
    const ventaja = (rV - rL) / 50;                     // + si el local es mejor
    let gl = Math.max(0, Math.min(4, Math.round(1.2 + ventaja + (rnd() * 2 - 0.7))));
    let gv = Math.max(0, Math.min(4, Math.round(1.2 - ventaja + (rnd() * 2 - 0.7))));
    const body = { goles_local: gl, goles_visitante: gv };
    if (gl === gv) {
      // Empate: penales deterministas, gana el mejor clasificado
      const ganaLocal = rL <= rV;
      body.penales_local = ganaLocal ? 5 : 3;
      body.penales_visitante = ganaLocal ? 3 : 5;
    }
    const r = await jput(`/fase-final/${m.id}/resultado`, body);
    if (r.error) throw new Error(`${fase} ${m.llave}: ${r.error}`);
    const pen = body.penales_local != null ? ` (pen ${body.penales_local}-${body.penales_visitante})` : '';
    console.log(`  ${fase} ${m.llave}: ${m.local} ${gl}-${gv}${pen} ${m.visitante}`);
  }
}

// 3) Verificacion: Tercer Lugar y Final con equipos definidos, sin jugar
const final = await jget('/fase-final');
const t1 = final.find((x) => x.llave === 'T1');
const f1 = final.find((x) => x.llave === 'F1');
console.log(`\nTercer Lugar: ${t1.local} vs ${t1.visitante} (pendiente)`);
console.log(`FINAL:        ${f1.local} vs ${f1.visitante} (pendiente)`);
if (!t1.local || !f1.local || t1.jugado || f1.jugado) {
  throw new Error('El estado de entrega no es el esperado.');
}
console.log('\nEstado de entrega listo: resultados cargados hasta Semifinales.');
