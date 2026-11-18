import test from 'node:test';
import assert from 'node:assert/strict';
import { seguimientoDemoHabilitado, validateSeguimiento, confirmadosValidos } from '../src/lib/jornadaSeguimiento.js';
const opciones = { nodeEnv: 'development', demoFlag: '1', institutionName: 'Comunidad Ohel' };
const j = { es_demo: true, estado: 'publicada' };
test('seguimiento DEMO requiere desarrollo y jornada habilitada', () => {
  assert.equal(seguimientoDemoHabilitado(j, opciones), true);
  assert.equal(seguimientoDemoHabilitado({ ...j, estado: 'borrador' }, opciones), false);
  assert.equal(seguimientoDemoHabilitado({ ...j, es_demo: false }, opciones), false);
  assert.equal(seguimientoDemoHabilitado(j, { ...opciones, nodeEnv: 'production' }), false);
  assert.equal(seguimientoDemoHabilitado({ ...j, estado: 'cerrada' }, opciones), true);
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
