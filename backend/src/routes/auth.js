import { Router } from 'express';
import { pool } from '../db.js';
import { clearSessionCookie, hashPassword, makeToken, normalizeEmail, readCookie, sessionCookie, SESSION_MS, tokenHash, validEmail, validPassword, verifyPassword } from '../lib/security.js';
import { limitRequests, sameOriginWrite } from '../lib/limits.js';
import { sendVerificationEmail, sendPasswordResetEmail, emailConfigurado } from '../services/email.js';
import { dominioRecibeCorreo } from '../lib/emailDomain.js';
import { googleConfigurado } from './google.js';

const auth = Router();
auth.use((_req, res, next) => {
  res.set('Cache-Control', 'no-store');
  if (!pool) return res.status(503).json({ code: 'BASE_NO_CONFIGURADA', message: 'La base de datos no está configurada.' });
  next();
});
auth.use((req, res, next) => ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method) ? sameOriginWrite(req, res, next) : next());
const registrationLimit = limitRequests({ prefix: 'registro', max: 8, windowMs: 15 * 60_000 });
const loginLimit = limitRequests({ prefix: 'login', max: 15, windowMs: 15 * 60_000 });
const emailLimit = limitRequests({ prefix: 'correo', max: 4, windowMs: 60 * 60_000 });
const genericMessage = 'Si la cuenta puede recibir un enlace, se enviarán instrucciones de verificación.';
const correoReal = () => (process.env.EMAIL_MODE || 'console') !== 'console';

// Qué opciones de acceso están disponibles en este servidor (sin revelar secretos).
auth.get('/proveedores', (_req, res) => {
  res.json({ google: googleConfigurado(), correo: correoReal() ? 'bandeja' : 'terminal', correoConfigurado: emailConfigurado() });
});

async function createEmailToken(client, userId) {
  const token = makeToken();
  await client.query('DELETE FROM verificaciones_correo WHERE usuario_id = $1 AND usado_en IS NULL', [userId]);
  await client.query(`INSERT INTO verificaciones_correo (usuario_id, token_hash, expira_en)
                      VALUES ($1, $2, now() + INTERVAL '24 hours')`, [userId, tokenHash(token)]);
  return token;
}

auth.post('/registro', registrationLimit, async (req, res) => {
  const { nombre, correo, password } = req.body || {};
  const email = normalizeEmail(correo);
  if (typeof nombre !== 'string' || nombre.trim().length < 2 || nombre.trim().length > 140 || !validEmail(email) || !validPassword(password)) {
    return res.status(400).json({ code: 'DATOS_INVALIDOS', message: 'Indica un nombre de 2 a 140 caracteres, correo válido y contraseña de 12 a 128 caracteres.' });
  }
  // Primero el duplicado: es el mensaje más útil para quien ya tiene cuenta.
  const yaExiste = await pool.query('SELECT 1 FROM usuarios WHERE lower(correo)=$1 LIMIT 1', [email]).catch(() => ({ rowCount: 0 }));
  if (yaExiste.rowCount) {
    return res.status(409).json({ code: 'CORREO_REGISTRADO', message: 'Ya existe una cuenta con ese correo. Inicia sesión o usa “¿Olvidaste tu contraseña?”.' });
  }
  // Solo correos que existen: el dominio debe recibir correo y después se confirma el buzón con un enlace.
  const dominio = await dominioRecibeCorreo(email);
  if (!dominio.ok) {
    return res.status(400).json({ code: 'CORREO_INEXISTENTE', message: 'Ese correo no puede recibir mensajes: el dominio no existe o no tiene buzones. Revisa que esté bien escrito.' });
  }
  const client = await pool.connect().catch(() => null);
  if (!client) return res.status(503).json({ code: 'BASE_NO_DISPONIBLE', message: 'No es posible conectar a PostgreSQL.' });
  let token, userId;
  try {
    const passwordHash = await hashPassword(password);
    await client.query('BEGIN');
    const previous = await client.query('SELECT id FROM usuarios WHERE lower(correo) = $1 LIMIT 1', [email]);
    if (previous.rowCount) {
      await client.query('ROLLBACK');
      return res.status(409).json({ code: 'CORREO_REGISTRADO', message: 'Ya existe una cuenta con ese correo. Inicia sesión o usa “¿Olvidaste tu contraseña?”.' });
    }
    const inserted = await client.query(`INSERT INTO usuarios (nombre, correo, password_hash, estado)
      VALUES ($1, $2, $3, 'activo') RETURNING id`, [nombre.trim(), email, passwordHash]);
    userId = inserted.rows[0].id;
    const roles = await client.query(`INSERT INTO usuario_rol (usuario_id, rol_id)
      SELECT $1, id FROM roles WHERE codigo = 'voluntario' RETURNING rol_id`, [userId]);
    if (!roles.rowCount) throw new Error('Falta aplicar la migracion 001: rol voluntario');
    token = await createEmailToken(client, userId);
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    if (error.code === '23505') return res.status(409).json({ code: 'CORREO_REGISTRADO', message: 'Ya existe una cuenta con ese correo. Inicia sesión o usa “¿Olvidaste tu contraseña?”.' });
    console.error('Error de registro:', error.code || error.message);
    return res.status(500).json({ code: 'REGISTRO_FALLIDO', message: 'No fue posible crear la cuenta. Comprueba la migración de autenticación.' });
  } finally { client.release(); }
  try {
    await sendVerificationEmail(email, token, nombre.trim());
    return res.status(201).json({ message: correoReal()
      ? `Cuenta creada. Te enviamos un enlace a ${email}: ábrelo para activar tu cuenta (revisa también la carpeta de spam).`
      : 'Cuenta creada. En modo local el enlace de verificación aparece en la terminal del backend.', requiereVerificacion: true });
  } catch (error) {
    console.error('Error al enviar correo de verificacion:', error.message);
    return res.status(201).json({ message: 'Cuenta creada, pero no se pudo enviar la verificación. Utiliza Reenviar correo cuando el servicio esté disponible.', requiereVerificacion: true, envioPendiente: true });
  }
});

