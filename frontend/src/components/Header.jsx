import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import Brand from './Brand.jsx';

const links = [
  ['/', 'Inicio'],
  ['/jornadas', 'Jornadas'],
  ['/voluntariado', 'Voluntariado'],
  ['/instituciones', 'Instituciones'],
  ['/seguimiento', 'Seguimiento'],
];

export default function Header() {
  const [opened, setOpened] = useState(false);
  return <header className="site-header">
    <div className="container nav-wrapper">
      <Brand />
      <button className="mobile-menu" aria-label="Abrir o cerrar menú" aria-expanded={opened} onClick={() => setOpened(!opened)}>{opened ? 'Cerrar' : 'Menú'}</button>
      <nav aria-label="Navegación principal" className={opened ? 'nav-links opened' : 'nav-links'}>
        {links.map(([path, label]) => <NavLink key={path} end={path === '/'} onClick={() => setOpened(false)} to={path} className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>{label}</NavLink>)}
      </nav>
      <span className="header-status">Prototipo académico</span>
    </div>
  </header>;
}
