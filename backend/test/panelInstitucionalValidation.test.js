import test from 'node:test';
import assert from 'node:assert/strict';
import {validateNewJornada, demoHabilitado, puedeGestionarJornada, validInstitutionId} from '../src/lib/panelInstitucionalValidation.js';
const future = new Date(Date.now()+86400000).toISOString();
const after = new Date(Date.now()+2*86400000).toISOString();
const valid = {titulo:'Jornada DEMO comunitaria',descripcion:'Esta es una convocatoria exclusivamente ficticia para pruebas academicas.',comunidadId:'3',cupo:15,inicio:future,fin:after};
test('permite borradores validos',()=>assert.equal(validateNewJornada(valid).ok,true));
test('impide cupos invalidos',()=>assert.equal(validateNewJornada({...valid,cupo:0}).ok,false));
test('impide fechas pasadas',()=>assert.equal(validateNewJornada({...valid,inicio:'2020-01-01T10:00:00Z'}).ok,false));
test('impide texto insuficiente',()=>assert.equal(validateNewJornada({...valid,descripcion:'corto'}).ok,false));
test('verifica IDs',()=>{assert.equal(validInstitutionId('3'),true);assert.equal(validInstitutionId('0'),false);});
test('modo demo solo con bandera explicita',()=>{
 assert.equal(demoHabilitado({ALLOW_DEMO_POSTULACIONES:'1'}),true);
 assert.equal(demoHabilitado({ALLOW_DEMO_POSTULACIONES:'0'}),false);
 assert.equal(demoHabilitado({}),false);
});
test('jornadas reales gestionables; DEMO solo con modo demo',()=>{
 assert.equal(puedeGestionarJornada({es_demo:false}),true);
 assert.equal(puedeGestionarJornada({es_demo:true}),false);
 assert.equal(puedeGestionarJornada({es_demo:true},{demo:true}),true);
 assert.equal(puedeGestionarJornada(null),false);
});
test('borrador real por defecto; DEMO solo si se pide',()=>{
 assert.equal(validateNewJornada(valid).value.esDemo,false);
 assert.equal(validateNewJornada({...valid,esDemo:true}).value.esDemo,true);
 assert.equal(validateNewJornada({...valid,esDemo:'si'}).value.esDemo,false);
});
