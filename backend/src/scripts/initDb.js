import 'dotenv/config';
import { readFile } from 'node:fs/promises';
import pg from 'pg';
const { Client } = pg;

if (!process.env.DATABASE_URL) {
  console.error('Falta DATABASE_URL en backend/.env. Crea primero una base PostgreSQL local vacia.');
  process.exit(1);
}
const client = new Client({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 3500 });
try {
  const sql = await readFile(new URL('../../database/schema.sql', import.meta.url), 'utf8');
  await client.connect();
  await client.query(sql);
  console.log('Esquema preliminar instalado en la base de datos local vacia.');
} catch (error) {
  console.error('No se pudo instalar el esquema:', error.message);
  process.exitCode = 1;
} finally {
  await client.end().catch(() => {});
}
