import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { resendVerification } from '../api.js';
export default function Login() {
  const navigate = useNavigate();
  const { user, login, loading } = useAuth();
  const [correo, setCorreo] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [needsEmail, setNeedsEmail] = useState(false);
  const [notice, setNotice] = useState('');
  if (loading) return <section className="container inner-page">Comprobando sesión…</section>;
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
  return <section className="container auth-page">
    <div className="auth-intro"><span className="section-kicker">Tu espacio de participación</span>
      <h1>Conectamos esfuerzos para apoyar la alfabetización en Oaxaca</h1>
      <p>Accede a tu cuenta para consultar tu información. Próximamente podrás administrar postulaciones, jornadas y seguimiento según tus permisos.</p>
      <div className="auth-feature">Nexo Ñuu es un proyecto académico. No sustituye los programas educativos ni sus instituciones responsables.</div>
    </div>
    <div className="auth-card">
      <h2>Iniciar sesión</h2><p className="auth-muted">Utiliza el correo y la contraseña con los que te registraste.</p>
      <form onSubmit={submit} className="auth-form">
        <label htmlFor="login-correo">Correo electrónico</label>
        <input id="login-correo" type="email" autoComplete="username" required value={correo} onChange={(e) => setCorreo(e.target.value)}/>
        <label htmlFor="login-password">Contraseña</label>
        <input id="login-password" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)}/>
        {error && <div className="auth-error" role="alert">{error}</div>}
        {notice && <div className="auth-success" role="status">{notice}</div>}
        <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? 'Ingresando…' : 'Entrar'}</button>
      </form>
      {needsEmail && <button className="btn btn-outline" type="button" onClick={resend} disabled={busy}>Reenviar verificación</button>}
      <p className="auth-switch"><Link to="/olvide-contrasena">¿Olvidaste tu contraseña?</Link></p>
      <p className="auth-switch">¿Aún no tienes cuenta? <Link to="/registro">Crear cuenta</Link></p>
      <small className="auth-muted">La verificación telefónica se incorporará en una etapa posterior.</small>
    </div>
  </section>;
}
