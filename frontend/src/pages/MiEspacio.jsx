import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
export default function MiEspacio() {
  const { user } = useAuth();
  return <section className="container inner-page">
    <span className="section-kicker">Acceso privado · Nexo Ñuu</span>
    <h1>¡Hola, {user.nombre}!</h1>
    <p className="page-intro">Has iniciado sesión correctamente. Este es el primer espacio privado de Nexo Ñuu.</p>
    <div className="feature-list">
      <article><h2>Tu cuenta</h2><p><strong>Correo:</strong> {user.correo}</p><p><strong>Correo verificado:</strong> Sí</p></article>
      <article><h2>Roles autorizados</h2><p>{user.roles.join(', ') || 'Sin roles asignados'}</p><p>El servidor determina tus permisos, no los botones de la interfaz.</p></article>
      <article><h2>Próximas funciones</h2><p>Perfil de voluntariado, verificación de teléfono, postulación a jornadas y seguimiento.</p></article>
    </div>
    <Link to="/jornadas" className="btn btn-primary">Explorar jornadas</Link>
  </section>;
}
