import { Link } from 'react-router-dom';

export default function Instituciones() {
  return <section className="container inner-page"><span className="section-kicker">Módulos Informar · Coordinar</span><h1>Espacio para instituciones</h1><p className="page-intro">En versiones posteriores, una institución previamente verificada podrá publicar jornadas, consultar postulaciones y registrar seguimientos básicos.</p><div className="feature-list"><article><h2>Verificación</h2><p>La incorporación institucional requerirá revisión administrativa. No se atribuirán convenios o alianzas que aún no existan.</p></article><article><h2>Publicación</h2><p>Las jornadas tendrán título, comunidad, fecha, cupo, descripción y criterios de participación.</p></article><article><h2>Coordinación</h2><p>Las solicitudes serán aceptadas o rechazadas por representantes autorizados.</p></article></div><Link to="/" className="btn btn-outline">Volver al inicio</Link></section>;
}
