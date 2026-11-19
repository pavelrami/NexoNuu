import { Router } from 'express';
import { pool } from '../db.js';
import { readCookie, tokenHash } from '../lib/security.js';
import { sameOriginWrite, limitRequests } from '../lib/limits.js';
import { validateNewJornada, validInstitutionId, demoHabilitado, puedeGestionarJornada } from '../lib/panelInstitucionalValidation.js';
import { canManageApplications, validateApplicationDecision, canAcceptWithCapacity } from '../lib/institutionalApplications.js';
import { canPublish, draftCanEdit, validateDraftEdit, validateLifecycleAction, evaluateLifecycle } from '../lib/jornadaLifecycle.js';
import { seguimientoHabilitado, validateSeguimiento, confirmadosValidos } from '../lib/jornadaSeguimiento.js';
import { sendApplicationDecisionEmail } from '../services/email.js';

// Panel de representantes institucionales (Incremento 8: operacion real).
// Toda accion exige: sesion activa, correo verificado, rol representante, vinculo 'activo'
// con la institucion e institucion 'verificada'. Las jornadas de demostracion solo se
// gestionan con ALLOW_DEMO_POSTULACIONES=1.
const router = Router();
const opciones = () => ({ demo: demoHabilitado() });

router.use((_req, res, next) => {
  res.set('Cache-Control', 'no-store');
  if (!pool) return res.status(503).json({ message: 'Base de datos no configurada.' });
  next();
});
router.use(async (req, res, next) => {
  const raw = readCookie(req.get('cookie') || '');
  if (!raw || !/^[A-Za-z0-9_-]{43}$/.test(raw)) return res.status(401).json({ message: 'Inicia sesión para continuar.' });
  try {
    const found = await pool.query(`SELECT u.id FROM sesiones_usuario s
      JOIN usuarios u ON u.id=s.usuario_id
      JOIN usuario_rol ur ON ur.usuario_id=u.id
      JOIN roles r ON r.id=ur.rol_id
      WHERE s.token_hash=$1 AND s.revocado_en IS NULL AND s.expira_en>now()
      AND u.estado='activo' AND u.correo_verificado_en IS NOT NULL AND r.codigo='representante'`, [tokenHash(raw)]);
    if (!found.rowCount) return res.status(403).json({ message: 'Necesitas representación institucional autorizada.' });
    req.representanteId = found.rows[0].id;
    next();
  } catch (error) {
    console.error('Error de sesion institucional:', error.code || error.message);
    res.status(500).json({ message: 'No se pudo validar la sesión.' });
  }
});
router.use((req, res, next) => ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method) ? sameOriginWrite(req, res, next) : next());

async function authorizedInstitution(client, institutionId, userId) {
  const result = await client.query(`SELECT i.id, i.nombre, i.estado_verificacion
    FROM instituciones i JOIN institucion_usuario iu ON iu.institucion_id=i.id
    WHERE i.id=$1 AND iu.usuario_id=$2 AND iu.estado='activo'
      AND i.estado_verificacion='verificada'`, [institutionId, userId]);
  return result.rows[0] || null;
}

const ids = (...values) => values.every(validInstitutionId);

router.get('/instituciones', async (req, res) => {
  try {
    const found = await pool.query(`SELECT i.id, i.nombre, i.tipo, i.estado_verificacion,
      (SELECT COUNT(*)::int FROM jornadas j WHERE j.institucion_id=i.id AND j.estado='publicada') AS publicadas,
      (SELECT COUNT(*)::int FROM postulaciones p JOIN jornadas j ON j.id=p.jornada_id
        WHERE j.institucion_id=i.id AND p.estado='pendiente') AS pendientes
      FROM instituciones i JOIN institucion_usuario iu ON iu.institucion_id=i.id
      WHERE iu.usuario_id=$1 AND iu.estado='activo' AND i.estado_verificacion='verificada'
      ORDER BY i.nombre`, [req.representanteId]);
    res.json({ instituciones: found.rows, modoDemo: demoHabilitado() });
  } catch (error) {
    console.error('Error instituciones propias:', error.code || error.message);
    res.status(500).json({ message: 'No fue posible consultar tus instituciones.' });
  }
});

