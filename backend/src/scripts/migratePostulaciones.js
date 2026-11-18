import 'dotenv/config';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { pool } from '../db.js';
if (!pool) {console.error('DATABASE_URL no configurada'); process.exit(1);}
try {
  const filename = fileURLToPath(new URL('../../database/005_control_postulaciones.sql',import.meta.url));
  await pool.query(await readFile(filename,'utf8'));
  console.log('Migracion 005 aplicada: las postulaciones permanecen deshabilitadas por defecto.');
} catch(e) {console.error('Error de migracion 005:',e.code||e.message);process.exitCode=1;}
finally {await pool.end();}
