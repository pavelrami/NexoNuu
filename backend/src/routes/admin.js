import { Router } from 'express';
import { pool } from '../db.js';
import { readCookie, tokenHash } from '../lib/security.js';
import { sameOriginWrite, limitRequests } from '../lib/limits.js';
import { validateDecision, validId } from '../lib/adminDecisions.js';

const router=Router();
router.use((_req,res,next)=>{res.set('Cache-Control','no-store');if(!pool)return res.status(503).json({code:'SIN_BASE',message:'Base no configurada.'});next();});
router.use(async(req,res,next)=>{
  const raw=readCookie(req.get('cookie')||'');
  if(!raw || !/^[A-Za-z0-9_-]{43}$/.test(raw))return res.status(401).json({code:'SIN_SESION',message:'Inicia sesion.'});
  try {
    const result=await pool.query(`SELECT u.id FROM sesiones_usuario s
      JOIN usuarios u ON u.id=s.usuario_id JOIN usuario_rol ur ON ur.usuario_id=u.id
      JOIN roles r ON r.id=ur.rol_id
      WHERE s.token_hash=$1 AND s.revocado_en IS NULL AND s.expira_en>now()
        AND u.estado='activo' AND u.correo_verificado_en IS NOT NULL AND r.codigo='administrador'`,[tokenHash(raw)]);
    if(!result.rowCount)return res.status(403).json({code:'SIN_PERMISO',message:'Solo administradores autorizados.'});
    req.adminUserId=result.rows[0].id;
    next();
  }catch(e){console.error('Error autenticacion admin:',e.code||e.message);res.status(500).json({message:'No se pudo validar la sesion.'});}
});
router.use((req,res,next)=>['POST','PUT','PATCH','DELETE'].includes(req.method)?sameOriginWrite(req,res,next):next());
router.get('/instituciones',async(req,res)=>{
  try {
    const results=await pool.query(`SELECT i.id,i.nombre,i.tipo,i.descripcion,i.sitio_web,i.estado_verificacion,i.creado_en,
      COALESCE(json_agg(json_build_object('id',u.id,'nombre',u.nombre,'correo',u.correo,'estadoVinculo',iu.estado))
        FILTER(WHERE u.id IS NOT NULL),'[]'::json) AS solicitantes
      FROM instituciones i
      LEFT JOIN institucion_usuario iu ON iu.institucion_id=i.id
      LEFT JOIN usuarios u ON u.id=iu.usuario_id
      GROUP BY i.id ORDER BY CASE WHEN i.estado_verificacion='pendiente' THEN 0 ELSE 1 END, i.creado_en DESC LIMIT 100`);
    res.json({instituciones:results.rows});
  }catch(e){console.error('Error listar instituciones:',e.code||e.message);res.status(500).json({message:'No se pudieron consultar instituciones.'});}
});
router.patch('/instituciones/:id/decision',limitRequests({prefix:'admin-institucion',max:30,windowMs:60000}),async(req,res)=>{
  if(!validId(req.params.id))return res.status(400).json({message:'Institucion invalida.'});
  const d=validateDecision(req.body);
  if(!d.ok)return res.status(400).json({message:d.message});
  const client=await pool.connect();
  try{
    await client.query('BEGIN');
    const selected=await client.query('SELECT id,estado_verificacion FROM instituciones WHERE id=$1 FOR UPDATE',[req.params.id]);
    if(!selected.rowCount){await client.query('ROLLBACK');return res.status(404).json({message:'Institucion no encontrada.'});}
    if(selected.rows[0].estado_verificacion!=='pendiente'){
      await client.query('ROLLBACK');return res.status(409).json({message:'Esta solicitud ya fue revisada.'});
    }
    const own=await client.query('SELECT 1 FROM institucion_usuario WHERE institucion_id=$1 AND usuario_id=$2',[req.params.id,req.adminUserId]);
    if(own.rowCount){await client.query('ROLLBACK');return res.status(403).json({message:'No puedes revisar tu propia solicitud.'});}
    const approved=d.accion==='aprobar';
    await client.query('UPDATE instituciones SET estado_verificacion=$1 WHERE id=$2',[approved?'verificada':'rechazada',req.params.id]);
    if(!approved)await client.query("UPDATE institucion_usuario SET estado='revocado' WHERE institucion_id=$1 AND estado='pendiente'",[req.params.id]);
    await client.query(`INSERT INTO decisiones_institucionales(institucion_id,administrador_id,accion,motivo)
      VALUES($1,$2,$3,$4)`,[req.params.id,req.adminUserId,approved?'verificar_institucion':'rechazar_institucion',d.motivo]);
    await client.query('COMMIT');
    res.json({message:approved?'Institucion verificada. El representante sigue pendiente.':'Solicitud rechazada.',estado:approved?'verificada':'rechazada'});
  }catch(e){await client.query('ROLLBACK').catch(()=>{});console.error('Error decision admin:',e.code||e.message);res.status(500).json({message:'No se pudo registrar la decision.'});}
  finally{client.release();}
});
router.patch('/instituciones/:id/representantes/:usuarioId',limitRequests({prefix:'admin-representante',max:30,windowMs:60000}),async(req,res)=>{
  if(!validId(req.params.id)||!validId(req.params.usuarioId))return res.status(400).json({message:'Identificador invalido.'});
  const d=validateDecision(req.body,'representante');
  if(!d.ok)return res.status(400).json({message:d.message});
  if(String(req.adminUserId)===req.params.usuarioId)return res.status(403).json({message:'No puedes autorizarte a ti mismo.'});
  const client=await pool.connect();
  try{
    await client.query('BEGIN');
    const inst=await client.query('SELECT estado_verificacion FROM instituciones WHERE id=$1 FOR UPDATE',[req.params.id]);
    if(!inst.rowCount){await client.query('ROLLBACK');return res.status(404).json({message:'Institucion no encontrada.'});}
    if(inst.rows[0].estado_verificacion!=='verificada'){
      await client.query('ROLLBACK');return res.status(409).json({message:'La institucion debe estar verificada.'});
    }
    const link=await client.query(`SELECT iu.estado,u.correo_verificado_en,u.estado AS estado_usuario
      FROM institucion_usuario iu JOIN usuarios u ON u.id=iu.usuario_id
      WHERE iu.institucion_id=$1 AND iu.usuario_id=$2 FOR UPDATE OF iu`,[req.params.id,req.params.usuarioId]);
    if(!link.rowCount){await client.query('ROLLBACK');return res.status(404).json({message:'Solicitante no vinculado.'});}
    const autorizar=d.accion==='autorizar';
    if(autorizar && (link.rows[0].estado!=='pendiente'||!link.rows[0].correo_verificado_en||link.rows[0].estado_usuario!=='activo')){
      await client.query('ROLLBACK');return res.status(409).json({message:'Solo puede autorizarse un solicitante pendiente, activo y con correo verificado.'});
    }
    if(!autorizar && link.rows[0].estado!=='activo'){
      await client.query('ROLLBACK');return res.status(409).json({message:'Solo puede revocarse una representacion activa.'});
    }
    await client.query('UPDATE institucion_usuario SET estado=$1 WHERE institucion_id=$2 AND usuario_id=$3',[autorizar?'activo':'revocado',req.params.id,req.params.usuarioId]);
    if(autorizar){
      await client.query(`INSERT INTO usuario_rol(usuario_id,rol_id)
        SELECT $1,id FROM roles WHERE codigo='representante' ON CONFLICT DO NOTHING`,[req.params.usuarioId]);
    }else {
      // El rol general se retira solo si no existe ninguna representacion activa.
      await client.query(`DELETE FROM usuario_rol WHERE usuario_id=$1 AND rol_id=(SELECT id FROM roles WHERE codigo='representante')
        AND NOT EXISTS (SELECT 1 FROM institucion_usuario WHERE usuario_id=$1 AND estado='activo')`,[req.params.usuarioId]);
    }
    await client.query(`INSERT INTO decisiones_institucionales(institucion_id,usuario_objetivo_id,administrador_id,accion,motivo)
      VALUES ($1,$2,$3,$4,$5)`,[req.params.id,req.params.usuarioId,req.adminUserId,autorizar?'autorizar_representante':'revocar_representante',d.motivo]);
    await client.query('COMMIT');
    res.json({message:autorizar?'Representante autorizado.':'Representacion revocada.',estado:autorizar?'activo':'revocado'});
  }catch(e){await client.query('ROLLBACK').catch(()=>{});console.error('Error representante:',e.code||e.message);res.status(500).json({message:'No se pudo registrar la decision.'});}
  finally{client.release();}
});
// ===== Incremento 8: administracion general (resumen, usuarios, instituciones y jornadas) =====