router.get('/comunidades', async (_req, res) => {
  try {
    const result = await pool.query('SELECT id,nombre,municipio,region FROM comunidades ORDER BY region NULLS LAST,municipio,nombre LIMIT 500');
    res.json({ comunidades: result.rows });
  } catch (error) {
    console.error('Error catalogo comunidades:', error.code || error.message);
    res.status(500).json({ message: 'No fue posible cargar las comunidades.' });
  }
});

router.get('/instituciones/:id/jornadas', async (req, res) => {
  if (!ids(req.params.id)) return res.status(400).json({ message: 'Institución inválida.' });
  try {
    const inst = await authorizedInstitution(pool, req.params.id, req.representanteId);
    if (!inst) return res.status(403).json({ message: 'No puedes consultar jornadas de esta institución.' });
    const found = await pool.query(`SELECT j.id,j.titulo,j.descripcion,j.comunidad_id,j.inicio,j.fin,j.cupo,j.estado,j.es_demo,
      j.postulaciones_habilitadas,c.nombre AS comunidad,c.municipio,c.region,
      (SELECT COUNT(*)::int FROM postulaciones p WHERE p.jornada_id=j.id AND p.estado='pendiente') AS pendientes,
      (SELECT COUNT(*)::int FROM postulaciones p WHERE p.jornada_id=j.id AND p.estado='aceptada') AS aceptadas,
      (SELECT COUNT(*)::int FROM postulaciones p WHERE p.jornada_id=j.id) AS total_postulaciones
      FROM jornadas j JOIN comunidades c ON c.id=j.comunidad_id
      WHERE j.institucion_id=$1 ORDER BY
        CASE j.estado WHEN 'publicada' THEN 0 WHEN 'borrador' THEN 1 WHEN 'cerrada' THEN 2 ELSE 3 END, j.inicio ASC
      LIMIT 100`, [req.params.id]);
    const op = opciones();
    res.json({ institucion: inst, modoDemo: op.demo,
      jornadas: found.rows.map((j) => ({ ...j, gestionable: puedeGestionarJornada(j, op) })) });
  } catch (error) {
    console.error('Error jornadas institucionales:', error.code || error.message);
    res.status(500).json({ message: 'No fue posible consultar las jornadas.' });
  }
});

router.post('/instituciones/:id/jornadas', limitRequests({ prefix: 'nueva-jornada-institucional', max: 20, windowMs: 3600000 }), async (req, res) => {
  if (!ids(req.params.id)) return res.status(400).json({ message: 'Institución inválida.' });
  const checked = validateNewJornada(req.body);
  if (!checked.ok) return res.status(400).json({ message: checked.message });
  const { titulo, descripcion, comunidadId, cupo, inicio, fin, esDemo } = checked.value;
  if (esDemo && !demoHabilitado()) return res.status(400).json({ message: 'El modo de demostración no está activo en este servidor.' });
  const client = await pool.connect().catch(() => null);
  if (!client) return res.status(503).json({ message: 'Base de datos no disponible.' });
  try {
    await client.query('BEGIN');
    const inst = await authorizedInstitution(client, req.params.id, req.representanteId);
    if (!inst) { await client.query('ROLLBACK'); return res.status(403).json({ message: 'No puedes crear jornadas para esta institución.' }); }
    const community = await client.query('SELECT id FROM comunidades WHERE id=$1', [comunidadId]);
    if (!community.rowCount) { await client.query('ROLLBACK'); return res.status(400).json({ message: 'La comunidad indicada no existe.' }); }
    const created = await client.query(`INSERT INTO jornadas
      (institucion_id,comunidad_id,creado_por,titulo,descripcion,inicio,fin,cupo,estado,es_demo,postulaciones_habilitadas)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8,'borrador',$9,FALSE)
      RETURNING id,titulo,estado,es_demo`, [req.params.id, comunidadId, req.representanteId, titulo, descripcion, inicio, fin, cupo, esDemo]);
    await client.query(`INSERT INTO jornadas_historial (jornada_id,actor_id,accion,estado_anterior,estado_nuevo,motivo)
      VALUES($1,$2,'creacion','borrador','borrador','Creación del borrador por su representante')`, [created.rows[0].id, req.representanteId]);
    await client.query('COMMIT');
    res.status(201).json({ message: 'Borrador guardado. Revísalo y publícalo cuando esté listo.', jornada: created.rows[0] });
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('Error crear jornada:', error.code || error.message);
    res.status(500).json({ message: 'No se pudo guardar la jornada.' });
  } finally { client.release(); }
});

