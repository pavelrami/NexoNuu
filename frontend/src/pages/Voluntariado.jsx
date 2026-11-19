import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '../components/Icons.jsx';
import { Escena } from '../components/Ilustraciones.jsx';
import { HiloSvg, Sello } from '../components/Adornos.jsx';
import Nuu from '../components/Nuu.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { getEstadisticas } from '../api.js';
import { FUENTES, OTRAS_PUERTAS, BRECHA } from '../data/fuentes.js';
import { useMotion } from '../motion/useMotion.js';

const pasos = [
  { t: 'Crea tu cuenta', d: 'Nombre, correo y una contraseña segura.', to: '/registro', icon: 'user' },
  { t: 'Verifica tu correo', d: 'Te enviamos un enlace de un solo uso.', to: '/registro', icon: 'mail' },
  { t: 'Completa tu perfil', d: 'Habilidades, disponibilidad y lenguas.', to: '/mi-perfil-voluntario', icon: 'language' },
  { t: 'Postúlate', d: 'Elige una jornada; la institución confirma.', to: '/jornadas', icon: 'flag' },
];

export default function Voluntariado() {
  const { user } = useAuth();
  const ref = useRef(null);
  const [stats, setStats] = useState(null);
  useEffect(() => {
    const c = new AbortController();
    getEstadisticas({ signal: c.signal }).then(setStats).catch(() => {});
    return () => c.abort();
  }, []);
  useMotion(ref, null, []);

  const destino = user ? '/mi-perfil-voluntario' : '/registro';
  return <div className="vol-page" ref={ref}>
    <section className="vol-hero container">
      <span className="kicker" data-reveal>Tecnología con propósito comunitario · Voluntariado</span>
      <h1 className="vol-titulo" data-reveal>Súmate al <span className="pastilla">voluntariado</span></h1>
      <p className="page-intro" data-reveal>Nexo Ñuu te permite registrar un perfil de colaboración con tus habilidades, región, disponibilidad y lenguas originarias, incluidas sus variantes cuando corresponda.</p>
    </section>

    <section className="container vol-banda">
      <div className="vol-resumen" data-reveal>
        <Nuu className="vol-nuu" />
        {stats ? <p><strong>{stats.perfiles_voluntariado}</strong> {stats.perfiles_voluntariado === 1 ? 'perfil de voluntariado registrado' : 'perfiles de voluntariado registrados'} en la plataforma</p>
          : <p><strong>Tu perfil, tus reglas.</strong> Tú decides qué compartir.</p>}
        <Link to={destino} className="chip-link">Únete a la red <Icon name="arrow" size={14} /></Link>
      </div>
      <div className="vol-foto" data-rombo>
        <Escena variante="arbol" titulo="Ilustración: círculo de estudio bajo un árbol en una comunidad de Oaxaca" />
        <ul className="vol-chips" aria-label="Ejemplos de lo que puedes indicar">
          <li><Icon name="pin" size={14} /> Oaxaca de Juárez</li>
          <li><Icon name="book" size={14} /> Alfabetización</li>
          <li><Icon name="language" size={14} /> Variantes mixtecas y zapotecas</li>
        </ul>
      </div>
    </section>

    <section className="container vol-principios">
      <article className="principio principio--blanco" data-reveal>
        <div className="principio-cabeza"><Icon name="shield" size={28} /><span className="pildora">01 · Seguro</span></div>
        <h2>Registro responsable</h2>
        <p>El registro es voluntario. Solo se solicitan los datos necesarios y cada persona decide qué información compartir. Tu perfil no se muestra públicamente.</p>
        <span className="etiqueta">Tú decides qué compartir</span>
      </article>
      <article className="principio principio--menta" data-reveal>
        <div className="principio-cabeza"><Icon name="language" size={28} /><span className="pildora">02 · Diversidad</span></div>
        <h2>Experiencia y lenguas</h2>
        <p>Indica conocimientos relevantes, disponibilidad y las lenguas que declaras hablar. Las instituciones valoran su pertinencia para cada actividad; no es una certificación.</p>
        <div className="etiquetas"><span className="etiqueta">Lenguas originarias</span><span className="etiqueta">Disponibilidad flexible</span></div>
      </article>
      <article className="principio principio--punteado" data-reveal>
        <div className="principio-cabeza"><Icon name="handshake" size={28} /><span className="pildora">03 · Consentimiento</span></div>
        <h2>Postulaciones transparentes</h2>
        <p>Las instituciones confirman la participación. El sistema no asigna voluntariado automáticamente ni sin tu consentimiento, y puedes retirar una solicitud pendiente.</p>
        <span className="etiqueta">Sin asignación forzada</span>
      </article>
    </section>

    <section className="vol-camino">
      <div className="container">
        <div className="seccion-cabeza">
          <span className="kicker" data-reveal>Tu camino</span>
          <h2 data-split>De la cuenta a la jornada, en cuatro pasos.</h2>
        </div>
        <div className="camino">
          <HiloSvg className="camino-hilo" viewBox="0 0 1000 40" paths={['M40 20H960']} grosor={14} />
          <ol>{pasos.map((p, i) => <li key={p.t} data-reveal>
            <Link to={p.to} className="camino-paso">
              <span className="camino-num"><Icon name={p.icon} size={22} /></span>
              <small>Paso {i + 1}</small>
              <strong>{p.t}</strong>
              <span>{p.d}</span>
            </Link>
          </li>)}</ol>
        </div>
      </div>
    </section>

    <section className="container vol-puertas">
      <div className="vol-puertas-cabeza">
        <span className="kicker" data-reveal>Otras puertas oficiales</span>
        <h2 data-split>También puedes sumarte a programas públicos.</h2>
        <p data-reveal>Si quieres acompañar círculos de estudio de forma directa, estas instituciones ya tienen mecanismos para hacerlo. Nexo Ñuu no tiene convenio con ellas; te compartimos su información pública.</p>
      </div>
      <ul className="puertas-lista">
        {OTRAS_PUERTAS.map((p) => {
          const f = FUENTES[p.fuente];
          return <li key={p.titulo} data-reveal>
            <h3>{p.titulo}</h3>
            <p>{p.texto}</p>
            <a className="fuente" href={f.url} target="_blank" rel="noopener noreferrer">{f.nombre} <Icon name="arrowUpRight" size={13} /></a>
          </li>;
        })}
      </ul>
    </section>

    <section className="container vol-cierre">
      <ul className="chips-fila" data-reveal>
        <li>ODS 4 — Educación de calidad</li>
        <li>{BRECHA.hablantesPct.toLocaleString('es-MX', { minimumFractionDigits: 1 })} % habla una lengua indígena en Oaxaca · INEGI 2025</li>
        <li>Postulación con consentimiento</li>
      </ul>
      <div className="vol-ctas" data-reveal>
        <Link to={destino} className="btn btn-primary btn-lg">{user ? 'Completar mi perfil' : 'Registrarme como voluntario'} <Icon name="arrow" size={18} /></Link>
        <Link to="/jornadas" className="btn btn-outline btn-lg">Explorar jornadas <Icon name="arrowUpRight" size={18} /></Link>
      </div>
      <Sello className="vol-sello" to="/jornadas" label="Explorar jornadas" />
    </section>
  </div>;
}
