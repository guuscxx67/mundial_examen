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
    return L.divIcon({ className: 'mk', html: '🏟️', iconSize: [24, 24] });
  },
  iconoCapital() {
    return L.divIcon({ className: 'mk', html: '🚩', iconSize: [18, 18] });
  },

  pintarEstadios(estadios) {
    this.init();
    this.capas.estadios.clearLayers();
    estadios.forEach((e) => {
      const m = L.marker([e.latitud, e.longitud], { icon: this.iconoEstadio() });
      m.bindPopup(
        `<b>${e.nombre}</b><br>${e.ciudad}, ${e.pais}<br>` +
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
      m.bindPopup(`<b>${s.bandera || ''} ${s.nombre}</b><br>${s.capital || ''}<br>Ranking FIFA: ${s.ranking || '-'}`);
      this.capas.capitales.addLayer(m);
    });
  },

  centrar(lat, lon, zoom = 12) {
    this.init();
    this.map.setView([lat, lon], zoom);
  },
};
