import 'dotenv/config';
import { readFile } from 'node:fs/promises';
import { pool } from '../db.js';
if (!pool) { console.error('DATABASE_URL no configurada.'); process.exit(1); }
try {
  const sql = await readFile(new URL('../../database/007_historial_jornadas.sql', import.meta.url), 'utf8');
  await pool.query(sql);
  console.log('Migracion 007 aplicada: historial de jornadas preparado sin eliminar datos.');
} catch (error) {
  console.error('No se pudo aplicar la migracion 007:', error.code || error.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
