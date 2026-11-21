import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Isotipo } from '../Brand.jsx';
import { Icon } from '../Icons.jsx';
import { Topo } from '../Adornos.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { gsap, RM, M, safe, drawPrep, lockScroll } from '../../motion/motion.js';
import { Avatar, hoyLargo } from './piezas.jsx';

// Estructura común de los tres paneles: menú lateral que se desliza (celular) o se contrae
// (escritorio), barra superior con búsqueda, avisos y fecha, y el contenido.

const LLAVE = 'nexo-panel-contraido';
function leerContraido() { try { return window.localStorage.getItem(LLAVE) === '1'; } catch { return false; } }
function guardarContraido(v) { try { window.localStorage.setItem(LLAVE, v ? '1' : '0'); } catch { /* sin almacenamiento local */ } }
const MQ = '(max-width: 1023px)';
const esCelular = () => typeof window !== 'undefined' && Boolean(window.matchMedia?.(MQ).matches);

const AREA = { voluntario: 'Panel de voluntariado', institucion: 'Área institucional', admin: 'Administración del sistema' };
const ROL_TXT = { voluntario: 'Voluntariado', institucion: 'Representación institucional', admin: 'Administración' };

function Item({ item, contraido }) {
  const { pathname } = useLocation();
  const activo = item.activo ?? (item.end ? pathname === item.to : pathname.startsWith(item.to));
  return <li>
    <Link to={item.to} className={`p-nav-link${activo ? ' is-activo' : ''}`} aria-current={activo ? 'page' : undefined}
      title={contraido ? `${item.label}${item.badge ? ` · ${item.badgeSr || item.badge}` : ''}` : (item.badgeSr ? `${item.label} · ${item.badgeSr}` : undefined)}>
      <span className="p-nav-icono"><Icon name={item.icon} size={19} /></span>
      <span className="p-nav-txt">{item.label}</span>
      {item.badge && <span className={`p-nav-badge p-nav-badge--${item.tono || 'suave'}`} aria-hidden={item.badgeSr ? true : undefined}>{item.badge}</span>}
      {item.badge && item.badgeSr && <span className="sr-only">: {item.badgeSr}</span>}
      {item.externo && <Icon name="arrowUpRight" size={14} className="p-nav-ext" />}
    </Link>
  </li>;
}

