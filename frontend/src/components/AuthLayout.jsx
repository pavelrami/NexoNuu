import { useRef, useState } from 'react';
import { Escena } from './Ilustraciones.jsx';
import { Isotipo } from './Brand.jsx';
import { Icon } from './Icons.jsx';
import { BRECHA } from '../data/fuentes.js';
import { useMotion } from '../motion/useMotion.js';
import { gsap, M } from '../motion/motion.js';

// Diseño compartido de las pantallas de cuenta: paisaje de la sierra a la izquierda, formulario a la derecha.
function entrada({ root }) {
  gsap.from(root.querySelectorAll('.auth-chip'), { y: 16, opacity: 0, scale: 0.9, duration: 0.7, ease: M.pop, stagger: 0.12, delay: 0.5, clearProps: 'transform,opacity' });
  gsap.from(root.querySelector('.auth-card2'), { y: M.dist, opacity: 0, duration: M.dur, ease: M.ease, delay: 0.1, clearProps: 'transform,opacity' });
}

export default function AuthLayout({ kicker = 'Tecnología con propósito comunitario', titulo, subtitulo, panelTitulo, panelTexto, children }) {
  const ref = useRef(null);
  useMotion(ref, entrada, []);
  return <section className="container auth-wrap" ref={ref}>
    <div className="auth-panel">
      <div className="auth-paisaje" data-rombo><Escena variante="sierra" /></div>
      <span className="auth-chip auth-chip--a"><Icon name="pin" size={15} /> Oaxaca, México</span>
      <span className="auth-chip auth-chip--b"><Icon name="book" size={15} /> {BRECHA.oaxaca2025.toLocaleString('es-MX', { minimumFractionDigits: 1 })} % de analfabetismo · INEGI 2025</span>
      <span className="auth-chip auth-chip--c">ODS 4 — Educación de calidad</span>
      <div className="auth-panel-texto">
        <h2>{panelTitulo || 'Conectamos esfuerzos para apoyar la alfabetización en Oaxaca'}</h2>
        <p>{panelTexto || 'Un espacio digital para informar, concientizar y facilitar la vinculación comunitaria.'}</p>
      </div>
    </div>
    <div className="auth-card2">
      <div className="auth-marca"><Isotipo /><span>Nexo <strong>Ñuu</strong></span></div>
      <span className="eyebrow auth-eyebrow"><span className="eyebrow-dot" /> {kicker}</span>
      <h1>{titulo}</h1>
      {subtitulo && <p className="auth-muted auth-sub">{subtitulo}</p>}
      {children}
    </div>
  </section>;
}

export function CampoPassword({ id, value, onChange, autoComplete, ...rest }) {
  const [ver, setVer] = useState(false);
  return <div className="campo-pass">
    <input id={id} type={ver ? 'text' : 'password'} autoComplete={autoComplete} value={value} onChange={onChange} {...rest} />
    <button type="button" className="ver-pass" onClick={() => setVer((v) => !v)} aria-label={ver ? 'Ocultar contraseña' : 'Mostrar contraseña'} aria-pressed={ver}>
      <Icon name={ver ? 'eyeOff' : 'eye'} size={19} />
    </button>
  </div>;
}
