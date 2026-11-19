import { Router } from 'express';
import { pool } from '../db.js';
import { buildJornadasQuery, parseJornadasFilters } from '../lib/jornadasFilters.js';
import { allowDemo, canApplyToJornada } from '../lib/postulacionesRules.js';

const router = Router();
router.use((_req, res, next) => {
  res.set('Cache-Control', 'no-store');
  if (!pool) return res.status(503).json({ code: 'BASE_NO_CONFIGURADA', message: 'La base de datos no está configurada.' });
  next();
});

// Catálogos públicos. Las lenguas se ofrecen como filtro únicamente cuando
// aparecen en una jornada futura publicada por una institución verificada.
router.get('/opciones', async (_req, res) => {
  try {
    const [comunidades, lenguas] = await Promise.all([
      pool.query(`SELECT DISTINCT municipio, region FROM comunidades
        WHERE municipio IS NOT NULL AND TRIM(municipio) <> ''
        ORDER BY region NULLS LAST, municipio LIMIT 500`),
      pool.query(`SELECT DISTINCT l.id, l.nombre FROM lenguas l
        JOIN jornada_lengua jl ON jl.lengua_id = l.id
        JOIN jornadas j ON j.id = jl.jornada_id
        JOIN instituciones i ON i.id = j.institucion_id
        WHERE j.estado = 'publicada' AND j.inicio >= CURRENT_TIMESTAMP
        AND i.estado_verificacion = 'verificada'
        ORDER BY l.nombre LIMIT 100`)
    ]);
    const regiones = [...new Set(comunidades.rows.map(c => c.region).filter(Boolean))];
    return res.json({ regiones, municipios: comunidades.rows, lenguas: lenguas.rows });
  } catch (error) {
    console.error('Error de opciones de jornadas:', error.code || error.message);
    return res.status(500).json({ code: 'OPCIONES_FALLIDAS', message: 'No fue posible consultar los filtros.' });
  }
});

// Incremento 7: referencia historica publica. Solo jornadas finalizadas de
// instituciones verificadas; no admite postulaciones ni expone participantes.
router.get('/historicas', async (_req, res) => {
  try {
    const result = await pool.query(`
      SELECT j.id, j.titulo, j.descripcion, j.inicio, j.fin, j.es_demo,
             c.nombre AS comunidad, c.municipio, c.region,
             i.nombre AS institucion, i.sitio_web AS institucion_sitio
      FROM jornadas j
      JOIN instituciones i ON i.id = j.institucion_id
      JOIN comunidades c ON c.id = j.comunidad_id
      WHERE j.estado = 'finalizada' AND i.estado_verificacion = 'verificada'
      ORDER BY j.inicio DESC, j.id DESC
      LIMIT 24`);
    return res.json({ jornadas: result.rows });
  } catch (error) {
    console.error('Error de jornadas historicas:', error.code || error.message);
    return res.status(500).json({ code: 'HISTORICAS_FALLIDAS', message: 'No fue posible consultar las jornadas finalizadas.' });
  }
});

// Detalle publico: solo jornadas futuras publicadas por instituciones verificadas.
// Nunca devuelve cuentas, telefonos o informacion privada de participantes.
router.get('/:id', async (req, res) => {
  if (!/^[1-9]\d{0,14}$/.test(req.params.id)) {
    return res.status(400).json({ code: 'ID_INVALIDO', message: 'Identificador de jornada no valido.' });
  }
  try {
    const result = await pool.query(`
      SELECT j.id, j.titulo, j.descripcion, j.inicio, j.fin, j.cupo,
             j.es_demo, j.postulaciones_habilitadas, j.estado, i.estado_verificacion,
             c.nombre AS comunidad, c.municipio, c.region,
             i.nombre AS institucion, i.descripcion AS institucion_descripcion,
             i.sitio_web AS institucion_sitio,
             COALESCE((SELECT json_agg(json_build_object('nombre', l.nombre,
                       'variante', v.nombre, 'prioridad', jl.prioridad) ORDER BY l.nombre)
               FROM jornada_lengua jl JOIN lenguas l ON l.id = jl.lengua_id
               LEFT JOIN variantes v ON v.id = jl.variante_id
               WHERE jl.jornada_id = j.id), '[]'::json) AS lenguas
      FROM jornadas j
      JOIN instituciones i ON i.id = j.institucion_id
      JOIN comunidades c ON c.id = j.comunidad_id
      WHERE j.id = $1 AND j.estado = 'publicada'
        AND j.inicio >= CURRENT_TIMESTAMP
        AND i.estado_verificacion = 'verificada'
      LIMIT 1`, [req.params.id]);
    if (!result.rows.length) return res.status(404).json({
      code: 'JORNADA_NO_DISPONIBLE',
      message: 'La jornada no existe o no esta disponible como convocatoria vigente.'
    });
    const jornada = result.rows[0];
    const puedePostular = canApplyToJornada(jornada, { demo: allowDemo() });
    res.json({ jornada: { ...jornada, puedePostular } });
  } catch (error) {
    console.error('Error en detalle de jornada:', error.code || error.message);
    res.status(500).json({ code: 'DETALLE_FALLIDO', message: 'No fue posible consultar esta jornada.' });
  }
});

router.get('/', async (req, res) => {
  const parsed = parseJornadasFilters(req.query);
  if (!parsed.ok) return res.status(400).json({ code: 'FILTROS_INVALIDOS', message: parsed.message });
  try {
    const result = await pool.query(buildJornadasQuery(parsed.value));
    const total = result.rows.length ? Number(result.rows[0].total_coincidencias) : 0;
    const jornadas = result.rows.map(({ total_coincidencias, ...jornada }) => jornada);
    return res.json({ jornadas, total });
  } catch (error) {
    console.error('Error de consulta de jornadas:', error.code || error.message);
    if (error.code === '42P01') return res.status(503).json({ code: 'ESQUEMA_PENDIENTE', message: 'Faltan tablas del esquema de PostgreSQL.' });
    return res.status(500).json({ code: 'CONSULTA_FALLIDA', message: 'No fue posible consultar las jornadas.' });
  }
});

export default router;
