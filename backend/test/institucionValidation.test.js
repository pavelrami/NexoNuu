import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeInstitutionRequest } from '../src/lib/institucionValidation.js';
const valid = { nombre: 'Centro Comunitario de Prueba', tipo: 'Asociación civil', descripcion: 'Organizacion simulada que ofrece actividades educativas comunitarias.', sitioWeb: 'https://example.org' };
test('normaliza espacios y permite datos validos', () => {
  const r=normalizeInstitutionRequest({...valid,nombre:'  Centro   Comunitario de Prueba   '});
  assert.equal(r.ok,true);assert.equal(r.value.nombre,'Centro Comunitario de Prueba');
});
test('rechaza nombre corto',()=>assert.equal(normalizeInstitutionRequest({...valid,nombre:'ABC'}).ok,false));
test('rechaza URL con javascript',()=>assert.equal(normalizeInstitutionRequest({...valid,sitioWeb:'javascript:alert(1)'}).ok,false));
test('rechaza URL con credenciales',()=>assert.equal(normalizeInstitutionRequest({...valid,sitioWeb:'https://a:secret@example.org'}).ok,false));
test('permite sitio web vacio',()=>assert.equal(normalizeInstitutionRequest({...valid,sitioWeb:''}).ok,true));
test('rechaza datos que no son texto',()=>assert.equal(normalizeInstitutionRequest({...valid,nombre:{}}).ok,false));
test('rechaza descripcion demasiado corta',()=>assert.equal(normalizeInstitutionRequest({...valid,descripcion:'No'}).ok,false));
