// Envuelve docs/entrega-1.md en un HTML autocontenido, listo para imprimir a PDF.
// Renderiza Markdown (marked) y el diagrama Entidad-Relacion (mermaid) en el navegador.
// Uso: node scripts/generar-html.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const md = fs.readFileSync(path.join(root, 'docs', 'entrega-1.md'), 'utf8');

const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Entrega 1 - Mundial FIFA 2026</title>
<script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
<script type="module">
  import mermaid from 'https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.esm.min.mjs';
  window.__mermaid = mermaid;
</script>
<style>
  body { font-family: "Segoe UI", system-ui, sans-serif; max-width: 980px; margin: 0 auto;
         padding: 2rem; color: #1a2330; line-height: 1.55; }
  h1 { color: #00833f; border-bottom: 3px solid #00833f; padding-bottom: .3rem; }
  h2 { color: #002868; border-bottom: 1px solid #ccc; padding-bottom: .2rem; margin-top: 2rem; }
  h3 { color: #d52b1e; margin-top: 1.4rem; }
  table { border-collapse: collapse; width: 100%; margin: .8rem 0; font-size: .85rem; }
  th, td { border: 1px solid #cdd6e0; padding: .35rem .5rem; text-align: left; }
  th { background: #eef3f8; }
  code { background: #f0f3f7; padding: .1rem .3rem; border-radius: 3px; font-size: .85em; }
  pre { background: #0f1620; color: #e8eef5; padding: 1rem; border-radius: 8px; overflow-x: auto; font-size: .82rem; }
  pre code { background: none; color: inherit; }
  .mermaid { background: #fff; text-align: center; margin: 1rem 0; }
  hr { border: none; border-top: 1px solid #ddd; margin: 1.5rem 0; }
  @media print {
    body { padding: 0; max-width: none; }
    h2 { page-break-before: auto; }
    pre, table, .mermaid { page-break-inside: avoid; }
  }
  .aviso { background: #fff8e1; border: 1px solid #f5c518; padding: .6rem 1rem; border-radius: 6px;
           font-size: .9rem; }
</style>
</head>
<body>
<div class="aviso no-print">Para generar el PDF: pulse <b>Ctrl + P</b> y elija <b>Guardar como PDF</b>.</div>
<div id="contenido"></div>
<script id="fuente" type="text/plain"></script>
<script>
  const MD = ${JSON.stringify(md)};
  document.getElementById('contenido').innerHTML = marked.parse(MD);
  // Convertir bloques \`\`\`mermaid en divs para mermaid.js
  document.querySelectorAll('code.language-mermaid').forEach((c) => {
    const div = document.createElement('div');
    div.className = 'mermaid';
    div.textContent = c.textContent;
    c.closest('pre').replaceWith(div);
  });
  // Renderizar mermaid cuando el modulo cargue
  const intentarMermaid = () => {
    if (window.__mermaid) { window.__mermaid.initialize({ startOnLoad: false }); window.__mermaid.run(); }
    else setTimeout(intentarMermaid, 200);
  };
  intentarMermaid();
</script>
</body>
</html>`;

fs.writeFileSync(path.join(root, 'docs', 'entrega-1.html'), html);
console.log('docs/entrega-1.html generado:', html.length, 'caracteres');
