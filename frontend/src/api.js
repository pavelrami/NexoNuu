// Consulta publica; conserva getJornadas() para codigo anterior.
async function publicGet(path, signal) {
  const response = await fetch(path, { signal });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.message || 'No se pudieron consultar las jornadas.');
    error.code = data.code;
    throw error;
  }
  return data;
}

export async function getJornadasConFiltros({ signal, filtros = {} } = {}) {
  const params = new URLSearchParams();
  for (const field of ['buscar', 'region', 'municipio', 'desde', 'hasta', 'lenguaId']) {
    const value = filtros[field];
    if (typeof value === 'string' && value.trim()) params.set(field, value.trim());
  }
  const suffix = params.toString();
  const data = await publicGet(`/api/jornadas${suffix ? `?${suffix}` : ''}`, signal);
  return {
    jornadas: Array.isArray(data.jornadas) ? data.jornadas : [],
    total: Number(data.total ?? data.jornadas?.length ?? 0)
  };
}

export const getOpcionesJornadas = ({ signal } = {}) => publicGet('/api/jornadas/opciones', signal);

export async function getJornadas({ signal } = {}) {
  const resultado = await getJornadasConFiltros({ signal });
  return resultado.jornadas;
}

async function authRequest(path, { method = 'GET', payload } = {}) {
  const response = await fetch(`/api/auth/${path}`, {
    method,
    credentials: 'same-origin',
    headers: payload ? { 'Content-Type': 'application/json' } : {},
    body: payload ? JSON.stringify(payload) : undefined,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.message || 'No se pudo completar la solicitud.');
    error.code = data.code;
    throw error;
  }
  return data;
}
export const register = (nombre, correo, password) => authRequest('registro', { method: 'POST', payload: { nombre, correo, password } });
export const verifyEmail = (token) => authRequest('verificar-correo', { method: 'POST', payload: { token } });
export const resendVerification = (correo) => authRequest('reenviar-verificacion', { method: 'POST', payload: { correo } });
export const login = (correo, password) => authRequest('login', { method: 'POST', payload: { correo, password } });
export const authMe = () => authRequest('me');
export const logout = () => authRequest('logout', { method: 'POST' });

export const requestPasswordReset = (correo) => authRequest('solicitar-recuperacion', { method: 'POST', payload: { correo } });
export const resetPassword = (token, password) => authRequest('restablecer-contrasena', { method: 'POST', payload: { token, password } });

export const phoneStatus = () => authRequest('telefono/estado');
export const requestPhoneCode = (telefono) => authRequest('telefono/solicitar-codigo', { method: 'POST', payload: { telefono } });
export const verifyPhoneCode = (codigo) => authRequest('telefono/confirmar-codigo', { method: 'POST', payload: { codigo } });

// Incremento 3: datos privados del voluntario.
async function volunteerRequest(path, { method = 'GET', payload } = {}) {
  const response = await fetch(`/api/voluntarios/${path}`, {
    method,
    credentials: 'same-origin',
    headers: payload ? { 'Content-Type': 'application/json' } : {},
    body: payload ? JSON.stringify(payload) : undefined,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.message || 'No fue posible consultar el voluntariado.');
    error.code = data.code;
    throw error;
  }
  return data;
}
export const getVolunteerCatalogs = () => volunteerRequest('catalogos');
export const getVolunteerProfile = () => volunteerRequest('me');
export const saveVolunteerProfile = (perfil) => volunteerRequest('me', { method: 'PUT', payload: perfil });

// Incremento 4.2: ficha publica de una jornada vigente.
export const getDetalleJornada = (id, { signal } = {}) => publicGet(`/api/jornadas/${encodeURIComponent(id)}`, signal);

// Incremento 4.3: postulaciones propias (requieren sesion).
async function postulacionesRequest(path, { method='GET', payload }={}) {
  const response = await fetch(`/api/postulaciones${path}`, {
    method, credentials:'same-origin',
    headers: payload ? { 'Content-Type':'application/json' } : {},
    body: payload ? JSON.stringify(payload) : undefined
  });
  const data=await response.json().catch(()=>({}));
  if (!response.ok) {
    const error=new Error(data.message||'No fue posible completar la solicitud.');
    error.code=data.code; throw error;
  }
  return data;
}
export const getMisPostulaciones=()=>postulacionesRequest('/mias');
export const postularJornada=(jornadaId)=>postulacionesRequest('/',{method:'POST',payload:{jornadaId}});
export const retirarPostulacion=(id)=>postulacionesRequest(`/${encodeURIComponent(id)}/retirar`,{method:'PATCH'});

// Incremento 5.1: solicitudes institucionales (cuenta verificada, sin permisos automaticos).
async function institutionRequest(path, { method='GET', payload }={}) {
  const response=await fetch(`/api/instituciones/${path}`, {
    method, credentials:'same-origin',
    headers: payload ? { 'Content-Type':'application/json' } : {},
    body: payload ? JSON.stringify(payload) : undefined
  });
  const data=await response.json().catch(()=>({}));
  if (!response.ok) {
    const error=new Error(data.message || 'No se pudo procesar la solicitud institucional.');
    error.code=data.code; throw error;
  }
  return data;
}
export const getInstitutionRequests=()=>institutionRequest('mis-solicitudes');
export const submitInstitutionRequest=(data)=>institutionRequest('solicitudes', { method:'POST', payload:data });

