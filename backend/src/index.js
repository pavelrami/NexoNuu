import 'dotenv/config';
import express from 'express';
import { pool } from './db.js';
import authRoutes from './routes/auth.js';
import phoneRoutes from './routes/phone.js';

const app = express();
const port = Number(process.env.PORT || 3001);
app.disable('x-powered-by');
app.use(express.json({ limit: '100kb' }));

app.get('/api/health', async (_req, res) => {
  if (!pool) return res.json({ api: 'conectada', database: 'sin_configurar' });
  try {
    await pool.query('SELECT 1');
    res.json({ api: 'conectada', database: 'conectada' });
  } catch {
    res.json({ api: 'conectada', database: 'no_disponible' });
  }
});

app.use('/api/auth', authRoutes);
app.use('/api/auth/telefono', phoneRoutes);

// Por el momento solo expondremos informacion de jornadas publicadas y verificadas.
app.get('/api/jornadas', async (_req, res) => {
  if (!pool) return res.status(503).json({ code: 'BASE_NO_CONFIGURADA', message: 'La base de datos del prototipo todavia no esta configurada.' });
  try {
    const result = await pool.query(`
      SELECT j.id, j.titulo, j.descripcion, j.inicio, j.fin,
             c.nombre AS comunidad, c.municipio, c.region,
             i.nombre AS institucion
      FROM jornadas j
      INNER JOIN instituciones i ON i.id = j.institucion_id
      INNER JOIN comunidades c ON c.id = j.comunidad_id
      WHERE j.estado = 'publicada'
        AND i.estado_verificacion = 'verificada'
        AND j.inicio >= CURRENT_TIMESTAMP
      ORDER BY j.inicio ASC
      LIMIT 30
    `);
    res.json({ jornadas: result.rows });
  } catch (error) {
    console.error('Fallo en /api/jornadas:', error.message);
    if (error.code === '42P01') return res.status(503).json({ code: 'ESQUEMA_PENDIENTE', message: 'Debes instalar el esquema SQL inicial.' });
    res.status(500).json({ code: 'CONSULTA_FALLIDA', message: 'No fue posible consultar las jornadas.' });
  }
});

app.use((req, res) => res.status(404).json({ code: 'NO_ENCONTRADO', message: 'Ruta no encontrada' }));
app.listen(port, '127.0.0.1', () => console.log(`Nexo Nuu API disponible en http://localhost:${port}`));
