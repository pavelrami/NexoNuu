import { allowedDemoPublish } from './panelInstitucionalValidation.js';

export function seguimientoDemoHabilitado(j, opciones = {}) {
  return Boolean(j && j.es_demo === true &&
    ['publicada', 'cerrada', 'finalizada'].includes(j.estado) && allowedDemoPublish(opciones));
}
export function validateSeguimiento(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return { ok: false, message: 'Formulario de seguimiento invalido.' };
  const resumen = typeof body.resumen === 'string' ? body.resumen.trim() : '';
  const observaciones = typeof body.observaciones === 'string' ? body.observaciones.trim() : '';
  const confirmados = body.participantesConfirmados;
  if (resumen.length < 30 || resumen.length > 1200) return { ok: false, message: 'El resumen debe tener entre 30 y 1200 caracteres.' };
  if (observaciones.length > 800) return { ok: false, message: 'Las observaciones no pueden exceder los 800 caracteres.' };
  if (!Number.isInteger(confirmados) || confirmados < 0 || confirmados > 500) return { ok: false, message: 'El numero de participantes confirmados debe estar entre 0 y 500.' };
  return { ok: true, value: { resumen, observaciones, participantesConfirmados: confirmados } };
}
export function confirmadosValidos({ confirmados, aceptados, cupo }) {
  return Number.isInteger(confirmados) && confirmados >= 0 && Number.isInteger(aceptados) &&
    Number.isInteger(cupo) && confirmados <= aceptados && confirmados <= cupo;
}
