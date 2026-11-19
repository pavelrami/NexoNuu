import { useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { resendVerification } from '../api.js';
import AuthLayout, { CampoPassword } from '../components/AuthLayout.jsx';
import GoogleButton from '../components/GoogleButton.jsx';
import { Icon } from '../components/Icons.jsx';

const ERRORES_GOOGLE = {
  google_no_configurado: 'El acceso con Google todavía no está configurado en el servidor. Usa tu correo y contraseña.',
  google_cancelado: 'Cancelaste el acceso con Google.',
  google_estado: 'La sesión con Google expiró. Inténtalo de nuevo.',
  google_fallo: 'Google no pudo confirmar tu cuenta. Inténtalo de nuevo.',
  google_correo: 'Tu cuenta de Google no tiene un correo válido.',
  google_otra_cuenta: 'Ese correo ya está vinculado a otra cuenta de Google.',
  cuenta_bloqueada: 'Tu cuenta está bloqueada. Escribe a la administración de Nexo Ñuu.',
  base_no_disponible: 'El servicio no está disponible en este momento.',
};

export default function Login() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { user, login, loading } = useAuth();
  const [correo, setCorreo] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(() => ERRORES_GOOGLE[params.get('error')] || '');
  const [needsEmail, setNeedsEmail] = useState(false);
  const [notice, setNotice] = useState('');
  if (loading) return <section className="container inner-page"><p role="status">Comprobando sesión…</p></section>;
  if (user) return <Navigate to="/mi-espacio" replace/>;
  async function submit(event) {
    event.preventDefault(); setBusy(true); setError(''); setNotice(''); setNeedsEmail(false);
    try { await login(correo, password); setPassword(''); navigate('/mi-espacio'); }
    catch (e) { setError(e.message); setNeedsEmail(e.code === 'CORREO_PENDIENTE'); }
    finally { setBusy(false); }
  }
  async function resend() {
    setBusy(true); setError('');
    try { const data = await resendVerification(correo); setNotice(data.message); }
    catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }
  return <AuthLayout titulo="Iniciar sesión" subtitulo="Accede a tu cuenta para gestionar jornadas, voluntariado y seguimiento según tus permisos.">
    <GoogleButton />
    <form onSubmit={submit} className="auth-form auth-form--tras-google">
      <label htmlFor="login-correo">Correo electrónico</label>
      <div className="input-icono"><Icon name="mail" size={18} />
        <input id="login-correo" type="email" autoComplete="username" required value={correo} onChange={(e) => setCorreo(e.target.value)} placeholder="tu@correo.com" />
      </div>
      <label htmlFor="login-password">Contraseña</label>
      <CampoPassword id="login-password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
      <p className="auth-olvido"><Link to="/olvide-contrasena">¿Olvidaste tu contraseña?</Link></p>
      {error && <div className="auth-error" role="alert">{error}</div>}
      {notice && <div className="auth-success" role="status">{notice}</div>}
      <button type="submit" className="btn btn-primary btn-lg" disabled={busy}>{busy ? 'Ingresando…' : <>Entrar a la plataforma <Icon name="arrow" size={18} /></>}</button>
    </form>
    {needsEmail && <button className="btn btn-outline" type="button" onClick={resend} disabled={busy}>Reenviar correo de verificación</button>}
    <p className="auth-switch">¿Aún no tienes cuenta? <Link to="/registro">Crear cuenta</Link></p>
    <small className="auth-legal">Solo pueden entrar cuentas con correo verificado. Nexo Ñuu es un proyecto de vinculación comunitaria y no sustituye a los programas educativos.</small>
  </AuthLayout>;
}
