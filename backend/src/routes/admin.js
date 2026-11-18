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
export default router;