auth.post('/reenviar-verificacion', emailLimit, async (req, res) => {
  const email = normalizeEmail(req.body?.correo);
  if (!validEmail(email)) return res.status(400).json({ code: 'CORREO_INVALIDO', message: 'Escribe un correo válido.' });
  const client = await pool.connect();
  let token, nombreDestino;
  try {
    await client.query('BEGIN');
    const result = await client.query('SELECT id, nombre, correo, correo_verificado_en FROM usuarios WHERE correo=$1 FOR UPDATE', [email]);
    if (result.rowCount && !result.rows[0].correo_verificado_en) {
      const last = await client.query('SELECT creado_en FROM verificaciones_correo WHERE usuario_id=$1 ORDER BY creado_en DESC LIMIT 1', [result.rows[0].id]);
      if (!last.rowCount || Date.now() - new Date(last.rows[0].creado_en).getTime() > 60_000) {
        token = await createEmailToken(client, result.rows[0].id);
        nombreDestino = result.rows[0].nombre;
      }
    }
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('Error al reenviar verificacion:', error.code || error.message);
    return res.status(500).json({ code: 'CORREO_FALLIDO', message: 'No fue posible procesar la solicitud.' });
  } finally { client.release(); }
  if (token) await sendVerificationEmail(email, token, nombreDestino).catch((e) => console.error('Error de envio:', e.message));
  return res.status(202).json({ message: genericMessage });
});

auth.post('/verificar-correo', limitRequests({ prefix: 'verificar', max: 20, windowMs: 15 * 60_000 }), async (req, res) => {
  const token = req.body?.token;
  if (typeof token !== 'string' || !/^[a-zA-Z0-9_-]{43}$/.test(token)) {
    return res.status(400).json({ code: 'ENLACE_INVALIDO', message: 'Enlace inválido o incompleto.' });
  }
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const changed = await client.query(`UPDATE verificaciones_correo SET usado_en = now()
      WHERE token_hash = $1 AND usado_en IS NULL AND expira_en > now()
      RETURNING usuario_id`, [tokenHash(token)]);
    if (!changed.rowCount) {
      await client.query('ROLLBACK');
      return res.status(400).json({ code: 'ENLACE_EXPIRADO', message: 'Este enlace ya fue utilizado o expiró. Solicita uno nuevo.' });
    }
    await client.query('UPDATE usuarios SET correo_verificado_en = COALESCE(correo_verificado_en, now()) WHERE id = $1', [changed.rows[0].usuario_id]);
    await client.query('DELETE FROM verificaciones_correo WHERE usuario_id = $1 AND usado_en IS NULL', [changed.rows[0].usuario_id]);
    await client.query('COMMIT');
    return res.json({ message: 'Correo verificado. Ya puedes iniciar sesión.' });
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('Error al verificar correo:', error.code || error.message);
    return res.status(500).json({ code: 'VERIFICACION_FALLIDA', message: 'No fue posible confirmar el correo.' });
  } finally { client.release(); }
});