router.get('/resumen', async (_req, res) => {
  try {
    const { rows } = await pool.query(`SELECT
      (SELECT COUNT(*) FROM usuarios)::int AS usuarios,
      (SELECT COUNT(*) FROM usuarios WHERE estado='bloqueado')::int AS bloqueados,
      (SELECT COUNT(*) FROM usuarios WHERE correo_verificado_en IS NULL)::int AS sin_verificar,
      (SELECT COUNT(DISTINCT ur.usuario_id) FROM usuario_rol ur JOIN roles r ON r.id=ur.rol_id WHERE r.codigo='voluntario')::int AS voluntarios,
      (SELECT COUNT(DISTINCT ur.usuario_id) FROM usuario_rol ur JOIN roles r ON r.id=ur.rol_id WHERE r.codigo='representante')::int AS representantes,
      (SELECT COUNT(DISTINCT ur.usuario_id) FROM usuario_rol ur JOIN roles r ON r.id=ur.rol_id WHERE r.codigo='administrador')::int AS administradores,
      (SELECT COUNT(*) FROM instituciones WHERE estado_verificacion='pendiente')::int AS instituciones_pendientes,
      (SELECT COUNT(*) FROM instituciones WHERE estado_verificacion='verificada')::int AS instituciones_verificadas,
      (SELECT COUNT(*) FROM institucion_usuario iu JOIN instituciones i ON i.id=iu.institucion_id
        WHERE iu.estado='pendiente' AND i.estado_verificacion='verificada')::int AS representantes_pendientes,
      (SELECT COUNT(*) FROM jornadas WHERE estado='publicada')::int AS jornadas_publicadas,
      (SELECT COUNT(*) FROM jornadas WHERE estado='borrador')::int AS jornadas_borrador,
      (SELECT COUNT(*) FROM postulaciones WHERE estado='pendiente')::int AS postulaciones_pendientes,
      (SELECT COUNT(*) FROM postulaciones WHERE estado='aceptada')::int AS postulaciones_aceptadas`);
    res.json({ resumen: rows[0] });
  } catch (e) { console.error('Error resumen admin:', e.code || e.message); res.status(500).json({ message: 'No se pudo consultar el resumen.' }); }
});