async function publicar(req, res) {
  if (!ids(req.params.id, req.params.jornadaId)) return res.status(400).json({ message: 'Identificador inválido.' });
  const client = await pool.connect().catch(() => null);
  if (!client) return res.status(503).json({ message: 'Base de datos no disponible.' });
  try {
    await client.query('BEGIN');
    const inst = await authorizedInstitution(client, req.params.id, req.representanteId);
    if (!inst) { await client.query('ROLLBACK'); return res.status(403).json({ message: 'No tienes permiso para esta institución.' }); }
    const found = await client.query('SELECT id,estado,inicio,es_demo FROM jornadas WHERE id=$1 AND institucion_id=$2 FOR UPDATE', [req.params.jornadaId, req.params.id]);
    if (!found.rowCount || !canPublish(found.rows[0], opciones())) {
      await client.query('ROLLBACK'); return res.status(409).json({ message: 'Solo puedes publicar borradores con fecha futura de tu institución.' });
    }
    const changed = await client.query(`UPDATE jornadas SET estado='publicada',postulaciones_habilitadas=TRUE
      WHERE id=$1 AND institucion_id=$2 RETURNING id,titulo,estado`, [req.params.jornadaId, req.params.id]);
    await client.query(`INSERT INTO jornadas_historial (jornada_id,actor_id,accion,estado_anterior,estado_nuevo,motivo)
      VALUES($1,$2,'publicacion','borrador','publicada','Publicación de la jornada por su representante')`, [req.params.jornadaId, req.representanteId]);
    await client.query('COMMIT');
    res.json({ message: 'Jornada publicada: ya aparece en Jornadas y recibe postulaciones.', jornada: changed.rows[0] });
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('Error publicar jornada:', error.code || error.message);
    res.status(500).json({ message: 'No se pudo publicar la jornada.' });
  } finally { client.release(); }
}
const limitePublicar = limitRequests({ prefix: 'publicar-jornada', max: 20, windowMs: 3600000 });
router.patch('/instituciones/:id/jornadas/:jornadaId/publicar', limitePublicar, publicar);
router.patch('/instituciones/:id/jornadas/:jornadaId/publicar-demo', limitePublicar, publicar);

// Postulaciones de una jornada propia, con el perfil que la persona decidió compartir.
// El correo de contacto solo se muestra cuando la postulación fue aceptada.
router.get('/instituciones/:id/jornadas/:jornadaId/postulaciones', async (req, res) => {
  if (!ids(req.params.id, req.params.jornadaId)) return res.status(400).json({ message: 'Identificador inválido.' });
  try {
    const inst = await authorizedInstitution(pool, req.params.id, req.representanteId);
    if (!inst) return res.status(403).json({ message: 'No puedes gestionar esta institución.' });
    const j = await pool.query(`SELECT id,titulo,estado,inicio,cupo,es_demo,postulaciones_habilitadas
      FROM jornadas WHERE id=$1 AND institucion_id=$2`, [req.params.jornadaId, req.params.id]);
    if (!j.rowCount) return res.status(404).json({ message: 'Jornada no encontrada en tu institución.' });
    const op = opciones();
    if (!puedeGestionarJornada(j.rows[0], op)) return res.status(403).json({ message: 'Las jornadas de demostración solo se gestionan con el modo demo activo.' });
    const result = await pool.query(`SELECT p.id, p.estado, p.creada_en AS "creadaEn", p.actualizada_en AS "actualizadaEn",
      u.nombre AS voluntario, CASE WHEN p.estado='aceptada' THEN u.correo END AS correo,
      pv.disponibilidad, pv.biografia, c.nombre AS comunidad, c.municipio,
      COALESCE((SELECT json_agg(h.nombre ORDER BY h.nombre) FROM voluntario_habilidad vh JOIN habilidades h ON h.id=vh.habilidad_id
        WHERE vh.usuario_id=u.id), '[]'::json) AS habilidades,
      COALESCE((SELECT json_agg(json_build_object('lengua', l.nombre, 'variante', v.nombre, 'nivel', vl.nivel) ORDER BY l.nombre)
        FROM voluntario_lengua vl JOIN lenguas l ON l.id=vl.lengua_id LEFT JOIN variantes v ON v.id=vl.variante_id
        WHERE vl.usuario_id=u.id), '[]'::json) AS lenguas
      FROM postulaciones p JOIN usuarios u ON u.id=p.voluntario_id
      LEFT JOIN perfiles_voluntario pv ON pv.usuario_id=u.id
      LEFT JOIN comunidades c ON c.id=pv.comunidad_id
      WHERE p.jornada_id=$1 ORDER BY CASE p.estado WHEN 'pendiente' THEN 0 WHEN 'aceptada' THEN 1 ELSE 2 END, p.creada_en ASC, p.id ASC
      LIMIT 300`, [req.params.jornadaId]);
    const accepted = result.rows.filter((row) => row.estado === 'aceptada').length;
    res.json({ jornada: j.rows[0], postulaciones: result.rows, aceptadas: accepted, cupo: j.rows[0].cupo,
      puedeDecidir: canManageApplications(j.rows[0], op) });
  } catch (error) {
    console.error('Error revisar postulaciones institucionales:', error.code || error.message);
    res.status(500).json({ message: 'No se pudieron consultar las postulaciones.' });
  }
});

