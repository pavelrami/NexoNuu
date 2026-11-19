import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { Icon } from '../components/Icons.jsx';
import { Escena } from '../components/Ilustraciones.jsx';
import { Topo } from '../components/Adornos.jsx';
import { FUENTES, PROGRAMAS } from '../data/fuentes.js';
import { useMotion } from '../motion/useMotion.js';
import { gsap, M } from '../motion/motion.js';
import '../instituciones-solicitudes.css';

const etapas = [
  { n: '01', t: 'Verificación', s: 'Revisión administrativa rigurosa', d: 'La incorporación institucional requiere validar a la organización y a sus representantes. No se atribuyen convenios o alianzas que no existan.', escena: 'aula', id: 'verificacion', cta: 'Saber más' },
  { n: '02', t: 'Publicación', s: 'Difusión de jornadas activas', d: 'Las jornadas tienen título, comunidad, fecha, cupo, descripción y lenguas requeridas, con criterios de participación transparentes.', escena: 'arbol', id: 'panel', cta: 'Ver qué incluye' },
  { n: '03', t: 'Coordinación', s: 'Gestión directa de solicitudes', d: 'Representantes autorizados aceptan o rechazan cada postulación, cierran inscripciones y registran el seguimiento de coordinación.', escena: 'sierra', id: 'proceso', cta: 'Ver proceso' },
];

const capacidades = [
  ['calendar', 'Crear jornadas en borrador', 'Con comunidad, fechas, cupo y lenguas solicitadas.'],
  ['flag', 'Publicarlas', 'Solo instituciones verificadas pueden hacerlo visible al público.'],
  ['users', 'Revisar postulaciones', 'Aceptar o rechazar cada solicitud de voluntariado.'],
  ['lock', 'Cerrar, cancelar o finalizar', 'Cada cambio de estado exige un motivo y queda en el historial.'],
  ['follow', 'Registrar seguimiento', 'Notas de coordinación y personas confirmadas, sin datos de aprendizaje.'],
  ['shield', 'Permisos en el servidor', 'Cada operación se valida en la API, no solo en los botones.'],
];

const proceso = [
  ['Solicitud', 'Una cuenta con correo verificado presenta los datos de la institución. Enviar la solicitud no concede permisos.'],
  ['Revisión', 'La administración revisa la información y decide verificarla o rechazarla, con motivo.'],
  ['Autorización', 'Se autoriza a cada representante de forma individual; los permisos se pueden revocar.'],
  ['Operación', 'El representante publica jornadas y coordina postulaciones de su propia institución.'],
];

function subrayar({ root }) {
  root.querySelectorAll('[data-subraya]').forEach((el) => {
    gsap.fromTo(el, { backgroundSize: '0% 100%' }, { backgroundSize: '100% 100%', duration: M.dur * 1.2, ease: M.ease, delay: 0.5 });
  });
}