auth.post('/login', loginLimit, async (req, res) => {
  const email = normalizeEmail(req.body?.correo);
  const password = req.body?.password;
  if (!validEmail(email) || typeof password !== 'string' || password.length > 128) return res.status(401).json({ code: 'CREDENCIALES_INVALIDAS', message: 'Correo o contraseña incorrectos.' });
  try {
    const result = await pool.query('SELECT id, nombre, correo, password_hash, estado, correo_verificado_en FROM usuarios WHERE correo = $1', [email]);
    const user = result.rows[0];
    if (!user || !(await verifyPassword(password, user.password_hash)) || user.estado !== 'activo') {
      return res.status(401).json({ code: 'CREDENCIALES_INVALIDAS', message: 'Correo o contraseña incorrectos.' });
    }
    if (!user.correo_verificado_en) return res.status(403).json({ code: 'CORREO_PENDIENTE', message: 'Verifica tu correo electrónico antes de entrar.' });
    const token = makeToken();
    await pool.query(`INSERT INTO sesiones_usuario (usuario_id, token_hash, expira_en)
      VALUES ($1, $2, now() + INTERVAL '7 days')`, [user.id, tokenHash(token)]);
    const roles = await pool.query('SELECT r.codigo FROM usuario_rol ur JOIN roles r ON r.id=ur.rol_id WHERE ur.usuario_id=$1', [user.id]);
    res.set('Set-Cookie', sessionCookie(token));
    return res.json({ user: { id: user.id, nombre: user.nombre, correo: user.correo, roles: roles.rows.map((r) => r.codigo) } });
  } catch (error) {
    console.error('Error login:', error.code || error.message);
    return res.status(500).json({ code: 'LOGIN_FALLIDO', message: 'No fue posible iniciar sesión.' });
  }
});

auth.get('/me', async (req, res) => {
  const raw = readCookie(req.get('cookie') || '');
  // Visitante sin sesión: respuesta 200 con user null (no es un error y no ensucia la consola).
  if (!raw || !/^[A-Za-z0-9_-]{43}$/.test(raw)) return res.json({ user: null, code: 'SIN_SESION' });
  try {
    const result = await pool.query(`SELECT u.id, u.nombre, u.correo, u.correo_verificado_en, u.telefono_verificado_en
      FROM sesiones_usuario s JOIN usuarios u ON u.id = s.usuario_id
      WHERE s.token_hash=$1 AND s.revocado_en IS NULL AND s.expira_en > now()
        AND u.estado='activo' AND u.correo_verificado_en IS NOT NULL`, [tokenHash(raw)]);
    if (!result.rowCount) return res.json({ user: null, code: 'SIN_SESION', message: 'La sesión expiró. Vuelve a iniciar sesión.' });
    const user = result.rows[0];
    const roles = await pool.query('SELECT r.codigo FROM usuario_rol ur JOIN roles r ON r.id=ur.rol_id WHERE ur.usuario_id=$1', [user.id]);
    return res.json({ user: { id: user.id, nombre: user.nombre, correo: user.correo, roles: roles.rows.map((r) => r.codigo), telefonoVerificado: !!user.telefono_verificado_en } });
  } catch (error) {
    console.error('Error consultar sesion:', error.code || error.message);
    return res.status(500).json({ code: 'CONSULTA_FALLIDA', message: 'No fue posible consultar la sesión.' });
  }
});

auth.post('/logout', async (req, res) => {
  const raw = readCookie(req.get('cookie') || '');
  try {
    if (raw && /^[A-Za-z0-9_-]{43}$/.test(raw)) {
      await pool.query('UPDATE sesiones_usuario SET revocado_en=now() WHERE token_hash=$1 AND revocado_en IS NULL', [tokenHash(raw)]);
    }
  } catch (error) {
    console.error('Error logout:', error.code || error.message);
    return res.status(500).json({ code: 'SALIDA_FALLIDA', message: 'No fue posible finalizar la sesión.' });
  }
  res.set('Set-Cookie', clearSessionCookie());
  return res.json({ message: 'Sesión cerrada.' });
});


