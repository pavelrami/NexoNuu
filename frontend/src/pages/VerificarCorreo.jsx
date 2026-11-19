import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { verifyEmail } from '../api.js';
import AuthLayout from '../components/AuthLayout.jsx';
import { Icon } from '../components/Icons.jsx';

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
  const ok = status.phase === 'done';
  return <AuthLayout kicker="Seguridad · Nexo Ñuu" titulo={ok ? '¡Correo confirmado!' : status.phase === 'error' ? 'No pudimos confirmar tu correo' : 'Confirmando tu correo…'}
    panelTitulo="Bienvenida a Nexo Ñuu" panelTexto="Con tu correo confirmado ya puedes completar tu perfil y postularte a jornadas.">
    <div className="registro-enviado" role="status">
      <span className={`registro-icono${status.phase === 'error' ? ' registro-icono--error' : ''}`}><Icon name={ok ? 'check' : status.phase === 'error' ? 'close' : 'mail'} size={28} /></span>
      <p>{status.message}</p>
      {ok && <Link className="btn btn-primary" to="/iniciar-sesion">Iniciar sesión <Icon name="arrow" size={17} /></Link>}
      {status.phase === 'error' && <>
        <p className="auth-muted">Si el enlace expiró, entra a Iniciar sesión con tu correo y usa “Reenviar correo de verificación”.</p>
        <Link className="btn btn-outline" to="/iniciar-sesion">Ir a iniciar sesión</Link>
      </>}
    </div>
  </AuthLayout>;
}
