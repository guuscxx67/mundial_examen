// Conexion a PostgreSQL mediante un pool de conexiones (node-postgres).
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

export const pool = new Pool({
  host: process.env.PGHOST || 'localhost',
  port: Number(process.env.PGPORT) || 5432,
  database: process.env.PGDATABASE || 'mundial2026',
  user: process.env.PGUSER || 'mundial',
  password: process.env.PGPASSWORD || 'mundial2026',
  max: 10,
  idleTimeoutMillis: 30000,
});

pool.on('error', (err) => {
  console.error('Error inesperado en el pool de PostgreSQL:', err);
});

// Atajo para ejecutar consultas con parametros ($1, $2, ...)
export const query = (text, params) => pool.query(text, params);

export default pool;
