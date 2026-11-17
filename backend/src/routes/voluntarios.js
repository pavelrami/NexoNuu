import { Router } from 'express';
import { pool } from '../db.js';
import { readCookie, tokenHash } from '../lib/security.js';
import { limitRequests, sameOriginWrite } from '../lib/limits.js';
import { normalizeVolunteerProfile } from '../lib/volunteerValidation.js';

const router = Router();
router.use((_req, res, next) => {
  res.set('Cache-Control', 'no-store');
  if (!pool) return res.status(503).json({ code: 'BASE_NO_CONFIGURADA', message: 'La base de datos no está disponible.' });
  next();
});

// La autorización se hace SIEMPRE en el backend, a partir de la cookie.
router.use(async (req, res, next) => {
  const raw = readCookie(req.get('cookie') || '');
  if (!raw || !/^[A-Za-z0-9_-]{43}$/.test(raw)) {
    return res.status(401).json({ code: 'SIN_SESION', message: 'Inicia sesión para continuar.' });
  }
  try {
    const result = await pool.query(`
      SELECT u.id
      FROM sesiones_usuario s
      JOIN usuarios u ON u.id = s.usuario_id
      WHERE s.token_hash = $1
        AND s.revocado_en IS NULL AND s.expira_en > now()
        AND u.estado = 'activo' AND u.correo_verificado_en IS NOT NULL
        AND EXISTS (
          SELECT 1 FROM usuario_rol ur
          JOIN roles r ON r.id = ur.rol_id
          WHERE ur.usuario_id = u.id AND r.codigo = 'voluntario'
        )
    `, [tokenHash(raw)]);
    if (!result.rowCount) return res.status(403).json({ code: 'ACCESO_DENEGADO', message: 'No tienes una sesión válida con rol de voluntario.' });
    req.volunteerId = result.rows[0].id;
    return next();
  } catch (error) {
    console.error('Error de permisos de voluntariado:', error.code || error.message);
    return res.status(500).json({ code: 'PERMISOS_FALLIDOS', message: 'No fue posible verificar tus permisos.' });
  }
});
router.use((req, res, next) => ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method) ? sameOriginWrite(req, res, next) : next());

router.get('/catalogos', async (_req, res) => {
  try {
    const [comunidades, habilidades, lenguas, variantes] = await Promise.all([
      pool.query('SELECT id, nombre, municipio, region FROM comunidades ORDER BY nombre, municipio LIMIT 300'),
      pool.query('SELECT id, nombre FROM habilidades ORDER BY nombre LIMIT 100'),
      pool.query('SELECT id, nombre FROM lenguas ORDER BY nombre LIMIT 100'),
      pool.query('SELECT id, lengua_id, nombre FROM variantes ORDER BY nombre LIMIT 300')
    ]);
    return res.json({
      comunidades: comunidades.rows,
      habilidades: habilidades.rows,
      lenguas: lenguas.rows,
      variantes: variantes.rows.map(row => ({ id: row.id, lenguaId: row.lengua_id, nombre: row.nombre }))
    });
  } catch (error) {
    console.error('Error de catálogo de voluntariado:', error.code || error.message);
    return res.status(500).json({ code: 'CATALOGOS_FALLIDOS', message: 'No se pudieron consultar los catálogos.' });
  }
});

router.get('/me', async (req, res) => {
  try {
    const [profile, skills, languages] = await Promise.all([
      pool.query('SELECT comunidad_id, disponibilidad, biografia FROM perfiles_voluntario WHERE usuario_id=$1', [req.volunteerId]),
      pool.query('SELECT habilidad_id FROM voluntario_habilidad WHERE usuario_id=$1 ORDER BY habilidad_id', [req.volunteerId]),
      pool.query('SELECT lengua_id, variante_id, nivel FROM voluntario_lengua WHERE usuario_id=$1 ORDER BY lengua_id, variante_id', [req.volunteerId])
    ]);
    const current = profile.rows[0];
    return res.json({
      perfilCreado: Boolean(current),
      perfil: {
        comunidadId: current?.comunidad_id ?? null,
        disponibilidad: current?.disponibilidad ?? 'variable',
        biografia: current?.biografia ?? '',
        habilidades: skills.rows.map(row => row.habilidad_id),
        lenguas: languages.rows.map(row => ({ lenguaId: row.lengua_id, varianteId: row.variante_id, nivel: row.nivel }))
      }
    });
  } catch (error) {
    console.error('Error de perfil:', error.code || error.message);
    return res.status(500).json({ code: 'PERFIL_FALLIDO', message: 'No fue posible consultar tu perfil.' });
  }
});

