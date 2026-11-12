import { useEffect, useState } from 'react';
import { getJornadas } from '../api.js';
import { Icon } from '../components/Icons.jsx';

const dateFormat = new Intl.DateTimeFormat('es-MX', { dateStyle: 'long', timeZone: 'America/Mexico_City' });
export default function Jornadas() {
  const [state, setState] = useState({ phase: 'loading', items: [], message: '' });
  useEffect(() => {
    const controller = new AbortController();
    getJornadas({ signal: controller.signal })
      .then((items) => setState({ phase: 'done', items, message: '' }))
      .catch((error) => { if (!controller.signal.aborted) setState({ phase: 'error', items: [], message: error.message }); });
    return () => controller.abort();
  }, []);
  return <section className="container inner-page">
    <span className="section-kicker">Módulos Informar · Conectar</span>
    <h1>Jornadas y oportunidades de participación</h1>
    <p className="page-intro">Aquí aparecerán únicamente las jornadas publicadas por instituciones verificadas. La implementación inicial ya consulta nuestra API, pero no muestra convocatorias ficticias.</p>
    {state.phase === 'loading' && <div className="notice">Consultando jornadas…</div>}
    {state.phase === 'error' && <div className="notice notice-warning" role="alert"><strong>Aún no podemos mostrar las jornadas.</strong><p>{state.message}</p><small>Si estás configurando el proyecto, comprueba el backend y la base de datos PostgreSQL.</small></div>}
    {state.phase === 'done' && state.items.length === 0 && <div className="empty-state"><div className="empty-icon"><Icon name="calendar" size={36}/></div><h2>Todavía no hay jornadas publicadas</h2><p>Cuando una institución validada publique una jornada, aparecerá aquí con su fecha y ubicación.</p></div>}
    {state.phase === 'done' && state.items.length > 0 && <div className="jornada-grid">{state.items.map((j) => <article className="jornada-card" key={j.id}><span className="chip">Jornada publicada</span><h2>{j.titulo}</h2><p>{j.descripcion}</p><div className="meta"><Icon name="pin" size={18}/>{j.comunidad}, {j.municipio}</div><div className="meta"><Icon name="calendar" size={18}/>{dateFormat.format(new Date(j.inicio))}</div><p className="source">Institución: {j.institucion}</p><p className="micro-note">Las postulaciones se habilitarán en un incremento posterior.</p></article>)}</div>}
  </section>;
}
