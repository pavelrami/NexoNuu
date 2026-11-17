import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { resetPassword } from '../api.js';
export default function RestablecerContrasena() {
  const [params] = useSearchParams();
  const token = params.get('token') || '';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  async function submit(event) {
    event.preventDefault(); setError('');
    if (password !== confirm) return setError('Las contraseñas no coinciden.');
    setBusy(true);
    try { await resetPassword(token, password); setDone(true); setPassword(''); setConfirm(''); }
    catch(e) { setError(e.message); }
    finally { setBusy(false); }
  }
  return <section className="container auth-page"><div className="auth-intro">
    <span className="section-kicker">Seguridad de la cuenta</span><h1>Establece una nueva contraseña</h1>
    <p>Al cambiarla, las sesiones anteriores se cerrarán automáticamente.</p>
  </div><div className="auth-card"><h2>Restablecer contraseña</h2>
    {!token && <div className="auth-error" role="alert">Falta el enlace de recuperación. Solicita uno nuevo.</div>}
    {done ? <><div className="auth-success" role="status">Contraseña actualizada correctamente.</div>
      <p className="auth-switch"><Link to="/iniciar-sesion">Iniciar sesión</Link></p></> : <>
      <form onSubmit={submit} className="auth-form">
        <label htmlFor="nueva-password">Nueva contraseña</label>
        <input id="nueva-password" type="password" required minLength={12} maxLength={128} autoComplete="new-password" value={password} onChange={e=>setPassword(e.target.value)}/>
        <label htmlFor="confirmar-password">Confirmar contraseña</label>
        <input id="confirmar-password" type="password" required minLength={12} maxLength={128} autoComplete="new-password" value={confirm} onChange={e=>setConfirm(e.target.value)}/>
        {error && <div className="auth-error" role="alert">{error}</div>}
        <button className="btn btn-primary" disabled={!token || busy}>{busy ? 'Guardando…' : 'Cambiar contraseña'}</button>
      </form><p className="auth-switch"><Link to="/olvide-contrasena">Solicitar otro enlace</Link></p></>}
  </div></section>;
}
