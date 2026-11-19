import test from 'node:test';
import assert from 'node:assert/strict';
import { leerIdToken, rutaSegura } from '../src/lib/googleAuth.js';
const cid = 'cliente.apps.googleusercontent.com';
const firmar = (payload) => ['e30', Buffer.from(JSON.stringify(payload)).toString('base64url'), 'firma'].join('.');
const base = { iss: 'https://accounts.google.com', aud: cid, exp: Math.floor(Date.now() / 1000) + 600, sub: '1234567890', email: 'Persona@Gmail.com', email_verified: true, name: 'Persona' };
test('acepta un id_token valido de Google', () => {
  assert.deepEqual(leerIdToken(firmar(base), { clientId: cid }), { sub: '1234567890', email: 'Persona@Gmail.com', name: 'Persona' });
});
test('rechaza emisor, audiencia, vencimiento o correo sin verificar', () => {
  assert.throws(() => leerIdToken(firmar({ ...base, iss: 'https://otro.com' }), { clientId: cid }));
  assert.throws(() => leerIdToken(firmar({ ...base, aud: 'otro' }), { clientId: cid }));
  assert.throws(() => leerIdToken(firmar({ ...base, exp: 10 }), { clientId: cid }));
  assert.throws(() => leerIdToken(firmar({ ...base, email_verified: false }), { clientId: cid }));
  assert.throws(() => leerIdToken('no.es.jwt.valido', { clientId: cid }));
});
test('solo redirige a rutas internas', () => {
  assert.equal(rutaSegura('/jornadas/3'), '/jornadas/3');
  assert.equal(rutaSegura('//evil.com'), '/mi-espacio');
  assert.equal(rutaSegura('https://evil.com'), '/mi-espacio');
  assert.equal(rutaSegura('/api/auth/logout'), '/mi-espacio');
  assert.equal(rutaSegura('/\\evil.com'), '/mi-espacio');
});
