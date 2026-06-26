// ============================================================================
//  Logica principal de la aplicacion (SPA)
// ============================================================================
const Estado = {
  continentes: [], selecciones: [], grupos: [], estadios: [],
  usuarios: [], grupoActivo: 1, miUbicacion: null,
};

// ---- Utilidades de render ----
const $ = (sel) => document.querySelector(sel);
const opt = (v, t) => `<option value="${v}">${t}</option>`;

function tabla(cols, filas, render) {
  const thead = `<tr>${cols.map((c) => `<th class="${c.num ? 'num' : ''}">${c.t}</th>`).join('')}</tr>`;
  const tbody = filas.map(render).join('');
  return `<table><thead>${thead}</thead><tbody>${tbody}</tbody></table>`;
}

function linksCompartir(enlaces, googleMaps) {
  let html = '';
  if (enlaces?.whatsapp) html += `<a class="wa" href="${enlaces.whatsapp}" target="_blank">WhatsApp</a>`;
  if (enlaces?.facebook) html += `<a class="fb" href="${enlaces.facebook}" target="_blank">Facebook</a>`;
  if (enlaces?.instagram) html += `<a class="ig" href="${enlaces.instagram}" target="_blank">Instagram</a>`;
  if (enlaces?.telegram) html += `<a class="tg" href="${enlaces.telegram}" target="_blank">Telegram</a>`;
  if (googleMaps) html += `<a class="gm" href="${googleMaps}" target="_blank">Google Maps</a>`;
  return html;
}

// ---- Navegacion por pestanas ----
document.querySelectorAll('.tab').forEach((tab) => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach((t) => t.classList.remove('active'));
    document.querySelectorAll('.view').forEach((v) => v.classList.remove('active'));
    tab.classList.add('active');
    const view = tab.dataset.view;
    $(`#view-${view}`).classList.add('active');
    cargarVista(view);
  });
});

function cargarVista(view) {
  const fn = {
    resumen: cargarResumen, selecciones: cargarSelecciones, grupos: cargarGrupos,
    estadios: cargarEstadios, partidos: cargarPartidos, fasefinal: cargarFaseFinal,
    boletos: cargarBoletos,
  }[view];
  if (fn) fn();
}

// ============================================================================
//  RESUMEN
// ============================================================================
async function cargarResumen() {
  const r = await API.get('/estadisticas/resumen');
  $('#cards-resumen').innerHTML = [
    ['Selecciones', r.total_selecciones], ['Estadios', r.total_estadios],
    ['Partidos jugados', r.partidos_jugados], ['Goles totales', r.goles_totales],
    ['Goles por partido', r.promedio_goles_partido],
  ].map(([l, n]) => `<div class="card"><div class="num">${n}</div><div class="lbl">${l}</div></div>`).join('');

  const gol = await API.get('/estadisticas/goleadores');
  $('#tabla-goleadores').innerHTML = tabla(
    [{ t: '#' }, { t: 'Seleccion' }, { t: 'Goles', num: true }],
    gol, (g, i) => `<tr><td class="pos">${i + 1}</td><td>${g.bandera} ${g.seleccion}</td><td class="num">${g.goles_favor}</td></tr>`
  );

  const conf = await API.get('/estadisticas/confederaciones');
  $('#tabla-confed').innerHTML = tabla(
    [{ t: 'Confederacion' }, { t: 'Selec.', num: true }, { t: 'Pts', num: true }, { t: 'GF', num: true }],
    conf, (c) => `<tr><td>${c.confederacion}</td><td class="num">${c.selecciones}</td><td class="num">${c.puntos_totales}</td><td class="num">${c.goles_favor}</td></tr>`
  );
}