export default function PanelLayout({ rol, nav = [], identidad, titulo, migas = [], buscar, avisos, estado, children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [contraido, setContraido] = useState(leerContraido);
  const [abierto, setAbierto] = useState(false);
  const [celular, setCelular] = useState(esCelular);
  const [saliendo, setSaliendo] = useState(false);
  const [q, setQ] = useState('');
  const sideRef = useRef(null);
  const btnRef = useRef(null);
  const isoRef = useRef(null);
  const idBuscar = useId();

  useEffect(() => {
    const mq = window.matchMedia?.(MQ);
    if (!mq) return undefined;
    const cambio = () => { setCelular(mq.matches); if (!mq.matches) setAbierto(false); };
    mq.addEventListener?.('change', cambio);
    return () => mq.removeEventListener?.('change', cambio);
  }, []);

  // Al elegir una sección, el menú del celular se cierra solo.
  useEffect(() => { setAbierto(false); }, [location.pathname, location.search]);

  useEffect(() => {
    if (!abierto) return undefined;
    lockScroll(true);
    requestAnimationFrame(() => sideRef.current?.querySelector('.p-nav-link')?.focus());
    const onKey = (e) => { if (e.key === 'Escape') { setAbierto(false); btnRef.current?.focus(); } };
    window.addEventListener('keydown', onKey);
    return () => { window.removeEventListener('keydown', onKey); lockScroll(false); };
  }, [abierto]);

  // Firma del panel: el rombo del isotipo se teje y las secciones se posan una tras otra.
  useLayoutEffect(() => {
    if (RM || !isoRef.current) return undefined;
    const ctx = gsap.context(() => safe(() => {
      const trazos = Array.from(isoRef.current.querySelectorAll('path'));
      drawPrep(trazos);
      gsap.to(trazos, { strokeDashoffset: 0, duration: 0.95, stagger: 0.1, ease: M.ease, delay: 0.05 });
      gsap.from(sideRef.current.querySelectorAll('.p-side-nav .p-nav-link'), {
        x: -14, opacity: 0, duration: 0.55, stagger: 0.035, ease: M.ease, delay: 0.2, clearProps: 'transform,opacity',
      });
    }), sideRef);
    return () => ctx.revert();
  }, []);

  const alternar = () => {
    const nuevo = !contraido;
    guardarContraido(nuevo);
    setContraido(nuevo);
  };

  async function salir() {
    setSaliendo(true);
    try { await logout(); navigate('/'); }
    catch { window.alert('No se pudo cerrar sesión. Intenta nuevamente.'); setSaliendo(false); }
  }

  const roles = user?.roles || [];
  const otros = [
    rol !== 'voluntario' && { to: '/mi-espacio', label: 'Mi espacio', icon: 'user' },
    rol !== 'institucion' && roles.includes('representante') && { to: '/panel-institucional', label: 'Panel institucional', icon: 'building' },
    rol !== 'admin' && roles.includes('administrador') && { to: '/admin', label: 'Administración', icon: 'shield' },
  ].filter(Boolean);
  const rail = contraido && !celular;

  const formBuscar = (movil) => buscar && <form role="search" className={`p-buscar${movil ? ' p-buscar--movil' : ''}`}
    onSubmit={(e) => { e.preventDefault(); buscar.onSubmit(q.trim()); }}>
    <label htmlFor={`${idBuscar}${movil ? 'm' : 'd'}`} className="sr-only">{buscar.placeholder}</label>
    <Icon name="search" size={18} />
    <input id={`${idBuscar}${movil ? 'm' : 'd'}`} type="search" value={q} maxLength={100}
      onChange={(e) => setQ(e.target.value)} placeholder={buscar.placeholder} />
  </form>;

  return <div className={`p-app p-app--${rol}${rail ? ' is-contraido' : ''}${abierto ? ' is-abierto' : ''}`}>
    <a className="skip-link" href="#contenido-panel">Saltar al contenido</a>

    <aside id="panel-menu" className="p-side" ref={sideRef} aria-label="Menú del panel" inert={celular && !abierto ? true : undefined}>
      <Topo className="p-side-topo" seed={41} />
      <div className="p-side-cabeza">
        <Link to="/" className="p-side-marca" aria-label="Nexo Ñuu, ir al sitio público">
          <span ref={isoRef} className="p-side-iso"><Isotipo /></span>
          <span className="p-side-nombre"><strong>Nexo Ñuu</strong><small>{AREA[rol]}</small></span>
        </Link>
        <button type="button" className="p-side-cerrar" aria-label="Cerrar menú"
          onClick={() => { setAbierto(false); btnRef.current?.focus(); }}><Icon name="close" size={20} /></button>
      </div>

      {identidad && <div className="p-side-identidad">{identidad}</div>}

      <nav className="p-side-nav" aria-label="Secciones del panel" data-lenis-prevent>
        <ul>{nav.map((it) => <Item key={`${it.to}-${it.label}`} item={it} contraido={rail} />)}</ul>
        {otros.length > 0 && <>
          <p className="p-side-grupo">Cambiar de panel</p>
          <ul>{otros.map((it) => <Item key={it.to} item={{ ...it, activo: false }} contraido={rail} />)}</ul>
        </>}
      </nav>

      <div className="p-side-pie">
        <button type="button" className="p-nav-link p-side-contraer" onClick={alternar} aria-pressed={contraido}
          title={rail ? 'Expandir menú' : undefined}>
          <span className="p-nav-icono"><Icon name={contraido ? 'expand' : 'collapse'} size={19} /></span>
          <span className="p-nav-txt">{contraido ? 'Expandir menú' : 'Contraer menú'}</span>
        </button>
        <Link to="/" className="p-nav-link" title={rail ? 'Ver sitio público' : undefined}>
          <span className="p-nav-icono"><Icon name="globe" size={19} /></span><span className="p-nav-txt">Ver sitio público</span>
        </Link>
        <div className="p-side-yo">
          <Avatar nombre={user?.nombre || ''} size={38} claro />
          <span className="p-side-yo-txt"><strong>{user?.nombre}</strong><small>{ROL_TXT[rol]}</small></span>
          <button type="button" className="p-side-salir" onClick={salir} disabled={saliendo}
            aria-label={saliendo ? 'Cerrando sesión…' : 'Cerrar sesión'} title="Cerrar sesión"><Icon name="logout" size={18} /></button>
        </div>
      </div>
    </aside>

    <div className="p-velo" aria-hidden="true" onClick={() => setAbierto(false)} />

    <div className="p-cuerpo" inert={celular && abierto ? true : undefined}>
      <header className="p-top">
        <button ref={btnRef} type="button" className="p-top-menu" aria-label="Abrir menú" aria-expanded={abierto}
          aria-controls="panel-menu" onClick={() => setAbierto(true)}><Icon name="menu" size={22} /></button>
        <div className="p-top-titulo">
          {titulo && <p className="p-top-h">{titulo}</p>}
          {migas.length > 0 && <nav aria-label="Ubicación" className="p-migas"><ol>
            {migas.map((m, i) => <li key={`${i}-${m}`} aria-current={i === migas.length - 1 ? 'page' : undefined}>{m}</li>)}
          </ol></nav>}
        </div>
        {formBuscar(false)}
        <div className="p-top-acciones">
          {estado}
          {avisos && <Link to={avisos.to} className="p-top-aviso" aria-label={avisos.label}>
            <Icon name="bell" size={20} />{avisos.n > 0 && <span className="p-top-aviso-n">{avisos.n > 9 ? '9+' : avisos.n}</span>}
          </Link>}
          <span className="p-top-fecha">{hoyLargo()}</span>
          <span className="p-top-yo" title={user?.nombre}><Avatar nombre={user?.nombre || ''} size={36} /></span>
        </div>
      </header>
      <main id="contenido-panel" className="p-main" tabIndex={-1}>
        {formBuscar(true)}
        {children}
      </main>
    </div>
  </div>;
}

// Pantalla de espera con la marca mientras se comprueba la sesión.
export function PanelEspera({ texto = 'Comprobando sesión…' }) {
  return <div className="p-espera" role="status"><span className="p-espera-iso"><Isotipo /></span><p>{texto}</p></div>;
}

// Entrada de las tarjetas del panel cuando llegan los datos. Sin movimiento si así se pidió.
export function entradaPanel({ root }) {
  const tarjetas = root.querySelectorAll('[data-panel-card]');
  if (!tarjetas.length) return;
  gsap.from(tarjetas, { y: 18, opacity: 0, duration: 0.7, ease: M.ease, stagger: 0.05, clearProps: 'transform,opacity' });
}
