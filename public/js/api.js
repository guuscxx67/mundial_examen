// Cliente ligero de la API REST
const API = {
  base: '/api',
  async get(path) {
    const r = await fetch(this.base + path);
    if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || r.statusText);
    return r.json();
  },
  async send(method, path, body) {
    const r = await fetch(this.base + path, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(data.error || r.statusText);
    return data;
  },
  post(path, body) { return this.send('POST', path, body); },
  put(path, body) { return this.send('PUT', path, body); },
  del(path) { return this.send('DELETE', path); },
};

// Notificacion tipo "toast"
function toast(msg, esError = false) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = 'toast show' + (esError ? ' error' : '');
  setTimeout(() => { t.className = 'toast'; }, 2800);
}

// Icono de interfaz (Font Awesome). ic('fa-house') -> <i class="fa-solid fa-house">
function ic(name, extra = '') {
  return `<i class="fa-solid ${name}${extra ? ' ' + extra : ''}" aria-hidden="true"></i>`;
}

// Deriva el codigo ISO 3166 de una bandera-emoji (indicadores regionales o
// secuencias de etiquetas como Inglaterra/Escocia/Gales).
function isoBandera(emoji) {
  if (!emoji) return null;
  const cps = [...emoji].map((c) => c.codePointAt(0));
  if (cps.includes(0x1F3F4)) { // bandera con etiquetas (subdivisiones del Reino Unido)
    const tags = cps.filter((cp) => cp >= 0xE0061 && cp <= 0xE007A)
      .map((cp) => String.fromCharCode(cp - 0xE0000)).join('');
    return tags.startsWith('gb') ? 'gb-' + tags.slice(2) : null;
  }
  const letras = cps.filter((cp) => cp >= 0x1F1E6 && cp <= 0x1F1FF)
    .map((cp) => String.fromCharCode(cp - 0x1F1E6 + 65));
  return letras.length === 2 ? letras.join('').toLowerCase() : null;
}

// Icono de bandera de pais (libreria flag-icons). Si no se reconoce, icono generico.
function bandera(emoji, extra = '') {
  const iso = isoBandera(emoji);
  const cls = extra ? ' ' + extra : '';
  return iso
    ? `<span class="fi fi-${iso}${cls}"></span>`
    : `<i class="fa-solid fa-flag flag-fallback${cls}" aria-hidden="true"></i>`;
}

// Convierte un formulario en objeto (ignorando campos vacios)
function formData(form) {
  const obj = {};
  for (const el of form.elements) {
    if (!el.name) continue;
    if (el.value === '') continue;
    obj[el.name] = el.type === 'number' ? Number(el.value) : el.value;
  }
  return obj;
}
