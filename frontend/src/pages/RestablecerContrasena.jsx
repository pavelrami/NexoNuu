import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { resetPassword } from '../api.js';
import AuthLayout, { CampoPassword } from '../components/AuthLayout.jsx';
import { Icon } from '../components/Icons.jsx';

export default function RestablecerContrasena() {
  const [params] = useSearchParams();
  const tokenRef = useRef(params.get('token') || '');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  // El enlace de un solo uso no debe quedarse visible en la barra de direcciones.
  useEffect(() => { if (tokenRef.current) window.history.replaceState(window.history.state, '', '/restablecer-contrasena'); }, []);
  const token = tokenRef.current;
  async function submit(event) {
    event.preventDefault(); setError('');
    if (password !== confirm) { setError('Las contraseñas no coinciden.'); return; }
    setBusy(true);
    try { await resetPassword(token, password); setDone(true); setPassword(''); setConfirm(''); }
    catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }
  const largo = password.length;
  return <AuthLayout kicker="Seguridad de la cuenta" titulo="Crea una nueva contraseña"
    subtitulo="Al cambiarla se cerrarán todas tus sesiones abiertas."
    panelTitulo="Un último paso" panelTexto="Elige una contraseña que no uses en otros sitios. Te recomendamos una frase larga.">
    {!token && !done && <div className="auth-error" role="alert">Este enlace está incompleto. <Link to="/olvide-contrasena">Solicita uno nuevo</Link>.</div>}
    {done ? <div className="registro-enviado" role="status">
      <span className="registro-icono"><Icon name="check" size={28} /></span>
      <h2>Contraseña actualizada</h2>
      <p>Ya puedes entrar con tu nueva contraseña.</p>
      <Link className="btn btn-primary" to="/iniciar-sesion">Iniciar sesión <Icon name="arrow" size={17} /></Link>
    </div> : <form onSubmit={submit} className="auth-form">
      <label htmlFor="nueva-password">Nueva contraseña</label>
      <CampoPassword id="nueva-password" required minLength={12} maxLength={128} autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
      <div className="pass-medidor" aria-hidden="true"><span style={{ width: `${Math.min(100, (largo / 12) * 100)}%` }} className={largo >= 12 ? 'ok' : ''} /></div>
      <label htmlFor="confirmar-password">Confirmar contraseña</label>
      <CampoPassword id="confirmar-password" required minLength={12} maxLength={128} autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
      <small>{largo >= 12 ? (confirm && confirm !== password ? 'Las contraseñas aún no coinciden.' : 'Longitud suficiente.') : `Usa al menos 12 caracteres (llevas ${largo}).`}</small>
      {error && <div className="auth-error" role="alert">{error}</div>}
      <button className="btn btn-primary btn-lg" disabled={!token || busy}>{busy ? 'Guardando…' : 'Cambiar contraseña'}</button>
    </form>}
    {!done && <p className="auth-switch"><Link to="/olvide-contrasena">Solicitar otro enlace</Link></p>}
  </AuthLayout>;
}