// Incremento 5.2: exclusivamente administradores (validacion real en Express).
async function adminRequest(path,{method='GET',payload}={}) {
  const response=await fetch(`/api/admin/${path}`,{
    method,credentials:'same-origin',
    headers:payload?{'Content-Type':'application/json'}:{},
    body:payload?JSON.stringify(payload):undefined
  });
  const data=await response.json().catch(()=>({}));
  if(!response.ok){const e=new Error(data.message||'Acceso denegado.');e.code=data.code;throw e;}
  return data;
}
export const getAdminInstitutions=()=>adminRequest('instituciones');
export const decideInstitution=(id,accion,motivo)=>adminRequest(`instituciones/${encodeURIComponent(id)}/decision`,{method:'PATCH',payload:{accion,motivo}});
export const decideRepresentative=(id,usuarioId,accion,motivo)=>adminRequest(`instituciones/${encodeURIComponent(id)}/representantes/${encodeURIComponent(usuarioId)}`,{method:'PATCH',payload:{accion,motivo}});

// Incremento 5.3: representante autorizado. Todas las operaciones se protegen en Express.
async function representativeRequest(path,{method='GET',payload}={}){
 const response=await fetch(`/api/panel-institucional/${path}`,{method,credentials:'same-origin',headers:payload?{'Content-Type':'application/json'}:{},body:payload?JSON.stringify(payload):undefined});
 const data=await response.json().catch(()=>({}));
 if(!response.ok){const e=new Error(data.message||'Error de gestion institucional.');e.code=data.code;throw e;}
 return data;
}
export const getRepresentativeInstitutions=()=>representativeRequest('instituciones');
export const getRepresentativeCommunities=()=>representativeRequest('comunidades');
export const getRepresentativeJornadas=id=>representativeRequest(`instituciones/${encodeURIComponent(id)}/jornadas`);
export const createRepresentativeJornada=(id,payload)=>representativeRequest(`instituciones/${encodeURIComponent(id)}/jornadas`,{method:'POST',payload});
export const publishRepresentativeDemo=(id,jornadaId)=>representativeRequest(`instituciones/${encodeURIComponent(id)}/jornadas/${encodeURIComponent(jornadaId)}/publicar`,{method:'PATCH'});

// Incremento 5.4: consultas y decisiones exclusivas de representantes.
export const getRepresentativeApplications=(id,jornadaId)=>representativeRequest(`instituciones/${encodeURIComponent(id)}/jornadas/${encodeURIComponent(jornadaId)}/postulaciones`);
export const decideRepresentativeApplication=(id,jornadaId,postulacionId,estado)=>representativeRequest(`instituciones/${encodeURIComponent(id)}/jornadas/${encodeURIComponent(jornadaId)}/postulaciones/${encodeURIComponent(postulacionId)}/decision`,{method:'PATCH',payload:{estado}});

// Incremento 5.5: ciclo de vida DEMO con validacion de permisos y auditoria.
export const editRepresentativeDraft = (institutionId, jornadaId, payload) =>
  representativeRequest(`instituciones/${encodeURIComponent(institutionId)}/jornadas/${encodeURIComponent(jornadaId)}/editar`, { method: 'PATCH', payload });
export const transitionRepresentativeDemo = (institutionId, jornadaId, accion, motivo) =>
  representativeRequest(`instituciones/${encodeURIComponent(institutionId)}/jornadas/${encodeURIComponent(jornadaId)}/transicion`, { method: 'PATCH', payload: { accion, motivo } });
export const getRepresentativeJornadaHistory = (institutionId, jornadaId) =>
  representativeRequest(`instituciones/${encodeURIComponent(institutionId)}/jornadas/${encodeURIComponent(jornadaId)}/historial`);

// Incremento 6.1: registro de avances de coordinación de jornadas DEMO.
export const getRepresentativeSeguimientos = (institutionId, jornadaId) =>
  representativeRequest(`instituciones/${encodeURIComponent(institutionId)}/jornadas/${encodeURIComponent(jornadaId)}/seguimientos`);
export const createRepresentativeSeguimiento = (institutionId, jornadaId, payload) =>
  representativeRequest(`instituciones/${encodeURIComponent(institutionId)}/jornadas/${encodeURIComponent(jornadaId)}/seguimientos`, { method: 'POST', payload });

// Incremento 7: indicadores publicos agregados y referencia historica.
export const getEstadisticas = ({ signal } = {}) => publicGet('/api/estadisticas', signal);
export const getJornadasHistoricas = ({ signal } = {}) => publicGet('/api/jornadas/historicas', signal);

// Incremento 8: opciones de acceso (Google y modo de correo).
export const getProveedores = () => authRequest('proveedores');

// Incremento 8: administracion general.
export const getAdminResumen = () => adminRequest('resumen');
export const getAdminUsuarios = (buscar = '') => adminRequest(`usuarios${buscar ? `?buscar=${encodeURIComponent(buscar)}` : ''}`);
export const setAdminUsuarioEstado = (id, estado, motivo) => adminRequest(`usuarios/${encodeURIComponent(id)}/estado`, { method: 'PATCH', payload: { estado, motivo } });
export const setAdminUsuarioAdmin = (id, accion, motivo) => adminRequest(`usuarios/${encodeURIComponent(id)}/admin`, { method: 'PATCH', payload: { accion, motivo } });
export const revokeInstitution = (id, motivo) => adminRequest(`instituciones/${encodeURIComponent(id)}/revocar`, { method: 'PATCH', payload: { motivo } });
export const getAdminJornadas = () => adminRequest('jornadas');
export const cancelAdminJornada = (id, motivo) => adminRequest(`jornadas/${encodeURIComponent(id)}/cancelar`, { method: 'PATCH', payload: { motivo } });
