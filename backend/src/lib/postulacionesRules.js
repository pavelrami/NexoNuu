export function validId(value) {
  return typeof value === 'string' && /^[1-9]\d{0,14}$/.test(value);
}
export function canApplyToJornada(j, { demo = false } = {}) {
  if (!j || j.estado !== 'publicada' || j.estado_verificacion !== 'verificada' || !j.postulaciones_habilitadas) return false;
  if (new Date(j.inicio).getTime() <= Date.now()) return false;
  if (j.es_demo && !demo) return false;
  return true;
}
/** Postulaciones simuladas a jornadas de demostracion: solo con ALLOW_DEMO_POSTULACIONES=1. */
export function allowDemo(env = process.env) {
  return env.ALLOW_DEMO_POSTULACIONES === '1';
}
/** La verificacion telefonica es obligatoria solo si TELEFONO_OBLIGATORIO=1 (requiere proveedor de SMS). */
export function telefonoObligatorio(env = process.env) {
  return env.TELEFONO_OBLIGATORIO === '1';
}
