import { Link } from 'react-router-dom';
import Brand from './Brand.jsx';

export default function Footer() {
  return <footer className="footer">
    <div className="container footer-row">
      <div><Brand /><p>Un puente de comunicación y colaboración para apoyar iniciativas de alfabetización en Oaxaca.</p></div>
      <div><strong>Explorar</strong><Link to="/jornadas">Jornadas</Link><Link to="/voluntariado">Voluntariado</Link><Link to="/instituciones">Instituciones</Link></div>
      <div><strong>Sobre el proyecto</strong><p>Proyecto integrador de Ingeniería en Sistemas Computacionales. La plataforma no sustituye a instituciones educativas.</p></div>
    </div>
  </footer>;
}