// Respuesta generica para no revelar si existe una cuenta.
const recoveryMessage = 'Si existe una cuenta verificada con ese correo, recibirás un enlace para crear una nueva contraseña. Revisa tu bandeja y la carpeta de spam.';
auth.post('/solicitar-recuperacion', limitRequests({ prefix: 'recuperar', max: 4, windowMs: 60 * 60_000 }), async (req, res) => {
  const email = normalizeEmail(req.body?.correo);
  if (!validEmail(email)) return res.status(400).json({ code: 'CORREO_INVALIDO', message: 'Escribe un correo válido.' });
  const client = await pool.connect();
  let token, nombreDestino;
  try {
    await client.query('BEGIN');
    const found = await client.query(`SELECT id, nombre FROM usuarios
      WHERE correo=$1 AND estado='activo' AND correo_verificado_en IS NOT NULL
      FOR UPDATE`, [email]);
    if (found.rowCount) {
      const userId = found.rows[0].id;
      nombreDestino = found.rows[0].nombre;
      const previous = await client.query(`SELECT creado_en FROM recuperaciones_password
        WHERE usuario_id=$1 ORDER BY creado_en DESC LIMIT 1`, [userId]);
      // No generar varios tokens durante el mismo minuto.
      if (!previous.rowCount || Date.now() - new Date(previous.rows[0].creado_en).getTime() > 60_000) {
        token = makeToken();
        await client.query('DELETE FROM recuperaciones_password WHERE usuario_id=$1 AND usado_en IS NULL', [userId]);
        await client.query(`INSERT INTO recuperaciones_password (usuario_id, token_hash, expira_en)
          VALUES ($1, $2, now() + INTERVAL '30 minutes')`, [userId, tokenHash(token)]);
      }
    }
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('Error de solicitud de recuperacion:', error.code || error.message);
    return res.status(500).json({ code: 'RECUPERACION_FALLIDA', message: 'No fue posible procesar la solicitud.' });
  } finally { client.release(); }
  if (token) await sendPasswordResetEmail(email, token, nombreDestino).catch(e => console.error('No pudo enviarse la recuperacion:', e.message));
  return res.status(202).json({ message: recoveryMessage });
});

auth.post('/restablecer-contrasena', limitRequests({ prefix: 'restablecer', max: 10, windowMs: 15 * 60_000 }), async (req, res) => {
  const { token, password } = req.body || {};
  if (typeof token !== 'string' || !/^[A-Za-z0-9_-]{43}$/.test(token) || !validPassword(password)) {
    return res.status(400).json({ code: 'DATOS_INVALIDOS', message: 'Enlace inválido o contraseña inválida (12 a 128 caracteres).' });
  }
  const passwordHash = await hashPassword(password);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await client.query(`SELECT r.id, r.usuario_id FROM recuperaciones_password r
      INNER JOIN usuarios u ON u.id=r.usuario_id
      WHERE r.token_hash=$1 AND r.usado_en IS NULL AND r.expira_en > now()
        AND u.estado='activo' AND u.correo_verificado_en IS NOT NULL
      FOR UPDATE OF r`, [tokenHash(token)]);
    if (!result.rowCount) {
      await client.query('ROLLBACK');
      return res.status(400).json({ code: 'ENLACE_EXPIRADO', message: 'Este enlace ya se utilizó o expiró. Solicita otro.' });
    }
    const { id, usuario_id } = result.rows[0];
    await client.query('UPDATE usuarios SET password_hash=$1 WHERE id=$2', [passwordHash, usuario_id]);
    await client.query('UPDATE recuperaciones_password SET usado_en=now() WHERE id=$1', [id]);
    await client.query('DELETE FROM recuperaciones_password WHERE usuario_id=$1 AND usado_en IS NULL', [usuario_id]);
    await client.query('UPDATE sesiones_usuario SET revocado_en=now() WHERE usuario_id=$1 AND revocado_en IS NULL', [usuario_id]);
    await client.query('COMMIT');
    res.set('Set-Cookie', clearSessionCookie());
    return res.json({ message: 'Contraseña actualizada. Inicia sesión con tu nueva contraseña.' });
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('Error al restablecer contrasena:', error.code || error.message);
    return res.status(500).json({ code: 'RESTABLECIMIENTO_FALLIDO', message: 'No fue posible actualizar la contrasena.' });
  } finally { client.release(); }
});

export default auth;
