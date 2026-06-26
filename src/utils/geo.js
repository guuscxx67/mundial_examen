// ============================================================================
//  Utilidades de Geolocalizacion y enlaces a mapas / redes sociales
// ============================================================================

const RADIO_TIERRA_KM = 6371;
const rad = (g) => (g * Math.PI) / 180;

/** Distancia en kilometros entre dos coordenadas (formula de Haversine). */
export function distanciaKm(lat1, lon1, lat2, lon2) {
  const dLat = rad(lat2 - lat1);
  const dLon = rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(RADIO_TIERRA_KM * c * 100) / 100;
}

/** Enlace a Google Maps para un punto. */
export function googleMapsPunto(lat, lon, etiqueta = '') {
  const q = etiqueta ? `${lat},${lon}(${encodeURIComponent(etiqueta)})` : `${lat},${lon}`;
  return `https://www.google.com/maps/search/?api=1&query=${lat},${lon}`;
}

/** Enlace a Google Maps con indicaciones (ruta) entre origen y destino. */
export function googleMapsRuta(latO, lonO, latD, lonD) {
  return `https://www.google.com/maps/dir/?api=1&origin=${latO},${lonO}&destination=${latD},${lonD}&travelmode=driving`;
}

/**
 * Construye los enlaces para compartir un texto/URL en redes sociales.
 * Cumple el requisito de "Compartir grupo / clasificacion / estadio / ruta".
 */
export function enlacesParaCompartir(texto, url) {
  const t = encodeURIComponent(texto);
  const u = encodeURIComponent(url || '');
  return {
    whatsapp: `https://api.whatsapp.com/send?text=${t}%20${u}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${u}&quote=${t}`,
    // Instagram no permite compartir por URL directa; se comparte el texto/imagen
    instagram: `https://www.instagram.com/?url=${u}`,
    telegram: `https://t.me/share/url?url=${u}&text=${t}`,
  };
}