router.get('/usuarios', async (req, res) => {
  const buscar = typeof req.query.buscar === 'string' ? req.query.buscar.trim().toLowerCase().slice(0, 100) : '';
  try {
    const result = await pool.query(`SELECT u.id, u.nombre, u.correo, u.estado, u.creado_en,
        u.correo_verificado_en IS NOT NULL AS correo_verificado,
        u.telefono_verificado_en IS NOT NULL AS telefono_verificado,
        u.google_sub IS NOT NULL AS con_google,
        COALESCE(array_agg(r.codigo ORDER BY r.codigo) FILTER (WHERE r.codigo IS NOT NULL), '{}') AS roles,
        (SELECT COUNT(*)::int FROM postulaciones p WHERE p.voluntario_id=u.id) AS postulaciones,
        (SELECT MAX(s.creado_en) FROM sesiones_usuario s WHERE s.usuario_id=u.id) AS ultimo_acceso
      FROM usuarios u LEFT JOIN usuario_rol ur ON ur.usuario_id=u.id LEFT JOIN roles r ON r.id=ur.rol_id
      WHERE ($1 = '' OR STRPOS(LOWER(u.nombre || ' ' || u.correo), $1) > 0)
      GROUP BY u.id ORDER BY u.creado_en DESC LIMIT 200`, [buscar]);
    res.json({ usuarios: result.rows });
  } catch (e) { console.error('Error listar usuarios:', e.code || e.message); res.status(500).json({ message: 'No se pudieron consultar los usuarios.' }); }
});

