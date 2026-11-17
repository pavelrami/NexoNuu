import { Router } from 'express';
import { pool } from '../db.js';
import { hashPassword, verifyPassword, readCookie, tokenHash } from '../lib/security.js';
import { limitRequests, sameOriginWrite } from '../lib/limits.js';
import { makeOtp, maskedPhone, normalizeMxPhone } from '../lib/phone.js';

const router = Router();
router.use((req, res, next) => {
  res.set('Cache-Control', 'no-store');
  if (!pool) return res.status(503).json({ message: 'La base de datos no esta configurada.' });
  next();
});
router.use(async (req, res, next) => {
  const raw = readCookie(req.get('cookie') || '');
  if (!raw || !/^[A-Za-z0-9_-]{43}$/.test(raw)) return res.status(401).json({ code: 'SIN_SESION', message: 'Inicia sesion.' });
  try {
    const result = await pool.query(`SELECT u.id, u.telefono_e164, u.telefono_verificado_en
      FROM sesiones_usuario s JOIN usuarios u ON u.id=s.usuario_id
      WHERE s.token_hash=$1 AND s.revocado_en IS NULL AND s.expira_en > now()
      AND u.estado='activo' AND u.correo_verificado_en IS NOT NULL`, [tokenHash(raw)]);
    if (!result.rowCount) return res.status(401).json({ code: 'SIN_SESION', message: 'Sesion caducada.' });
    req.authUser = result.rows[0];
    next();
  } catch (error) {
    console.error('Error de sesion telefono:', error.code || error.message);
    res.status(500).json({ message: 'No se pudo validar tu sesion.' });
  }
});
router.use((req, res, next) => ['POST','PUT','PATCH','DELETE'].includes(req.method) ? sameOriginWrite(req, res, next) : next());

router.get('/estado', async (req, res) => {
  const u = req.authUser;
  res.json({ telefonoVerificado: Boolean(u.telefono_verificado_en), telefono: maskedPhone(u.telefono_e164) });
});

router.post('/solicitar-codigo', limitRequests({prefix:'telefono-envio', max:6, windowMs:60*60_000}), async (req, res) => {
  const phone = normalizeMxPhone(req.body?.telefono);
  if (!phone) return res.status(400).json({ code:'TELEFONO_INVALIDO', message:'Escribe un numero de Mexico de diez digitos.' });
  const mode = process.env.SMS_MODE || 'console';
  if (mode !== 'console' || process.env.NODE_ENV === 'production') {
    return res.status(503).json({code:'SMS_NO_CONFIGURADO', message:'El envio de SMS aun no esta configurado para este entorno.'});
  }
  const client = await pool.connect();
  let code;
  try {
    await client.query('BEGIN');
    const locked = await client.query('SELECT telefono_e164, telefono_verificado_en FROM usuarios WHERE id=$1 FOR UPDATE', [req.authUser.id]);
    if (!locked.rowCount) { await client.query('ROLLBACK'); return res.status(401).json({ message:'Sesion no valida.' }); }
    if (locked.rows[0].telefono_verificado_en) {
      await client.query('ROLLBACK');
      return res.status(409).json({code:'TELEFONO_YA_VERIFICADO', message:'Tu telefono ya esta verificado.'});
    }
    const last = await client.query(`SELECT creado_en FROM verificaciones_telefono
      WHERE usuario_id=$1 ORDER BY creado_en DESC LIMIT 1`, [req.authUser.id]);
    if (last.rowCount && Date.now() - new Date(last.rows[0].creado_en).getTime() < 60_000) {
      await client.query('ROLLBACK');
      return res.status(429).json({code:'ESPERA_REENVIO', message:'Espera un minuto antes de solicitar otro codigo.'});
    }
    const hour = await client.query(`SELECT count(*)::int AS total FROM verificaciones_telefono
      WHERE usuario_id=$1 AND creado_en > now() - INTERVAL '1 hour'`, [req.authUser.id]);
    if (hour.rows[0].total >= 3) {
      await client.query('ROLLBACK');
      return res.status(429).json({code:'LIMITE_REENVIOS', message:'Has solicitado demasiados codigos. Intenta dentro de una hora.'});
    }
    code = makeOtp();
    const codeHash = await hashPassword(code); // scrypt: evita guardar un PIN de 6 digitos recuperable facilmente.
    await client.query('UPDATE verificaciones_telefono SET usado_en=now() WHERE usuario_id=$1 AND usado_en IS NULL', [req.authUser.id]);
    await client.query(`INSERT INTO verificaciones_telefono (usuario_id, telefono_e164, codigo_hash, expira_en)
      VALUES ($1,$2,$3, now() + INTERVAL '10 minutes')`, [req.authUser.id, phone, codeHash]);
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('Error al solicitar OTP:', error.code || error.message);
    return res.status(500).json({message:'No fue posible crear el codigo.'});
  } finally { client.release(); }
  // Solo desarrollo: no se comunica con operadores telefonicos.
  console.info(`\n[NEXO NUU - CODIGO TELEFONICO SOLO DESARROLLO]\nUsuario ID: ${req.authUser.id}\nTelefono: ${maskedPhone(phone)}\nCodigo OTP (10 minutos): ${code}\nNO publicar ni compartir este codigo.\n`);
  res.status(202).json({ message:'Codigo generado en modo de prueba. Revisa la terminal del backend.', telefono:maskedPhone(phone) });
});

