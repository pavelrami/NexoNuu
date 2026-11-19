import { puedeGestionarJornada } from './panelInstitucionalValidation.js';

/** La institucion decide postulaciones de jornadas publicadas, abiertas y futuras. */
export function canManageApplications(jornada, { demo = false, ahora = Date.now() } = {}) {
  return Boolean(jornada && puedeGestionarJornada(jornada, { demo }) && jornada.estado === 'publicada' &&
    jornada.postulaciones_habilitadas === true && new Date(jornada.inicio).getTime() > ahora);
}
export function validateApplicationDecision(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return { ok: false, message: 'Solicitud invalida.' };
  if (!['aceptada', 'rechazada'].includes(body.estado)) return { ok: false, message: 'Decision invalida.' };
  return { ok: true, estado: body.estado };
}
export function canAcceptWithCapacity({ cupo, ocupados }) {
  return Number.isInteger(cupo) && cupo > 0 && Number.isInteger(ocupados) && ocupados >= 0 && ocupados < cupo;
}