router.patch('/usuarios/:id/estado', limitRequests({ prefix: 'admin-usuario', max: 40, windowMs: 60000 }), async (req, res) => {
  if (!validId(req.params.id)) return res.status(400).json({ message: 'Usuario inválido.' });
  const estado = req.body?.estado;
  const motivo = typeof req.body?.motivo === 'string' ? req.body.motivo.trim() : '';
  if (!['activo', 'bloqueado'].includes(estado) || motivo.length < 10 || motivo.length > 1000) {
    return res.status(400).json({ message: 'Indica el estado (activo o bloqueado) y un motivo de 10 a 1000 caracteres.' });
  }
  if (String(req.adminUserId) === req.params.id) return res.status(403).json({ message: 'No puedes cambiar el estado de tu propia cuenta.' });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const found = await client.query('SELECT id, estado FROM usuarios WHERE id=$1 FOR UPDATE', [req.params.id]);
    if (!found.rowCount) { await client.query('ROLLBACK'); return res.status(404).json({ message: 'Usuario no encontrado.' }); }
    if (found.rows[0].estado === estado) { await client.query('ROLLBACK'); return res.status(409).json({ message: `La cuenta ya está ${estado}.` }); }
    await client.query('UPDATE usuarios SET estado=$1 WHERE id=$2', [estado, req.params.id]);
    if (estado === 'bloqueado') await client.query('UPDATE sesiones_usuario SET revocado_en=now() WHERE usuario_id=$1 AND revocado_en IS NULL', [req.params.id]);
    await client.query(`INSERT INTO decisiones_usuarios (usuario_objetivo_id, administrador_id, accion, motivo) VALUES ($1,$2,$3,$4)`,
      [req.params.id, req.adminUserId, estado === 'bloqueado' ? 'bloquear' : 'desbloquear', motivo]);
    await client.query('COMMIT');
    res.json({ message: estado === 'bloqueado' ? 'Cuenta bloqueada y sesiones cerradas.' : 'Cuenta reactivada.' });
  } catch (e) { await client.query('ROLLBACK').catch(() => {}); console.error('Error estado usuario:', e.code || e.message); res.status(500).json({ message: 'No se pudo actualizar la cuenta. Comprueba la migración 009.' }); }
  finally { client.release(); }
});

