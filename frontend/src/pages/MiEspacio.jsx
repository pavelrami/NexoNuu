import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { phoneStatus, getVolunteerProfile, getVolunteerCatalogs } from '../api.js';

const disponibilidadTexto = {
  entre_semana: 'Entre semana',
  fin_semana: 'Fines de semana',
  variable: 'Variable',
};

export default function MiEspacio() {
  const { user } = useAuth();
  const esAdministrador = user?.roles?.includes('administrador') ?? false;
  const esVoluntario = user?.roles?.includes('voluntario') ?? false;

  const [telefono, setTelefono] = useState(null);
  const [telefonoCargando, setTelefonoCargando] = useState(true);
  const [telefonoError, setTelefonoError] = useState('');

  const [perfil, setPerfil] = useState(null);
  const [perfilCreado, setPerfilCreado] = useState(false);
  const [catalogos, setCatalogos] = useState(null);
  const [perfilCargando, setPerfilCargando] = useState(esVoluntario);
  const [perfilError, setPerfilError] = useState('');

  useEffect(() => {
    let activo = true;
    phoneStatus()
      .then(resultado => { if (activo) setTelefono(resultado); })
      .catch(error => { if (activo) setTelefonoError(error.message); })
      .finally(() => { if (activo) setTelefonoCargando(false); });
    return () => { activo = false; };
  }, []);

  useEffect(() => {
    if (!esVoluntario) return;
    let activo = true;
    setPerfilCargando(true);
    setPerfilError('');

    Promise.all([getVolunteerProfile(), getVolunteerCatalogs()])
      .then(([resultado, listas]) => {
        if (!activo) return;
        setPerfilCreado(Boolean(resultado.perfilCreado));
        setPerfil(resultado.perfil ?? null);
        setCatalogos(listas);
      })
      .catch(error => { if (activo) setPerfilError(error.message); })
      .finally(() => { if (activo) setPerfilCargando(false); });

    return () => { activo = false; };
  }, [esVoluntario, user?.id]);

  const comunidad = catalogos?.comunidades?.find(
    item => String(item.id) === String(perfil?.comunidadId)
  );
  const nombresHabilidades = (perfil?.habilidades ?? []).map(id => {
    const habilidad = catalogos?.habilidades?.find(item => String(item.id) === String(id));
    return habilidad?.nombre ?? `Habilidad ${id}`;
  });
  const nombresLenguas = (perfil?.lenguas ?? []).map(item => {
    const lengua = catalogos?.lenguas?.find(
      entrada => String(entrada.id) === String(item.lenguaId)
    );
    return lengua?.nombre ?? `Lengua ${item.lenguaId}`;
  });

  return (
    <section className="container inner-page">
      <span className="section-kicker">Acceso privado · Nexo Ñuu</span>
      <h1>¡Hola, {user.nombre}!</h1>
      <p className="page-intro">
        Has iniciado sesión correctamente. Este es tu espacio privado de Nexo Ñuu.
      </p>
      <div className="feature-list">
        <article>
          <h2>Tu cuenta</h2>
          <p><strong>Correo:</strong> {user.correo}</p>
          <p><strong>Correo verificado:</strong> Sí</p>
        </article>

        <article>
          <h2>Roles autorizados</h2>
          <p>{user.roles.join(', ') || 'Sin roles asignados'}</p>
          <p>El servidor determina tus permisos, no los botones de la interfaz.</p>
        </article>

        <article>
          <h2>Seguridad de tu cuenta</h2>
          {telefonoCargando ? (
            <p>Consultando estado del teléfono...</p>
          ) : telefonoError ? (
            <p role="alert">No se pudo consultar el teléfono: {telefonoError}</p>
          ) : telefono?.telefonoVerificado ? (
            <>
              <p style={{ color: '#087c65', fontWeight: 600 }}>
                ✓ Teléfono verificado correctamente
              </p>
              <p><strong>Número:</strong> {telefono.telefono}</p>
              <p>Tu número está registrado y verificado en Nexo Ñuu.</p>
            </>
          ) : (
            <>
              <p>Todavía no has verificado tu teléfono.</p>
              <Link to="/verificar-telefono" className="btn btn-outline">
                Verificar teléfono
              </Link>
            </>
          )}
        </article>

        {user.roles?.includes('representante') && (
          <article>
            <h2>Mi panel institucional</h2>
            <p>Publica jornadas de tu institución y revisa a las personas voluntarias que se postulan.</p>
            <Link className="btn btn-primary" to="/panel-institucional">Abrir panel institucional</Link>
          </article>
        )}
        {esAdministrador && (
          <article>
            <h2>Panel de administración</h2>
            <p>Revisa solicitudes, autoriza instituciones y representantes, gestiona usuarios y modera jornadas.</p>
            <Link className="btn btn-primary" to="/admin">Abrir administración</Link>
          </article>
        )}
        {esVoluntario && (
          <article>
            <h2>Mi perfil de voluntariado</h2>
            {perfilCargando ? (
              <p role="status">Consultando perfil guardado...</p>
            ) : perfilError ? (
              <>
                <p role="alert">No fue posible consultar tu perfil: {perfilError}</p>
                <Link to="/mi-perfil-voluntario" className="btn btn-outline">
                  Abrir mi perfil
                </Link>
              </>
            ) : perfilCreado ? (
              <>
                <p style={{ color: '#087c65', fontWeight: 600 }}>✓ Perfil guardado</p>
                <p><strong>Comunidad:</strong>{' '}
                  {comunidad ? `${comunidad.nombre}, ${comunidad.municipio}` : 'No indicada'}
                </p>
                <p><strong>Disponibilidad:</strong>{' '}
                  {disponibilidadTexto[perfil?.disponibilidad] ?? 'No indicada'}
                </p>
                <p><strong>Habilidades:</strong>{' '}
                  {nombresHabilidades.length ? nombresHabilidades.join(', ') : 'No indicadas'}
                </p>
                <p><strong>Lenguas:</strong>{' '}
                  {nombresLenguas.length ? nombresLenguas.join(', ') : 'No indicadas'}
                </p>
                <Link to="/mi-perfil-voluntario" className="btn btn-primary">
                  Editar mi perfil
                </Link>
              </>
            ) : (
              <>
                <p>Aún no has guardado tu perfil de voluntariado.</p>
                <Link to="/mi-perfil-voluntario" className="btn btn-primary">
                  Completar mi perfil
                </Link>
              </>
            )}
          </article>
        )}
      </div>
      <Link to="/jornadas" className="btn btn-outline">Explorar jornadas</Link>
    </section>
  );
}