export default function Instituciones() {
  const { user } = useAuth();
  const ref = useRef(null);
  useMotion(ref, subrayar, []);
  const esRepresentante = user?.roles?.includes('representante');
  const esAdmin = user?.roles?.includes('administrador');
  const destino = user ? '/instituciones/solicitar' : '/iniciar-sesion';
  const referencias = PROGRAMAS.filter((p) => ['ieea', 'inea', 'anuies'].includes(p.id));

  return <div className="inst-page2" ref={ref}>
    <section className="container inst-hero">
      <div className="inst-hero-texto">
        <span className="eyebrow eyebrow--ocre" data-reveal><span className="eyebrow-dot" /> Tecnología con propósito comunitario</span>
        <h1 data-reveal>Espacio para <span className="subrayado" data-subraya>instituciones</span></h1>
        <p className="page-intro" data-reveal>Una institución verificada puede publicar jornadas, consultar postulaciones y registrar seguimientos básicos. Todo empieza con una revisión que protege a las comunidades.</p>
        <div className="hero-actions" data-reveal>
          <Link className="btn btn-primary btn-lg" to={destino}>{user ? 'Registrar institución' : 'Iniciar sesión para registrar'} <Icon name="arrow" size={18} /></Link>
          <Link className="btn btn-outline btn-lg" to="/">Volver al inicio</Link>
        </div>
        {(esRepresentante || esAdmin) && <div className="inst-accesos" data-reveal>
          {esRepresentante && <Link to="/panel-institucional" className="chip-link"><Icon name="building" size={15} /> Ir a mi panel institucional</Link>}
          {esAdmin && <Link to="/admin/instituciones" className="chip-link"><Icon name="shield" size={15} /> Administrar solicitudes</Link>}
        </div>}
      </div>
      <ol className="inst-pila">
        {etapas.map((e) => <li key={e.n} className={`inst-etapa${e.n === '02' ? ' inst-etapa--verde' : ''}`} data-reveal>
          <div className="inst-etapa-texto">
            <h2><span>{e.n} /</span> {e.t}</h2>
            <strong>{e.s}</strong>
            <p>{e.d}</p>
            <a className="chip-link" href={`#${e.id}`}>{e.cta} <Icon name="arrow" size={14} /></a>
          </div>
          <div className="inst-etapa-img" data-rombo><Escena variante={e.escena} /></div>
        </li>)}
      </ol>
    </section>

    <section className="inst-panel-sec" id="panel">
      <div className="container">
        <div className="seccion-cabeza">
          <span className="kicker" data-reveal>Panel institucional</span>
          <h2 data-split>Lo que una institución verificada puede hacer.</h2>
          <p className="seccion-intro" data-reveal>Estas funciones ya existen en la plataforma. En esta etapa, la publicación opera con jornadas de demostración mientras se valida el proceso con instituciones reales.</p>
        </div>
        <ul className="capacidades">
          {capacidades.map(([icon, t, d]) => <li key={t} data-reveal>
            <span className="capacidad-icono"><Icon name={icon} size={22} /></span>
            <div><strong>{t}</strong><p>{d}</p></div>
          </li>)}
        </ul>
      </div>
    </section>

    <section className="inst-proceso" id="proceso">
      <Topo className="inst-proceso-topo" seed={17} centros={[[0.1, 0.2, 6], [0.9, 0.9, 7]]} />
      <div className="container">
        <div className="seccion-cabeza" id="verificacion">
          <span className="kicker kicker--claro" data-reveal>Proceso de verificación</span>
          <h2 data-split>Cuatro pasos antes de publicar la primera jornada.</h2>
        </div>
        <ol className="proceso-lista">
          {proceso.map(([t, d], i) => <li key={t} data-reveal="left">
            <span className="proceso-num"><span>{i + 1}</span></span>
            <strong>{t}</strong>
            <p>{d}</p>
          </li>)}
        </ol>
      </div>
    </section>

    <section className="container inst-referencias">
      <div className="seccion-cabeza">
        <span className="kicker" data-reveal>Referencias públicas</span>
        <h2 data-split>Instituciones que ya alfabetizan en Oaxaca.</h2>
        <p className="seccion-intro" data-reveal>Las citamos como referencia para que conozcas el ecosistema. No representan convenios con Nexo Ñuu.</p>
      </div>
      <div className="referencias">
        {referencias.map((p) => {
          const f = FUENTES[p.fuente];
          return <article key={p.id} className="referencia" data-reveal>
            <span className="programa-sigla">{p.sigla}</span>
            <h3>{p.titulo}</h3>
            <p>{p.texto}</p>
            <a className="fuente" href={p.enlace?.url || f.url} target="_blank" rel="noopener noreferrer">{p.enlace?.texto || f.nombre} <Icon name="arrowUpRight" size={13} /></a>
          </article>;
        })}
      </div>

      <div className="inst-cta" data-reveal>
        <div>
          <strong>Registro institucional</strong>
          <p>Presenta tu institución y consulta el estado de la revisión. Usa datos reales solo si tienes autorización para representarla.</p>
        </div>
        <Link className="btn btn-primary" to={destino}>{user ? 'Solicitar registro institucional' : 'Iniciar sesión para solicitar registro'} <Icon name="arrow" size={17} /></Link>
      </div>
    </section>
  </div>;
}
