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
