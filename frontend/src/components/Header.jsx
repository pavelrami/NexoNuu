import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import Brand, { Isotipo } from './Brand.jsx';
import { Icon } from './Icons.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { gsap, M, RM, lockScroll, drawPrep, safe, ROMBO_ABIERTO } from '../motion/motion.js';

const links = [
  ['/', 'Inicio'],
  ['/jornadas', 'Jornadas'],
  ['/voluntariado', 'Voluntariado'],
  ['/instituciones', 'Instituciones'],
  ['/seguimiento', 'Seguimiento'],
];

export default function Header() {
  const [opened, setOpened] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [leaving, setLeaving] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [hidden, setHidden] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const navRef = useRef(null);
  const indicatorRef = useRef(null);
  const sheetRef = useRef(null);
  const menuBtnRef = useRef(null);
  const searchRef = useRef(null);
  const tlRef = useRef(null);

  // Indicador que se desliza bajo la sección activa.
  const moveIndicator = useCallback(() => {
    const nav = navRef.current, ind = indicatorRef.current;
    if (!nav || !ind) return;
    const active = nav.querySelector('.nav-link.active');
    if (!active) { ind.style.opacity = '0'; return; }
    ind.style.opacity = '1';
    ind.style.width = `${active.offsetWidth}px`;
    ind.style.transform = `translateX(${active.offsetLeft}px)`;
  }, []);
  useLayoutEffect(() => { moveIndicator(); }, [location.pathname, moveIndicator]);
  useEffect(() => {
    const onResize = () => moveIndicator();
    window.addEventListener('resize', onResize);
    document.fonts?.ready?.then(onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [moveIndicator]);

  // Cabecera que se compacta y se esconde al bajar; reaparece al subir.
  useEffect(() => {
    let last = window.scrollY, ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const y = window.scrollY;
        setScrolled(y > 24);
        setHidden(y > 420 && y > last + 2);
        if (y < last - 2) setHidden(false);
        last = y;
        ticking = false;
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => { setOpened(false); setSearchOpen(false); setHidden(false); }, [location.pathname]);

  // Menú móvil: se abre en rombo desde el botón y el isotipo se teje.
  useLayoutEffect(() => {
    const sheet = sheetRef.current;
    if (!sheet) return undefined;
    const ctx = gsap.context(() => {
      if (RM) return;
      const items = sheet.querySelectorAll('.sheet-item');
      const hilos = Array.from(sheet.querySelectorAll('.sheet-iso path'));
      safe(() => drawPrep(hilos));
      tlRef.current = gsap.timeline({
        paused: true,
        onReverseComplete: () => { sheet.hidden = true; },
      })
        .fromTo(sheet, { clipPath: 'polygon(92% 0%, 92% 0%, 92% 0%, 92% 0%)' }, { clipPath: ROMBO_ABIERTO, duration: 0.6, ease: M.easeIO })
        .to(hilos, { strokeDashoffset: 0, duration: 0.7, stagger: 0.06, ease: M.ease }, 0.15)
        .fromTo(items, { y: 24, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, stagger: 0.05, ease: M.ease }, 0.2);
    }, sheet);
    return () => ctx.revert();
  }, []);

  useEffect(() => {
    const sheet = sheetRef.current;
    if (!sheet) return undefined;
    if (opened) {
      sheet.hidden = false;
      lockScroll(true);
      if (tlRef.current) tlRef.current.timeScale(1).play();
      requestAnimationFrame(() => sheet.querySelector('a, button')?.focus());
      const onKey = (e) => { if (e.key === 'Escape') { setOpened(false); menuBtnRef.current?.focus(); } };
      window.addEventListener('keydown', onKey);
      return () => window.removeEventListener('keydown', onKey);
    }
    lockScroll(false);
    if (tlRef.current && !sheet.hidden) tlRef.current.timeScale(1.6).reverse();
    else sheet.hidden = true;
    return undefined;
  }, [opened]);

  useEffect(() => {
    if (!searchOpen) return undefined;
    searchRef.current?.querySelector('input')?.focus();
    const onKey = (e) => { if (e.key === 'Escape') setSearchOpen(false); };
    const onClick = (e) => { if (!searchRef.current?.contains(e.target)) setSearchOpen(false); };
    window.addEventListener('keydown', onKey);
    window.addEventListener('pointerdown', onClick);
    return () => { window.removeEventListener('keydown', onKey); window.removeEventListener('pointerdown', onClick); };
  }, [searchOpen]);

  function buscar(event) {
    event.preventDefault();
    const q = query.trim();
    setSearchOpen(false);
    setOpened(false);
    navigate(q ? `/jornadas?buscar=${encodeURIComponent(q)}` : '/jornadas');
    setQuery('');
  }

  async function exit() {
    setLeaving(true);
    try { await logout(); setOpened(false); navigate('/'); }
    catch { alert('No se pudo cerrar sesión. Intenta nuevamente.'); }
    finally { setLeaving(false); }
  }

  const esRepresentante = user?.roles?.includes('representante');
  const esAdmin = user?.roles?.includes('administrador');
  const cls = ['site-header', scrolled && 'is-scrolled', hidden && !opened && !searchOpen && 'is-hidden'].filter(Boolean).join(' ');

  return <header className={cls}>
    <a className="skip-link" href="#contenido">Saltar al contenido</a>
    <div className="container nav-wrapper">
      <Brand />
      <nav aria-label="Navegación principal" className="nav-links" ref={navRef}>
        <span className="nav-indicator" ref={indicatorRef} aria-hidden="true" />
        {links.map(([path, label]) => <NavLink key={path} end={path === '/'} to={path}
          className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}>{label}</NavLink>)}
      </nav>
      <div className="header-actions">
        <div className="header-search" ref={searchRef}>
          <button type="button" className="icon-btn" aria-label="Buscar jornadas" aria-expanded={searchOpen}
            onClick={() => setSearchOpen((v) => !v)}><Icon name="search" size={20} /></button>
          {searchOpen && <form className="search-pop" role="search" onSubmit={buscar}>
            <label htmlFor="busqueda-rapida" className="sr-only">Buscar jornadas, comunidades o instituciones</label>
            <Icon name="search" size={18} />
            <input id="busqueda-rapida" type="search" maxLength={100} value={query} onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar jornadas, comunidades o instituciones…" />
            <button type="submit" className="btn btn-primary btn-sm">Buscar</button>
          </form>}
        </div>
        {user ? <>
          <Link to="/mi-espacio" className="header-login"><Icon name="user" size={17} /> Mi espacio</Link>
          <button className="header-logout" onClick={exit} disabled={leaving}>{leaving ? 'Saliendo…' : 'Salir'}</button>
        </> : <Link to="/iniciar-sesion" className="header-login">Iniciar sesión</Link>}
        <button ref={menuBtnRef} className="mobile-menu icon-btn" aria-label={opened ? 'Cerrar menú' : 'Abrir menú'}
          aria-expanded={opened} aria-controls="menu-movil" onClick={() => setOpened((v) => !v)}>
          <Icon name={opened ? 'close' : 'menu'} size={22} />
        </button>
      </div>
    </div>

    <div id="menu-movil" className="mobile-sheet" ref={sheetRef} hidden>
      <div className="sheet-inner">
        <Isotipo className="sheet-iso" />
        <nav aria-label="Menú móvil" className="sheet-nav">
          {links.map(([path, label], i) => <NavLink key={path} end={path === '/'} to={path}
            className={({ isActive }) => `sheet-item sheet-link${isActive ? ' active' : ''}`} onClick={() => setOpened(false)}>
            <span className="sheet-num">{String(i + 1).padStart(2, '0')}</span>{label}
          </NavLink>)}
        </nav>
        <div className="sheet-item sheet-actions">
          {user ? <>
            <Link className="btn btn-primary" to="/mi-espacio" onClick={() => setOpened(false)}>Mi espacio</Link>
            {esRepresentante && <Link className="btn btn-ghost-light" to="/panel-institucional" onClick={() => setOpened(false)}>Panel institucional</Link>}
            {esAdmin && <Link className="btn btn-ghost-light" to="/admin/instituciones" onClick={() => setOpened(false)}>Administración</Link>}
            <button type="button" className="btn btn-ghost-light" onClick={exit} disabled={leaving}>{leaving ? 'Saliendo…' : 'Cerrar sesión'}</button>
          </> : <>
            <Link className="btn btn-light" to="/iniciar-sesion" onClick={() => setOpened(false)}>Iniciar sesión</Link>
            <Link className="btn btn-ghost-light" to="/registro" onClick={() => setOpened(false)}>Crear cuenta</Link>
          </>}
        </div>
        <p className="sheet-item sheet-note">Conectamos comunidades, instituciones y voluntariado por la alfabetización en Oaxaca.</p>
      </div>
    </div>
  </header>;
}
