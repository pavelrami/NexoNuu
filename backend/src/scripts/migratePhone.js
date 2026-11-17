import 'dotenv/config';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { pool } from '../db.js';

if (!pool) { console.error('Falta DATABASE_URL en backend/.env'); process.exit(1); }
try {
  const sql = await readFile(fileURLToPath(new URL('../../database/003_verificacion_telefono.sql', import.meta.url)), 'utf8');
  await pool.query(sql);
  console.info('Migracion 003 aplicada. Se conservaron usuarios, jornadas y sesiones.');
} catch (error) {
  console.error('Error en migracion 003:', error.message);
  process.exitCode = 1;
} finally { await pool.end(); }
