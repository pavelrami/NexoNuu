import { useState } from 'react';
import { Link } from 'react-router-dom';
import { register, resendVerification } from '../api.js';
import AuthLayout, { CampoPassword } from '../components/AuthLayout.jsx';
import GoogleButton, { useProveedores } from '../components/GoogleButton.jsx';
import { Icon } from '../components/Icons.jsx';

export default function Registro() {
  const proveedores = useProveedores();
  const [form, setForm] = useState({ nombre: '', correo: '', password: '' });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const update = (event) => setForm({ ...form, [event.target.name]: event.target.value });
  async function submit(event) {
    event.preventDefault(); setBusy(true); setMessage(''); setError('');
    try { const data = await register(form.nombre, form.correo, form.password); setMessage(data.message); setSent(true); setForm((previous) => ({ ...previous, password: '' })); }
    catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }
  async function resend() {
    setBusy(true); setError('');
    try { const data = await resendVerification(form.correo); setMessage(data.message); }
    catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }
  const largo = form.password.length;
  const local = proveedores?.correo === 'terminal';
  return <AuthLayout kicker="Conectar · Registro de voluntariado" titulo="Crear cuenta"
    subtitulo="Tu cuenta comienza con el rol voluntario. Usa un correo real: te enviaremos un enlace para activarla y sin confirmarlo no podrás entrar."
    panelTitulo="Participa en Nexo Ñuu" panelTexto="Registra tu cuenta, completa tu perfil y postúlate a jornadas de alfabetización en Oaxaca.">
    {!sent && <GoogleButton texto="Registrarme con Google" />}
    {sent ? <div className="registro-enviado" role="status">
      <span className="registro-icono"><Icon name="mail" size={28} /></span>
      <h2>Revisa tu correo</h2>
      <p>{message}</p>
      {local && <p className="auth-muted">Estás en modo local: el enlace aparece en la terminal del backend.</p>}
      <button className="btn btn-outline" type="button" onClick={resend} disabled={busy}>{busy ? 'Enviando…' : 'Reenviar enlace de verificación'}</button>
      {error && <div className="auth-error" role="alert">{error}</div>}
    </div> : <form onSubmit={submit} className="auth-form auth-form--tras-google">
      <label htmlFor="registro-nombre">Nombre completo</label>
      <div className="input-icono"><Icon name="user" size={18} />
        <input id="registro-nombre" name="nombre" autoComplete="name" required minLength={2} maxLength={140} value={form.nombre} onChange={update} disabled={busy} />
      </div>
      <label htmlFor="registro-correo">Correo electrónico</label>
      <div className="input-icono"><Icon name="mail" size={18} />
        <input id="registro-correo" name="correo" type="email" autoComplete="email" required maxLength={254} value={form.correo} onChange={update} disabled={busy} placeholder="tu@correo.com" />
      </div>
      <label htmlFor="registro-password">Contraseña</label>
      <CampoPassword id="registro-password" name="password" autoComplete="new-password" required minLength={12} maxLength={128} value={form.password} onChange={update} disabled={busy} aria-describedby="pass-ayuda" />
      <div className="pass-medidor" aria-hidden="true"><span style={{ width: `${Math.min(100, (largo / 12) * 100)}%` }} className={largo >= 12 ? 'ok' : ''} /></div>
      <small id="pass-ayuda">{largo >= 12 ? 'Longitud suficiente.' : `Usa al menos 12 caracteres (llevas ${largo}).`} No reutilices contraseñas de otras cuentas.</small>
      {error && <div className="auth-error" role="alert">{error}</div>}
      <button className="btn btn-primary btn-lg" type="submit" disabled={busy}>{busy ? 'Comprobando tu correo…' : <>Crear cuenta <Icon name="arrow" size={18} /></>}</button>
    </form>}
    <p className="auth-switch">¿Ya tienes cuenta? <Link to="/iniciar-sesion">Iniciar sesión</Link></p>
  </AuthLayout>;
}
