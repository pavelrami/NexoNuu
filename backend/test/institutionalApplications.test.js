import test from 'node:test';
import assert from 'node:assert/strict';
import { canManageDemoApplications, validateApplicationDecision, canAcceptWithCapacity } from '../src/lib/institutionalApplications.js';
const local={nodeEnv:'development',demoFlag:'1',institutionName:'Comunidad Ohel'};
const demo={es_demo:true,estado:'publicada',postulaciones_habilitadas:true,inicio:'2099-12-10T10:00:00Z'};
test('solicitudes DEMO permitidas solo en desarrollo local',()=>{
 assert.equal(canManageDemoApplications(demo,local),true);
 assert.equal(canManageDemoApplications(demo,{...local,nodeEnv:'production'}),false);
 assert.equal(canManageDemoApplications({...demo,es_demo:false},local),false);
 assert.equal(canManageDemoApplications({...demo,postulaciones_habilitadas:false},local),false);
 assert.equal(canManageDemoApplications({...demo,inicio:'2020-01-01T00:00:00Z'},local),false);
 assert.equal(canManageDemoApplications(demo,{...local,institutionName:'IEEA Oaxaca'}),false);
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
