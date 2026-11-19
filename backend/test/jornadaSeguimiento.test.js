import test from 'node:test';
import assert from 'node:assert/strict';
import { seguimientoHabilitado, validateSeguimiento, confirmadosValidos } from '../src/lib/jornadaSeguimiento.js';
const opciones = { demo: true };
const j = { es_demo: true, estado: 'publicada' };
test('seguimiento para jornadas publicadas, cerradas o finalizadas', () => {
  assert.equal(seguimientoHabilitado(j, opciones), true);
  assert.equal(seguimientoHabilitado({ ...j, estado: 'borrador' }, opciones), false);
  assert.equal(seguimientoHabilitado({ ...j, es_demo: false }), true);
  assert.equal(seguimientoHabilitado(j, { demo: false }), false);
  assert.equal(seguimientoHabilitado({ ...j, estado: 'cerrada' }, opciones), true);
});
test('no acepta resúmenes breves o excesivos', () => {
  assert.equal(validateSeguimiento({ resumen: 'Muy corto', participantesConfirmados: 0 }).ok, false);
  assert.equal(validateSeguimiento({ resumen: 'a'.repeat(1201), participantesConfirmados: 0 }).ok, false);
});
test('valida seguimiento correcto sin datos personales', () => {
  assert.equal(validateSeguimiento({ resumen: 'Se revisaron materiales DEMO y la coordinación de lectura.', participantesConfirmados: 1, observaciones: '' }).ok, true);
});
test('confirmados nunca superan aceptados ni cupo', () => {
  assert.equal(confirmadosValidos({ confirmados: 1, aceptados: 1, cupo: 15 }), true);
  assert.equal(confirmadosValidos({ confirmados: 2, aceptados: 1, cupo: 15 }), false);
  assert.equal(confirmadosValidos({ confirmados: 2, aceptados: 2, cupo: 1 }), false);
});
