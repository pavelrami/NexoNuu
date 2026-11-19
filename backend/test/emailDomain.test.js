import test from 'node:test';
import assert from 'node:assert/strict';
import { dominioDe, dominioRecibeCorreo } from '../src/lib/emailDomain.js';
const falla = (code) => () => Promise.reject(Object.assign(new Error(code), { code }));
test('obtiene el dominio del correo', () => assert.equal(dominioDe('ana@ITOaxaca.edu.mx'), 'itoaxaca.edu.mx'));
test('acepta dominios con MX', async () => {
  const r = await dominioRecibeCorreo('a@gmail.com', { resolver: { resolveMx: async () => [{ exchange: 'mx.google.com', priority: 5 }] } });
  assert.equal(r.ok, true);
});
test('rechaza dominios inexistentes o reservados', async () => {
  assert.equal((await dominioRecibeCorreo('a@noexiste-xyz.com', { resolver: { resolveMx: falla('ENOTFOUND') } })).ok, false);
  assert.equal((await dominioRecibeCorreo('a@nexonuu.test')).ok, false);
});
test('MX nulo significa que no recibe correo', async () => {
  const r = await dominioRecibeCorreo('a@ejemplo.com', { resolver: { resolveMx: async () => [{ exchange: '.', priority: 0 }] } });
  assert.equal(r.ok, false);
});
test('si el DNS no responde no bloquea: decide el enlace de verificacion', async () => {
  const r = await dominioRecibeCorreo('a@gmail.com', { resolver: { resolveMx: falla('ETIMEOUT') } });
  assert.deepEqual(r, { ok: true, sinComprobar: true });
});