router.patch('/usuarios/:id/admin', limitRequests({ prefix: 'admin-rol', max: 20, windowMs: 60000 }), async (req, res) => {
  if (!validId(req.params.id)) return res.status(400).json({ message: 'Usuario inválido.' });
  const accion = req.body?.accion;
  const motivo = typeof req.body?.motivo === 'string' ? req.body.motivo.trim() : '';
  if (!['otorgar', 'retirar'].includes(accion) || motivo.length < 10 || motivo.length > 1000) {
    return res.status(400).json({ message: 'Indica otorgar o retirar y un motivo de 10 a 1000 caracteres.' });
  }
  if (String(req.adminUserId) === req.params.id) return res.status(403).json({ message: 'No puedes cambiar tus propios permisos de administración.' });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const user = await client.query(`SELECT id, estado, correo_verificado_en FROM usuarios WHERE id=$1 FOR UPDATE`, [req.params.id]);
    if (!user.rowCount) { await client.query('ROLLBACK'); return res.status(404).json({ message: 'Usuario no encontrado.' }); }
    if (accion === 'otorgar' && (user.rows[0].estado !== 'activo' || !user.rows[0].correo_verificado_en)) {
      await client.query('ROLLBACK'); return res.status(409).json({ message: 'Solo una cuenta activa y con correo verificado puede administrar.' });
    }
    const changed = accion === 'otorgar'
      ? await client.query(`INSERT INTO usuario_rol(usuario_id,rol_id) SELECT $1,id FROM roles WHERE codigo='administrador' ON CONFLICT DO NOTHING RETURNING rol_id`, [req.params.id])
      : await client.query(`DELETE FROM usuario_rol WHERE usuario_id=$1 AND rol_id=(SELECT id FROM roles WHERE codigo='administrador') RETURNING rol_id`, [req.params.id]);
    if (!changed.rowCount) { await client.query('ROLLBACK'); return res.status(409).json({ message: accion === 'otorgar' ? 'La cuenta ya administra.' : 'La cuenta no administra.' }); }
    await client.query(`INSERT INTO decisiones_usuarios (usuario_objetivo_id, administrador_id, accion, motivo) VALUES ($1,$2,$3,$4)`,
      [req.params.id, req.adminUserId, accion === 'otorgar' ? 'otorgar_admin' : 'retirar_admin', motivo]);
    await client.query('COMMIT');
    res.json({ message: accion === 'otorgar' ? 'Permiso de administración otorgado.' : 'Permiso de administración retirado.' });
  } catch (e) { await client.query('ROLLBACK').catch(() => {}); console.error('Error rol admin:', e.code || e.message); res.status(500).json({ message: 'No se pudo cambiar el permiso.' }); }
  finally { client.release(); }
});

// Retirar la verificacion de una institucion verificada: deja de publicar y sus representantes pierden el acceso.
router.patch('/instituciones/:id/revocar', limitRequests({ prefix: 'admin-revocar-inst', max: 20, windowMs: 60000 }), async (req, res) => {
  if (!validId(req.params.id)) return res.status(400).json({ message: 'Institución inválida.' });
  const motivo = typeof req.body?.motivo === 'string' ? req.body.motivo.trim() : '';
  if (motivo.length < 10 || motivo.length > 1000) return res.status(400).json({ message: 'Escribe un motivo de 10 a 1000 caracteres.' });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const inst = await client.query('SELECT estado_verificacion FROM instituciones WHERE id=$1 FOR UPDATE', [req.params.id]);
    if (!inst.rowCount) { await client.query('ROLLBACK'); return res.status(404).json({ message: 'Institución no encontrada.' }); }
    if (inst.rows[0].estado_verificacion !== 'verificada') { await client.query('ROLLBACK'); return res.status(409).json({ message: 'Solo se puede retirar la verificación de una institución verificada.' }); }
    await client.query("UPDATE instituciones SET estado_verificacion='rechazada' WHERE id=$1", [req.params.id]);
    const revocados = await client.query("UPDATE institucion_usuario SET estado='revocado' WHERE institucion_id=$1 AND estado IN ('activo','pendiente') RETURNING usuario_id", [req.params.id]);
    for (const { usuario_id } of revocados.rows) {
      await client.query(`DELETE FROM usuario_rol WHERE usuario_id=$1 AND rol_id=(SELECT id FROM roles WHERE codigo='representante')
        AND NOT EXISTS (SELECT 1 FROM institucion_usuario WHERE usuario_id=$1 AND estado='activo')`, [usuario_id]);
    }
    await client.query("UPDATE jornadas SET postulaciones_habilitadas=FALSE WHERE institucion_id=$1 AND estado='publicada'", [req.params.id]);
    await client.query(`INSERT INTO decisiones_institucionales(institucion_id,administrador_id,accion,motivo) VALUES($1,$2,'revocar_institucion',$3)`,
      [req.params.id, req.adminUserId, motivo]);
    await client.query('COMMIT');
    res.json({ message: 'Verificación retirada: sus jornadas dejan de ser visibles y sus representantes pierden el acceso.' });
  } catch (e) { await client.query('ROLLBACK').catch(() => {}); console.error('Error revocar institucion:', e.code || e.message); res.status(500).json({ message: 'No se pudo retirar la verificación. Comprueba la migración 009.' }); }
  finally { client.release(); }
});

