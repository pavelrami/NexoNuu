export const allowedDecision = new Set(['aprobar','rechazar']);
export const allowedRepresentativeDecision = new Set(['autorizar','revocar']);
export function validateDecision(body, kind='institucion') {
  const action=typeof body?.accion==='string'?body.accion:'';
  const motivo=typeof body?.motivo==='string'?body.motivo.trim():'';
  const allowed=kind==='representante'?allowedRepresentativeDecision:allowedDecision;
  if (!allowed.has(action) || motivo.length<10 || motivo.length>1000)
    return {ok:false,message:'Indica una decision valida y un motivo de 10 a 1000 caracteres.'};
  return {ok:true,accion:action,motivo};
}
export function validId(id){return typeof id==='string' && /^[1-9]\d{0,15}$/.test(id);}
