// Control inicial en memoria para el entorno academico de una sola instancia.
// En produccion se sustituira por un limite compartido entre procesos (Redis / reverse proxy).
const hits = new Map();
export function limitRequests({ prefix, max, windowMs }) {
  return (req, res, next) => {
    const ip = req.ip || req.socket.remoteAddress || 'desconocido';
    const key = `${prefix}:${ip}`;
    const now = Date.now();
    const prev = hits.get(key);
    const nextEntry = !prev || now >= prev.reset ? { count: 1, reset: now + windowMs } : { count: prev.count + 1, reset: prev.reset };
    hits.set(key, nextEntry);
    if (hits.size > 10000) for (const [k, v] of hits) if (v.reset < now) hits.delete(k);
    if (nextEntry.count > max) return res.status(429).json({ code: 'DEMASIADOS_INTENTOS', message: 'Demasiados intentos. Intenta más tarde.' });
    next();
  };
}
export function sameOriginWrite(req, res, next) {
  const origin = req.get('origin');
  const allowed = process.env.APP_URL || 'http://localhost:5173';
  if (origin && origin !== new URL(allowed).origin) {
    return res.status(403).json({ code: 'ORIGEN_NO_PERMITIDO', message: 'Origen no permitido.' });
  }
  next();
}
