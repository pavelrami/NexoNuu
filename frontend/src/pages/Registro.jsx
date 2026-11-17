import { useState } from 'react';
import { Link } from 'react-router-dom';
import { register, resendVerification } from '../api.js';

export default function Registro() {
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
  return <section className="container auth-page">
    <div className="auth-intro"><span className="section-kicker">Conectar · Registro de voluntariado</span>
      <h1>Participa en Nexo Ñuu</h1>
      <p>Registra tu cuenta para participar en iniciativas de alfabetización. La creación de una cuenta no confirma tu participación en una jornada.</p>
      <div className="auth-feature">Tu cuenta comenzará con el rol <strong>voluntario</strong>. Las instituciones requieren validación adicional.</div>
    </div>
    <div className="auth-card">
      <h2>Crear cuenta</h2><p className="auth-muted">Por ahora verificaremos tu correo. El teléfono se verificará en un incremento posterior.</p>
      <form onSubmit={submit} className="auth-form">
        <label htmlFor="registro-nombre">Nombre completo</label>
        <input id="registro-nombre" name="nombre" autoComplete="name" required minLength={2} maxLength={140} value={form.nombre} onChange={update} disabled={busy || sent}/>
        <label htmlFor="registro-correo">Correo electrónico</label>
        <input id="registro-correo" name="correo" type="email" autoComplete="email" required maxLength={254} value={form.correo} onChange={update} disabled={busy || sent}/>
        <label htmlFor="registro-password">Contraseña</label>
        <input id="registro-password" name="password" type="password" autoComplete="new-password" required minLength={12} maxLength={128} value={form.password} onChange={update} disabled={busy || sent}/>
        <small>Utiliza al menos 12 caracteres. No reutilices contraseñas de otras cuentas.</small>
        {error && <div className="auth-error" role="alert">{error}</div>}
        {message && <div className="auth-success" role="status">{message}</div>}
        {!sent && <button className="btn btn-primary" type="submit" disabled={busy}>{busy ? 'Creando cuenta…' : 'Crear cuenta'}</button>}
      </form>
      {sent && <><button className="btn btn-outline" type="button" onClick={resend} disabled={busy}>{busy ? 'Enviando…' : 'Reenviar enlace de verificación'}</button><p className="auth-muted">En modo local, revisa la terminal del backend para abrir el enlace de prueba.</p></>}
      <p className="auth-switch">¿Ya tienes cuenta? <Link to="/iniciar-sesion">Iniciar sesión</Link></p>
    </div>
  </section>;
}
