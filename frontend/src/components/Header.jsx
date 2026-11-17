import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import Brand from './Brand.jsx';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

const links = [
  ['/', 'Inicio'],
  ['/jornadas', 'Jornadas'],
  ['/voluntariado', 'Voluntariado'],
  ['/instituciones', 'Instituciones'],
  ['/seguimiento', 'Seguimiento'],
];

export default function Header() {
  const [opened, setOpened] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  async function exit() {
    setLeaving(true);
    try { await logout(); navigate('/'); }
    catch { alert('No se pudo cerrar sesión. Intenta nuevamente.'); }
    finally { setLeaving(false); }
  }
  return <header className="site-header">
    <div className="container nav-wrapper">
      <Brand />
      <button className="mobile-menu" aria-label="Abrir o cerrar menú" aria-expanded={opened} onClick={() => setOpened(!opened)}>{opened ? 'Cerrar' : 'Menú'}</button>
      <nav aria-label="Navegación principal" className={opened ? 'nav-links opened' : 'nav-links'}>
        {links.map(([path, label]) => <NavLink key={path} end={path === '/'} onClick={() => setOpened(false)} to={path} className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>{label}</NavLink>)}
      </nav>
      <div className="header-actions">
        {user ? <><Link to="/mi-espacio" className="header-login">Mi espacio</Link><button className="header-logout" onClick={exit} disabled={leaving}>{leaving ? 'Saliendo…' : 'Salir'}</button></>
          : <Link to="/iniciar-sesion" className="header-login">Iniciar sesión</Link>}
      </div>
    </div>
  </header>;
}
