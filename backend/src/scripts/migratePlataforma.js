import 'dotenv/config';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { pool } from '../db.js';

if (!pool) { console.error('DATABASE_URL no configurada'); process.exit(1); }
try {
  const sql = await readFile(fileURLToPath(new URL('../../database/009_plataforma_funcional.sql', import.meta.url)), 'utf8');
  await pool.query(sql);
  console.log('Migracion 009 aplicada: Google, auditoria de usuarios y moderacion. No se eliminaron datos.');
} catch (e) {
  console.error('No se aplico la migracion 009:', e.message);
  process.exitCode = 1;
} finally { await pool.end(); }
