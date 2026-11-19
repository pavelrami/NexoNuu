import { useRef } from 'react';
import { Link } from 'react-router-dom';
import Brand from './Brand.jsx';
import Nuu from './Nuu.jsx';
import { Greca, Topo } from './Adornos.jsx';
import { Icon } from './Icons.jsx';
import { useMotion } from '../motion/useMotion.js';

export default function Footer() {
  const ref = useRef(null);
  useMotion(ref, null, []);
  return <footer className="footer" ref={ref}>
    <Greca className="footer-greca" />
    <Topo className="footer-topo" seed={23} />
    <div className="container footer-top">
      <div className="footer-brand" data-reveal>
        <div className="footer-logo" data-draw><Brand /></div>
        <p>Una plataforma de vinculación: conecta comunidades, instituciones y voluntariado para impulsar la alfabetización en Oaxaca.</p>
        <p className="footer-ods"><span>ODS 4</span> Educación de calidad</p>
      </div>
      <nav className="footer-col" aria-label="Explorar" data-reveal>
        <strong>Explorar</strong>
        <Link to="/">Inicio</Link>
        <Link to="/jornadas">Jornadas</Link>
        <Link to="/voluntariado">Voluntariado</Link>
        <Link to="/instituciones">Instituciones</Link>
        <Link to="/seguimiento">Seguimiento</Link>
      </nav>
      <nav className="footer-col" aria-label="Participar" data-reveal>
        <strong>Participar</strong>
        <Link to="/registro">Crear cuenta de voluntariado</Link>
        <Link to="/instituciones/solicitar">Registrar una institución</Link>
        <Link to="/mis-postulaciones">Mis postulaciones</Link>
        <Link to="/iniciar-sesion">Iniciar sesión</Link>
      </nav>
      <div className="footer-col" data-reveal>
        <strong>Fuentes oficiales</strong>
        <a href="https://www.gob.mx/inea" target="_blank" rel="noopener noreferrer">INEA <Icon name="arrowUpRight" size={14} /></a>
        <a href="https://www.oaxaca.gob.mx/ieea/" target="_blank" rel="noopener noreferrer">IEEA Oaxaca <Icon name="arrowUpRight" size={14} /></a>
        <a href="https://www.inegi.org.mx/programas/eic/2025/" target="_blank" rel="noopener noreferrer">INEGI · Encuesta Intercensal 2025 <Icon name="arrowUpRight" size={14} /></a>
        <strong className="footer-sub">Contacto</strong>
        <span className="marcador">[CORREO DE CONTACTO]</span>
      </div>
    </div>
    <div className="container footer-bottom">
      <Nuu className="footer-nuu" />
      <p>Proyecto integrador de Ingeniería en Sistemas Computacionales. Nexo Ñuu no imparte clases ni sustituye a las instituciones educativas; las cifras públicas se citan con su fuente.</p>
      <p className="footer-year">© {new Date().getFullYear()} Nexo Ñuu</p>
    </div>
  </footer>;
}
