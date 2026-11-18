import { Router } from 'express';
import { pool } from '../db.js';
import { readCookie, tokenHash } from '../lib/security.js';
import { limitRequests, sameOriginWrite } from '../lib/limits.js';
import { normalizeInstitutionRequest } from '../lib/institucionValidation.js';

const router = Router();
router.use((_req, res, next) => {
  res.set('Cache-Control', 'no-store');
  if (!pool) return res.status(503).json({ code: 'BASE_NO_CONFIGURADA', message: 'PostgreSQL no esta configurado.' });
  next();
});

// Las operaciones institucionales se asocian a la identidad verificada en la cookie.
// Tener una solicitud NO confiere el rol de representante.
router.use(async (req, res, next) => {
  const raw = readCookie(req.get('cookie') || '');
  if (!raw || !/^[A-Za-z0-9_-]{43}$/.test(raw)) {
    return res.status(401).json({ code: 'SIN_SESION', message: 'Inicia sesion para continuar.' });
  }
  try {
    const result = await pool.query(`SELECT u.id
      FROM sesiones_usuario s JOIN usuarios u ON u.id = s.usuario_id
      WHERE s.token_hash=$1 AND s.revocado_en IS NULL AND s.expira_en > now()
        AND u.estado='activo' AND u.correo_verificado_en IS NOT NULL`, [tokenHash(raw)]);
    if (!result.rowCount) return res.status(401).json({ code: 'SIN_SESION', message: 'La sesion no es valida o el correo no esta verificado.' });
    req.institutionApplicantId = result.rows[0].id;
    next();
  } catch (error) {
    console.error('Error sesion institucional:', error.code || error.message);
    return res.status(500).json({ code: 'SESION_FALLIDA', message: 'No se pudo validar tu sesion.' });
  }
});
router.use((req, res, next) => ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method) ? sameOriginWrite(req, res, next) : next());

router.get('/mis-solicitudes', async (req, res) => {
  try {
    const rows = await pool.query(`SELECT i.id, i.nombre, i.tipo, i.descripcion, i.sitio_web,
      i.estado_verificacion, iu.estado AS estado_vinculo, i.creado_en
      FROM institucion_usuario iu JOIN instituciones i ON i.id=iu.institucion_id
      WHERE iu.usuario_id=$1 ORDER BY i.creado_en DESC LIMIT 20`, [req.institutionApplicantId]);
    return res.json({ solicitudes: rows.rows.map(r => ({
      id: r.id, nombre: r.nombre, tipo: r.tipo, descripcion: r.descripcion,
      sitioWeb: r.sitio_web, estadoVerificacion: r.estado_verificacion,
      estadoVinculo: r.estado_vinculo, creadoEn: r.creado_en
    })) });
  } catch (error) {
    console.error('Error de consulta institucional:', error.code || error.message);
    return res.status(500).json({ code: 'SOLICITUDES_FALLIDAS', message: 'No fue posible consultar tus solicitudes.' });
  }
});

router.post('/solicitudes', limitRequests({ prefix: 'solicitar-institucion', max: 6, windowMs: 60 * 60_000 }), async (req, res) => {
  const checked = normalizeInstitutionRequest(req.body);
  if (!checked.ok) return res.status(400).json({ code: 'DATOS_INVALIDOS', message: checked.message });
  const { nombre, tipo, descripcion, sitioWeb } = checked.value;
  const client = await pool.connect().catch(() => null);
  if (!client) return res.status(503).json({ code: 'BASE_NO_DISPONIBLE', message: 'PostgreSQL no esta disponible.' });
  try {
    await client.query('BEGIN');
    // Bloqueos de transaccion para evitar doble alta simultanea por usuario o nombre.
    await client.query('SELECT pg_advisory_xact_lock(51801, ($1::bigint % 2147483647)::int)', [req.institutionApplicantId]);
    await client.query('SELECT pg_advisory_xact_lock(51802, hashtext(lower($1::text)))', [nombre]);
    const count = await client.query(`SELECT COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE i.estado_verificacion='pendiente' AND iu.estado='pendiente')::int AS pendientes
      FROM institucion_usuario iu JOIN instituciones i ON i.id=iu.institucion_id
      WHERE iu.usuario_id=$1`, [req.institutionApplicantId]);
    if (count.rows[0].pendientes > 0 || count.rows[0].total >= 3) {
      await client.query('ROLLBACK');
      return res.status(409).json({ code: 'SOLICITUD_EXISTENTE', message: 'Ya tienes una solicitud pendiente o alcanzaste el limite de solicitudes. Consulta su estado.' });
    }
    const exists = await client.query('SELECT id FROM instituciones WHERE lower(nombre)=lower($1) LIMIT 1', [nombre]);
    if (exists.rowCount) {
      await client.query('ROLLBACK');
      return res.status(409).json({ code: 'INSTITUCION_EXISTENTE', message: 'Ya existe una institucion registrada con ese nombre. No es posible atribuirse su representacion mediante este formulario.' });
    }
    const inserted = await client.query(`INSERT INTO instituciones
      (nombre, tipo, descripcion, sitio_web, estado_verificacion)
      VALUES ($1,$2,$3,$4,'pendiente') RETURNING id`, [nombre, tipo, descripcion, sitioWeb]);
    await client.query(`INSERT INTO institucion_usuario (institucion_id, usuario_id, estado)
      VALUES ($1,$2,'pendiente')`, [inserted.rows[0].id, req.institutionApplicantId]);
    await client.query('COMMIT');
    return res.status(201).json({ message: 'Solicitud recibida. Requiere revision administrativa antes de otorgar permisos.', solicitud: {
      id: inserted.rows[0].id, nombre, estadoVerificacion: 'pendiente', estadoVinculo: 'pendiente'
    }});
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('Error de solicitud institucional:', error.code || error.message);
    return res.status(500).json({ code: 'SOLICITUD_FALLIDA', message: 'No fue posible registrar la solicitud.' });
  } finally { client.release(); }
});

export default router;
