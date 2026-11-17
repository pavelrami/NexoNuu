
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { phoneStatus } from '../api.js';

export default function MiEspacio() {
  const { user } = useAuth();

  const [telefono, setTelefono] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let activo = true;

    async function consultarTelefono() {
      try {
        const resultado = await phoneStatus();

        if (activo) {
          setTelefono(resultado);
        }
      } catch (err) {
        if (activo) {
          setError(err.message);
        }
      } finally {
        if (activo) {
          setCargando(false);
        }
      }
    }

    consultarTelefono();

    return () => {
      activo = false;
    };
  }, []);

  return (
    <section className="container inner-page">

      <span className="section-kicker">
        Acceso privado · Nexo Ñuu
      </span>

      <h1>¡Hola, {user.nombre}!</h1>

      <p className="page-intro">
        Has iniciado sesión correctamente.
        Este es tu espacio privado de Nexo Ñuu.
      </p>

      <div className="feature-list">

        <article>
          <h2>Tu cuenta</h2>

          <p>
            <strong>Correo:</strong> {user.correo}
          </p>

          <p>
            <strong>Correo verificado:</strong>{' '}
            {user.correo_verificado_en === null
              ? 'No'
              : 'Sí'}
          </p>
        </article>

        <article>
          <h2>Roles autorizados</h2>

          <p>
            {user.roles.join(', ') || 'Sin roles asignados'}
          </p>

          <p>
            El servidor determina tus permisos,
            no los botones de la interfaz.
          </p>
        </article>

        <article>
          <h2>Seguridad de tu cuenta</h2>

          {cargando ? (
            <p>Consultando estado del teléfono...</p>
          ) : error ? (
            <>
              <p>No se pudo consultar el estado del teléfono.</p>
              <p role="alert">{error}</p>
            </>
          ) : telefono?.telefonoVerificado ? (
            <>
              <p style={{ color: '#087c65', fontWeight: 600 }}>
                ✓ Teléfono verificado correctamente
              </p>

              <p>
                <strong>Número:</strong>{' '}
                {telefono.telefono}
              </p>

              <p>
                Tu número está registrado y verificado
                en Nexo Ñuu.
              </p>
            </>
          ) : (
            <>
              <p>
                Todavía no has verificado tu teléfono.
              </p>

              <Link
                to="/verificar-telefono"
                className="btn btn-outline"
              >
                Verificar teléfono
              </Link>
            </>
          )}

        </article>

      </div>

      <Link to="/jornadas" className="btn btn-primary">
        Explorar jornadas
      </Link>

    </section>
  );
}