router.patch('/instituciones/:id/jornadas/:jornadaId/postulaciones/:postulacionId/decision',
  limitRequests({ prefix: 'decision-postulacion-institucional', max: 60, windowMs: 15 * 60_000 }), async (req, res) => {
  if (!ids(req.params.id, req.params.jornadaId, req.params.postulacionId)) return res.status(400).json({ message: 'Identificador inválido.' });
  const checked = validateApplicationDecision(req.body);
  if (!checked.ok) return res.status(400).json({ message: checked.message });
  const client = await pool.connect().catch(() => null);
  if (!client) return res.status(503).json({ message: 'Base de datos no disponible.' });
  let aviso = null;
  try {
    await client.query('BEGIN');
    const inst = await authorizedInstitution(client, req.params.id, req.representanteId);
    if (!inst) { await client.query('ROLLBACK'); return res.status(403).json({ message: 'No puedes decidir por esta institución.' }); }
    // El bloqueo de la misma jornada serializa las decisiones simultáneas de cupo.
    const jornada = await client.query(`SELECT id,titulo,estado,inicio,cupo,es_demo,postulaciones_habilitadas
       FROM jornadas WHERE id=$1 AND institucion_id=$2 FOR UPDATE`, [req.params.jornadaId, req.params.id]);
    if (!jornada.rowCount) { await client.query('ROLLBACK'); return res.status(404).json({ message: 'Jornada no encontrada.' }); }
    if (!canManageApplications(jornada.rows[0], opciones())) {
      await client.query('ROLLBACK'); return res.status(409).json({ message: 'Solo puedes decidir postulaciones de jornadas publicadas y abiertas.' });
    }
    const application = await client.query(`SELECT p.id,p.estado,p.voluntario_id,u.nombre,u.correo FROM postulaciones p
       JOIN usuarios u ON u.id=p.voluntario_id WHERE p.id=$1 AND p.jornada_id=$2 FOR UPDATE OF p`, [req.params.postulacionId, req.params.jornadaId]);
    if (!application.rowCount) { await client.query('ROLLBACK'); return res.status(404).json({ message: 'Solicitud no encontrada.' }); }
    if (application.rows[0].estado !== 'pendiente') {
      await client.query('ROLLBACK'); return res.status(409).json({ message: 'La solicitud ya fue resuelta o retirada.' });
    }
    if (checked.estado === 'aceptada') {
      const occupied = await client.query(`SELECT COUNT(*)::integer AS total FROM postulaciones WHERE jornada_id=$1 AND estado='aceptada'`, [req.params.jornadaId]);
      if (!canAcceptWithCapacity({ cupo: jornada.rows[0].cupo, ocupados: occupied.rows[0].total })) {
        await client.query('ROLLBACK'); return res.status(409).json({ message: 'Cupo agotado: no se puede aceptar esta solicitud.' });
      }
    }
    const changed = await client.query(`UPDATE postulaciones SET estado=$1,actualizada_en=now()
      WHERE id=$2 AND jornada_id=$3 AND estado='pendiente'
      RETURNING id,estado,actualizada_en`, [checked.estado, req.params.postulacionId, req.params.jornadaId]);
    if (!changed.rowCount) { await client.query('ROLLBACK'); return res.status(409).json({ message: 'La solicitud cambió de estado.' }); }
    await client.query('COMMIT');
    aviso = { to: application.rows[0].correo, nombre: application.rows[0].nombre, jornada: jornada.rows[0].titulo, estado: checked.estado, institucion: inst.nombre };
    res.json({ message: checked.estado === 'aceptada' ? 'Postulación aceptada. Avisamos a la persona por correo.' : 'Postulación rechazada. Avisamos a la persona por correo.', postulacion: changed.rows[0] });
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('Error decidir postulacion:', error.code || error.message);
    res.status(500).json({ message: 'No se pudo registrar la decisión.' });
  } finally { client.release(); }
  if (aviso) sendApplicationDecisionEmail(aviso.to, aviso).catch((e) => console.error('No se pudo avisar la decision:', e.message));
});

