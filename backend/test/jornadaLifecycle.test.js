import test from 'node:test';
import assert from 'node:assert/strict';
import { draftCanEdit, evaluateLifecycle, validateLifecycleAction, validateDraftEdit } from '../src/lib/jornadaLifecycle.js';
const opciones = { nodeEnv: 'development', demoFlag: '1', institutionName: 'Comunidad Ohel' };
const jornada = { estado: 'publicada', es_demo: true, inicio: '2099-10-01T10:00:00Z', fin: '2099-10-02T10:00:00Z' };
test('gestion del ciclo de vida DEMO prohibida en produccion o sin bandera', () => {
  assert.equal(evaluateLifecycle({ jornada, accion: 'cerrar', pendientes: 0, aceptadas: 1, opciones: { ...opciones, nodeEnv: 'production' } }).ok, false);
  assert.equal(evaluateLifecycle({ jornada: { ...jornada, es_demo: false }, accion: 'cerrar', pendientes: 0, aceptadas: 1, opciones }).ok, false);
});
test('cerrar convocatoria sin pendientes preserva aceptaciones', () => {
  assert.deepEqual(evaluateLifecycle({ jornada, accion: 'cerrar', pendientes: 0, aceptadas: 1, opciones }), { ok: true, estado: 'cerrada', postulacionesHabilitadas: false });
  assert.equal(evaluateLifecycle({ jornada, accion: 'cerrar', pendientes: 1, aceptadas: 0, opciones }).ok, false);
});
test('cancelacion impide dejar personas aceptadas o pendientes sin resolver', () => {
  assert.equal(evaluateLifecycle({ jornada, accion: 'cancelar', pendientes: 1, aceptadas: 0, opciones }).ok, false);
  assert.equal(evaluateLifecycle({ jornada, accion: 'cancelar', pendientes: 0, aceptadas: 1, opciones }).ok, false);
  assert.equal(evaluateLifecycle({ jornada, accion: 'cancelar', pendientes: 0, aceptadas: 0, opciones }).estado, 'cancelada');
});
test('finalizacion solo despues del termino y luego del cierre', () => {
  assert.equal(evaluateLifecycle({ jornada: { ...jornada, estado: 'cerrada' }, accion: 'finalizar', pendientes: 0, aceptadas: 1, opciones }).ok, false);
  assert.equal(evaluateLifecycle({ jornada: { ...jornada, estado: 'cerrada' }, accion: 'finalizar', pendientes: 0, aceptadas: 1, now: Date.parse('2100-01-01T00:00:00Z'), opciones }).estado, 'finalizada');
});
test('motivos y acciones se validan', () => {
  assert.equal(validateLifecycleAction({ accion: 'cerrar', motivo: 'Cierre de prueba a peticion del representante.' }).ok, true);
  assert.equal(validateLifecycleAction({ accion: 'borrar', motivo: 'Texto suficientemente largo' }).ok, false);
  assert.equal(validateLifecycleAction({ accion: 'cancelar', motivo: 'no' }).ok, false);
});
test('edicion solo de borradores futuros DEMO', () => {
  assert.equal(draftCanEdit({ ...jornada, estado: 'borrador' }, opciones), true);
  assert.equal(draftCanEdit(jornada, opciones), false);
  const future = '2099-10-01T10:00:00Z';
  const valid = validateDraftEdit({ titulo: 'Jornada DEMO educacion', descripcion: 'Descripcion suficientemente extensa para las pruebas de plataforma.', comunidadId: '3', cupo: 20, inicio: future, fin: '2099-10-02T10:00:00Z' });
  assert.equal(valid.ok, true);
});
