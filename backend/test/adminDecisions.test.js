import test from 'node:test';
import assert from 'node:assert/strict';
import {validateDecision, validId} from '../src/lib/adminDecisions.js';
test('instituciones solo aprobar o rechazar',()=>{
  assert.equal(validateDecision({accion:'aprobar',motivo:'Identidad verificada con documentos.'}).ok,true);
  assert.equal(validateDecision({accion:'autorizar',motivo:'Documento validado con evidencia.'}).ok,false);
});
test('representante acciones distintas',()=>{
 assert.equal(validateDecision({accion:'autorizar',motivo:'Se valido la representacion.'},'representante').ok,true);
 assert.equal(validateDecision({accion:'aprobar',motivo:'Se valido la representacion.'},'representante').ok,false);
});
test('motivo obligatorio y validacion ids',()=>{
 assert.equal(validateDecision({accion:'aprobar',motivo:'ok'}).ok,false);
 assert.equal(validId('3'),true); assert.equal(validId('0'),false); assert.equal(validId('1 OR 1=1'),false);
});
