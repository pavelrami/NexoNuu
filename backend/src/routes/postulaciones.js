import { Router } from 'express';
import { pool } from '../db.js';
import { readCookie, tokenHash } from '../lib/security.js';
import { limitRequests, sameOriginWrite } from '../lib/limits.js';
import { allowLocalDemo, canApplyToJornada, validId } from '../lib/postulacionesRules.js';

const router = Router();
router.use((_req, res, next) => {
  res.set('Cache-Control', 'no-store');
  if (!pool) return res.status(503).json({ code:'BASE_NO_CONFIGURADA', message:'Base de datos no disponible.' });
  next();
});
// Cada peticion identifica al voluntario a partir de su sesion; no aceptar usuario_id del cliente.
router.use(async (req, res, next) => {
  const raw = readCookie(req.get('cookie') || '');
  if (!raw || !/^[A-Za-z0-9_-]{43}$/.test(raw)) return res.status(401).json({ code:'SIN_SESION', message:'Inicia sesion.' });
  try {
    const result = await pool.query(`
      SELECT u.id, u.telefono_verificado_en IS NOT NULL AS telefono_verificado
      FROM sesiones_usuario s JOIN usuarios u ON u.id=s.usuario_id
      WHERE s.token_hash=$1 AND s.revocado_en IS NULL AND s.expira_en>now()
        AND u.estado='activo' AND u.correo_verificado_en IS NOT NULL
        AND EXISTS (SELECT 1 FROM usuario_rol ur JOIN roles r ON r.id=ur.rol_id
                    WHERE ur.usuario_id=u.id AND r.codigo='voluntario')
    `, [tokenHash(raw)]);
    if (!result.rowCount) return res.status(403).json({code:'ACCESO_DENEGADO',message:'Se requiere una sesion de voluntariado verificada.'});
    req.voluntario = result.rows[0];
    next();
  } catch (error) {
    console.error('Error de autorizacion postulaciones:', error.code || error.message);
    res.status(500).json({code:'PERMISOS_FALLIDOS',message:'No se pudieron verificar permisos.'});
  }
});
router.use((req,res,next) => ['POST','PUT','PATCH','DELETE'].includes(req.method) ? sameOriginWrite(req,res,next) : next());

router.get('/mias', async (req,res) => {
  try {
    const result = await pool.query(`
      SELECT p.id, p.jornada_id AS "jornadaId", p.estado, p.creada_en AS "creadaEn",
             p.actualizada_en AS "actualizadaEn", j.titulo, j.inicio, j.fin,
             j.es_demo AS "esDemo", i.nombre AS institucion,
             c.nombre AS comunidad, c.municipio
      FROM postulaciones p JOIN jornadas j ON j.id=p.jornada_id
      JOIN instituciones i ON i.id=j.institucion_id
      JOIN comunidades c ON c.id=j.comunidad_id
      WHERE p.voluntario_id=$1 ORDER BY p.creada_en DESC, p.id DESC LIMIT 100`, [req.voluntario.id]);
    res.json({ postulaciones:result.rows });
  } catch (error) {
    console.error('Error consultar postulaciones:', error.code || error.message);
    res.status(500).json({code:'POSTULACIONES_FALLIDAS',message:'No se pudieron consultar las solicitudes.'});
  }
});

router.post('/', limitRequests({prefix:'postular',max:12,windowMs:15*60_000}), async (req,res) => {
  const id = req.body?.jornadaId;
  if (!validId(String(id || ''))) return res.status(400).json({code:'JORNADA_INVALIDA',message:'Selecciona una jornada valida.'});
  if (!req.voluntario.telefono_verificado) return res.status(403).json({code:'TELEFONO_PENDIENTE',message:'Verifica tu telefono antes de postularte.'});
  const client = await pool.connect().catch(() => null);
  if (!client) return res.status(503).json({code:'BASE_NO_DISPONIBLE',message:'Base de datos no disponible.'});
  try {
    await client.query('BEGIN');
    const profile = await client.query('SELECT usuario_id FROM perfiles_voluntario WHERE usuario_id=$1', [req.voluntario.id]);
    const jornada = await client.query(`SELECT j.id,j.estado,j.inicio,j.cupo,j.es_demo,j.postulaciones_habilitadas,
                    i.estado_verificacion FROM jornadas j JOIN instituciones i ON i.id=j.institucion_id
                    WHERE j.id=$1 FOR UPDATE OF j`, [id]);
    if (!profile.rowCount) { await client.query('ROLLBACK'); return res.status(403).json({code:'PERFIL_PENDIENTE',message:'Completa tu perfil antes de postularte.'}); }
    if (!canApplyToJornada(jornada.rows[0],{localDemo:allowLocalDemo()})) {
      await client.query('ROLLBACK');
      return res.status(403).json({code:'JORNADA_NO_ADMITE_SOLICITUDES',message:'Esta jornada no admite postulaciones.'});
    }
    const already = await client.query('SELECT id FROM postulaciones WHERE jornada_id=$1 AND voluntario_id=$2', [id,req.voluntario.id]);
    if (already.rowCount) {await client.query('ROLLBACK'); return res.status(409).json({code:'SOLICITUD_DUPLICADA',message:'Ya existe una solicitud para esta jornada.'});}
    const capacity = await client.query("SELECT COUNT(*)::integer AS ocupados FROM postulaciones WHERE jornada_id=$1 AND estado='aceptada'", [id]);
    if (capacity.rows[0].ocupados >= jornada.rows[0].cupo) { await client.query('ROLLBACK'); return res.status(409).json({code:'CUPO_AGOTADO',message:'No hay cupos disponibles.'}); }
    const created = await client.query(`INSERT INTO postulaciones(jornada_id,voluntario_id,estado)
      VALUES ($1,$2,'pendiente') RETURNING id, estado`, [id,req.voluntario.id]);
    await client.query('COMMIT');
    res.status(201).json({postulacion:created.rows[0],message:'Solicitud registrada como pendiente.'});
  } catch(error) {
    await client.query('ROLLBACK').catch(()=>{});
    if (error.code==='23505') return res.status(409).json({code:'SOLICITUD_DUPLICADA',message:'Ya existe una solicitud para esta jornada.'});
    console.error('Error registrar postulacion:',error.code||error.message);
    res.status(500).json({code:'POSTULACION_FALLIDA',message:'No se pudo registrar la solicitud.'});
  } finally {client.release();}
});

router.patch('/:id/retirar', limitRequests({prefix:'retirar',max:20,windowMs:15*60_000}), async (req,res) => {
  if (!validId(req.params.id)) return res.status(400).json({code:'ID_INVALIDO',message:'Solicitud invalida.'});
  try {
    const changed = await pool.query(`UPDATE postulaciones SET estado='retirada', actualizada_en=now()
      WHERE id=$1 AND voluntario_id=$2 AND estado='pendiente'
      RETURNING id,estado`,[req.params.id,req.voluntario.id]);
    if (!changed.rowCount) return res.status(409).json({code:'NO_SE_PUEDE_RETIRAR',message:'La solicitud no existe o ya fue resuelta o retirada.'});
    res.json({postulacion:changed.rows[0],message:'Solicitud retirada.'});
  } catch(error) {
    console.error('Error retiro de postulacion:',error.code||error.message);
    res.status(500).json({code:'RETIRO_FALLIDO',message:'No se pudo retirar la solicitud.'});
  }
});
export default router;
