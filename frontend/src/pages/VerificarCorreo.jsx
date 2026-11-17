import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { verifyEmail } from '../api.js';
export default function VerificarCorreo() {
  const [params] = useSearchParams();
  const [status, setStatus] = useState({ phase: 'loading', message: 'Verificando enlace…' });
  const initiated = useRef(false);
  useEffect(() => {
    if (initiated.current) return;
    initiated.current = true;
    const token = params.get('token');
    // El token no debe permanecer visible en la URL al terminar la carga.
    window.history.replaceState(window.history.state, '', '/verificar-correo');
    if (!token) { setStatus({ phase: 'error', message: 'El enlace no contiene un token válido.' }); return; }
    verifyEmail(token).then((data) => setStatus({ phase: 'done', message: data.message }))
      .catch((e) => setStatus({ phase: 'error', message: e.message }));
  }, [params]);
  return <section className="container inner-page" style={{ maxWidth: 790 }}>
    <span className="section-kicker">Seguridad · Nexo Ñuu</span><h1>Verificar correo electrónico</h1>
    <div className={status.phase === 'error' ? 'notice notice-warning' : 'notice'} role="status">{status.message}</div>
    <p style={{ marginTop: 22 }}><Link className="btn btn-primary" to="/iniciar-sesion">Ir a iniciar sesión</Link></p>
    {status.phase === 'error' && <p>Si expiró el enlace, entra a la pantalla de inicio de sesión para solicitar otro.</p>}
  </section>;
}
