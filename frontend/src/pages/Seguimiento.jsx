import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { getJornadasHistoricas } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { Icon } from '../components/Icons.jsx';
import { HiloSvg } from '../components/Adornos.jsx';
import JornadaCard from '../components/JornadaCard.jsx';
import Nuu from '../components/Nuu.jsx';
import { useMotion } from '../motion/useMotion.js';

const estados = [
  { k: 'borrador', t: 'Borrador', d: 'La institución prepara la jornada. Aún no es pública.' },
  { k: 'publicada', t: 'Publicada', d: 'Visible en Jornadas. Recibe postulaciones si están habilitadas.' },
  { k: 'cerrada', t: 'Cerrada', d: 'Sin nuevas inscripciones; solo cuando no quedan solicitudes pendientes.' },
  { k: 'finalizada', t: 'Finalizada', d: 'Pasa a referencia histórica, como las que ves abajo.' },
];

const registros = [
  ['follow', 'Notas de coordinación', 'Resumen de lo acordado y observaciones operativas de la jornada.'],
  ['users', 'Personas confirmadas', 'Un número que nunca supera las postulaciones aceptadas. No es lista de asistencia.'],
  ['clock', 'Historial con motivo', 'Cada edición, cierre, cancelación o finalización queda registrada con quién y por qué.'],
  ['shield', 'Sin datos sensibles', 'No se guardan nombres ni avances de las personas que aprenden a leer y escribir.'],
];

export default function Seguimiento() {
  const { user } = useAuth();
  const ref = useRef(null);
  const histRef = useRef(null);
  const [hist, setHist] = useState({ fase: 'loading', items: [] });

  useEffect(() => {
    const c = new AbortController();
    getJornadasHistoricas({ signal: c.signal })
      .then((d) => setHist({ fase: 'done', items: d.jornadas || [] }))
      .catch(() => { if (!c.signal.aborted) setHist({ fase: 'error', items: [] }); });
    return () => c.abort();
  }, []);

  useMotion(ref, null, []);
  useMotion(histRef, null, [hist.fase]);

  const esRepresentante = user?.roles?.includes('representante');

  return <div className="seg-page" ref={ref}>
    <section className="container seg-hero">
      <span className="kicker" data-reveal>Módulo Dar seguimiento</span>
      <h1 data-split>Coordinación y seguimiento de cada jornada</h1>
      <p className="page-intro" data-reveal>El seguimiento registra cómo avanza la coordinación de una jornada, no los aprendizajes de las personas. Así las instituciones rinden cuentas sin exponer a nadie.</p>
      {esRepresentante
        ? <Link className="btn btn-primary" to="/panel-institucional" data-reveal>Registrar seguimiento en mi panel <Icon name="arrow" size={17} /></Link>
        : <p className="seg-acceso" data-reveal><Icon name="lock" size={17} /> El registro está reservado a representantes autorizados de instituciones verificadas.</p>}
    </section>

    <section className="seg-ciclo">
      <div className="container">
        <div className="seccion-cabeza">
          <span className="kicker" data-reveal>Ciclo de vida</span>
          <h2 data-split>Los estados por los que pasa una jornada.</h2>
        </div>
        <div className="ciclo">
          <HiloSvg className="ciclo-hilo" viewBox="0 0 1000 40" paths={['M60 20H940']} grosor={14} />
          <ol>{estados.map((e, i) => <li key={e.k} className={`ciclo-paso ciclo-paso--${e.k}`} data-reveal>
            <span className="ciclo-rombo"><span>{i + 1}</span></span>
            <strong>{e.t}</strong>
            <p>{e.d}</p>
          </li>)}</ol>
          <p className="ciclo-nota" data-reveal><Icon name="close" size={15} /><span>Una jornada también puede <strong>cancelarse</strong> desde borrador, o desde publicada si no tiene solicitudes pendientes ni aceptadas.</span></p>
        </div>
      </div>
    </section>

    <section className="container seg-registros">
      <div className="seccion-cabeza">
        <span className="kicker" data-reveal>Qué se registra</span>
        <h2 data-split>Información útil para coordinar, nada más.</h2>
      </div>
      <ul className="capacidades">
        {registros.map(([icon, t, d]) => <li key={t} data-reveal>
          <span className="capacidad-icono"><Icon name={icon} size={22} /></span>
          <div><strong>{t}</strong><p>{d}</p></div>
        </li>)}
      </ul>
    </section>

    <section className="seg-historicas" ref={histRef}>
      <div className="container">
        <div className="seccion-cabeza">
          <span className="kicker" data-reveal>Referencia histórica</span>
          <h2 data-split>Jornadas finalizadas</h2>
          <p className="seccion-intro" data-reveal>Actividades que ya ocurrieron. Se consultan con su fuente y no admiten postulaciones.</p>
        </div>
        {hist.fase === 'loading' && <p className="cargando" role="status">Consultando jornadas finalizadas…</p>}
        {hist.fase === 'error' && <div className="notice notice-warning" role="alert">No se pudieron consultar las jornadas finalizadas.</div>}
        {hist.fase === 'done' && hist.items.length === 0 && <div className="vacio" data-reveal>
          <Nuu className="vacio-nuu" />
          <div><h3>Aún no hay jornadas finalizadas</h3><p>Cuando una jornada termine, quedará aquí como referencia.</p></div>
        </div>}
        {hist.items.length > 0 && <div className="j-grid">{hist.items.map((j) => <JornadaCard key={j.id} j={j} historica />)}</div>}
      </div>
    </section>
  </div>;
}
