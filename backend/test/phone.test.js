import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeMxPhone, maskedPhone, makeOtp } from '../src/lib/phone.js';

test('Acepta numero mexicano y estandariza E.164', () => {
  assert.equal(normalizeMxPhone('951 123 4567'), '+529511234567');
  assert.equal(normalizeMxPhone('+52 951-123-4567'), '+529511234567');
  assert.equal(normalizeMxPhone('123'), null);
  assert.equal(normalizeMxPhone('+1 555 123 4567'), null);
});
test('Codigo OTP y numero enmascarado', () => {
  for (let i=0;i<100;i++) assert.match(makeOtp(), /^\d{6}$/);
  assert.equal(maskedPhone('+529511234567'), '+52 ******4567');
});
