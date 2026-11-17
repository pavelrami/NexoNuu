import test from 'node:test';
import assert from 'node:assert/strict';
import { hashPassword, verifyPassword, validPassword, normalizeEmail, makeToken, tokenHash, sessionCookie, readCookie } from '../src/lib/security.js';

test('contraseña se protege con scrypt y un salt aleatorio', async () => {
  const p = 'ContraseñaDeEnsayo#2026';
  const a = await hashPassword(p);
  const b = await hashPassword(p);
  assert.notEqual(a, b);
  assert.ok(await verifyPassword(p, a));
  assert.equal(await verifyPassword('otra contraseña', a), false);
  assert.equal(await verifyPassword(p, 'CUENTA_DE_PRUEBA_SIN_CONTRASENA_VALIDA'), false);
});
test('valida datos y no almacena tokens en claro', () => {
  assert.equal(validPassword('corta'), false);
  assert.equal(validPassword('UnaClaveDePrueba#2026'), true);
  assert.equal(normalizeEmail(' Ejemplo@Correo.COM '), 'ejemplo@correo.com');
  const token = makeToken();
  assert.match(token, /^[A-Za-z0-9_-]{43}$/);
  assert.match(tokenHash(token), /^[a-f0-9]{64}$/);
  assert.ok(sessionCookie(token).includes('HttpOnly'));
  assert.equal(readCookie(`otro=valor; nexo_sesion=${token}`), token);
});
