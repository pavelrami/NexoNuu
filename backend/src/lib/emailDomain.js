// Comprueba que el dominio del correo exista y pueda recibir mensajes (registros MX, o A/AAAA como respaldo).
// La existencia del buzon se confirma despues con el enlace de verificacion: sin abrirlo no se puede entrar.
import { promises as dns } from 'node:dns';

const RESERVADOS = /\.(test|example|invalid|localhost|local)$/i;

export function dominioDe(correo = '') {
  const at = correo.lastIndexOf('@');
  return at > 0 ? correo.slice(at + 1).toLowerCase() : '';
}

const conLimite = (promesa, ms) => Promise.race([
  promesa,
  new Promise((_, reject) => { setTimeout(() => reject(Object.assign(new Error('timeout'), { code: 'ETIMEOUT' })), ms); }),
]);

/**
 * Devuelve { ok: true } si el dominio puede recibir correo,
 * { ok: false, motivo } si no existe, o { ok: true, sinComprobar: true } si el DNS no respondio
 * (en ese caso decide el correo de verificacion).
 */
export async function dominioRecibeCorreo(correo, { resolver = dns, timeoutMs = 4000 } = {}) {
  const dominio = dominioDe(correo);
  if (!dominio || RESERVADOS.test(dominio)) return { ok: false, motivo: 'DOMINIO_INVALIDO' };
  try {
    const mx = await conLimite(resolver.resolveMx(dominio), timeoutMs);
    if (Array.isArray(mx) && mx.some((r) => r.exchange && r.exchange !== '.')) return { ok: true };
    return { ok: false, motivo: 'SIN_MX' };
  } catch (error) {
    if (['ENOTFOUND', 'ENODOMAIN', 'NXDOMAIN'].includes(error.code)) return { ok: false, motivo: 'DOMINIO_INEXISTENTE' };
    if (error.code === 'ENODATA') {
      try {
        const a = await conLimite(resolver.resolve4(dominio), timeoutMs);
        return a.length ? { ok: true } : { ok: false, motivo: 'SIN_MX' };
      } catch { return { ok: false, motivo: 'SIN_MX' }; }
    }
    return { ok: true, sinComprobar: true };
  }
}