router.get('/jornadas', async (_req, res) => {
  try {
    const result = await pool.query(`SELECT j.id, j.titulo, j.estado, j.es_demo, j.inicio, j.cupo, j.postulaciones_habilitadas,
        i.nombre AS institucion, c.municipio, c.region,
        (SELECT COUNT(*)::int FROM postulaciones p WHERE p.jornada_id=j.id AND p.estado='pendiente') AS pendientes,
        (SELECT COUNT(*)::int FROM postulaciones p WHERE p.jornada_id=j.id AND p.estado='aceptada') AS aceptadas
      FROM jornadas j JOIN instituciones i ON i.id=j.institucion_id JOIN comunidades c ON c.id=j.comunidad_id
      ORDER BY CASE j.estado WHEN 'publicada' THEN 0 WHEN 'borrador' THEN 1 WHEN 'cerrada' THEN 2 ELSE 3 END, j.inicio ASC LIMIT 300`);
    res.json({ jornadas: result.rows });
  } catch (e) { console.error('Error jornadas admin:', e.code || e.message); res.status(500).json({ message: 'No se pudieron consultar las jornadas.' }); }
});

// Moderacion: la administracion puede cancelar una jornada publicada o en borrador (queda en el historial).
router.patch('/jornadas/:id/cancelar', limitRequests({ prefix: 'admin-moderar', max: 20, windowMs: 60000 }), async (req, res) => {
  if (!validId(req.params.id)) return res.status(400).json({ message: 'Jornada inválida.' });
  const motivo = typeof req.body?.motivo === 'string' ? req.body.motivo.trim() : '';
  if (motivo.length < 12 || motivo.length > 500) return res.status(400).json({ message: 'Escribe un motivo de 12 a 500 caracteres.' });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const j = await client.query('SELECT estado FROM jornadas WHERE id=$1 FOR UPDATE', [req.params.id]);
    if (!j.rowCount) { await client.query('ROLLBACK'); return res.status(404).json({ message: 'Jornada no encontrada.' }); }
    if (!['borrador', 'publicada', 'cerrada'].includes(j.rows[0].estado)) { await client.query('ROLLBACK'); return res.status(409).json({ message: 'Esta jornada ya terminó o fue cancelada.' }); }
    await client.query("UPDATE jornadas SET estado='cancelada', postulaciones_habilitadas=FALSE WHERE id=$1", [req.params.id]);
    await client.query("UPDATE postulaciones SET estado='rechazada', actualizada_en=now() WHERE jornada_id=$1 AND estado='pendiente'", [req.params.id]);
    await client.query(`INSERT INTO jornadas_historial (jornada_id,actor_id,accion,estado_anterior,estado_nuevo,motivo) VALUES($1,$2,'moderacion',$3,'cancelada',$4)`,
      [req.params.id, req.adminUserId, j.rows[0].estado, motivo]);
    await client.query('COMMIT');
    res.json({ message: 'Jornada cancelada por moderación. Las solicitudes pendientes se marcaron como rechazadas.' });
  } catch (e) { await client.query('ROLLBACK').catch(() => {}); console.error('Error moderar jornada:', e.code || e.message); res.status(500).json({ message: 'No se pudo cancelar la jornada. Comprueba la migración 009.' }); }
  finally { client.release(); }
});

export default router;
