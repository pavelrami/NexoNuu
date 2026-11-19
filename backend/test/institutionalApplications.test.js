import test from 'node:test';
import assert from 'node:assert/strict';
import { canManageApplications, validateApplicationDecision, canAcceptWithCapacity } from '../src/lib/institutionalApplications.js';
const real={es_demo:false,estado:'publicada',postulaciones_habilitadas:true,inicio:'2099-12-10T10:00:00Z'};
const demo={...real,es_demo:true};
test('jornadas reales: la institucion decide postulaciones de jornadas publicadas y abiertas',()=>{
 assert.equal(canManageApplications(real),true);
 assert.equal(canManageApplications({...real,postulaciones_habilitadas:false}),false);
 assert.equal(canManageApplications({...real,estado:'cerrada'}),false);
 assert.equal(canManageApplications({...real,inicio:'2020-01-01T00:00:00Z'}),false);
});
test('jornadas de demostracion solo con el modo demo activo',()=>{
 assert.equal(canManageApplications(demo),false);
 assert.equal(canManageApplications(demo,{demo:true}),true);
});
test('solo acepta dos decisiones de representante',()=>{
 assert.deepEqual(validateApplicationDecision({estado:'aceptada'}),{ok:true,estado:'aceptada'});
 assert.deepEqual(validateApplicationDecision({estado:'rechazada'}),{ok:true,estado:'rechazada'});
 assert.equal(validateApplicationDecision({estado:'administrador'}).ok,false);
 assert.equal(validateApplicationDecision(null).ok,false);
});
test('no acepta postulaciones por encima del cupo',()=>{
 assert.equal(canAcceptWithCapacity({cupo:1,ocupados:0}),true);
 assert.equal(canAcceptWithCapacity({cupo:1,ocupados:1}),false);
 assert.equal(canAcceptWithCapacity({cupo:0,ocupados:0}),false);
});
