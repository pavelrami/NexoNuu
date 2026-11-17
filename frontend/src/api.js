export async function getJornadas({ signal } = {}) {
  const response = await fetch('/api/jornadas', { signal });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.message || 'No se pudieron consultar las jornadas.');
    error.code = data.code;
    throw error;
  }
  return data.jornadas ?? [];
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
