// Validaciones de solicitudes institucionales. Nunca otorgan permisos.
export function normalizeInstitutionRequest(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return { ok: false, message: 'Completa la informacion de la institucion.' };
  }
  const fields = ['nombre', 'tipo', 'descripcion', 'sitioWeb'];
  for (const field of fields) {
    if (input[field] !== undefined && typeof input[field] !== 'string') {
      return { ok: false, message: 'Los campos deben contener texto valido.' };
    }
  }
  const nombre = (input.nombre || '').trim().replace(/\s+/g, ' ');
  const tipo = (input.tipo || '').trim();
  const descripcion = (input.descripcion || '').trim();
  const sitioWeb = (input.sitioWeb || '').trim();
  if (nombre.length < 5 || nombre.length > 200) return { ok: false, message: 'El nombre debe tener entre 5 y 200 caracteres.' };
  if (tipo.length > 100) return { ok: false, message: 'El tipo de institucion es demasiado largo.' };
  if (descripcion.length < 30 || descripcion.length > 2000) return { ok: false, message: 'Describe la institucion entre 30 y 2000 caracteres.' };
  if (sitioWeb.length > 500) return { ok: false, message: 'La direccion web es demasiado larga.' };
  if (sitioWeb) {
    try {
      const parsed = new URL(sitioWeb);
      if (!['https:', 'http:'].includes(parsed.protocol) || !parsed.hostname.includes('.') || parsed.username || parsed.password) {
        throw new Error('URL invalida');
      }
    } catch {
      return { ok: false, message: 'Escribe un sitio web HTTP o HTTPS valido, o dejalo vacio.' };
    }
  }
  return { ok: true, value: { nombre, tipo: tipo || null, descripcion, sitioWeb: sitioWeb || null } };
}
