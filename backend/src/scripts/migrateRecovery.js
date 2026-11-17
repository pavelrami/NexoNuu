import 'dotenv/config';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { pool } from '../db.js';
if (!pool) { console.error('Configura DATABASE_URL en backend/.env'); process.exit(1); }
try {
  const sql = await readFile(fileURLToPath(new URL('../../database/002_recuperacion_password.sql', import.meta.url)), 'utf8');
  await pool.query(sql);
  console.info('Migracion 002 aplicada sin eliminar datos existentes.');
} catch (error) {
  console.error('Fallo la migracion 002:', error.message);
  process.exitCode = 1;
} finally { await pool.end(); }
