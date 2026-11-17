import { useState } from 'react';
import { Link } from 'react-router-dom';
import { requestPasswordReset } from '../api.js';
export default function OlvideContrasena() {
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
  return <section className="container auth-page"><div className="auth-intro">
    <span className="section-kicker">Seguridad de la cuenta</span>
    <h1>Recupera el acceso a Nexo Ñuu</h1>
    <p>Te ayudaremos a establecer una nueva contraseña sin mostrar públicamente si tu correo está registrado.</p>
  </div><div className="auth-card"><h2>Olvidé mi contraseña</h2>
    <p className="auth-muted">Indica tu correo. Si corresponde a una cuenta verificada, recibirás un enlace válido durante 30 minutos.</p>
    <form onSubmit={submit} className="auth-form"><label htmlFor="recuperar-correo">Correo electrónico</label>
      <input id="recuperar-correo" type="email" autoComplete="email" required value={correo} onChange={e => setCorreo(e.target.value)}/>
      {error && <div className="auth-error" role="alert">{error}</div>}
      {message && <div className="auth-success" role="status">{message}</div>}
      <button className="btn btn-primary" type="submit" disabled={busy}>{busy ? 'Enviando…' : 'Solicitar enlace'}</button>
    </form><p className="auth-switch"><Link to="/iniciar-sesion">Volver al inicio de sesión</Link></p>
    <small className="auth-muted">En desarrollo local, el enlace se mostrará en la terminal del backend.</small>
  </div></section>;
}
