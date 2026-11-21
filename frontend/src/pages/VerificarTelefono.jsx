import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { phoneStatus, requestPhoneCode, verifyPhoneCode } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { panelDe } from '../components/panel/navegacion.js';

export default function VerificarTelefono() {
  const { user } = useAuth();
  const [status, setStatus] = useState(null);
  const [telefono, setTelefono] = useState('');
  const [codigo, setCodigo] = useState('');
  const [step, setStep] = useState('numero');
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    phoneStatus().then((data) => { if (active) setStatus(data); })
      .catch((e) => { if (active) setError(e.message); });
    return () => { active = false; };
  }, []);

  const request = async (event) => {
    event.preventDefault(); setBusy(true); setError(''); setNotice('');
    try {
      const response = await requestPhoneCode(telefono);
      setNotice(response.message);
      setStep('codigo');
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  };
  const confirm = async (event) => {
    event.preventDefault(); setBusy(true); setError(''); setNotice('');
    try {
      const response = await verifyPhoneCode(codigo);
      setStatus({ telefono: response.telefono, telefonoVerificado: true });
      setNotice(response.message);
      setStep('completo');
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  };

  return <section className="container inner-page">
    <span className="section-kicker">Seguridad de la cuenta · Nexo Ñuu</span>
    <h1>Verifica tu número telefónico</h1>
    <p className="page-intro">Esta función se prueba por ahora con un código en la terminal de Express. No enviamos todavía mensajes SMS reales.</p>
    <div className="auth-card" style={{maxWidth:600}}>
      {status?.telefonoVerificado || step === 'completo' ? <>
        <h2>Teléfono verificado</h2>
        <p className="auth-success" role="status">{notice || 'Tu número ya está verificado.'}</p>
        <p>Teléfono: {status?.telefono}</p>
        <Link to={panelDe(user)} className="btn btn-primary">Regresar a mi panel</Link>
      </> : <>
        <h2>{step === 'numero' ? 'Registrar número' : 'Confirmar código'}</h2>
        {step === 'numero' ? <form className="auth-form" onSubmit={request}>
          <label htmlFor="telefono-mx">Número de México (+52)</label>
          <input id="telefono-mx" type="tel" autoComplete="tel" inputMode="tel" placeholder="951 123 4567" required value={telefono} onChange={(e) => setTelefono(e.target.value)} disabled={busy}/>
          <small>Introduce 10 dígitos o +52 seguido de 10 dígitos. Usaremos este dato solo para verificar tu cuenta.</small>
          <button className="btn btn-primary" type="submit" disabled={busy}>{busy ? 'Generando...' : 'Obtener código de prueba'}</button>
        </form> : <form className="auth-form" onSubmit={confirm}>
          <label htmlFor="otp">Código de seis dígitos</label>
          <input id="otp" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} required value={codigo} onChange={(e) => setCodigo(e.target.value.replace(/\D/g,''))} disabled={busy} placeholder="000000"/>
          <small>En modo de prueba, busca el código en la terminal del backend. Vence en 10 minutos y permite hasta 5 intentos.</small>
          <button className="btn btn-primary" type="submit" disabled={busy}>{busy ? 'Verificando...' : 'Verificar código'}</button>
          <button className="header-logout" type="button" disabled={busy} onClick={() => {setStep('numero');setNotice('');setError('');setCodigo('');}}>Cambiar número o solicitar otro código</button>
        </form>}
        {notice && <p className="auth-success" role="status">{notice}</p>}
        {error && <p className="auth-error" role="alert">{error}</p>}
      </>}
    </div>
  </section>;
}
