import test from 'node:test';
import assert from 'node:assert/strict';
import {validateNewJornada, allowedDemoPublish, validInstitutionId} from '../src/lib/panelInstitucionalValidation.js';
const future = new Date(Date.now()+86400000).toISOString();
const after = new Date(Date.now()+2*86400000).toISOString();
const valid = {titulo:'Jornada DEMO comunitaria',descripcion:'Esta es una convocatoria exclusivamente ficticia para pruebas academicas.',comunidadId:'3',cupo:15,inicio:future,fin:after};
test('permite borradores validos',()=>assert.equal(validateNewJornada(valid).ok,true));
test('impide cupos invalidos',()=>assert.equal(validateNewJornada({...valid,cupo:0}).ok,false));
test('impide fechas pasadas',()=>assert.equal(validateNewJornada({...valid,inicio:'2020-01-01T10:00:00Z'}).ok,false));
test('impide texto insuficiente',()=>assert.equal(validateNewJornada({...valid,descripcion:'corto'}).ok,false));
test('verifica IDs',()=>{assert.equal(validInstitutionId('3'),true);assert.equal(validInstitutionId('0'),false);});
test('publicacion de pruebas nunca en produccion',()=>{
 assert.equal(allowedDemoPublish({nodeEnv:'production',demoFlag:'1',institutionName:'Comunidad Ohel'}),false);
 assert.equal(allowedDemoPublish({nodeEnv:'development',demoFlag:'1',institutionName:'Comunidad Ohel'}),true);
 assert.equal(allowedDemoPublish({nodeEnv:'development',demoFlag:'0',institutionName:'Comunidad Ohel'}),false);
});
