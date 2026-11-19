// Utilidades puras para el inicio de sesion con Google (probadas en test/googleAuth.test.js).

const EMISORES = new Set(['https://accounts.google.com', 'accounts.google.com']);

/** Lee y valida las afirmaciones de un id_token recibido directamente del endpoint de tokens de Google. */
export function leerIdToken(idToken, { clientId, ahora = Date.now() } = {}) {
  if (typeof idToken !== 'string') throw new Error('id_token ausente');
  const partes = idToken.split('.');
  if (partes.length !== 3) throw new Error('id_token mal formado');
  let datos;
  try { datos = JSON.parse(Buffer.from(partes[1], 'base64url').toString('utf8')); }
  catch { throw new Error('id_token ilegible'); }
  if (!EMISORES.has(datos.iss)) throw new Error('Emisor no valido');
  const audiencia = Array.isArray(datos.aud) ? datos.aud : [datos.aud];
  if (!clientId || !audiencia.includes(clientId)) throw new Error('Audiencia no valida');
  if (typeof datos.exp !== 'number' || datos.exp * 1000 <= ahora) throw new Error('id_token vencido');
  if (typeof datos.sub !== 'string' || !/^[0-9A-Za-z_-]{1,64}$/.test(datos.sub)) throw new Error('Identificador no valido');
  if (datos.email_verified !== true && datos.email_verified !== 'true') throw new Error('Google no ha verificado ese correo');
  if (typeof datos.email !== 'string') throw new Error('Correo ausente');
  return { sub: datos.sub, email: datos.email, name: typeof datos.name === 'string' ? datos.name : '' };
}

/** Solo rutas internas del sitio: evita redirecciones abiertas a otros dominios. */
export function rutaSegura(ruta) {
  if (typeof ruta !== 'string' || !ruta.startsWith('/') || ruta.startsWith('//') || ruta.includes('\\') || /[\r\n]/.test(ruta)) return '/mi-espacio';
  if (ruta.startsWith('/api')) return '/mi-espacio';
  return ruta.slice(0, 200);
}
