// Inicio de sesion con Google (OpenID Connect, flujo de codigo con PKCE).
// Requiere GOOGLE_CLIENT_ID y GOOGLE_CLIENT_SECRET. URI de redireccion autorizada en Google Cloud:
//   {APP_URL}/api/auth/google/callback
import { Router } from 'express';
import { createHash, randomBytes } from 'node:crypto';
import { pool } from '../db.js';
import { hashPassword, makeToken, normalizeEmail, readCookie, sessionCookie, tokenHash, validEmail } from '../lib/security.js';
import { limitRequests } from '../lib/limits.js';
import { leerIdToken, rutaSegura } from '../lib/googleAuth.js';

const router = Router();
const COOKIE = 'nexo_google';
const appUrl = () => (process.env.APP_URL || 'http://localhost:5173').replace(/\/$/, '');
const redirectUri = () => `${appUrl()}/api/auth/google/callback`;
export const googleConfigurado = () => Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);

const cookieTemporal = (valor, maxAge) => `${COOKIE}=${valor}; Path=/api/auth/google; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${(process.env.COOKIE_SECURE ? process.env.COOKIE_SECURE === 'true' : process.env.NODE_ENV === 'production') ? '; Secure' : ''}`;
const volverConError = (res, codigo) => res.redirect(302, `${appUrl()}/iniciar-sesion?error=${encodeURIComponent(codigo)}`);

router.get('/', limitRequests({ prefix: 'google-inicio', max: 30, windowMs: 15 * 60_000 }), (req, res) => {
  if (!googleConfigurado()) return volverConError(res, 'google_no_configurado');
  const state = makeToken();
  const verifier = randomBytes(48).toString('base64url');
  const challenge = createHash('sha256').update(verifier).digest('base64url');
  const volver = rutaSegura(typeof req.query.volver === 'string' ? req.query.volver : '/mi-espacio');
  res.set('Set-Cookie', cookieTemporal(`${state}.${verifier}.${Buffer.from(volver).toString('base64url')}`, 600));
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID,
    redirect_uri: redirectUri(),
    response_type: 'code',
    scope: 'openid email profile',
    state,
    code_challenge: challenge,
    code_challenge_method: 'S256',
    prompt: 'select_account',
  });
  res.redirect(302, `https://accounts.google.com/o/oauth2/v2/auth?${params}`);
});

router.get('/callback', limitRequests({ prefix: 'google-callback', max: 30, windowMs: 15 * 60_000 }), async (req, res) => {
  res.set('Cache-Control', 'no-store');
  const guardado = readCookie(req.get('cookie') || '', COOKIE) || '';
  res.append('Set-Cookie', cookieTemporal('', 0));
  if (!googleConfigurado()) return volverConError(res, 'google_no_configurado');
  if (req.query.error) return volverConError(res, 'google_cancelado');
  const [state, verifier, volver64] = guardado.split('.');
  if (!state || !verifier || typeof req.query.state !== 'string' || req.query.state !== state || typeof req.query.code !== 'string') {
    return volverConError(res, 'google_estado');
  }
  if (!pool) return volverConError(res, 'base_no_disponible');
  let perfil;
  try {
    const respuesta = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code: req.query.code,
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        redirect_uri: redirectUri(),
        grant_type: 'authorization_code',
        code_verifier: verifier,
      }),
      signal: AbortSignal.timeout(10_000),
    });
    const datos = await respuesta.json().catch(() => ({}));
    if (!respuesta.ok || !datos.id_token) throw new Error(`token ${respuesta.status}`);
    // El id_token llega directo de Google por TLS: se validan emisor, audiencia, vigencia y correo verificado.
    perfil = leerIdToken(datos.id_token, { clientId: process.env.GOOGLE_CLIENT_ID });
  } catch (error) {
    console.error('Error de Google:', error.message);
    return volverConError(res, 'google_fallo');
  }
  const correo = normalizeEmail(perfil.email);
  if (!validEmail(correo)) return volverConError(res, 'google_correo');

  const client = await pool.connect().catch(() => null);
  if (!client) return volverConError(res, 'base_no_disponible');
  try {
    await client.query('BEGIN');
    let user = (await client.query(`SELECT id, estado, google_sub, correo_verificado_en FROM usuarios
      WHERE google_sub=$1 OR lower(correo)=$2 ORDER BY (google_sub IS NOT DISTINCT FROM $1) DESC LIMIT 1 FOR UPDATE`, [perfil.sub, correo])).rows[0];
    if (user && user.estado !== 'activo') { await client.query('ROLLBACK'); return volverConError(res, 'cuenta_bloqueada'); }
    if (user && user.google_sub && user.google_sub !== perfil.sub) { await client.query('ROLLBACK'); return volverConError(res, 'google_otra_cuenta'); }
    if (user) {
      if (!user.correo_verificado_en) {
        // Cuenta creada con ese correo pero nunca verificada: Google demuestra la propiedad del correo.
        // Se invalida la contrasena previa para que nadie mas conserve acceso.
        await client.query('UPDATE usuarios SET password_hash=$1 WHERE id=$2', [await hashPassword(makeToken()), user.id]);
        await client.query('UPDATE sesiones_usuario SET revocado_en=now() WHERE usuario_id=$1 AND revocado_en IS NULL', [user.id]);
      }
      await client.query('UPDATE usuarios SET google_sub=$1, correo_verificado_en=COALESCE(correo_verificado_en, now()) WHERE id=$2', [perfil.sub, user.id]);
    } else {
      const nombre = (perfil.name || correo.split('@')[0]).trim().slice(0, 140) || 'Persona voluntaria';
      user = (await client.query(`INSERT INTO usuarios (nombre, correo, password_hash, estado, correo_verificado_en, google_sub)
        VALUES ($1,$2,$3,'activo',now(),$4) RETURNING id`, [nombre, correo, await hashPassword(makeToken()), perfil.sub])).rows[0];
      const rol = await client.query(`INSERT INTO usuario_rol (usuario_id, rol_id) SELECT $1, id FROM roles WHERE codigo='voluntario' RETURNING rol_id`, [user.id]);
      if (!rol.rowCount) throw new Error('Falta el rol voluntario');
    }
    const token = makeToken();
    await client.query(`INSERT INTO sesiones_usuario (usuario_id, token_hash, expira_en) VALUES ($1,$2, now() + INTERVAL '7 days')`, [user.id, tokenHash(token)]);
    await client.query('COMMIT');
    res.append('Set-Cookie', sessionCookie(token));
    const destino = rutaSegura(Buffer.from(volver64 || '', 'base64url').toString('utf8'));
    return res.redirect(302, `${appUrl()}${destino}`);
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('Error al iniciar sesion con Google:', error.code || error.message);
    return volverConError(res, 'google_fallo');
  } finally { client.release(); }
});

export default router;