// ============================================================================
//  SELECCIONES
// ============================================================================
async function cargarSelecciones() {
  const top = await API.get('/selecciones/ranking/top?limite=10');
  $('#tabla-ranking').innerHTML = tabla(
    [{ t: 'Ranking', num: true }, { t: 'Seleccion' }, { t: 'Confed.' }],
    top, (s) => `<tr><td class="num pos">${s.ranking}</td><td>${s.bandera} ${s.seleccion}</td><td>${s.confederacion}</td></tr>`
  );

  const det = await API.get('/selecciones/detalle');
  Estado.selecciones = det;
  $('#conteo-selecciones').textContent = det.length;
  $('#tabla-selecciones').innerHTML = tabla(
    [{ t: 'Seleccion' }, { t: 'Pais' }, { t: 'Confed.' }, { t: 'Ranking', num: true }, { t: 'Capital (lat,lon)' }],
    det, (s) => `<tr><td>${s.bandera} ${s.nombre}</td><td>${s.pais}</td><td>${s.confederacion}</td><td class="num">${s.ranking ?? '-'}</td><td>${s.latitud ?? ''}, ${s.longitud ?? ''}</td></tr>`
  );

  // Continentes para el formulario
  if (!Estado.continentes.length) Estado.continentes = await API.get('/continentes');
  $('#form-seleccion [name=id_continente]').innerHTML =
    opt('', 'Continente...') + Estado.continentes.map((c) => opt(c.id_continente, `${c.nombre} (${c.confederacion})`)).join('');
}

$('#form-seleccion').addEventListener('submit', async (e) => {
  e.preventDefault();
  try {
    await API.post('/selecciones', formData(e.target));
    toast('Seleccion agregada');
    e.target.reset();
    cargarSelecciones();
  } catch (err) { toast(err.message, true); }
});

// ============================================================================
//  GRUPOS
// ============================================================================
async function cargarGrupos() {
  if (!Estado.grupos.length) Estado.grupos = await API.get('/grupos');
  if (!Estado.selecciones.length) Estado.selecciones = await API.get('/selecciones/detalle');

  $('#selector-grupos').innerHTML = Estado.grupos.map((g) =>
    `<button data-grupo="${g.id}" class="${g.id === Estado.grupoActivo ? 'active' : ''}">${g.nombre}</button>`).join('');
  document.querySelectorAll('#selector-grupos button').forEach((b) =>
    b.addEventListener('click', () => { Estado.grupoActivo = Number(b.dataset.grupo); cargarGrupos(); }));

  // Selector de seleccion para asignar
  $('#sel-asignar').innerHTML = Estado.selecciones
    .map((s) => opt(s.id, `${s.bandera} ${s.nombre}`)).join('');

  const g = Estado.grupos.find((x) => x.id === Estado.grupoActivo);
  $('#titulo-grupo').textContent = `Grupo ${g.nombre}`;

  const cls = await API.get(`/grupos/${Estado.grupoActivo}/clasificacion`);
  $('#tabla-grupo').innerHTML = tabla(
    [{ t: '#' }, { t: 'Seleccion' }, { t: 'PJ', num: true }, { t: 'G', num: true }, { t: 'E', num: true },
     { t: 'P', num: true }, { t: 'GF', num: true }, { t: 'GC', num: true }, { t: 'DG', num: true }, { t: 'Pts', num: true }],
    cls, (c) => `<tr class="${c.posicion <= 2 ? 'clasifica' : ''}"><td class="pos">${c.posicion}</td><td>${c.bandera} ${c.seleccion}</td>` +
      `<td class="num">${c.pj}</td><td class="num">${c.pg}</td><td class="num">${c.pe}</td><td class="num">${c.pp}</td>` +
      `<td class="num">${c.gf}</td><td class="num">${c.gc}</td><td class="num">${c.dg}</td><td class="num"><b>${c.pts}</b></td></tr>`
  );

  // Compartir grupo y clasificacion
  const cg = await API.get(`/compartir/grupo/${Estado.grupoActivo}`);
  $('#share-grupo').innerHTML = linksCompartir(cg.enlaces);
  const cc = await API.get('/compartir/clasificacion');
  $('#share-clasificacion').innerHTML = linksCompartir(cc.enlaces);
}

$('#form-asignar').addEventListener('submit', async (e) => {
  e.preventDefault();
  try {
    await API.post(`/grupos/${Estado.grupoActivo}/asignar`, formData(e.target));
    toast('Seleccion asignada al grupo');
    cargarGrupos();
  } catch (err) { toast(err.message, true); }
});

