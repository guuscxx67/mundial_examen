// ============================================================================
//  Logica principal de la aplicacion (SPA) - Mundial FIFA 2026
//  13 modulos: Inicio, Confederaciones, Selecciones, Grupos, Calendario,
//  Clasificacion, Simulador, Fase Final, Estadios, Geolocalizacion, Boletos,
//  Administrador y Acerca del Proyecto.
//  Iconos: Font Awesome (interfaz) + flag-icons (banderas de paises).
// ============================================================================
const Estado = {
  continentes: [], selecciones: [], grupos: [], estadios: [], usuarios: [],
  grupoActivo: 1, confActiva: 'UEFA', miUbicacion: null,
  _selDetalle: null, _partidos: null,
};

const CONFEDS = [
  { code: 'UEFA', nombre: 'Europa', icon: 'fa-earth-europe' },
  { code: 'CONMEBOL', nombre: 'Sudamérica', icon: 'fa-earth-americas' },
  { code: 'CONCACAF', nombre: 'Norte/Centroamérica', icon: 'fa-earth-americas' },
  { code: 'CAF', nombre: 'África', icon: 'fa-earth-africa' },
  { code: 'AFC', nombre: 'Asia', icon: 'fa-earth-asia' },
  { code: 'OFC', nombre: 'Oceanía', icon: 'fa-earth-oceania' },
];

const MODULOS = [
  'Inicio', 'Confederaciones', 'Selecciones', 'Grupos', 'Calendario',
  'Clasificación', 'Simulador', 'Resultados (carga por fase)', 'Fase Final',
  'Estadios', 'Geolocalización', 'Boletos', 'Administrador',
  'Acerca del Proyecto',
];

// ---- Utilidades ----
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);
const opt = (v, t) => `<option value="${v}">${t}</option>`;
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function tabla(cols, filas, render) {
  const thead = `<tr>${cols.map((c) => `<th class="${c.num ? 'num' : ''}">${c.t}</th>`).join('')}</tr>`;
  const tbody = filas.map(render).join('');
  return `<table><thead>${thead}</thead><tbody>${tbody}</tbody></table>`;
}

function linksCompartir(enlaces, googleMaps) {
  let html = '';
  if (enlaces?.whatsapp) html += `<a class="wa" href="${enlaces.whatsapp}" target="_blank">${ic('fa-brands fa-whatsapp')} WhatsApp</a>`;
  if (enlaces?.facebook) html += `<a class="fb" href="${enlaces.facebook}" target="_blank">${ic('fa-brands fa-facebook')} Facebook</a>`;
  if (enlaces?.instagram) html += `<a class="ig" href="${enlaces.instagram}" target="_blank">${ic('fa-brands fa-instagram')} Instagram</a>`;
  if (enlaces?.telegram) html += `<a class="tg" href="${enlaces.telegram}" target="_blank">${ic('fa-brands fa-telegram')} Telegram</a>`;
  if (googleMaps) html += `<a class="gm" href="${googleMaps}" target="_blank">${ic('fa-location-dot')} Google Maps</a>`;
  return html;
}

// Precio de boleto sugerido segun la fase (simulacion)
function precioPorFase(fase) {
  return ({
    Grupos: 1500, Dieciseisavos: 2200, Octavos: 3000, Cuartos: 4200,
    Semifinal: 6500, 'Tercer Lugar': 3500, Final: 9500,
  })[fase] || 1500;
}