router.get('/instituciones/:id/jornadas/:jornadaId/historial', async (req, res) => {
  if (!ids(req.params.id, req.params.jornadaId)) return res.status(400).json({ message: 'Identificador inválido.' });
  try {
    const inst = await authorizedInstitution(pool, req.params.id, req.representanteId);
    if (!inst) return res.status(403).json({ message: 'No tienes autorización sobre esta institución.' });
    const owns = await pool.query('SELECT id FROM jornadas WHERE id=$1 AND institucion_id=$2', [req.params.jornadaId, req.params.id]);
    if (!owns.rowCount) return res.status(404).json({ message: 'Jornada no encontrada.' });
    const result = await pool.query(`SELECT h.id, h.accion, h.estado_anterior, h.estado_nuevo, h.motivo,
      h.creado_en, u.nombre AS responsable
      FROM jornadas_historial h JOIN usuarios u ON u.id=h.actor_id
      WHERE h.jornada_id=$1 ORDER BY h.creado_en DESC, h.id DESC LIMIT 100`, [req.params.jornadaId]);
    res.json({ historial: result.rows });
  } catch (error) {
    console.error('Error historial jornadas:', error.code || error.message);
    res.status(500).json({ message: 'No fue posible cargar el historial de la jornada.' });
  }
});

async function editar(req, res) {
  if (!ids(req.params.id, req.params.jornadaId)) return res.status(400).json({ message: 'Identificador inválido.' });
  const checked = validateDraftEdit(req.body);
  if (!checked.ok) return res.status(400).json({ message: checked.message });
  const client = await pool.connect().catch(() => null);
  if (!client) return res.status(503).json({ message: 'Base de datos no disponible.' });
  try {
    await client.query('BEGIN');
    const inst = await authorizedInstitution(client, req.params.id, req.representanteId);
    if (!inst) { await client.query('ROLLBACK'); return res.status(403).json({ message: 'No tienes permisos para editar esta jornada.' }); }
    const jornada = await client.query(`SELECT id, estado, es_demo, inicio
      FROM jornadas WHERE id=$1 AND institucion_id=$2 FOR UPDATE`, [req.params.jornadaId, req.params.id]);
    if (!jornada.rowCount || !draftCanEdit(jornada.rows[0], opciones())) {
      await client.query('ROLLBACK'); return res.status(409).json({ message: 'Solo pueden editarse borradores con fecha futura.' });
    }
    const { titulo, descripcion, comunidadId, cupo, inicio, fin } = checked.value;
    const community = await client.query('SELECT id FROM comunidades WHERE id=$1', [comunidadId]);
    if (!community.rowCount) { await client.query('ROLLBACK'); return res.status(400).json({ message: 'Comunidad no encontrada.' }); }
    const result = await client.query(`UPDATE jornadas SET titulo=$1, descripcion=$2, comunidad_id=$3,
      cupo=$4, inicio=$5, fin=$6 WHERE id=$7 AND institucion_id=$8 RETURNING id,titulo,estado`,
      [titulo, descripcion, comunidadId, cupo, inicio, fin, req.params.jornadaId, req.params.id]);
    await client.query(`INSERT INTO jornadas_historial (jornada_id,actor_id,accion,estado_anterior,estado_nuevo,motivo)
      VALUES($1,$2,'edicion','borrador','borrador','Edición del borrador por su representante')`, [req.params.jornadaId, req.representanteId]);
    await client.query('COMMIT');
    res.json({ message: 'Borrador actualizado.', jornada: result.rows[0] });
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('Error editar borrador:', error.code || error.message);
    res.status(500).json({ message: 'No se pudo actualizar el borrador.' });
  } finally { client.release(); }
}
const limiteEditar = limitRequests({ prefix: 'editar-jornada', max: 30, windowMs: 3600000 });
router.patch('/instituciones/:id/jornadas/:jornadaId/editar', limiteEditar, editar);
router.patch('/instituciones/:id/jornadas/:jornadaId/editar-demo', limiteEditar, editar);