// ============================================================================
//  ESTADIOS Y MAPA
// ============================================================================
async function cargarEstadios() {
  Estado.estadios = await API.get('/estadios');
  $('#conteo-estadios').textContent = Estado.estadios.length;

  Mapa.pintarEstadios(Estado.estadios);
  if (!Estado.selecciones.length) Estado.selecciones = await API.get('/selecciones/detalle');
  Mapa.pintarCapitales(Estado.selecciones);
  setTimeout(() => Mapa.map.invalidateSize(), 100);

  $('#tabla-estadios').innerHTML = tabla(
    [{ t: 'Estadio' }, { t: 'Ciudad' }, { t: 'Pais' }, { t: 'Capacidad', num: true }, { t: 'Mapa' }],
    Estado.estadios, (e) => `<tr><td>${e.nombre}</td><td>${e.ciudad}</td><td>${e.pais}</td>` +
      `<td class="num">${Number(e.capacidad).toLocaleString()}</td>` +
      `<td><a class="gm" style="padding:.2rem .5rem" href="${Mapa.gmaps(e.latitud, e.longitud)}" target="_blank">Ver</a></td></tr>`
  );

  $('#ruta-estadio').innerHTML = Estado.estadios.map((e) => opt(e.id, `${e.nombre} (${e.ciudad})`)).join('');
}

$('#form-estadio').addEventListener('submit', async (e) => {
  e.preventDefault();
  try {
    await API.post('/estadios', formData(e.target));
    toast('Estadio agregado');
    e.target.reset();
    cargarEstadios();
  } catch (err) { toast(err.message, true); }
});

$('#btn-mi-ubicacion').addEventListener('click', () => {
  if (!navigator.geolocation) return toast('Geolocalizacion no disponible', true);
  navigator.geolocation.getCurrentPosition(async (pos) => {
    Estado.miUbicacion = { lat: pos.coords.latitude, lon: pos.coords.longitude };
    await mostrarRuta();
    toast('Ubicacion obtenida');
  }, () => {
    // Si el usuario no comparte ubicacion, usamos el Zocalo de CDMX como ejemplo
    Estado.miUbicacion = { lat: 19.4326, lon: -99.1332 };
    mostrarRuta();
    toast('Sin permiso de GPS: usando CDMX como origen');
  });
});

async function mostrarRuta() {
  const idEstadio = $('#ruta-estadio').value;
  const u = Estado.miUbicacion;
  if (!u || !idEstadio) return;
  const r = await API.get(`/compartir/ruta?lat=${u.lat}&lon=${u.lon}&estadio=${idEstadio}`);
  $('#share-ruta').innerHTML = `<span class="hint" style="width:100%">Distancia: ${r.km} km</span>` + linksCompartir(r.enlaces, r.google_maps);
}
$('#ruta-estadio').addEventListener('change', mostrarRuta);

// ============================================================================
//  PARTIDOS
// ============================================================================
async function cargarPartidos() {
  if (!Estado.grupos.length) Estado.grupos = await API.get('/grupos');
  if (!Estado.selecciones.length) Estado.selecciones = await API.get('/selecciones/detalle');
  if (!Estado.estadios.length) Estado.estadios = await API.get('/estadios');

  const selSel = Estado.selecciones.map((s) => opt(s.id, `${s.bandera} ${s.nombre}`)).join('');
  $('#part-local').innerHTML = selSel;
  $('#part-visitante').innerHTML = selSel;
  $('#part-grupo').innerHTML = opt('', 'Sin grupo (fase final)') + Estado.grupos.map((g) => opt(g.id, `Grupo ${g.nombre}`)).join('');
  $('#part-estadio').innerHTML = opt('', 'Estadio...') + Estado.estadios.map((e) => opt(e.id, e.nombre)).join('');

  const partidos = await API.get('/partidos/detalle');
  $('#res-partido').innerHTML = partidos.map((p) =>
    opt(p.id, `${p.local} ${p.goles_local ?? ''}-${p.goles_visitante ?? ''} ${p.visitante} (${p.fecha?.slice(0, 10) || ''})`)).join('');

  $('#tabla-partidos').innerHTML = tabla(
    [{ t: 'Fase' }, { t: 'Grupo' }, { t: 'Local' }, { t: 'Marcador', num: true }, { t: 'Visitante' }, { t: 'Estadio' }, { t: 'Fecha' }],
    partidos, (p) => `<tr><td>${p.fase}</td><td>${p.grupo || '-'}</td>` +
      `<td>${p.bandera_local || ''} ${p.local}</td>` +
      `<td class="num">${p.jugado ? `${p.goles_local}-${p.goles_visitante}` : 'vs'}</td>` +
      `<td>${p.bandera_visitante || ''} ${p.visitante}</td><td>${p.estadio || '-'}</td><td>${p.fecha?.slice(0, 10) || '-'}</td></tr>`
  );
}

