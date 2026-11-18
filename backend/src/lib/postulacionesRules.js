export function validId(value) {
  return typeof value === 'string' && /^[1-9]\d{0,14}$/.test(value);
}
export function canApplyToJornada(j, { localDemo = false } = {}) {
  if (!j || j.estado !== 'publicada' || j.estado_verificacion !== 'verificada' || !j.postulaciones_habilitadas) return false;
  if (new Date(j.inicio).getTime() <= Date.now()) return false;
  if (j.es_demo && !localDemo) return false;
  return true;
}
export function allowLocalDemo() {
  return process.env.NODE_ENV !== 'production' && process.env.ALLOW_DEMO_POSTULACIONES === '1';
}
