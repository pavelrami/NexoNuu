import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { resendVerification } from '../api.js';
import AuthLayout, { CampoPassword } from '../components/AuthLayout.jsx';
import { Icon } from '../components/Icons.jsx';

export default function Login() {
  const navigate = useNavigate();
  const { user, login, loading } = useAuth();
  const [correo, setCorreo] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
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
    <form onSubmit={submit} className="auth-form">
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
    {needsEmail && <button className="btn btn-outline" type="button" onClick={resend} disabled={busy}>Reenviar verificación</button>}
    <p className="auth-switch">¿Aún no tienes cuenta? <Link to="/registro">Crear cuenta</Link></p>
    <small className="auth-legal">Nexo Ñuu es un proyecto de vinculación comunitaria. No sustituye a los programas educativos ni a sus instituciones responsables.</small>
  </AuthLayout>;
}
