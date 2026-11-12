import pg from 'pg';
const { Pool } = pg;

export const pool = process.env.DATABASE_URL
  ? new Pool({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 3500, max: 5 })
  : null;

if (pool) pool.on('error', (err) => console.error('Error de conexion PostgreSQL:', err.message));