router.post('/confirmar-codigo', limitRequests({prefix:'telefono-confirmacion', max:25, windowMs:15*60_000}), async (req, res) => {
  const code = req.body?.codigo;
  if (typeof code !== 'string' || !/^\d{6}$/.test(code)) return res.status(400).json({code:'CODIGO_INVALIDO',message:'Introduce los seis digitos del codigo.'});
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await client.query(`SELECT id, telefono_e164, codigo_hash, intentos FROM verificaciones_telefono
      WHERE usuario_id=$1 AND usado_en IS NULL AND expira_en > now()
      ORDER BY creado_en DESC LIMIT 1 FOR UPDATE`, [req.authUser.id]);
    if (!result.rowCount) { await client.query('ROLLBACK'); return res.status(400).json({code:'CODIGO_VENCIDO',message:'El codigo ya expiro. Solicita uno nuevo.'}); }
    const item = result.rows[0];
    if (item.intentos >= 5) { await client.query('ROLLBACK'); return res.status(429).json({code:'INTENTOS_AGOTADOS',message:'Codigo bloqueado. Solicita otro.'}); }
    const valid = await verifyPassword(code, item.codigo_hash);
    if (!valid) {
      await client.query(`UPDATE verificaciones_telefono SET intentos=intentos+1,
        usado_en=CASE WHEN intentos+1 >= 5 THEN now() ELSE usado_en END WHERE id=$1`, [item.id]);
      await client.query('COMMIT');
      return res.status(400).json({code:'CODIGO_INCORRECTO', message:'Codigo incorrecto o agotado.'});
    }
    const updated = await client.query(`UPDATE usuarios SET telefono_e164=$1, telefono_verificado_en=now()
      WHERE id=$2 AND telefono_verificado_en IS NULL RETURNING id`, [item.telefono_e164, req.authUser.id]);
    if (!updated.rowCount) { await client.query('ROLLBACK'); return res.status(409).json({message:'Telefono ya verificado.'}); }
    await client.query('UPDATE verificaciones_telefono SET usado_en=now() WHERE usuario_id=$1 AND usado_en IS NULL', [req.authUser.id]);
    await client.query('COMMIT');
    return res.json({message:'Numero de telefono verificado correctamente.', telefonoVerificado:true, telefono:maskedPhone(item.telefono_e164)});
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    if (error.code==='23505') return res.status(409).json({code:'NUMERO_EN_USO',message:'Este telefono ya esta asociado a una cuenta verificada.'});
    console.error('Error al confirmar OTP:', error.code || error.message);
    return res.status(500).json({message:'No fue posible verificar el telefono.'});
  } finally { client.release(); }
});
export default router;
