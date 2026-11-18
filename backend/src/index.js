import 'dotenv/config';
import express from 'express';
import { pool } from './db.js';
import authRoutes from './routes/auth.js';
import phoneRoutes from './routes/phone.js';
import volunteerRoutes from './routes/voluntarios.js';
import jornadasRoutes from './routes/jornadas.js';
import postulacionesRoutes from './routes/postulaciones.js';
import institucionesRoutes from './routes/instituciones.js';
import adminRoutes from './routes/admin.js';

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
app.use('/api/voluntarios', volunteerRoutes);

// Incremento 4.1: búsqueda pública de jornadas y sus filtros.
app.use('/api/jornadas', jornadasRoutes);
app.use('/api/postulaciones', postulacionesRoutes);
app.use('/api/instituciones', institucionesRoutes);
app.use('/api/admin', adminRoutes);

app.use((req, res) => res.status(404).json({ code: 'NO_ENCONTRADO', message: 'Ruta no encontrada' }));
app.listen(port, '127.0.0.1', () => console.log(`Nexo Nuu API disponible en http://localhost:${port}`));
