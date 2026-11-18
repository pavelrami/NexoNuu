import { allowedDemoPublish } from './panelInstitucionalValidation.js';
export function canManageDemoApplications(jornada,{nodeEnv,demoFlag,institutionName}={}){
  return Boolean(jornada && jornada.es_demo===true && jornada.estado==='publicada' &&
    jornada.postulaciones_habilitadas===true && new Date(jornada.inicio).getTime()>Date.now() &&
    allowedDemoPublish({nodeEnv,demoFlag,institutionName}));
}
export function validateApplicationDecision(body){
  if(!body || typeof body!=='object' || Array.isArray(body)) return {ok:false,message:'Solicitud invalida.'};
  if(!['aceptada','rechazada'].includes(body.estado)) return {ok:false,message:'Decision invalida.'};
  return {ok:true,estado:body.estado};
}
export function canAcceptWithCapacity({cupo,ocupados}){
  return Number.isInteger(cupo) && cupo>0 && Number.isInteger(ocupados) && ocupados>=0 && ocupados<cupo;
}
