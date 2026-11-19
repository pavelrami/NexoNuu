import { puedeGestionarJornada, validateNewJornada } from './panelInstitucionalValidation.js';

export function draftCanEdit(j, opts = {}) {
  return puedeGestionarJornada(j, opts) && j.estado === 'borrador' && new Date(j.inicio).getTime() > Date.now();
}

/** Publicar: borrador futuro de una jornada gestionable. */
export function canPublish(j, opts = {}) {
  return puedeGestionarJornada(j, opts) && j.estado === 'borrador' && new Date(j.inicio).getTime() > Date.now();
}

export function validateDraftEdit(body) {
  return validateNewJornada(body);
}

export function validateLifecycleAction(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return { ok: false, message: 'Solicitud invalida.' };
  const accion = body.accion;
  const motivo = typeof body.motivo === 'string' ? body.motivo.trim() : '';
  if (!['cerrar', 'cancelar', 'finalizar'].includes(accion)) return { ok: false, message: 'Accion no permitida.' };
  if (motivo.length < 12 || motivo.length > 500) return { ok: false, message: 'Escribe un motivo entre 12 y 500 caracteres.' };
  return { ok: true, accion, motivo };
}

export function evaluateLifecycle({ jornada, accion, pendientes, aceptadas, now = Date.now(), opciones = {} }) {
  if (!puedeGestionarJornada(jornada, opciones)) return { ok: false, message: 'Las jornadas de demostracion solo se gestionan con el modo demo activo.' };
  const pending = Number(pendientes), accepted = Number(aceptadas);
  if (!Number.isSafeInteger(pending) || !Number.isSafeInteger(accepted) || pending < 0 || accepted < 0) return { ok: false, message: 'Conteos invalidos.' };
  let estado;
  if (accion === 'cerrar' && jornada.estado === 'publicada' && pending === 0) estado = 'cerrada';
  if (accion === 'cancelar' && ['borrador', 'publicada'].includes(jornada.estado) && pending === 0 && accepted === 0) estado = 'cancelada';
  if (accion === 'finalizar' && jornada.estado === 'cerrada' && pending === 0 && new Date(jornada.fin).getTime() <= now) estado = 'finalizada';
  if (!estado) {
    const message = accion === 'cerrar'
      ? 'Solo puedes cerrar jornadas publicadas que no tengan solicitudes pendientes.'
      : accion === 'cancelar'
        ? 'Solo puedes cancelar borradores o jornadas sin postulaciones pendientes ni aceptadas.'
        : 'Solo puedes finalizar jornadas cerradas cuya fecha de termino ya haya pasado y sin solicitudes pendientes.';
    return { ok: false, message };
  }
  return { ok: true, estado, postulacionesHabilitadas: false };
}