const money = (n) => '$' + Number(n).toLocaleString('es-MX');
const soloFecha = (iso) => (iso ? String(iso).slice(0, 10) : '');
function fechaLarga(iso) {
  if (!iso) return 'Fecha por definir';
  const d = new Date(String(iso).slice(0, 10) + 'T00:00:00');
  return d.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

// ---- Datos compartidos con cache ----
async function selDetalle(force = false) {
  if (force || !Estado._selDetalle) Estado._selDetalle = await API.get('/selecciones/detalle');
  Estado.selecciones = Estado._selDetalle;
  return Estado._selDetalle;
}
async function partidosDetalle(force = false) {
  if (force || !Estado._partidos) Estado._partidos = await API.get('/partidos/detalle');
  return Estado._partidos;
}
async function cargarGruposLista() {
  if (!Estado.grupos.length) Estado.grupos = await API.get('/grupos');
  return Estado.grupos;
}
async function cargarContinentes() {
  if (!Estado.continentes.length) Estado.continentes = await API.get('/continentes');
  return Estado.continentes;
}
async function cargarEstadiosLista(force = false) {
  if (force || !Estado.estadios.length) Estado.estadios = await API.get('/estadios');
  return Estado.estadios;
}
function invalidarCache() { Estado._selDetalle = null; Estado._partidos = null; Estado.estadios = []; }

// ============================================================================
//  Navegacion
// ============================================================================
$$('.tab').forEach((tab) => {
  tab.addEventListener('click', () => {
    $$('.tab').forEach((t) => t.classList.remove('active'));
    $$('.view').forEach((v) => v.classList.remove('active'));
    tab.classList.add('active');
    const view = tab.dataset.view;
    $(`#view-${view}`).classList.add('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    cargarVista(view);
  });
});

function cargarVista(view) {
  const fn = {
    inicio: cargarInicio, confederaciones: cargarConfederaciones, selecciones: cargarSelecciones,
    grupos: cargarGrupos, calendario: cargarCalendario, clasificacion: cargarClasificacion,
    simulador: cargarSimulador, resultados: cargarResultados, fasefinal: cargarFaseFinal,
    estadios: cargarEstadios, geo: cargarGeo, boletos: cargarBoletos, admin: cargarAdmin,
    acerca: cargarAcerca,
  }[view];
  if (fn) fn().catch((e) => toast(e.message, true));
}

// ============================================================================
//  1) INICIO
// ============================================================================
async function cargarInicio() {
  const r = await API.get('/estadisticas/resumen');
  const partidos = await partidosDetalle();
  const jugados = partidos.filter((p) => p.jugado).length;
  const programados = partidos.length - jugados;

  $('#cards-inicio').innerHTML = [
    [ic('fa-map-location-dot'), r.total_estadios, 'Estadios sede'],
    [ic('fa-shirt'), r.total_selecciones, 'Selecciones'],
    [ic('fa-futbol'), partidos.length, 'Partidos totales'],
    [ic('fa-circle-check'), jugados, 'Partidos jugados'],
    [ic('fa-calendar-day'), programados, 'Por jugar'],
    [ic('fa-bullseye'), r.goles_totales, 'Goles anotados'],
  ].map(([icono, n, l]) => `<div class="card"><div class="card-ic">${icono}</div><div class="num" data-count="${n}">0</div><div class="lbl">${l}</div></div>`).join('');
  animarContadores();

  // Video introductorio (poster por defecto; el usuario puede pegar una URL)
  ponerVideoPoster();

  // Noticias (contenido informativo del torneo)
  $('#noticias').innerHTML = [
    ['11 jun 2026', 'Arranca el Mundial: México inaugura en el Estadio Azteca.'],
    ['48 selecciones', 'Primera Copa del Mundo con 48 equipos y 12 grupos.'],
    ['3 países sede', 'México, Estados Unidos y Canadá organizan por primera vez de forma conjunta.'],
    ['19 jul 2026', 'La gran final se disputará en el estadio de mayor capacidad.'],
  ].map(([f, t]) => `<div class="noticia"><div class="fecha">${f}</div><div>${t}</div></div>`).join('');

  const estadios = await cargarEstadiosLista();
  const top = [...estadios].sort((a, b) => (b.capacidad || 0) - (a.capacidad || 0)).slice(0, 6);
  $('#inicio-estadios').innerHTML = top.map((e) => `
    <div class="mini-estadio">
      <div class="nom">${ic('fa-location-dot')} ${esc(e.nombre)}</div>
      <div class="cap">${esc(e.ciudad)}, ${esc(e.pais)}</div>
      <div class="cap">Capacidad: ${Number(e.capacidad).toLocaleString('es-MX')}</div>
    </div>`).join('');

  const sels = await selDetalle();
  $('#inicio-equipos').innerHTML = [...sels]
    .sort((a, b) => (a.ranking || 999) - (b.ranking || 999))
    .map((s) => `<span class="chip">${bandera(s.bandera)} ${esc(s.nombre)}</span>`).join('');

  iniciarCountdown();
}

// Cuenta regresiva a la Gran Final (19 de julio de 2026, MetLife Stadium)
let _cdTimer = null;
function iniciarCountdown() {
  const objetivo = new Date('2026-07-19T13:00:00-05:00');
  const pinta = () => {
    const el = $('#countdown');
    if (!el) return;
    const diff = objetivo - Date.now();
    if (diff <= 0) {
      el.innerHTML = `<div class="cd-titulo">${ic('fa-trophy')} ¡La Gran Final ya se jugó!</div>`;
      clearInterval(_cdTimer);
      return;
    }
    const d = Math.floor(diff / 86400000);
    const h = Math.floor(diff / 3600000) % 24;
    const m = Math.floor(diff / 60000) % 60;
    const s = Math.floor(diff / 1000) % 60;
    el.innerHTML = `
      <div class="cd-titulo">${ic('fa-trophy')} Cuenta regresiva a la Gran Final · MetLife Stadium</div>
      <div class="cd-nums">
        <div class="cd-box"><b>${d}</b><span>días</span></div>
        <div class="cd-box"><b>${String(h).padStart(2, '0')}</b><span>horas</span></div>
        <div class="cd-box"><b>${String(m).padStart(2, '0')}</b><span>min</span></div>
        <div class="cd-box"><b>${String(s).padStart(2, '0')}</b><span>seg</span></div>
      </div>`;
  };
  clearInterval(_cdTimer);
  pinta();
  _cdTimer = setInterval(pinta, 1000);
}

function animarContadores() {
  $$('#cards-inicio .num[data-count]').forEach((el) => {
    const fin = Number(el.dataset.count) || 0;
    const pasos = 30; let i = 0;
    const t = setInterval(() => {
      i++; el.textContent = Math.round((fin * i) / pasos).toLocaleString('es-MX');
      if (i >= pasos) { el.textContent = fin.toLocaleString('es-MX'); clearInterval(t); }
    }, 20);
  });
}

function idYouTube(url) {
  if (!url) return '';
  const m = String(url).match(/(?:youtu\.be\/|v=|embed\/|shorts\/)([A-Za-z0-9_-]{11})/);
  return m ? m[1] : (/^[A-Za-z0-9_-]{11}$/.test(url.trim()) ? url.trim() : '');
}
function ponerVideoEmbed(id) {
  $('#video-intro').innerHTML =
    `<iframe src="https://www.youtube-nocookie.com/embed/${id}" title="Video introductorio Mundial 2026" allowfullscreen></iframe>`;
}
function ponerVideoPoster() {
  const busqueda = 'https://www.youtube.com/results?search_query=Mundial+2026+FIFA+tr%C3%A1iler+oficial';
  $('#video-intro').innerHTML = `
    <a class="video-poster" href="${busqueda}" target="_blank" rel="noopener">
      <div class="play">${ic('fa-circle-play')}</div>
      <div><b>Video introductorio del Mundial 2026</b></div>
      <div style="font-size:.8rem;opacity:.85">Haz clic para ver tráileres oficiales, o pega una URL de YouTube abajo.</div>
    </a>`;
}
$('#form-video').addEventListener('submit', (e) => {
  e.preventDefault();
  const id = idYouTube($('#video-url').value);
  if (!id) return toast('Pega una URL o ID de YouTube válido', true);
  ponerVideoEmbed(id);
});

// ============================================================================
//  2) CONFEDERACIONES  (+ ficha emergente por seleccion)
// ============================================================================
async function cargarConfederaciones() {
  await selDetalle();
  $('#conf-tabs').innerHTML = CONFEDS.map((c) => {
    const n = Estado.selecciones.filter((s) => s.confederacion === c.code).length;
    return `<button class="conf-tab ${c.code === Estado.confActiva ? 'active' : ''}" data-conf="${c.code}">
      <span>${ic(c.icon)} ${c.code}</span><small>${c.nombre} · ${n} equipos</small></button>`;
  }).join('');
  $$('#conf-tabs .conf-tab').forEach((b) =>
    b.addEventListener('click', () => { Estado.confActiva = b.dataset.conf; cargarConfederaciones(); }));

  const equipos = Estado.selecciones
    .filter((s) => s.confederacion === Estado.confActiva)
    .sort((a, b) => (a.ranking || 999) - (b.ranking || 999));
  $('#conf-equipos').innerHTML = equipos.map((s) => `
    <div class="team-card" data-id="${s.id}">
      <div class="bandera">${bandera(s.bandera)}</div>
      <div class="nombre">${esc(s.nombre)}</div>
      <div class="rank"><span class="badge-rank">FIFA #${s.ranking ?? '-'}</span></div>
    </div>`).join('') || '<p class="hint">Sin selecciones en esta confederación.</p>';
  $$('#conf-equipos .team-card').forEach((c) =>
    c.addEventListener('click', () => abrirFicha(c.dataset.id)));
}

async function abrirFicha(id) {
  try {
    const p = await API.get(`/selecciones/${id}/perfil`);
    const gmaps = (lat, lon) => `https://www.google.com/maps/search/?api=1&query=${lat},${lon}`;
    const estadiosHtml = (p.estadios || []).length
      ? p.estadios.map((e) => `
        <div class="ee">
          <span>${ic('fa-location-dot')} <b>${esc(e.nombre)}</b> (${esc(e.ciudad)}) · vs ${bandera(e.rival_bandera)} ${esc(e.rival)}<br>
            <span class="hint">${e.fase} · ${fechaLarga(e.fecha)} · ${String(e.horario || '').slice(0, 5)}</span></span>
          <a class="gm" style="padding:.25rem .6rem" href="${gmaps(e.latitud, e.longitud)}" target="_blank">${ic('fa-map-location-dot')} Mapa</a>
        </div>`).join('')
      : '<p class="hint">Aún no hay partidos programados para esta selección.</p>';

    $('#modal-content').innerHTML = `
      <div class="ficha-head">
        <div class="bandera">${bandera(p.bandera)}</div>
        <div>
          <h3>${esc(p.nombre)}</h3>
          <div class="sub">${esc(p.continente)} · ${esc(p.confederacion)}</div>
        </div>
      </div>
      <div class="ficha-tags">
        <span class="ficha-tag"><b>Ranking FIFA:</b> #${p.ranking ?? '-'}</span>
        <span class="ficha-tag"><b>Grupo:</b> ${p.grupo || 'Por definir'}</span>
        <span class="ficha-tag"><b>Entrenador:</b> ${esc(p.entrenador || 'Por confirmar')}</span>
        <span class="ficha-tag"><b>Capital:</b> ${esc(p.capital || '-')}</span>
      </div>
      <div class="ficha-block"><div class="et">${ic('fa-book')} Historia</div><p>${esc(p.historia || 'Sin información.')}</p></div>
      <div class="ficha-block"><div class="et">${ic('fa-circle-check')} Ventajas</div><p>${esc(p.ventajas || '-')}</p></div>
      <div class="ficha-block"><div class="et">${ic('fa-triangle-exclamation')} Desventajas</div><p>${esc(p.desventajas || '-')}</p></div>
      <div class="ficha-block">
        <div class="et">${ic('fa-location-dot')} Estadios donde juega</div>
        <div class="ficha-estadios">${estadiosHtml}</div>
      </div>
      <div class="ficha-block">
        <div class="et">${ic('fa-map-pin')} Ubicación de la capital</div>
        <div class="share"><a class="gm" href="${gmaps(p.latitud, p.longitud)}" target="_blank">${ic('fa-location-dot')} Ver ${esc(p.capital || p.nombre)} en Google Maps</a></div>
      </div>`;
    $('#modal').classList.add('show');
  } catch (e) { toast(e.message, true); }
}
$('#modal-close').addEventListener('click', () => $('#modal').classList.remove('show'));
$('#modal').addEventListener('click', (e) => { if (e.target.id === 'modal') $('#modal').classList.remove('show'); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') $('#modal').classList.remove('show'); });

// ============================================================================
//  3) SELECCIONES
// ============================================================================
async function cargarSelecciones() {
  const top = await API.get('/selecciones/ranking/top?limite=10');
  $('#tabla-ranking').innerHTML = tabla(
    [{ t: 'Ranking', num: true }, { t: 'Selección' }, { t: 'Confed.' }],
    top, (s) => `<tr><td class="num pos">${s.ranking}</td><td>${bandera(s.bandera)} ${esc(s.seleccion)}</td><td>${esc(s.confederacion)}</td></tr>`,
  );

  const det = await selDetalle();
  $('#conteo-selecciones').textContent = det.length;
  pintarTablaSelecciones(det);
  $('#buscar-seleccion').oninput = (e) => {
    const q = e.target.value.toLowerCase();
    pintarTablaSelecciones(det.filter((s) =>
      [s.nombre, s.pais, s.confederacion, s.continente].some((v) => String(v).toLowerCase().includes(q))));
  };
}
function pintarTablaSelecciones(det) {
  $('#tabla-selecciones').innerHTML = tabla(
    [{ t: 'Selección' }, { t: 'País' }, { t: 'Confed.' }, { t: 'Entrenador' }, { t: 'Ranking', num: true }],
    det, (s) => `<tr><td>${bandera(s.bandera)} ${esc(s.nombre)}</td><td>${esc(s.pais)}</td>` +
      `<td>${esc(s.confederacion)}</td><td>${esc(s.entrenador || '-')}</td><td class="num">${s.ranking ?? '-'}</td></tr>`,
  ) || '<p class="hint">Sin resultados.</p>';
}

// ============================================================================
//  4) GRUPOS
// ============================================================================
async function cargarGrupos() {
  await cargarGruposLista();
  $('#selector-grupos').innerHTML = Estado.grupos.map((g) =>
    `<button data-grupo="${g.id}" class="${g.id === Estado.grupoActivo ? 'active' : ''}">${g.nombre}</button>`).join('');
  $$('#selector-grupos button').forEach((b) =>
    b.addEventListener('click', () => { Estado.grupoActivo = Number(b.dataset.grupo); cargarGrupos(); }));

  const g = Estado.grupos.find((x) => x.id === Estado.grupoActivo);
  $('#titulo-grupo').textContent = `Grupo ${g.nombre}`;

  const cls = await API.get(`/grupos/${Estado.grupoActivo}/clasificacion`);
  $('#tabla-grupo').innerHTML = tabla(
    [{ t: '#' }, { t: 'Selección' }, { t: 'PJ', num: true }, { t: 'PG', num: true }, { t: 'PE', num: true },
      { t: 'PP', num: true }, { t: 'GF', num: true }, { t: 'GC', num: true }, { t: 'DG', num: true }, { t: 'PT', num: true }],
    cls, (c) => `<tr class="${c.posicion <= 2 ? 'clasifica' : ''}"><td class="pos">${c.posicion}</td><td>${bandera(c.bandera)} ${esc(c.seleccion)}</td>` +
      `<td class="num">${c.pj}</td><td class="num">${c.pg}</td><td class="num">${c.pe}</td><td class="num">${c.pp}</td>` +
      `<td class="num">${c.gf}</td><td class="num">${c.gc}</td><td class="num">${c.dg}</td><td class="num"><b>${c.pts}</b></td></tr>`,
  );

  // Partidos del grupo
  const partidos = (await partidosDetalle()).filter((p) => p.grupo === g.nombre);
  $('#tabla-grupo-partidos').innerHTML = partidos.length ? tabla(
    [{ t: 'Local' }, { t: 'Marcador', num: true }, { t: 'Visitante' }, { t: 'Estadio' }, { t: 'Fecha' }],
    partidos, (p) => `<tr><td>${bandera(p.bandera_local)} ${esc(p.local)}</td>` +
      `<td class="num">${p.jugado ? `${p.goles_local}-${p.goles_visitante}` : 'vs'}</td>` +
      `<td>${bandera(p.bandera_visitante)} ${esc(p.visitante)}</td><td>${esc(p.estadio || '-')}</td><td>${soloFecha(p.fecha)}</td></tr>`,
  ) : '<p class="hint">Sin partidos.</p>';

  // Compartir
  const cg = await API.get(`/compartir/grupo/${Estado.grupoActivo}`);
  $('#share-grupo').innerHTML = linksCompartir(cg.enlaces);
}

// ============================================================================
//  5) CALENDARIO
// ============================================================================
async function cargarCalendario() {
  // Fase de grupos + fase final (eliminatorias) en un solo calendario
  const grupos = await partidosDetalle();
  const ff = await API.get('/fase-final');
  const knockout = ff.map((x) => ({
    fase: x.nombre_fase, grupo: null,
    local: x.local || 'Por definir', visitante: x.visitante || 'Por definir',
    bandera_local: x.bandera_local, bandera_visitante: x.bandera_visitante,
    goles_local: x.goles_local, goles_visitante: x.goles_visitante,
    penales_local: x.penales_local, penales_visitante: x.penales_visitante,
    jugado: x.jugado, fecha: x.fecha, horario: x.horario,
    estadio: x.estadio, ciudad: x.ciudad,
  }));
  const partidos = [...grupos, ...knockout];

  const render = () => {
    const fFase = $('#cal-fase').value;
    const fEstado = $('#cal-estado').value;
    let lista = partidos.filter((p) => (!fFase || p.fase === fFase) &&
      (!fEstado || (fEstado === 'jugado' ? p.jugado : !p.jugado)));

    // Agrupar por fecha
    const porFecha = {};
    lista.forEach((p) => { (porFecha[soloFecha(p.fecha)] ||= []).push(p); });
    const fechas = Object.keys(porFecha).sort();
    if (!fechas.length) { $('#calendario').innerHTML = '<p class="hint">Sin partidos para el filtro seleccionado.</p>'; return; }

    $('#calendario').innerHTML = fechas.map((f) => `
      <div class="dia-cal">
        <div class="fecha-cab">${ic('fa-calendar-days')} ${fechaLarga(f)}</div>
        ${porFecha[f].sort((a, b) => String(a.horario || '').localeCompare(String(b.horario || ''))).map(matchRow).join('')}
      </div>`).join('');
  };
  $('#cal-fase').onchange = render;
  $('#cal-estado').onchange = render;
  render();
}
function matchRow(p) {
  const pen = p.penales_local != null && p.penales_visitante != null;
  const marcador = p.jugado
    ? `<div class="marcador">${p.goles_local}${pen ? `<sup>(${p.penales_local})</sup>` : ''} - ${p.goles_visitante}${pen ? `<sup>(${p.penales_visitante})</sup>` : ''}</div>`
    : `<div class="marcador vs">${String(p.horario || '').slice(0, 5) || 'vs'}</div>`;
  return `<div class="match-row">
    <div class="eq local">${esc(p.local)} ${bandera(p.bandera_local)}</div>
    ${marcador}
    <div class="eq">${bandera(p.bandera_visitante)} ${esc(p.visitante)}</div>
    <div class="meta-p">${p.fase}${p.grupo ? ' · Grupo ' + p.grupo : ''} · ${ic('fa-location-dot')} ${esc(p.estadio || 'Por definir')}${p.ciudad ? ' (' + esc(p.ciudad) + ')' : ''} · ${ic('fa-ticket')} ${money(precioPorFase(p.fase))}</div>
  </div>`;
}

// ============================================================================
//  6) CLASIFICACION
// ============================================================================
async function cargarClasificacion() {
  const gen = await API.get('/clasificaciones');
  const porGrupo = {};
  gen.forEach((c) => { (porGrupo[c.grupo] ||= []).push(c); });
  $('#tabla-clasificacion-general').innerHTML = Object.keys(porGrupo).sort().map((grp) => `
    <h4 style="color:#fff;margin:.6rem 0 .3rem">Grupo ${grp}</h4>
    ${tabla(
      [{ t: '#' }, { t: 'Selección' }, { t: 'PJ', num: true }, { t: 'PG', num: true }, { t: 'PE', num: true },
        { t: 'PP', num: true }, { t: 'GF', num: true }, { t: 'GC', num: true }, { t: 'DG', num: true }, { t: 'PT', num: true }],
      porGrupo[grp], (c) => `<tr class="${c.posicion <= 2 ? 'clasifica' : ''}"><td class="pos">${c.posicion}</td><td>${bandera(c.bandera)} ${esc(c.seleccion)}</td>` +
        `<td class="num">${c.pj}</td><td class="num">${c.pg}</td><td class="num">${c.pe}</td><td class="num">${c.pp}</td>` +
        `<td class="num">${c.gf}</td><td class="num">${c.gc}</td><td class="num">${c.dg}</td><td class="num"><b>${c.pts}</b></td></tr>`,
    )}`).join('');

  const clasif = await API.get('/clasificaciones/clasificados');
  $('#tabla-clasificados').innerHTML = tabla(
    [{ t: 'Grupo' }, { t: 'Pos', num: true }, { t: 'Selección' }, { t: 'PT', num: true }, { t: 'DG', num: true }],
    clasif, (c) => `<tr class="clasifica"><td>${c.grupo}</td><td class="num pos">${c.posicion}</td>` +
      `<td>${bandera(c.bandera)} ${esc(c.seleccion)}</td><td class="num"><b>${c.pts}</b></td><td class="num">${c.dg}</td></tr>`,
  );

  const cc = await API.get('/compartir/clasificacion');
  $('#share-clasificacion').innerHTML = linksCompartir(cc.enlaces);
}

// ============================================================================
//  7) SIMULADOR
// ============================================================================
async function cargarSimulador() {
  const partidos = await partidosDetalle(true);
  $('#res-partido').innerHTML = partidos.map((p) =>
    opt(p.id, `${p.local} ${p.jugado ? p.goles_local + '-' + p.goles_visitante : 'vs'} ${p.visitante} (${soloFecha(p.fecha)})`)).join('');

  const pendientes = partidos.filter((p) => !p.jugado);
  $('#tabla-pendientes').innerHTML = pendientes.length ? tabla(
    [{ t: 'Fase' }, { t: 'Grupo' }, { t: 'Local' }, { t: 'Visitante' }, { t: 'Estadio' }, { t: 'Fecha' }],
    pendientes, (p) => `<tr><td>${p.fase}</td><td>${p.grupo || '-'}</td><td>${bandera(p.bandera_local)} ${esc(p.local)}</td>` +
      `<td>${bandera(p.bandera_visitante)} ${esc(p.visitante)}</td><td>${esc(p.estadio || '-')}</td><td>${soloFecha(p.fecha)}</td></tr>`,
  ) : `<p class="hint">${ic('fa-circle-check')} No hay partidos pendientes. La fase de grupos está completa.</p>`;
}

$('#form-resultado').addEventListener('submit', async (e) => {
  e.preventDefault();
  const d = formData(e.target);
  try {
    await API.put(`/partidos/${d.id}/resultado`, { goles_local: d.goles_local, goles_visitante: d.goles_visitante });
    invalidarCache();
    toast('Resultado guardado (clasificación recalculada)');
    e.target.reset();
    cargarSimulador();
  } catch (err) { toast(err.message, true); }
});

$('#btn-simular-todo').addEventListener('click', async () => {
  const partidos = (await partidosDetalle(true)).filter((p) => !p.jugado && p.fase === 'Grupos');
  if (!partidos.length) return toast('No hay partidos de grupos pendientes');
  try {
    for (const p of partidos) {
      const gl = Math.floor(Math.random() * 5);
      const gv = Math.floor(Math.random() * 5);
      await API.put(`/partidos/${p.id}/resultado`, { goles_local: gl, goles_visitante: gv });
    }
    invalidarCache();
    toast(`Simulados ${partidos.length} partidos`);
    cargarSimulador();
  } catch (err) { toast(err.message, true); }
});

$('#btn-generar-fasefinal-sim').addEventListener('click', generarFaseFinal);

// ============================================================================
//  7b) RESULTADOS  (carga de marcadores de TODAS las fases del Mundial)
//  - Grupos: al guardar, el trigger recalcula la clasificacion y el backend
//    re-siembra los dieciseisavos si el cuadro ya existe.
//  - Eliminatorias: el ganador avanza automaticamente a la siguiente ronda;
//    los empates se definen por penales.
// ============================================================================
const FASES_TODAS = ['Grupos', 'Dieciseisavos', 'Octavos', 'Cuartos', 'Semifinal', 'Tercer Lugar', 'Final'];
Estado.faseResultados = 'Grupos';

async function cargarResultados() {
  const partidos = await partidosDetalle(true);
  const cuadro = await API.get('/fase-final');

  const deFase = (f) => f === 'Grupos'
    ? partidos.filter((p) => p.fase === 'Grupos')
    : cuadro.filter((x) => x.nombre_fase === f);

  $('#res-fases').innerHTML = FASES_TODAS.map((f) => {
    const lista = deFase(f);
    const jugados = lista.filter((x) => x.jugado).length;
    return `<button class="fase-chip ${f === Estado.faseResultados ? 'active' : ''}" data-fase="${f}">
      <span>${f}</span><small>${jugados}/${lista.length} jugados</small></button>`;
  }).join('');
  $$('#res-fases .fase-chip').forEach((b) =>
    b.addEventListener('click', () => { Estado.faseResultados = b.dataset.fase; cargarResultados(); }));

  const f = Estado.faseResultados;
  $('#res-titulo').textContent = f === 'Grupos' ? 'Partidos de la fase de grupos' : `Llaves de ${f}`;
  const lista = deFase(f);

  if (!lista.length) {
    $('#lista-resultados').innerHTML = `<p class="hint">Aún no hay partidos en esta fase. ${f !== 'Grupos' ? 'Genera el cuadro de fase final desde el Simulador.' : ''}</p>`;
    return;
  }

  $('#lista-resultados').innerHTML = lista.map((p) => f === 'Grupos' ? filaResGrupo(p) : filaResLlave(p)).join('');
  $$('#lista-resultados .form-res').forEach((form) =>
    form.addEventListener('submit', guardarResultadoFila));
}

function filaResGrupo(p) {
  return `<form class="fila-res form-res" data-tipo="grupo" data-id="${p.id}">
    <div class="fr-info">
      <span class="fr-fase">Grupo ${p.grupo} · ${fechaLarga(p.fecha)}</span>
      <span class="fr-sede">${ic('fa-location-dot')} ${esc(p.estadio || 'Por definir')}</span>
    </div>
    <div class="fr-equipos">
      <span class="fr-eq local">${esc(p.local)} ${bandera(p.bandera_local)}</span>
      <input name="goles_local" type="number" min="0" required value="${p.jugado ? p.goles_local : ''}" placeholder="-">
      <span class="fr-guion">–</span>
      <input name="goles_visitante" type="number" min="0" required value="${p.jugado ? p.goles_visitante : ''}" placeholder="-">
      <span class="fr-eq">${bandera(p.bandera_visitante)} ${esc(p.visitante)}</span>
    </div>
    <button type="submit">${p.jugado ? ic('fa-rotate') + ' Corregir' : ic('fa-check') + ' Guardar'}</button>
  </form>`;
}

function filaResLlave(x) {
  const sinEquipos = !x.local || !x.visitante;
  const empate = x.jugado && x.goles_local === x.goles_visitante;
  return `<form class="fila-res form-res ${sinEquipos ? 'fr-bloqueada' : ''}" data-tipo="llave" data-id="${x.id}">
    <div class="fr-info">
      <span class="fr-fase">${x.nombre_fase} · Llave ${x.llave} · ${fechaLarga(x.fecha)}</span>
      <span class="fr-sede">${ic('fa-location-dot')} ${esc(x.estadio || 'Por definir')}${x.ciudad ? ' (' + esc(x.ciudad) + ')' : ''}</span>
    </div>
    <div class="fr-equipos">
      <span class="fr-eq local">${esc(x.local || 'Por definir')} ${bandera(x.bandera_local)}</span>
      <input name="goles_local" type="number" min="0" required ${sinEquipos ? 'disabled' : ''} value="${x.jugado ? x.goles_local : ''}" placeholder="-">
      <span class="fr-guion">–</span>
      <input name="goles_visitante" type="number" min="0" required ${sinEquipos ? 'disabled' : ''} value="${x.jugado ? x.goles_visitante : ''}" placeholder="-">
      <span class="fr-eq">${bandera(x.bandera_visitante)} ${esc(x.visitante || 'Por definir')}</span>
    </div>
    <div class="fr-penales" title="Solo si el partido termina empatado">
      ${ic('fa-bullseye')} Penales:
      <input name="penales_local" type="number" min="0" ${sinEquipos ? 'disabled' : ''} value="${empate && x.penales_local != null ? x.penales_local : ''}" placeholder="L">
      <input name="penales_visitante" type="number" min="0" ${sinEquipos ? 'disabled' : ''} value="${empate && x.penales_visitante != null ? x.penales_visitante : ''}" placeholder="V">
    </div>
    <button type="submit" ${sinEquipos ? 'disabled' : ''}>${sinEquipos ? ic('fa-lock') + ' Ronda previa' : (x.jugado ? ic('fa-rotate') + ' Corregir' : ic('fa-check') + ' Guardar')}</button>
  </form>`;
}

async function guardarResultadoFila(e) {
  e.preventDefault();
  const form = e.target;
  const d = formData(form);
  try {
    if (form.dataset.tipo === 'grupo') {
      const r = await API.put(`/partidos/${form.dataset.id}/resultado`, {
        goles_local: d.goles_local, goles_visitante: d.goles_visitante,
      });
      const sync = r.fase_final;
      const nDs = sync?.llaves_dieciseisavos?.length || 0;
      toast(nDs
        ? `Resultado guardado: clasificación recalculada y ${nDs} llave(s) de dieciseisavos re-sembradas`
        : 'Resultado guardado: clasificación recalculada (los dieciseisavos no cambiaron)');
    } else {
      const r = await API.put(`/fase-final/${form.dataset.id}/resultado`, {
        goles_local: d.goles_local, goles_visitante: d.goles_visitante,
        penales_local: d.penales_local, penales_visitante: d.penales_visitante,
      });
      const n = r.llaves_actualizadas?.length || 0;
      toast(`Resultado de ${r.nombre_fase} guardado${n ? ` · ${n} llave(s) siguiente(s) actualizada(s)` : ''}`);
    }
    invalidarCache();
    cargarResultados();
  } catch (err) { toast(err.message, true); }
}

$('#btn-simular-fase').addEventListener('click', async () => {
  try {
    if (Estado.faseResultados === 'Grupos') {
      const partidos = (await partidosDetalle(true)).filter((p) => !p.jugado && p.fase === 'Grupos');
      if (!partidos.length) return toast('La fase de grupos ya está completa');
      for (const p of partidos) {
        await API.put(`/partidos/${p.id}/resultado`, {
          goles_local: Math.floor(Math.random() * 5),
          goles_visitante: Math.floor(Math.random() * 5),
        });
      }
      toast(`Simulados ${partidos.length} partidos de grupos`);
    } else {
      const r = await API.post('/fase-final/simular');
      toast(`Simulada la ronda de ${r.fase} (${r.simulados} partidos)`);
      Estado.faseResultados = r.fase;
    }
    invalidarCache();
    cargarResultados();
  } catch (err) { toast(err.message, true); }
});

// ============================================================================
//  8) FASE FINAL
// ============================================================================
const ORDEN_FASES = ['Dieciseisavos', 'Octavos', 'Cuartos', 'Semifinal', 'Tercer Lugar', 'Final'];

async function cargarFaseFinal() {
  const cuadro = await API.get('/fase-final');
  if (!cuadro.length) {
    $('#bracket-rondas').innerHTML = '<div class="panel"><p class="hint">Aún no se ha generado el cuadro. Usa el botón de arriba (requiere los 32 clasificados).</p></div>';
    return;
  }
  const porFase = {};
  cuadro.forEach((x) => { (porFase[x.nombre_fase] ||= []).push(x); });
  $('#bracket-rondas').innerHTML = ORDEN_FASES.filter((f) => porFase[f]).map((f) => `
    <h3 class="ronda-titulo">${f} (${porFase[f].length})</h3>
    <div id="bracket">${porFase[f].map(llaveHtml).join('')}</div>`).join('');
}
function llaveHtml(x) {
  const gmaps = x.latitud ? `https://www.google.com/maps/search/?api=1&query=${x.latitud},${x.longitud}` : null;
  const jugado = x.jugado;
  const pen = x.penales_local != null && x.penales_visitante != null;
  const gL = x.goles_local, gV = x.goles_visitante;
  const ganaL = jugado && (gL > gV || (gL === gV && pen && x.penales_local > x.penales_visitante));
  const ganaV = jugado && (gV > gL || (gL === gV && pen && x.penales_visitante > x.penales_local));
  const marca = (g, p) => jugado ? `<span class="ff-goles">${g}${pen ? ` (${p})` : ''}</span>` : '';
  const linea = (bnd, nombre, gana, g, p) =>
    `<div class="ff-linea ${gana ? 'ff-gana' : ''}">
       <span>${bandera(bnd)} ${esc(nombre || 'Por definir')}</span>${marca(g, p)}
     </div>`;
  return `<div class="llave ${jugado ? 'jugada' : ''}">
    <div class="fase">${x.nombre_fase} · ${x.llave}${jugado ? ' · ' + ic('fa-flag-checkered') + ' Final' : ''}</div>
    ${linea(x.bandera_local, x.local, ganaL, gL, x.penales_local)}
    ${linea(x.bandera_visitante, x.visitante, ganaV, gV, x.penales_visitante)}
    <div class="sede">${ic('fa-location-dot')} ${esc(x.estadio || '')}${x.ciudad ? ' (' + esc(x.ciudad) + ')' : ''} · ${soloFecha(x.fecha)} ${String(x.horario || '').slice(0, 5)}</div>
    <div class="sede">${ic('fa-ticket')} ${money(precioPorFase(x.nombre_fase))} ${gmaps ? `· <a class="gm" style="padding:.1rem .4rem" href="${gmaps}" target="_blank">${ic('fa-map-location-dot')} Mapa</a>` : ''}</div>
  </div>`;
}
async function generarFaseFinal() {
  try {
    const r = await API.post('/fase-final/generar');
    toast(r.mensaje || 'Cuadro generado');
    // Cambiar a la vista de fase final
    $$('.tab').forEach((t) => t.classList.remove('active'));
    $$('.view').forEach((v) => v.classList.remove('active'));
    $('.tab[data-view="fasefinal"]').classList.add('active');
    $('#view-fasefinal').classList.add('active');
    cargarFaseFinal();
  } catch (err) { toast(err.message, true); }
}
$('#btn-generar-fasefinal').addEventListener('click', generarFaseFinal);

// ============================================================================
//  9) ESTADIOS
// ============================================================================
const PAIS_ISO = { 'Mexico': 'mx', 'México': 'mx', 'Estados Unidos': 'us', 'Canada': 'ca', 'Canadá': 'ca' };
const PAIS_GRAD = {
  mx: 'linear-gradient(135deg,#00512a,#00833f 55%,#0aa04f)',
  us: 'linear-gradient(135deg,#001a4d,#002868 55%,#20458f)',
  ca: 'linear-gradient(135deg,#7a0f08,#d52b1e 55%,#e8564a)',
};

async function cargarEstadios() {
  const estadios = await cargarEstadiosLista(true);
  const cards = await Promise.all(estadios.map(async (e) => {
    const partidos = await API.get(`/estadios/${e.id}/partidos`);
    const compartir = await API.get(`/compartir/estadio/${e.id}`).catch(() => null);
    const gmaps = `https://www.google.com/maps/search/?api=1&query=${e.latitud},${e.longitud}`;
    const iso = PAIS_ISO[e.pais] || 'us';

    const equipos = [...new Map(
      partidos.filter((p) => p.local !== 'Por definir' || p.visitante !== 'Por definir')
        .flatMap((p) => [[p.local, p.bandera_local], [p.visitante, p.bandera_visitante]])
        .filter(([n]) => n && n !== 'Por definir'),
    ).entries()];

    const fases = [...new Set(partidos.map((p) => p.fase))];
    const costosHtml = fases.map((f) =>
      `<span class="chip-costo">${f}: <b>${money(precioPorFase(f))}</b></span>`).join('');

    const partidosHtml = partidos.length
      ? partidos.map((p) => `<div class="partido-mini">
          <span class="pm-fase">${p.fase}</span>
          ${bandera(p.bandera_local)} ${esc(p.local)}
          ${p.jugado ? `<b>${p.goles_local}-${p.goles_visitante}</b>` : 'vs'}
          ${bandera(p.bandera_visitante)} ${esc(p.visitante)}
          · ${ic('fa-calendar-days')} ${soloFecha(p.fecha)} ${ic('fa-clock')} ${String(p.horario || '').slice(0, 5)}
          · ${ic('fa-ticket')} ${money(precioPorFase(p.fase))}</div>`).join('')
      : '<p class="hint">Sin partidos programados.</p>';

    return `<div class="estadio-card">
      <div class="cab" style="background:${PAIS_GRAD[iso]}">
        <span class="cab-flag fi fi-${iso}"></span>
        <div class="cab-ic">${ic('fa-landmark-flag')}</div>
        <div class="nom">${esc(e.nombre)}</div>
        <div class="ciu">${ic('fa-city')} ${esc(e.ciudad)}, ${esc(e.pais)}</div>
        <div class="cab-badges">
          <span class="badge-cap">${ic('fa-users')} ${Number(e.capacidad).toLocaleString('es-MX')}</span>
          ${e.anio_apertura ? `<span class="badge-cap">${ic('fa-calendar')} ${e.anio_apertura}</span>` : ''}
          <span class="badge-cap">${ic('fa-futbol')} ${partidos.length} partidos</span>
        </div>
      </div>
      <div class="cuerpo">
        ${e.descripcion ? `<p class="est-desc">${esc(e.descripcion)}</p>` : ''}
        <div class="dato"><span class="k">${ic('fa-seedling')} Superficie</span><span>${esc(e.superficie || '-')}</span></div>
        <div class="dato"><span class="k">${ic('fa-umbrella')} Techo</span><span>${esc(e.techo || '-')}</span></div>
        <div class="dato"><span class="k">${ic('fa-shield-halved')} Equipo local</span><span>${esc(e.equipo_local || '-')}</span></div>
        <div class="dato"><span class="k">${ic('fa-map-pin')} Coordenadas</span><span>${e.latitud}, ${e.longitud}</span></div>
        <div class="dato"><span class="k">${ic('fa-layer-group')} Fases</span><span>${fases.join(' · ') || '-'}</span></div>
        <div class="est-costos"><span class="k">${ic('fa-ticket')} Boletos:</span> ${costosHtml || '-'}</div>
        ${equipos.length ? `<div class="est-equipos">${equipos.map(([n, b]) =>
          `<span class="chip">${bandera(b)} ${esc(n)}</span>`).join('')}</div>` : ''}
        <div class="share" style="margin-top:.6rem">
          <a class="gm" href="${gmaps}" target="_blank">${ic('fa-map-location-dot')} Google Maps</a>
          ${compartir ? linksCompartir(compartir.enlaces) : ''}
        </div>
        <details><summary>${ic('fa-calendar-days')} Ver los ${partidos.length} partidos (equipos, fechas, horarios y costos)</summary>${partidosHtml}</details>
      </div>
    </div>`;
  }));
  $('#estadios-grid').innerHTML = cards.join('');
}

// ============================================================================
//  10) GEOLOCALIZACION
// ============================================================================
async function cargarGeo() {
  const estadios = await cargarEstadiosLista();
  const sels = await selDetalle();
  Mapa.pintarEstadios(estadios);
  Mapa.pintarCapitales(sels);
  Mapa.mostrarCapa('estadios', $('#chk-estadios').checked);
  Mapa.mostrarCapa('capitales', $('#chk-capitales').checked);
  setTimeout(() => Mapa.map.invalidateSize(), 100);

  $('#chk-estadios').onchange = (e) => Mapa.mostrarCapa('estadios', e.target.checked);
  $('#chk-capitales').onchange = (e) => Mapa.mostrarCapa('capitales', e.target.checked);
  $('#ruta-estadio').innerHTML = estadios.map((e) => opt(e.id, `${e.nombre} (${e.ciudad})`)).join('');
}

$('#btn-mi-ubicacion').addEventListener('click', () => {
  if (!navigator.geolocation) return toast('Geolocalización no disponible', true);
  navigator.geolocation.getCurrentPosition(async (pos) => {
    Estado.miUbicacion = { lat: pos.coords.latitude, lon: pos.coords.longitude };
    await mostrarRuta();
    toast('Ubicación obtenida');
  }, () => {
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
  $('#share-ruta').innerHTML = `<span class="hint" style="width:100%">Distancia aproximada: ${r.km} km</span>` + linksCompartir(r.enlaces, r.google_maps);
}
$('#ruta-estadio').addEventListener('change', mostrarRuta);

// ============================================================================
//  11) BOLETOS
// ============================================================================
async function cargarBoletos() {
  Estado.usuarios = await API.get('/usuarios');
  const partidos = await partidosDetalle();
  $('#bol-usuario').innerHTML = Estado.usuarios.map((u) => opt(u.id, u.nombre)).join('');
  $('#bol-partido').innerHTML = partidos.map((p) =>
    opt(p.id, `${p.local} vs ${p.visitante} — ${p.estadio || 's/e'} (${soloFecha(p.fecha)})`)).join('');

  const boletos = await API.get('/boletos/detalle');
  $('#tabla-boletos').innerHTML = boletos.length ? tabla(
    [{ t: 'Usuario' }, { t: 'Estadio' }, { t: 'Selección' }, { t: 'Fecha' }, { t: 'Horario' }, { t: 'Costo', num: true }],
    boletos, (b) => `<tr><td>${esc(b.usuario)}</td><td>${esc(b.estadio)}</td><td>${bandera(b.bandera)} ${esc(b.seleccion || '-')}</td>` +
      `<td>${soloFecha(b.fecha)}</td><td>${String(b.horario || '').slice(0, 5)}</td><td class="num">${money(b.costo)}</td></tr>`,
  ) : '<p class="hint">Aún no hay boletos vendidos.</p>';
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
  try {
    const partido = await API.get(`/partidos/${d.id_partido}`);
    await API.post('/boletos', {
      id_usuario: d.id_usuario, id_partido: d.id_partido,
      id_estadio: partido.id_estadio, id_seleccion: partido.id_equipo_local,
      fecha: partido.fecha, horario: partido.horario,
      costo: d.costo || precioPorFase(partido.fase),
    });
    toast('Boleto comprado');
    e.target.reset();
    cargarBoletos();
  } catch (err) { toast(err.message, true); }
});

// ============================================================================
//  12) ADMINISTRADOR
// ============================================================================
async function cargarAdmin() {
  await cargarContinentes();
  await cargarGruposLista();
  const sels = await selDetalle(true);
  const estadios = await cargarEstadiosLista(true);

  $('#form-seleccion [name=id_continente]').innerHTML =
    opt('', 'Continente / confederación...') + Estado.continentes.map((c) => opt(c.id_continente, `${c.nombre} (${c.confederacion})`)).join('');

  $('#asig-grupo').innerHTML = Estado.grupos.map((g) => opt(g.id, `Grupo ${g.nombre}`)).join('');
  const selSel = sels.map((s) => opt(s.id, s.nombre)).join('');
  $('#sel-asignar').innerHTML = selSel;
  $('#part-local').innerHTML = selSel;
  $('#part-visitante').innerHTML = selSel;
  $('#part-grupo').innerHTML = opt('', 'Sin grupo (fase final)') + Estado.grupos.map((g) => opt(g.id, `Grupo ${g.nombre}`)).join('');
  $('#part-estadio').innerHTML = opt('', 'Estadio...') + estadios.map((e) => opt(e.id, e.nombre)).join('');

  $('#admin-conteo').textContent = sels.length;
  $('#admin-tabla-selecciones').innerHTML = tabla(
    [{ t: 'Selección' }, { t: 'País' }, { t: 'Confed.' }, { t: 'Ranking', num: true }, { t: '' }],
    sels, (s) => `<tr><td>${bandera(s.bandera)} ${esc(s.nombre)}</td><td>${esc(s.pais)}</td><td>${esc(s.confederacion)}</td>` +
      `<td class="num">${s.ranking ?? '-'}</td><td><button class="btn-del" data-id="${s.id}">${ic('fa-trash')} Eliminar</button></td></tr>`,
  );
  $$('#admin-tabla-selecciones .btn-del').forEach((b) => b.addEventListener('click', async () => {
    if (!confirm('¿Eliminar esta selección?')) return;
    try { await API.del(`/selecciones/${b.dataset.id}`); invalidarCache(); toast('Selección eliminada'); cargarAdmin(); }
    catch (err) { toast(err.message, true); }
  }));
}

$('#form-seleccion').addEventListener('submit', async (e) => {
  e.preventDefault();
  try {
    await API.post('/selecciones', formData(e.target));
    invalidarCache();
    toast('Selección agregada');
    e.target.reset();
    cargarAdmin();
  } catch (err) { toast(err.message, true); }
});

$('#form-estadio').addEventListener('submit', async (e) => {
  e.preventDefault();
  try {
    await API.post('/estadios', formData(e.target));
    invalidarCache();
    toast('Estadio agregado');
    e.target.reset();
    cargarAdmin();
  } catch (err) { toast(err.message, true); }
});

$('#form-asignar').addEventListener('submit', async (e) => {
  e.preventDefault();
  const d = formData(e.target);
  try {
    await API.post(`/grupos/${d.id_grupo}/asignar`, { id_seleccion: d.id_seleccion });
    toast('Selección asignada al grupo');
  } catch (err) { toast(err.message, true); }
});

$('#form-partido').addEventListener('submit', async (e) => {
  e.preventDefault();
  try {
    await API.post('/partidos', formData(e.target));
    invalidarCache();
    toast('Partido programado');
    e.target.reset();
  } catch (err) { toast(err.message, true); }
});

// ============================================================================
//  13) ACERCA DEL PROYECTO
// ============================================================================
async function cargarAcerca() {
  $('#lista-modulos').innerHTML = MODULOS.map((m) => `<li>${m}</li>`).join('');
}

// ---- Arranque ----
cargarInicio().catch((e) => toast(e.message, true));
