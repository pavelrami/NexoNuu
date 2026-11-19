import { Link } from 'react-router-dom';
import { Portada } from './Ilustraciones.jsx';
import { Icon } from './Icons.jsx';

const fechaCorta = new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'America/Mexico_City' });

export function esDemo(j) {
  if (typeof j?.es_demo === 'boolean') return j.es_demo;
  return /\bdemo\b|demostrativ|actividad ficticia/i.test(`${j?.titulo || ''} ${j?.institucion || ''}`);
}

export const formatoCorto = (valor) => {
  const d = new Date(valor);
  return Number.isFinite(d.getTime()) ? fechaCorta.format(d) : '';
};

// Convierte las direcciones https:// del texto en enlaces seguros (para citar la fuente).
function conEnlaces(texto = '') {
  return texto.split(/(https:\/\/[^\s)]+)/g).map((parte, i) => (/^https:\/\//.test(parte)
    ? <a key={i} className="fuente" href={parte} target="_blank" rel="noopener noreferrer">consultar la fuente oficial</a>
    : parte));
}

export default function JornadaCard({ j, historica = false }) {
  const demo = esDemo(j);
  const href = historica ? null : `/jornadas/${j.id}`;
  const Media = href ? Link : 'div';
  return <div className="j-card-wrap" data-reveal>
    <article className={`j-card${historica ? ' j-card--historica' : ''}`}>
      <Media {...(href ? { to: href, tabIndex: -1, 'aria-hidden': true } : {})} className="j-card-media">
        <span className="j-card-cover" data-rombo><Portada seed={j.id} region={j.region || ''} /></span>
        {demo && <span className="j-badge">Demostración</span>}
        {historica && <span className="j-badge j-badge--fin">Finalizada</span>}
      </Media>
      <div className="j-card-body">
        <ul className="j-tags" aria-label="Datos clave">
          <li className="tag"><Icon name="pin" size={14} />{j.municipio}</li>
          {j.region && <li className="tag tag--soft">{j.region}</li>}
          <li className="tag"><Icon name="calendar" size={14} />{formatoCorto(j.inicio)}</li>
        </ul>
        <h3 className="j-title">{href ? <Link to={href}>{j.titulo}</Link> : j.titulo}</h3>
        <p className={`j-desc${historica ? ' j-desc--completa' : ''}`}>{historica ? conEnlaces(j.descripcion) : j.descripcion}</p>
        <p className="j-org"><Icon name="building" size={15} /> Organiza: {j.institucion}</p>
        {href && <div className="j-actions">
          <Link className="btn btn-primary btn-sm" to={href}>Ver detalles <Icon name="arrow" size={16} /></Link>
        </div>}
        {demo && !historica && <p className="j-note">Registro de prueba: no es una convocatoria real.</p>}
      </div>
    </article>
  </div>;
}
