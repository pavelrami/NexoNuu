import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getDetalleJornada, postularJornada } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';
import '../detalle-jornada.css';

const fecha = new Intl.DateTimeFormat('es-MX', {dateStyle:'full',timeStyle:'short',timeZone:'America/Mexico_City'});
function isDemo(j) {
  return /\bdemo\b|demostrativ|actividad ficticia/i.test(`${j?.titulo || ''} ${j?.institucion || ''} ${j?.descripcion || ''}`);
}
function safeWeb(url) {
  try { const u = new URL(url); return ['https:', 'http:'].includes(u.protocol) ? u.href : null; }
  catch { return null; }
}
export default function DetalleJornada() {
  const { id } = useParams();
  const {user}=useAuth();
  const [enviando,setEnviando]=useState(false);
  const [mensaje,setMensaje]=useState('');
  const [state, setState] = useState({status:'loading', jornada:null, error:''});
  useEffect(() => {
    const controller = new AbortController();
    setState({status:'loading', jornada:null, error:''});
    getDetalleJornada(id, {signal:controller.signal})
      .then(data => { if (!controller.signal.aborted) setState({status:'done',jornada:data.jornada,error:''}); })
      .catch(e => { if (!controller.signal.aborted) setState({status:'error',jornada:null,error:e.message}); });
    return () => controller.abort();
  }, [id]);
  async function enviarPostulacion() {
    if (!state.jornada || enviando) return;
    setEnviando(true);setMensaje('');
    try {
      await postularJornada(state.jornada.id);
      setMensaje('Solicitud registrada como pendiente. Puedes consultarla en Mis postulaciones.');
    } catch(e) {setMensaje(e.message);}
    finally {setEnviando(false);}
  }
  const j = state.jornada;
  return <section className="container inner-page detalle-jornada">
    <Link className="detalle-volver" to="/jornadas">← Regresar a jornadas</Link>
    {state.status === 'loading' && <p role="status">Cargando información de la jornada...</p>}
    {state.status === 'error' && <div role="alert" className="notice notice-warning"><h1>Jornada no disponible</h1><p>{state.error}</p><Link className="btn btn-outline" to="/jornadas">Ver jornadas vigentes</Link></div>}
    {j && <>
      <span className="section-kicker">Informar · Detalles de la jornada</span>
      <h1>{j.titulo}</h1>
      {j.es_demo ? <div className="detalle-aviso" role="note"><strong>Jornada DEMO.</strong> No corresponde a una convocatoria real. {j.puedePostular ? 'Se permiten solicitudes simuladas únicamente para probar la aplicación local.' : 'No admite postulaciones.'}</div>
        : <div className="detalle-aviso" role="note">{j.puedePostular ? 'Esta jornada admite solicitudes de voluntariado.' : 'Esta jornada solo se puede consultar por ahora.'}</div>}
      <div className="detalle-grid">
        <article className="detalle-panel">
          <h2>Acerca de esta jornada</h2>
          <p className="detalle-descripcion">{j.descripcion}</p>
          <h2>Lenguas solicitadas</h2>
          {j.lenguas?.length ? <ul>{j.lenguas.map((l,i) => <li key={`${l.nombre}-${i}`}>{l.nombre}{l.variante ? ` — ${l.variante}` : ''} ({l.prioridad})</li>)}</ul> : <p>No se especifican requisitos lingüísticos.</p>}
        </article>
        <aside className="detalle-panel" aria-label="Datos de la jornada">
          <h2>Información general</h2>
          <dl>
            <dt>Inicio</dt><dd>{fecha.format(new Date(j.inicio))}</dd>
            <dt>Finalización</dt><dd>{fecha.format(new Date(j.fin))}</dd>
            <dt>Comunidad</dt><dd>{j.comunidad}, {j.municipio}, {j.region || 'Oaxaca'}</dd>
            <dt>Institución</dt><dd>{j.institucion}</dd>
            <dt>Cupo registrado</dt><dd>{isDemo(j) ? 'Dato ficticio de prueba' : j.cupo}</dd>
          </dl>
          {safeWeb(j.institucion_sitio) && <a href={safeWeb(j.institucion_sitio)} target="_blank" rel="noopener noreferrer">Visitar sitio de la institución</a>}
          <p className="detalle-nota">No se muestran direcciones exactas porque el modelo actual solo registra comunidad y municipio. Los mapas se activarán cuando tengamos ubicaciones verificadas.</p>
        </aside>
      </div>
      {j.puedePostular && <div className="detalle-panel">
        <h2>Participar en esta jornada</h2>
        {!user ? <p><Link className="btn btn-primary" to="/iniciar-sesion">Iniciar sesión para postularme</Link></p> : <button className="btn btn-primary" type="button" disabled={enviando || Boolean(mensaje.startsWith('Solicitud registrada'))} onClick={enviarPostulacion}>{enviando ? 'Enviando solicitud...' : (j.es_demo ? 'Simular postulación' : 'Postularme')}</button>}
        {mensaje && <p role="status">{mensaje}</p>}
        <p><Link to="/mis-postulaciones">Mis postulaciones</Link></p>
      </div>}
      <Link className="btn btn-outline" to="/jornadas">Explorar otras jornadas</Link>
    </>}
  </section>;
}
