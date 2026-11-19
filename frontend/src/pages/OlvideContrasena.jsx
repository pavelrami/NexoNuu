import { useState } from 'react';
import { Link } from 'react-router-dom';
import { requestPasswordReset } from '../api.js';
import AuthLayout from '../components/AuthLayout.jsx';
import { useProveedores } from '../components/GoogleButton.jsx';
import { Icon } from '../components/Icons.jsx';

export default function OlvideContrasena() {
  const proveedores = useProveedores();
  const [correo, setCorreo] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  async function submit(event) {
    event.preventDefault(); setBusy(true); setMessage(''); setError('');
    try { const data = await requestPasswordReset(correo); setMessage(data.message); }
    catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }
  return <AuthLayout kicker="Seguridad de la cuenta" titulo="Recupera tu acceso"
    subtitulo="Escribe el correo de tu cuenta. Te enviaremos un enlace para crear una nueva contraseña, válido durante 30 minutos."
    panelTitulo="Tu cuenta sigue a salvo" panelTexto="Por seguridad no mostramos si un correo está registrado. Si existe una cuenta verificada, el enlace llegará a esa bandeja.">
    {message ? <div className="registro-enviado" role="status">
      <span className="registro-icono"><Icon name="mail" size={28} /></span>
      <h2>Revisa tu correo</h2>
      <p>{message}</p>
      {proveedores?.correo === 'terminal' && <p className="auth-muted">Estás en modo local: el enlace aparece en la terminal del backend.</p>}
      <button type="button" className="btn btn-outline" onClick={() => setMessage('')}>Usar otro correo</button>
    </div> : <form onSubmit={submit} className="auth-form">
      <label htmlFor="recuperar-correo">Correo electrónico</label>
      <div className="input-icono"><Icon name="mail" size={18} />
        <input id="recuperar-correo" type="email" autoComplete="email" required value={correo} onChange={(e) => setCorreo(e.target.value)} placeholder="tu@correo.com" />
      </div>
      {error && <div className="auth-error" role="alert">{error}</div>}
      <button className="btn btn-primary btn-lg" type="submit" disabled={busy}>{busy ? 'Enviando…' : <>Enviarme el enlace <Icon name="arrow" size={18} /></>}</button>
    </form>}
    <p className="auth-switch"><Link to="/iniciar-sesion">Volver a iniciar sesión</Link></p>
    <small className="auth-legal">Si entraste con Google y nunca creaste contraseña, este enlace te permite crear una.</small>
  </AuthLayout>;
}
