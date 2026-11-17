import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeVolunteerProfile } from '../src/lib/volunteerValidation.js';

test('Acepta un perfil válido y opcional', () => {
  const result = normalizeVolunteerProfile({
    comunidadId: '2', disponibilidad: 'fin_semana',
    biografia: 'Quiero colaborar', habilidades: ['1', '2'],
    lenguas: [{ lenguaId: '1', varianteId: null, nivel: 'conversacional' }]
  });
  assert.equal(result.ok, true);
  assert.equal(result.value.comunidadId, '2');
  assert.equal(result.value.lenguas[0].varianteId, null);
});

test('No permite habilidades repetidas', () => {
  assert.equal(normalizeVolunteerProfile({ habilidades: ['2', '2'] }).ok, false);
});

test('No permite lengua y variante duplicadas', () => {
  assert.equal(normalizeVolunteerProfile({ lenguas: [
    { lenguaId: '1', nivel: 'fluido' },
    { lenguaId: '1', varianteId: null, nivel: 'basico' }
  ] }).ok, false);
});

test('No permite biografía demasiado larga ni disponibilidad inválida', () => {
  assert.equal(normalizeVolunteerProfile({ biografia: 'x'.repeat(701) }).ok, false);
  assert.equal(normalizeVolunteerProfile({ disponibilidad: 'siempre' }).ok, false);
});

test('No permite variantes con ID inválido', () => {
  assert.equal(normalizeVolunteerProfile({ lenguas: [
    { lenguaId: '1', varianteId: '-2', nivel: 'basico' }
  ] }).ok, false);
});
