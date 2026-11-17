import 'dotenv/config';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { pool } from '../db.js';

if (!pool) {
  console.error('Falta DATABASE_URL en backend/.env');
  process.exit(1);
}
try {
  const path = fileURLToPath(new URL('../../database/004_catalogos_voluntariado.sql', import.meta.url));
  const sql = await readFile(path, 'utf8');
  await pool.query(sql);
  const result = await pool.query(`SELECT
      (SELECT COUNT(*) FROM comunidades) AS comunidades,
      (SELECT COUNT(*) FROM habilidades) AS habilidades,
      (SELECT COUNT(*) FROM lenguas) AS lenguas,
      (SELECT COUNT(*) FROM variantes) AS variantes`);
  console.info('Catalogos de voluntariado cargados sin borrar datos.');
  console.table(result.rows);
} catch (error) {
  console.error('Error al cargar catalogos:', error.code || error.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