$('#form-partido').addEventListener('submit', async (e) => {
  e.preventDefault();
  try {
    await API.post('/partidos', formData(e.target));
    toast('Partido programado');
    e.target.reset();
    cargarPartidos();
  } catch (err) { toast(err.message, true); }
});

$('#form-resultado').addEventListener('submit', async (e) => {
  e.preventDefault();
  const d = formData(e.target);
  try {
    await API.put(`/partidos/${d.id}/resultado`, { goles_local: d.goles_local, goles_visitante: d.goles_visitante });
    toast('Resultado guardado (clasificacion recalculada)');
    cargarPartidos();
  } catch (err) { toast(err.message, true); }
});

// ============================================================================
//  FASE FINAL
// ============================================================================
async function cargarFaseFinal() {
  const cuadro = await API.get('/fase-final');
  renderBracket(cuadro);
}

function renderBracket(cuadro) {
  if (!cuadro.length) { $('#bracket').innerHTML = '<p class="hint">Aun no se ha generado el cuadro.</p>'; return; }
  $('#bracket').innerHTML = cuadro.map((x) => `
    <div class="llave">
      <div class="fase">${x.nombre_fase} · ${x.llave}</div>
      <div>${x.bandera_local || ''} ${x.local || 'Por definir'} <b>vs</b> ${x.bandera_visitante || ''} ${x.visitante || 'Por definir'}</div>
      <div class="sede">📍 ${x.estadio || ''} (${x.ciudad || ''}) · ${x.fecha?.slice(0, 10) || ''}</div>
    </div>`).join('');
}

$('#btn-generar-fasefinal').addEventListener('click', async () => {
  try {
    const r = await API.post('/fase-final/generar');
    toast(r.mensaje);
    cargarFaseFinal();
  } catch (err) { toast(err.message, true); }
});

// ============================================================================
//  BOLETOS
// ============================================================================
async function cargarBoletos() {
  Estado.usuarios = await API.get('/usuarios');
  const partidos = await API.get('/partidos/detalle');
  $('#bol-usuario').innerHTML = Estado.usuarios.map((u) => opt(u.id, u.nombre)).join('');
  $('#bol-partido').innerHTML = partidos.map((p) => opt(p.id, `${p.local} vs ${p.visitante} (${p.estadio || ''})`)).join('');

  const boletos = await API.get('/boletos/detalle');
  $('#tabla-boletos').innerHTML = tabla(
    [{ t: 'Usuario' }, { t: 'Estadio' }, { t: 'Seleccion' }, { t: 'Fecha' }, { t: 'Horario' }, { t: 'Costo', num: true }],
    boletos, (b) => `<tr><td>${b.usuario}</td><td>${b.estadio}</td><td>${b.bandera || ''} ${b.seleccion || '-'}</td>` +
      `<td>${b.fecha?.slice(0, 10) || ''}</td><td>${b.horario || ''}</td><td class="num">$${Number(b.costo).toLocaleString()}</td></tr>`
  );
}

$('#form-usuario').addEventListener('submit', async (e) => {
  e.preventDefault();
  try {
    await API.post('/usuarios', formData(e.target));
    toast('Usuario agregado');
    e.target.reset();
    cargarBoletos();
  } catch (err) { toast(err.message, true); }
});

$('#form-boleto').addEventListener('submit', async (e) => {
  e.preventDefault();
  const d = formData(e.target);
  // Completar estadio/fecha desde el partido seleccionado
  try {
    const partido = await API.get(`/partidos/${d.id_partido}`);
    await API.post('/boletos', {
      id_usuario: d.id_usuario, id_partido: d.id_partido,
      id_estadio: partido.id_estadio, id_seleccion: partido.id_equipo_local,
      fecha: partido.fecha, horario: partido.horario, costo: d.costo || 1500,
    });
    toast('Boleto comprado');
    e.target.reset();
    cargarBoletos();
  } catch (err) { toast(err.message, true); }
});

// ---- Arranque ----
cargarResumen();
