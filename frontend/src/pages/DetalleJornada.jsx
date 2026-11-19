import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getDetalleJornada, postularJornada } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { Portada } from '../components/Ilustraciones.jsx';
import { Icon } from '../components/Icons.jsx';
import Nuu from '../components/Nuu.jsx';
import { useMotion } from '../motion/useMotion.js';
import '../detalle-jornada.css';

const fecha = new Intl.DateTimeFormat('es-MX', { dateStyle: 'full', timeStyle: 'short', timeZone: 'America/Mexico_City' });
function isDemo(j) {
  if (typeof j?.es_demo === 'boolean') return j.es_demo;
  return /\bdemo\b|demostrativ|actividad ficticia/i.test(`${j?.titulo || ''} ${j?.institucion || ''} ${j?.descripcion || ''}`);
}
function safeWeb(url) {
  try { const u = new URL(url); return ['https:', 'http:'].includes(u.protocol) ? u.href : null; }
  catch { return null; }
}

export default function DetalleJornada() {
  const { id } = useParams();
  const { user } = useAuth();
  const ref = useRef(null);
  const [enviando, setEnviando] = useState(false);
  const [mensaje, setMensaje] = useState('');
  const [state, setState] = useState({ status: 'loading', jornada: null, error: '' });

  useEffect(() => {
    const controller = new AbortController();
    setState({ status: 'loading', jornada: null, error: '' });
    getDetalleJornada(id, { signal: controller.signal })
      .then((data) => { if (!controller.signal.aborted) setState({ status: 'done', jornada: data.jornada, error: '' }); })
      .catch((e) => { if (!controller.signal.aborted) setState({ status: 'error', jornada: null, error: e.message }); });
    return () => controller.abort();
  }, [id]);

  useMotion(ref, null, [state.status]);

  async function enviarPostulacion() {
    if (!state.jornada || enviando) return;
    setEnviando(true); setMensaje('');
    try {
      await postularJornada(state.jornada.id);
      setMensaje('Solicitud registrada como pendiente. Puedes consultarla en Mis postulaciones.');
    } catch (e) { setMensaje(e.message); }
    finally { setEnviando(false); }
  }

  const j = state.jornada;
  const exito = mensaje.startsWith('Solicitud registrada');
  return <section className="container inner-page detalle-jornada" ref={ref}>
    <Link className="detalle-volver" to="/jornadas"><Icon name="arrowLeft" size={17} /> Regresar a jornadas</Link>
    {state.status === 'loading' && <div className="detalle-cargando" role="status"><span className="j-esqueleto" /><p>Cargando información de la jornada…</p></div>}
    {state.status === 'error' && <div role="alert" className="vacio">
      <Nuu className="vacio-nuu" />
      <div><h1 className="detalle-error-titulo">Jornada no disponible</h1><p>{state.error}</p>
        <Link className="btn btn-outline btn-sm" to="/jornadas">Ver jornadas vigentes</Link></div>
    </div>}
    {j && <>
      <div className="detalle-portada" data-rombo>
        <Portada seed={j.id} region={j.region || ''} />
        {j.es_demo && <span className="j-badge">Demostración</span>}
      </div>
      <span className="kicker" data-reveal>Informar · Detalles de la jornada</span>
      <h1 data-split>{j.titulo}</h1>
      <ul className="j-tags detalle-tags" data-reveal>
        <li className="tag"><Icon name="pin" size={14} />{j.comunidad}, {j.municipio}</li>
        {j.region && <li className="tag tag--soft">{j.region}</li>}
        <li className="tag"><Icon name="building" size={14} />{j.institucion}</li>
      </ul>
      {j.es_demo
        ? <div className="detalle-aviso" role="note" data-reveal><strong>Jornada DEMO.</strong> No corresponde a una convocatoria real. {j.puedePostular ? 'Se permiten solicitudes simuladas únicamente para probar la aplicación local.' : 'No admite postulaciones.'}</div>
        : <div className="detalle-aviso detalle-aviso--ok" role="note" data-reveal>{j.puedePostular ? 'Esta jornada admite solicitudes de voluntariado.' : 'Esta jornada solo se puede consultar por ahora.'}</div>}
      <div className="detalle-grid">
        <article className="detalle-panel" data-reveal>
          <h2>Acerca de esta jornada</h2>
          <p className="detalle-descripcion">{j.descripcion}</p>
          <h2>Lenguas solicitadas</h2>
          {j.lenguas?.length
            ? <ul className="detalle-lenguas">{j.lenguas.map((l, i) => <li key={`${l.nombre}-${i}`}><Icon name="language" size={17} /><span>{l.nombre}{l.variante ? ` — ${l.variante}` : ''}</span><em className={l.prioridad === 'requerida' ? 'req' : ''}>{l.prioridad}</em></li>)}</ul>
            : <p>No se especifican requisitos lingüísticos.</p>}
          {j.institucion_descripcion && <><h2>Sobre la institución</h2><p>{j.institucion_descripcion}</p></>}
        </article>
        <aside className="detalle-aside" aria-label="Datos de la jornada">
          <div className="detalle-panel" data-reveal>
            <h2>Información general</h2>
            <dl>
              <dt><Icon name="calendar" size={15} /> Inicio</dt><dd>{fecha.format(new Date(j.inicio))}</dd>
              <dt><Icon name="clock" size={15} /> Finalización</dt><dd>{fecha.format(new Date(j.fin))}</dd>
              <dt><Icon name="pin" size={15} /> Comunidad</dt><dd>{j.comunidad}, {j.municipio}, {j.region || 'Oaxaca'}</dd>
              <dt><Icon name="building" size={15} /> Institución</dt><dd>{j.institucion}</dd>
              <dt><Icon name="users" size={15} /> Cupo registrado</dt><dd>{isDemo(j) ? 'Dato ficticio de prueba' : j.cupo}</dd>
            </dl>
            {safeWeb(j.institucion_sitio) && <a className="detalle-sitio" href={safeWeb(j.institucion_sitio)} target="_blank" rel="noopener noreferrer">Visitar sitio de la institución <Icon name="arrowUpRight" size={14} /></a>}
            {j.puedePostular && <div className="detalle-postular">
              {!user
                ? <Link className="btn btn-primary" to="/iniciar-sesion">Iniciar sesión para postularme <Icon name="arrow" size={17} /></Link>
                : <button className="btn btn-primary" type="button" disabled={enviando || exito} onClick={enviarPostulacion}>
                  {enviando ? 'Enviando solicitud…' : exito ? <><Icon name="check" size={18} /> Solicitud enviada</> : (j.es_demo ? 'Simular postulación' : 'Postularme')}
                </button>}
              {mensaje && <p role="status" className={exito ? 'auth-success' : 'auth-error'}>{mensaje}</p>}
              <Link className="detalle-mis" to="/mis-postulaciones">Ver mis postulaciones</Link>
            </div>}
            <p className="detalle-nota">No se muestran direcciones exactas: el modelo solo registra comunidad y municipio. Los mapas se activarán cuando haya ubicaciones verificadas.</p>
          </div>
        </aside>
      </div>
      <Link className="btn btn-outline" to="/jornadas">Explorar otras jornadas</Link>
    </>}
  </section>;
}
