export const validInstitutionId = (value) => typeof value === 'string' && /^[1-9]\d{0,14}$/.test(value);
export function validateNewJornada(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return { ok: false, message: 'Formulario invalido.' };
  const titulo = typeof body.titulo === 'string' ? body.titulo.trim() : '';
  const descripcion = typeof body.descripcion === 'string' ? body.descripcion.trim() : '';
  if (titulo.length < 8 || titulo.length > 220) return { ok: false, message: 'El titulo debe tener entre 8 y 220 caracteres.' };
  if (descripcion.length < 30 || descripcion.length > 2000) return { ok: false, message: 'La descripcion debe tener entre 30 y 2000 caracteres.' };
  if (!validInstitutionId(String(body.comunidadId ?? ''))) return { ok: false, message: 'Selecciona una comunidad valida.' };
  if (!Number.isInteger(body.cupo) || body.cupo < 1 || body.cupo > 500) return { ok: false, message: 'El cupo debe estar entre 1 y 500.' };
  if (typeof body.inicio !== 'string' || typeof body.fin !== 'string' || !/T\d{2}:\d{2}/.test(body.inicio) || !/T\d{2}:\d{2}/.test(body.fin)) return { ok: false, message: 'Indica fecha y horario de inicio y termino.' };
  const inicio = new Date(body.inicio), fin = new Date(body.fin);
  if (!Number.isFinite(inicio.getTime()) || !Number.isFinite(fin.getTime()) || inicio.getTime() <= Date.now()) return { ok: false, message: 'La jornada debe comenzar en una fecha futura.' };
  if (fin <= inicio || fin.getTime() - inicio.getTime() > 7 * 24 * 3600 * 1000) return { ok: false, message: 'La fecha de cierre debe ser posterior al inicio, con duracion maxima de 7 dias.' };
  return { ok: true, value: { titulo, descripcion, comunidadId: String(body.comunidadId), cupo: body.cupo, inicio: inicio.toISOString(), fin: fin.toISOString() } };
}
export function allowedDemoPublish({ nodeEnv, demoFlag, institutionName }) {
  return nodeEnv === 'development' && demoFlag === '1' && /demo|fictici|prueba|ohel/i.test(institutionName || '');
}
