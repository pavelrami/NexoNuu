import { Link } from 'react-router-dom';

export default function Seguimiento() {
  return <section className="container inner-page"><span className="section-kicker">Módulo Dar seguimiento · Acceso reservado futuro</span><h1>Coordinación y seguimiento</h1><p className="page-intro">Esta sección tendrá un panel privado para registrar el estado de las jornadas y las participaciones confirmadas. Todavía no se habilita porque primero debemos implementar autenticación y autorización por roles.</p><div className="notice"><strong>Diseño previsto, no funcionalidad liberada</strong><p>Estados de jornada, registros de participación y resúmenes administrativos, sin datos nominativos de personas que requieran alfabetización.</p></div><Link to="/jornadas" className="btn btn-primary">Ver jornadas públicas</Link></section>;
}
