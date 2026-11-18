import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import '../instituciones-solicitudes.css';
export default function Instituciones() {
  const { user } = useAuth();
  return <section className="container inner-page inst-page">
    <span className="section-kicker">Informar · Coordinar</span>
    <h1>Instituciones que conectan oportunidades</h1>
    <p className="page-intro">Nexo Ñuu facilitará la difusión de iniciativas de alfabetización. Las instituciones podrán participar mediante un proceso de revisión y autorización.</p>
    <div className="feature-list">
      <article><h2>1. Solicitar registro</h2><p>El responsable de una organización presenta su solicitud sin recibir permisos automáticamente.</p></article>
      <article><h2>2. Verificación</h2><p>La administración revisará la institución y autorizará a sus representantes.</p></article>
      <article><h2>3. Coordinar</h2><p>Los representantes podrán gestionar jornadas y postulaciones de su propia institución.</p></article>
    </div>
    <div className="notice inst-action"><strong>Registro institucional</strong>
      <p>Esta primera etapa permite solicitar una institución y consultar el estado de revisión. Todavía no se publican jornadas desde cuentas institucionales.</p>
      <Link className="btn btn-primary" to={user ? '/instituciones/solicitar' : '/iniciar-sesion'}>{user ? 'Solicitar registro institucional' : 'Iniciar sesión para solicitar registro'}</Link>
    </div>
  </section>;
}
