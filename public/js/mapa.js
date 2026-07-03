// ============================================================================
//  Visualizacion en mapas (Geolocalizacion) con Leaflet + enlaces Google Maps
// ============================================================================
const Mapa = {
  map: null,
  capas: { estadios: null, capitales: null },

  init() {
    if (this.map) return;
    // Centro aproximado entre Mexico, EEUU y Canada
    this.map = L.map('mapa').setView([37.5, -97], 3);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 18,
      attribution: '© OpenStreetMap',
    }).addTo(this.map);
    this.capas.estadios = L.layerGroup().addTo(this.map);
    this.capas.capitales = L.layerGroup().addTo(this.map);
  },

  gmaps(lat, lon) {
    return `https://www.google.com/maps/search/?api=1&query=${lat},${lon}`;
  },

  iconoEstadio() {
    return L.divIcon({
      className: 'mk-est', html: '<i class="fa-solid fa-location-dot"></i>',
      iconSize: [26, 26], iconAnchor: [13, 26], popupAnchor: [0, -24],
    });
  },
  iconoCapital() {
    return L.divIcon({
      className: 'mk-cap', html: '<i class="fa-solid fa-flag"></i>',
      iconSize: [20, 20], iconAnchor: [10, 20], popupAnchor: [0, -16],
    });
  },

  // Icono de bandera (usa el helper global 'bandera' si esta disponible)
  _bandera(emoji) {
    return (typeof bandera === 'function') ? bandera(emoji) : (emoji || '');
  },

  pintarEstadios(estadios) {
    this.init();
    this.capas.estadios.clearLayers();
    estadios.forEach((e) => {
      const m = L.marker([e.latitud, e.longitud], { icon: this.iconoEstadio() });
      m.bindPopup(
        `<b><i class="fa-solid fa-location-dot"></i> ${e.nombre}</b><br>${e.ciudad}, ${e.pais}<br>` +
        `Capacidad: ${Number(e.capacidad).toLocaleString()}<br>` +
        `<a href="${this.gmaps(e.latitud, e.longitud)}" target="_blank">Ver en Google Maps</a>`
      );
      this.capas.estadios.addLayer(m);
    });
  },

  pintarCapitales(selecciones) {
    this.init();
    this.capas.capitales.clearLayers();
    selecciones.forEach((s) => {
      if (s.latitud == null || s.longitud == null) return;
      const m = L.marker([s.latitud, s.longitud], { icon: this.iconoCapital() });
      m.bindPopup(`<b>${this._bandera(s.bandera)} ${s.nombre}</b><br>${s.capital || ''}<br>Ranking FIFA: ${s.ranking || '-'}`);
      this.capas.capitales.addLayer(m);
    });
  },

  centrar(lat, lon, zoom = 12) {
    this.init();
    this.map.setView([lat, lon], zoom);
  },

  // Muestra u oculta una capa ('estadios' | 'capitales') en el mapa
  mostrarCapa(nombre, visible) {
    this.init();
    const capa = this.capas[nombre];
    if (!capa) return;
    if (visible) { if (!this.map.hasLayer(capa)) capa.addTo(this.map); }
    else if (this.map.hasLayer(capa)) this.map.removeLayer(capa);
  },
};
