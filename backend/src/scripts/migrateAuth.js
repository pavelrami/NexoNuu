import 'dotenv/config';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { pool } from '../db.js';

if (!pool) {
  console.error('Debes configurar DATABASE_URL en backend/.env');
  process.exit(1);
}
try {
  const sql = await readFile(fileURLToPath(new URL('../../database/001_autenticacion.sql', import.meta.url)), 'utf8');
  await pool.query(sql);
  console.info('Migracion 001 aplicada. Jornada y otras tablas conservadas.');
} catch (error) {
  console.error('No se aplico la migracion:', error.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