async function transicion(req, res) {
  if (!ids(req.params.id, req.params.jornadaId)) return res.status(400).json({ message: 'Identificador inválido.' });
  const checked = validateLifecycleAction(req.body);
  if (!checked.ok) return res.status(400).json({ message: checked.message });
  const client = await pool.connect().catch(() => null);
  if (!client) return res.status(503).json({ message: 'Base de datos no disponible.' });
  try {
    await client.query('BEGIN');
    const inst = await authorizedInstitution(client, req.params.id, req.representanteId);
    if (!inst) { await client.query('ROLLBACK'); return res.status(403).json({ message: 'No puedes modificar jornadas ajenas.' }); }
    // Comparte el bloqueo por jornada con decisiones de postulación: evita cambios simultáneos.
    const result = await client.query(`SELECT id, estado, inicio, fin, es_demo, postulaciones_habilitadas
      FROM jornadas WHERE id=$1 AND institucion_id=$2 FOR UPDATE`, [req.params.jornadaId, req.params.id]);
    if (!result.rowCount) { await client.query('ROLLBACK'); return res.status(404).json({ message: 'Jornada no encontrada.' }); }
    const counts = await client.query(`SELECT COUNT(*) FILTER (WHERE estado='pendiente')::integer AS pendientes,
      COUNT(*) FILTER (WHERE estado='aceptada')::integer AS aceptadas FROM postulaciones WHERE jornada_id=$1`, [req.params.jornadaId]);
    const choice = evaluateLifecycle({ jornada: result.rows[0], accion: checked.accion,
      pendientes: counts.rows[0].pendientes, aceptadas: counts.rows[0].aceptadas, opciones: opciones() });
    if (!choice.ok) { await client.query('ROLLBACK'); return res.status(409).json({ message: choice.message }); }
    const changed = await client.query(`UPDATE jornadas SET estado=$1,postulaciones_habilitadas=FALSE
      WHERE id=$2 AND institucion_id=$3 RETURNING id,titulo,estado,postulaciones_habilitadas`,
      [choice.estado, req.params.jornadaId, req.params.id]);
    const accion = { cerrar: 'cierre', cancelar: 'cancelacion', finalizar: 'finalizacion' }[checked.accion];
    await client.query(`INSERT INTO jornadas_historial (jornada_id,actor_id,accion,estado_anterior,estado_nuevo,motivo)
      VALUES($1,$2,$3,$4,$5,$6)`, [req.params.jornadaId, req.representanteId, accion, result.rows[0].estado, choice.estado, checked.motivo]);
    await client.query('COMMIT');
    res.json({ message: `Estado actualizado a ${choice.estado}.`, jornada: changed.rows[0] });
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('Error cambiar estado jornada:', error.code || error.message);
    res.status(500).json({ message: 'No se pudo cambiar el estado.' });
  } finally { client.release(); }
}
const limiteTransicion = limitRequests({ prefix: 'transicion-jornada', max: 20, windowMs: 3600000 });
router.patch('/instituciones/:id/jornadas/:jornadaId/transicion', limiteTransicion, transicion);
router.patch('/instituciones/:id/jornadas/:jornadaId/transicion-demo', limiteTransicion, transicion);

