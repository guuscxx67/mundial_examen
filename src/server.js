// ============================================================================
//  Servidor Express  -  API REST + sirve el frontend (public/)
//  Sistema de Simulacion, Administracion y Geolocalizacion del Mundial 2026
// ============================================================================
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import api from './routes/index.js';
import { pool } from './db/pool.js';
import FaseFinalService from './services/FaseFinalService.js';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Archivos estaticos del frontend
app.use(express.static(path.join(__dirname, '..', 'public')));

// Salud del sistema
app.get('/api/health', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT NOW() AS hora, COUNT(*) AS selecciones FROM selecciones');
    res.json({ ok: true, hora: rows[0].hora, selecciones: Number(rows[0].selecciones) });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// API REST
app.use('/api', api);

// Manejo central de errores
app.use((err, req, res, next) => {
  console.error('Error API:', err.message);
  res.status(400).json({ error: err.message });
});

// Si la fase de grupos ya esta completa y el cuadro de eliminatorias no
// existe, se genera solo: asi la liga grupos -> dieciseisavos es visible
// desde el primer arranque.
async function asegurarFaseFinal() {
  try {
    const { rows } = await pool.query('SELECT COUNT(*) AS n FROM fase_final');
    if (Number(rows[0].n) === 0) {
      const r = await FaseFinalService.generar();
      console.log(`  Fase final generada automaticamente (${r.clasificados} clasificados).`);
    }
  } catch (e) {
    console.log(`  Fase final no generada aun: ${e.message}`);
  }
}

app.listen(PORT, () => {
  console.log(`\n  Mundial FIFA 2026  ->  http://localhost:${PORT}`);
  console.log(`  API REST           ->  http://localhost:${PORT}/api/health\n`);
  asegurarFaseFinal();
});
