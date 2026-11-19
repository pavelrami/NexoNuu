import { Router } from 'express';
import { pool } from '../db.js';

// Indicadores publicos agregados de la plataforma (Incremento 7).
// Solo devuelve conteos: nunca nombres, correos, telefonos ni datos de participantes.
// Las jornadas DEMO se cuentan aparte para que la interfaz pueda decirlo con claridad.
const router = Router();

router.get('/', async (_req, res) => {
  res.set('Cache-Control', 'public, max-age=60');
  if (!pool) return res.status(503).json({ code: 'BASE_NO_CONFIGURADA', message: 'La base de datos no está configurada.' });
  try {
    const { rows } = await pool.query(`
      WITH vigentes AS (
        SELECT j.id, j.es_demo, c.municipio, c.region
        FROM jornadas j
        JOIN instituciones i ON i.id = j.institucion_id
        JOIN comunidades c ON c.id = j.comunidad_id
        WHERE j.estado = 'publicada' AND j.inicio >= CURRENT_TIMESTAMP
          AND i.estado_verificacion = 'verificada'
      )
      SELECT
        (SELECT COUNT(*) FROM vigentes)::int AS jornadas_vigentes,
        (SELECT COUNT(*) FROM vigentes WHERE es_demo)::int AS jornadas_vigentes_demo,
        (SELECT COUNT(DISTINCT municipio) FROM vigentes)::int AS municipios_con_jornadas,
        (SELECT COUNT(*) FROM jornadas WHERE estado = 'finalizada')::int AS jornadas_finalizadas,
        (SELECT COUNT(*) FROM instituciones WHERE estado_verificacion = 'verificada')::int AS instituciones_verificadas,
        (SELECT COUNT(*) FROM perfiles_voluntario)::int AS perfiles_voluntariado,
        (SELECT COUNT(*) FROM lenguas)::int AS lenguas_catalogo,
        (SELECT COUNT(DISTINCT region) FROM comunidades WHERE region IS NOT NULL)::int AS regiones_registradas
    `);
    return res.json({ ...rows[0], generado: new Date().toISOString() });
  } catch (error) {
    console.error('Error de estadisticas publicas:', error.code || error.message);
    if (error.code === '42P01' || error.code === '42703') {
      return res.status(503).json({ code: 'ESQUEMA_PENDIENTE', message: 'Faltan migraciones de la base de datos.' });
    }
    return res.status(500).json({ code: 'ESTADISTICAS_FALLIDAS', message: 'No fue posible consultar los indicadores.' });
  }
});

export default router;