// Seguimiento operativo de coordinación. No acredita alfabetización ni guarda datos de quien aprende.
router.get('/instituciones/:id/jornadas/:jornadaId/seguimientos', async (req, res) => {
  if (!ids(req.params.id, req.params.jornadaId)) return res.status(400).json({ message: 'Identificador inválido.' });
  try {
    const inst = await authorizedInstitution(pool, req.params.id, req.representanteId);
    if (!inst) return res.status(403).json({ message: 'No puedes ver el seguimiento de otra institución.' });
    const found = await pool.query('SELECT id, estado, es_demo, cupo FROM jornadas WHERE id=$1 AND institucion_id=$2', [req.params.jornadaId, req.params.id]);
    const j = found.rows[0];
    if (!j) return res.status(404).json({ message: 'Jornada no encontrada.' });
    if (!seguimientoHabilitado(j, opciones())) return res.status(403).json({ message: 'El seguimiento está disponible para jornadas publicadas, cerradas o finalizadas.' });
    const [registrados, aceptados] = await Promise.all([
      pool.query(`SELECT s.id,s.fecha,s.resumen,s.participantes_confirmados,s.observaciones,u.nombre AS responsable
        FROM seguimientos s JOIN usuarios u ON u.id=s.registrado_por
        WHERE s.jornada_id=$1 ORDER BY s.fecha DESC,s.id DESC LIMIT 100`, [req.params.jornadaId]),
      pool.query("SELECT COUNT(*)::integer AS total FROM postulaciones WHERE jornada_id=$1 AND estado='aceptada'", [req.params.jornadaId]),
    ]);
    res.json({ seguimientos: registrados.rows, aceptados: aceptados.rows[0].total, cupo: j.cupo });
  } catch (error) {
    console.error('Error cargar seguimiento:', error.code || error.message);
    res.status(500).json({ message: 'No se pudo consultar el seguimiento.' });
  }
});

router.post('/instituciones/:id/jornadas/:jornadaId/seguimientos',
  limitRequests({ prefix: 'seguimiento-jornada', max: 20, windowMs: 3600000 }), async (req, res) => {
  if (!ids(req.params.id, req.params.jornadaId)) return res.status(400).json({ message: 'Identificador inválido.' });
  const checked = validateSeguimiento(req.body);
  if (!checked.ok) return res.status(400).json({ message: checked.message });
  const client = await pool.connect().catch(() => null);
  if (!client) return res.status(503).json({ message: 'Base de datos no disponible.' });
  try {
    await client.query('BEGIN');
    const inst = await authorizedInstitution(client, req.params.id, req.representanteId);
    if (!inst) { await client.query('ROLLBACK'); return res.status(403).json({ message: 'No puedes registrar seguimiento de otra institución.' }); }
    const rows = await client.query('SELECT id, estado, es_demo, cupo FROM jornadas WHERE id=$1 AND institucion_id=$2 FOR UPDATE', [req.params.jornadaId, req.params.id]);
    const j = rows.rows[0];
    if (!j) { await client.query('ROLLBACK'); return res.status(404).json({ message: 'Jornada no encontrada.' }); }
    if (!seguimientoHabilitado(j, opciones())) {
      await client.query('ROLLBACK'); return res.status(403).json({ message: 'El seguimiento está disponible para jornadas publicadas, cerradas o finalizadas.' });
    }
    const accepted = await client.query("SELECT COUNT(*)::integer AS total FROM postulaciones WHERE jornada_id=$1 AND estado='aceptada'", [req.params.jornadaId]);
    const { resumen, observaciones, participantesConfirmados } = checked.value;
    if (!confirmadosValidos({ confirmados: participantesConfirmados, aceptados: accepted.rows[0].total, cupo: j.cupo })) {
      await client.query('ROLLBACK'); return res.status(409).json({ message: 'Las personas confirmadas no pueden superar las postulaciones aceptadas ni el cupo.' });
    }
    const saved = await client.query(`INSERT INTO seguimientos (jornada_id,registrado_por,resumen,participantes_confirmados,observaciones)
      VALUES($1,$2,$3,$4,$5) RETURNING id,fecha,resumen,participantes_confirmados,observaciones`,
      [req.params.jornadaId, req.representanteId, resumen, participantesConfirmados, observaciones || null]);
    await client.query('COMMIT');
    res.status(201).json({ message: 'Nota de seguimiento registrada.', seguimiento: saved.rows[0] });
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('Error guardar seguimiento:', error.code || error.message);
    res.status(500).json({ message: 'No se pudo guardar el seguimiento.' });
  } finally { client.release(); }
});

export default router;