router.put('/me', limitRequests({ prefix: 'guardar-perfil', max: 30, windowMs: 15 * 60_000 }), async (req, res) => {
  const validated = normalizeVolunteerProfile(req.body);
  if (!validated.ok) return res.status(400).json({ code: 'PERFIL_INVALIDO', message: validated.message });
  const { comunidadId, disponibilidad, biografia, habilidades, lenguas } = validated.value;
  const client = await pool.connect().catch(() => null);
  if (!client) return res.status(503).json({ code: 'BASE_NO_DISPONIBLE', message: 'PostgreSQL no está disponible.' });
  try {
    await client.query('BEGIN');
    if (comunidadId) {
      const found = await client.query('SELECT id FROM comunidades WHERE id=$1', [comunidadId]);
      if (!found.rowCount) throw Object.assign(new Error('Selecciona una comunidad existente.'), { userInput: true });
    }
    if (habilidades.length) {
      const found = await client.query('SELECT id FROM habilidades WHERE id = ANY($1::bigint[])', [habilidades]);
      if (found.rowCount !== habilidades.length) throw Object.assign(new Error('Una habilidad no existe en el catálogo.'), { userInput: true });
    }
    if (lenguas.length) {
      const languageIds = [...new Set(lenguas.map(row => row.lenguaId))];
      const found = await client.query('SELECT id FROM lenguas WHERE id = ANY($1::bigint[])', [languageIds]);
      if (found.rowCount !== languageIds.length) throw Object.assign(new Error('Una lengua no existe en el catálogo.'), { userInput: true });
      for (const row of lenguas) {
        if (!row.varianteId) continue;
        const variant = await client.query('SELECT id FROM variantes WHERE id=$1 AND lengua_id=$2', [row.varianteId, row.lenguaId]);
        if (!variant.rowCount) throw Object.assign(new Error('La variante no pertenece a la lengua seleccionada.'), { userInput: true });
      }
    }

    await client.query(`INSERT INTO perfiles_voluntario (usuario_id, comunidad_id, biografia, disponibilidad)
       VALUES ($1,$2,$3,$4)
       ON CONFLICT (usuario_id) DO UPDATE SET
       comunidad_id=EXCLUDED.comunidad_id, biografia=EXCLUDED.biografia,
       disponibilidad=EXCLUDED.disponibilidad`, [req.volunteerId, comunidadId, biografia, disponibilidad]);
    await client.query('DELETE FROM voluntario_habilidad WHERE usuario_id=$1', [req.volunteerId]);
    for (const id of habilidades) {
      await client.query('INSERT INTO voluntario_habilidad (usuario_id, habilidad_id) VALUES ($1,$2)', [req.volunteerId, id]);
    }
    await client.query('DELETE FROM voluntario_lengua WHERE usuario_id=$1', [req.volunteerId]);
    for (const row of lenguas) {
      await client.query(`INSERT INTO voluntario_lengua (usuario_id, lengua_id, variante_id, nivel)
        VALUES ($1,$2,$3,$4)`, [req.volunteerId, row.lenguaId, row.varianteId, row.nivel]);
    }
    await client.query('COMMIT');
    return res.json({ message: 'Tu perfil de voluntariado se guardó correctamente.', perfilCreado: true });
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    if (error.userInput || error.code === '23503' || error.code === '23505' || error.code === '23514') {
      return res.status(400).json({ code: 'PERFIL_INVALIDO', message: error.userInput ? error.message : 'Revisa los datos seleccionados.' });
    }
    console.error('Error al guardar perfil:', error.code || error.message);
    return res.status(500).json({ code: 'GUARDADO_FALLIDO', message: 'No fue posible guardar tu perfil.' });
  } finally {
    client.release();
  }
});

export default router;
