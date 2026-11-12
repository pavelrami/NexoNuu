import { Link } from 'react-router-dom';
import { Icon } from '../components/Icons.jsx';

const modules = [
  { label: 'Concientizar', icon: 'awareness', copy: 'Visibilizar la importancia de la alfabetización y sus oportunidades de participación.' },
  { label: 'Informar', icon: 'info', copy: 'Reunir contenidos y referencias confiables sobre iniciativas educativas.' },
  { label: 'Conectar', icon: 'connect', copy: 'Relacionar a voluntarios e instituciones según habilidades y disponibilidad.' },
  { label: 'Coordinar', icon: 'calendar', copy: 'Facilitar la publicación de jornadas y la gestión de postulaciones.' },
  { label: 'Dar seguimiento', icon: 'follow', copy: 'Registrar actividades y participaciones, sin evaluar aprendizajes individuales.' },
];

export default function Home() {
  return <>
    <section className="hero container">
      <div className="hero-content">
        <span className="eyebrow"><span className="eyebrow-dot"/> Tecnología con propósito comunitario</span>
        <h1>Conectamos esfuerzos para apoyar la <span>alfabetización en Oaxaca.</span></h1>
        <p>Un espacio digital para informar, concientizar y facilitar la vinculación entre instituciones, universidades y personas voluntarias.</p>
        <div className="hero-actions">
          <Link to="/jornadas" className="btn btn-primary">Explorar jornadas <Icon name="arrow" size={18}/></Link>
          <Link to="/voluntariado" className="btn btn-outline">Conocer el voluntariado</Link>
        </div>
        <p className="hero-footnote">Nexo Ñuu no imparte clases ni sustituye a los programas de alfabetización existentes.</p>
      </div>
      <div className="hero-graphic" role="img" aria-label="Diagrama simbólico: voluntariado, instituciones y comunidades conectadas por Nexo Ñuu">
        <div className="graphic-kicker">Construyendo puentes</div>
        <div className="graphic-orbit">
          <div className="graphic-node node-top"><Icon name="book" size={27}/><span>Instituciones</span></div>
          <div className="graphic-node node-left"><Icon name="connect" size={27}/><span>Voluntariado</span></div>
          <div className="graphic-node node-right"><Icon name="pin" size={27}/><span>Comunidades</span></div>
          <div className="graphic-core"><span>Nexo</span><strong>Ñuu</strong></div>
        </div>
        <div className="graphic-footer">Comunicación · Colaboración · Inclusión</div>
      </div>
    </section>
    <section className="module-section">
      <div className="container">
        <span className="section-kicker">El modelo de trabajo</span>
        <h2>Cinco funciones. Un mismo propósito.</h2>
        <p className="section-intro">La plataforma se desarrollará por incrementos. Cada función responde a una necesidad concreta de información o coordinación.</p>
        <div className="module-grid">
          {modules.map((m, idx) => <article className="module-card" key={m.label}>
            <span className="number">{String(idx + 1).padStart(2, '0')}</span>
            <span className="module-icon"><Icon name={m.icon}/></span>
            <h3>{m.label}</h3><p>{m.copy}</p>
          </article>)}
        </div>
      </div>
    </section>
    <section className="container callout"><div><span className="section-kicker">ODS 4 — Educación de calidad</span><h2>Una herramienta tecnológica de apoyo</h2><p>El proyecto busca fortalecer la visibilidad y la participación en esfuerzos de alfabetización. Su impacto se medirá por información consultada, oportunidades publicadas y colaboraciones registradas, no por resultados educativos atribuidos al software.</p></div><Link to="/instituciones" className="btn btn-light">Conocer cómo participar <Icon name="arrow" size={18}/></Link></section>
  </>;
}
