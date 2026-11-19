import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '../components/Icons.jsx';
import { Isotipo } from '../components/Brand.jsx';
import Nuu from '../components/Nuu.jsx';
import { Escena } from '../components/Ilustraciones.jsx';
import { Hilo, HiloSvg, RomboMini, Topo } from '../components/Adornos.jsx';
import JornadaCard from '../components/JornadaCard.jsx';
import { getEstadisticas, getJornadasConFiltros } from '../api.js';
import { BRECHA, FUENTES, PROGRAMAS } from '../data/fuentes.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useMotion, fontsReady } from '../motion/useMotion.js';
import { gsap, M, SplitText, drawPrep, ROMBO_ABIERTO, ROMBO_CERRADO } from '../motion/motion.js';

const nf1 = new Intl.NumberFormat('es-MX', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const nf0 = new Intl.NumberFormat('es-MX');

const modulos = [
  { label: 'Concientizar', icon: 'awareness', copy: 'Hacer visible la brecha de alfabetización en Oaxaca con datos oficiales y su fuente.', estado: 'Disponible', a: '#brecha' },
  { label: 'Informar', icon: 'info', copy: 'Reunir los programas públicos que ya existen para no duplicar esfuerzos.', estado: 'Disponible', a: '#programas' },
  { label: 'Conectar', icon: 'connect', copy: 'Perfiles de voluntariado con habilidades, disponibilidad y lenguas originarias.', estado: 'Disponible', to: '/voluntariado' },
  { label: 'Coordinar', icon: 'calendar', copy: 'Instituciones verificadas publican jornadas y deciden cada postulación.', estado: 'Disponible', to: '/instituciones' },
  { label: 'Dar seguimiento', icon: 'follow', copy: 'Bitácora de coordinación por jornada, sin evaluar aprendizajes individuales.', estado: 'En demostración', to: '/seguimiento' },
];

const ladoInstitucion = [
  ['Solicita su registro', 'Una persona autorizada presenta a la institución. Enviar la solicitud no da permisos.'],
  ['Se verifica', 'La administración revisa la institución y autoriza a sus representantes.'],
  ['Publica jornadas', 'Con comunidad, fecha, cupo, descripción y lenguas requeridas.'],
];
const ladoVoluntariado = [
  ['Crea su cuenta', 'Con correo verificado. Solo se piden los datos necesarios.'],
  ['Completa su perfil', 'Habilidades, disponibilidad y lenguas que habla, con su variante.'],
  ['Se postula', 'Elige una jornada y envía su solicitud. Puede retirarla mientras esté pendiente.'],
];

function Fuente({ id, children }) {
  const f = FUENTES[id];
  return <a className="fuente" href={f.url} target="_blank" rel="noopener noreferrer">
    {children || f.nombre}, {f.fecha} <Icon name="arrowUpRight" size={13} />
  </a>;
}

// La firma: el rombo se teje, sus hilos llegan a los tres actores y la portada queda armada.
function firma({ root, ctx }) {
  const hero = root.querySelector('.hero');
  if (!hero) return undefined;
  const q = (s) => Array.from(hero.querySelectorAll(s));
  const title = hero.querySelector('.hero-title');
  const iso = q('.orbit-core .isotipo path');
  const hilos = q('.orbit-hilos .dr');
  const trazo = q('.hero-trazo path');
  const nodos = q('.orbit-node');
  const cards = q('.hero-card');
  const resto = q('.hero-eyebrow, .hero-lead, .hero-actions, .hero-footnote');
  const extra = q('.hero-stat, .hero-nuu');

  drawPrep([...iso, ...hilos, ...trazo]);
  gsap.set(title, { autoAlpha: 0 });
  gsap.set(nodos, { scale: 0.6, opacity: 0 });
  gsap.set(cards, { clipPath: ROMBO_CERRADO });
  gsap.set(resto, { y: M.dist, opacity: 0 });
  gsap.set(extra, { y: M.dist * 1.2, opacity: 0 });
  gsap.set('.orbit-core', { scale: 0.7, opacity: 0 });

  const tl = gsap.timeline({ paused: true, defaults: { ease: M.ease } })
    .to('.orbit-core', { scale: 1, opacity: 1, duration: 0.7, ease: M.pop }, 0)
    .to(iso, { strokeDashoffset: 0, duration: 0.9, stagger: 0.08 }, 0.1)
    .to(cards, { clipPath: ROMBO_ABIERTO, duration: 1.2, stagger: 0.14, ease: 'power2.out', clearProps: 'clipPath' }, 0.3)
    .to(hilos, { strokeDashoffset: 0, duration: 0.85, stagger: 0.14 }, 0.55)
    .to(nodos, { scale: 1, opacity: 1, duration: 0.6, stagger: 0.13, ease: M.pop }, 0.9)
    .to(resto, { y: 0, opacity: 1, duration: M.dur, stagger: 0.09, clearProps: 'transform,opacity' }, 0.45)
    .to(extra, { y: 0, opacity: 1, duration: M.dur, stagger: 0.1, clearProps: 'transform,opacity' }, 1.15)
    .to(trazo, { strokeDashoffset: 0, duration: 0.8 }, 1.35);

  fontsReady(900).then(() => ctx.add(() => {
    gsap.set(title, { autoAlpha: 1 });
    const split = SplitText.create(title, { type: 'lines', mask: 'lines', linesClass: 'linea' });
    tl.from(split.lines, { yPercent: 128, duration: 1.05, stagger: 0.11, ease: M.ease }, 0.12);
    tl.play(0);
  }));

  // Se salta con un toque o una tecla; y nunca se queda a medias.
  const skip = () => { if (tl.progress() > 0 && tl.progress() < 1) tl.progress(1); };
  window.addEventListener('pointerdown', skip, { once: true });
  window.addEventListener('keydown', skip, { once: true });
  const respaldo = setTimeout(() => { gsap.set(title, { autoAlpha: 1 }); if (tl.progress() < 1) tl.progress(1); }, 4200);
  return () => {
    window.removeEventListener('pointerdown', skip);
    window.removeEventListener('keydown', skip);
    clearTimeout(respaldo);
  };
}

export default function Home() {
  const ref = useRef(null);
  const jRef = useRef(null);
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [proximas, setProximas] = useState({ fase: 'loading', items: [] });

  useEffect(() => {
    const controller = new AbortController();
    getEstadisticas({ signal: controller.signal }).then(setStats).catch(() => {});
    getJornadasConFiltros({ signal: controller.signal })
      .then((data) => setProximas({ fase: 'done', items: data.jornadas.slice(0, 3) }))
      .catch(() => { if (!controller.signal.aborted) setProximas({ fase: 'error', items: [] }); });
    return () => controller.abort();
  }, []);

  useMotion(ref, firma, []);
  useMotion(jRef, null, [proximas.fase]);

  const todasDemo = stats && stats.jornadas_vigentes > 0 && stats.jornadas_vigentes === stats.jornadas_vigentes_demo;

  return <div className="home" ref={ref}>
    {/* ===== INICIO Portada ===== */}
    <section className="hero">
      <div className="container hero-grid">
        <div className="hero-content">
          <span className="eyebrow hero-eyebrow"><span className="eyebrow-dot" /> Tecnología con propósito comunitario</span>
          <div className="hero-title-wrap">
            <h1 className="hero-title">Conectamos esfuerzos para apoyar la alfabetización en <em className="acento">Oaxaca.</em></h1>
            <svg className="hero-trazo" viewBox="0 0 220 18" aria-hidden="true" focusable="false"><path d="M4 12C50 4 120 4 216 10" /></svg>
          </div>
          <p className="hero-lead">Un espacio digital para informar, concientizar y facilitar la vinculación entre instituciones, universidades y personas voluntarias.</p>
          <div className="hero-actions">
            <Link to="/jornadas" className="btn btn-primary btn-lg">Explorar jornadas <Icon name="arrow" size={18} /></Link>
            <Link to="/voluntariado" className="btn btn-outline btn-lg">Conocer el voluntariado</Link>
          </div>
          <p className="hero-footnote">Nexo Ñuu no imparte clases ni sustituye a los programas de alfabetización existentes.</p>
        </div>

        <div className="hero-visual">
          <div className="hero-escenario" role="img" aria-label="Ilustración: Nexo Ñuu conecta a instituciones, voluntariado y comunidades de Oaxaca">
          <div className="hero-card hero-card--a"><Escena variante="arbol" /></div>
          <div className="hero-card hero-card--b"><Escena variante="aula" /></div>
          <div className="hero-card hero-card--c"><Escena variante="sierra" /></div>
          <svg className="orbit-hilos" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true" focusable="false">
            <defs>
              <mask id="orbit-mask" maskUnits="userSpaceOnUse" x="0" y="0" width="100" height="100">
                <path className="dr" d="M50 52C56 40 62 30 70 20" />
                <path className="dr" d="M50 52C40 56 30 58 18 60" />
                <path className="dr" d="M50 52C58 62 64 72 74 80" />
              </mask>
            </defs>
            <g mask="url(#orbit-mask)">
              <path d="M50 52C56 40 62 30 70 20" /><path d="M50 52C40 56 30 58 18 60" /><path d="M50 52C58 62 64 72 74 80" />
            </g>
          </svg>
          <div className="orbit-core"><Isotipo /><span>Nexo <strong>Ñuu</strong></span></div>
          <span className="orbit-node node-inst"><Icon name="building" size={17} />Instituciones</span>
          <span className="orbit-node node-vol"><Icon name="users" size={17} />Voluntariado</span>
          <span className="orbit-node node-com"><Icon name="pin" size={17} />Comunidades</span>
          <Nuu className="hero-nuu" />
          </div>
          <div className="hero-stat">
            <div><strong>{nf1.format(BRECHA.oaxaca2025)} %</strong><span>analfabetismo<br />15 años y más</span></div>
            <div><strong>{nf1.format(BRECHA.hablantesPct)} %</strong><span>habla una<br />lengua indígena</span></div>
            <div><strong>{nf1.format(BRECHA.escolaridadOax2025)}</strong><span>años de escolaridad<br />promedio</span></div>
            <small>Oaxaca · INEGI, Encuesta Intercensal 2025</small>
          </div>
        </div>
      </div>
    </section>
    {/* ===== FIN Portada ===== */}

    {/* ===== INICIO Brecha (Concientizar) ===== */}
    <section className="brecha" id="brecha">
      <Topo className="brecha-topo" seed={11} />
      <div className="container brecha-grid">
        <div className="brecha-texto">
          <span className="kicker kicker--claro" data-reveal>Concientizar · Datos oficiales</span>
          <h2 data-split>En Oaxaca, casi 1 de cada 10 personas de 15 años o más no sabe leer ni escribir.</h2>
          <p data-reveal>La tasa bajó {nf1.format(BRECHA.oaxaca2020 - BRECHA.oaxaca2025)} puntos en cinco años, pero sigue siendo 2.5 veces la nacional. En un estado donde {nf1.format(BRECHA.hablantesPct)} % de la población habla una lengua indígena, alfabetizar también significa hacerlo en mixteco, zapoteco, mixe, mazateco y muchas lenguas más.</p>
        </div>
        <div className="brecha-datos">
          <div className="dato-grande" data-reveal>
            <strong><span data-count={BRECHA.oaxaca2025} data-decimals="1">{nf1.format(BRECHA.oaxaca2025)}</span> %</strong>
            <span>de la población de 15 años y más en Oaxaca no sabe leer ni escribir (2025).</span>
          </div>
          <div className="barras" data-reveal>
            <div className="barra">
              <span className="barra-label">Oaxaca 2020</span>
              <span className="barra-pista"><span className="barra-relleno barra-relleno--tenue" data-grow style={{ width: `${(BRECHA.oaxaca2020 / 12) * 100}%` }} /></span>
              <span className="barra-valor">{nf1.format(BRECHA.oaxaca2020)} %</span>
            </div>
            <div className="barra">
              <span className="barra-label">Oaxaca 2025</span>
              <span className="barra-pista"><span className="barra-relleno" data-grow style={{ width: `${(BRECHA.oaxaca2025 / 12) * 100}%` }} /></span>
              <span className="barra-valor">{nf1.format(BRECHA.oaxaca2025)} %</span>
            </div>
            <div className="barra">
              <span className="barra-label">México 2025</span>
              <span className="barra-pista"><span className="barra-relleno barra-relleno--menta" data-grow style={{ width: `${(BRECHA.nacional2025 / 12) * 100}%` }} /></span>
              <span className="barra-valor">{nf1.format(BRECHA.nacional2025)} %</span>
            </div>
          </div>
          <dl className="mini-datos" data-reveal>
            <div><dt>Escolaridad promedio</dt><dd><span data-count={BRECHA.escolaridadOax2025} data-decimals="1">{nf1.format(BRECHA.escolaridadOax2025)}</span> años <small>(México: {nf1.format(BRECHA.escolaridadNal2025)})</small></dd></div>
            <div><dt>Hablantes de lengua indígena</dt><dd><span data-count={BRECHA.hablantes}>{nf0.format(BRECHA.hablantes)}</span> <small>personas de 3 años y más</small></dd></div>
          </dl>
          <p className="fuentes-linea" data-reveal>Fuentes: <Fuente id="inegiOax">INEGI, resultados de Oaxaca</Fuente> · <Fuente id="inegiNal">INEGI, comunicado 54/26</Fuente></p>
        </div>
      </div>
    </section>
    {/* ===== FIN Brecha ===== */}

    {/* ===== INICIO Cinco funciones ===== */}
    <section className="funciones">
      <div className="container">
        <div className="seccion-cabeza">
          <span className="kicker" data-reveal>El modelo de trabajo</span>
          <h2 data-split>Cinco funciones. Un mismo propósito.</h2>
          <p className="seccion-intro" data-reveal>La plataforma crece por incrementos. Cada función responde a una necesidad concreta de información o de coordinación.</p>
        </div>
        <div className="funciones-riel">
          <HiloSvg className="funciones-hilo" viewBox="0 0 1000 40" paths={['M10 20H990']} grosor={14} />
          <ol className="funciones-lista">
            {modulos.map((m, i) => {
              const Tag = m.to ? Link : 'a';
              const props = m.to ? { to: m.to } : { href: m.a };
              return <li key={m.label} data-reveal>
                <Tag {...props} className="funcion">
                  <span className="funcion-nodo"><RomboMini /><span>{String(i + 1).padStart(2, '0')}</span></span>
                  <span className="funcion-icono"><Icon name={m.icon} /></span>
                  <h3>{m.label}</h3>
                  <p>{m.copy}</p>
                  <span className={`estado${m.estado !== 'Disponible' ? ' estado--demo' : ''}`}>{m.estado}</span>
                </Tag>
              </li>;
            })}
          </ol>
        </div>
      </div>
    </section>
    {/* ===== FIN Cinco funciones ===== */}

    <Hilo className="separador" />

    {/* ===== INICIO El nexo (plataforma de dos lados) ===== */}
    <section className="nexo">
      <div className="container">
        <div className="seccion-cabeza seccion-cabeza--centro">
          <span className="kicker" data-reveal>Conectar · Coordinar</span>
          <h2 data-split>Dos lados, un mismo encuentro: la jornada.</h2>
          <p className="seccion-intro" data-reveal>Nexo Ñuu es una plataforma de vinculación. Las instituciones publican lo que necesitan; las personas voluntarias ofrecen lo que saben. La jornada es donde ambos se encuentran, siempre con consentimiento mutuo.</p>
        </div>
        <div className="nexo-grid">
          <div className="nexo-lado nexo-lado--inst">
            <h3 data-reveal="left"><Icon name="building" size={22} /> Instituciones</h3>
            <ol>{ladoInstitucion.map(([t, d], i) => <li key={t} data-reveal="left"><span className="paso">{i + 1}</span><div><strong>{t}</strong><p>{d}</p></div></li>)}</ol>
          </div>
          <div className="nexo-centro" data-pop>
            <div className="nexo-rombo"><Isotipo /></div>
            <strong>Jornada</strong>
            <p>La institución acepta o rechaza cada solicitud. Nadie es asignado sin su consentimiento.</p>
            <span className="nexo-comunidad"><Icon name="pin" size={16} /> En una comunidad registrada, con su municipio y región</span>
          </div>
          <div className="nexo-lado nexo-lado--vol">
            <h3 data-reveal="right"><Icon name="users" size={22} /> Voluntariado</h3>
            <ol>{ladoVoluntariado.map(([t, d], i) => <li key={t} data-reveal="right"><span className="paso">{i + 1}</span><div><strong>{t}</strong><p>{d}</p></div></li>)}</ol>
          </div>
          <HiloSvg className="nexo-hilos" viewBox="0 0 1000 400" grosor={12} paths={[
            'M300 90C400 90 390 200 460 200', 'M700 90C600 90 610 200 540 200',
            'M300 310C400 310 390 200 460 200', 'M700 310C600 310 610 200 540 200',
          ]} />
        </div>
        {stats && <div className="nexo-vivo" data-reveal>
          <span className="vivo-punto" aria-hidden="true" />
          <p><strong>El nexo hoy</strong> · datos en vivo de esta plataforma{todasDemo ? ' (las jornadas vigentes son de demostración)' : ''}</p>
          <ul>
            <li><strong>{stats.jornadas_vigentes}</strong> {stats.jornadas_vigentes === 1 ? 'jornada vigente' : 'jornadas vigentes'}</li>
            <li><strong>{stats.instituciones_verificadas}</strong> {stats.instituciones_verificadas === 1 ? 'institución verificada' : 'instituciones verificadas'}</li>
            <li><strong>{stats.perfiles_voluntariado}</strong> {stats.perfiles_voluntariado === 1 ? 'perfil de voluntariado' : 'perfiles de voluntariado'}</li>
            <li><strong>{stats.jornadas_finalizadas}</strong> {stats.jornadas_finalizadas === 1 ? 'jornada finalizada' : 'jornadas finalizadas'}</li>
          </ul>
        </div>}
      </div>
    </section>
    {/* ===== FIN El nexo ===== */}

    {/* ===== INICIO Programas (Informar) ===== */}
    <section className="programas" id="programas">
      <div className="container programas-grid">
        <div className="programas-cabeza">
          <span className="kicker" data-reveal>Informar · Lo que ya existe</span>
          <h2 data-split>Programas públicos que ya trabajan por la alfabetización.</h2>
          <p data-reveal>Nexo Ñuu no reemplaza estos esfuerzos: los da a conocer y facilita que más personas se sumen.</p>
          <p className="aviso-convenio" data-reveal><Icon name="shield" size={18} /> Información pública citada como referencia. Nexo Ñuu no tiene convenio con estas instituciones.</p>
        </div>
        <ol className="programas-lista">
          {PROGRAMAS.map((p) => <li key={p.id} className="programa" data-reveal>
            <span className="programa-sigla">{p.sigla}</span>
            <div className="programa-cuerpo">
              <h3>{p.titulo}</h3>
              <p className="programa-quien">{p.quien}</p>
              <p>{p.texto}</p>
              <p className="programa-fuente"><Fuente id={p.fuente} />{p.enlace && <> · <a href={p.enlace.url} target="_blank" rel="noopener noreferrer">{p.enlace.texto} <Icon name="arrowUpRight" size={13} /></a></>}</p>
            </div>
            <div className="programa-dato"><strong>{p.dato.valor}</strong><span>{p.dato.etiqueta}</span></div>
          </li>)}
        </ol>
      </div>
    </section>
    {/* ===== FIN Programas ===== */}

    {/* ===== INICIO Próximas jornadas ===== */}
    <section className="proximas" ref={jRef}>
      <div className="container">
        <div className="seccion-cabeza seccion-cabeza--fila">
          <div>
            <span className="kicker" data-reveal>Jornadas</span>
            <h2 data-split>Próximas oportunidades para participar</h2>
          </div>
          <Link to="/jornadas" className="btn btn-outline" data-reveal>Ver todas las jornadas <Icon name="arrow" size={17} /></Link>
        </div>
        {proximas.fase === 'loading' && <p className="cargando" role="status">Buscando jornadas…</p>}
        {proximas.fase === 'error' && <div className="vacio" data-reveal>
          <Nuu className="vacio-nuu" />
          <div><h3>No pudimos consultar las jornadas</h3><p>Intenta de nuevo en unos minutos o visita la sección de jornadas.</p></div>
        </div>}
        {proximas.fase === 'done' && proximas.items.length === 0 && <div className="vacio" data-reveal>
          <Nuu className="vacio-nuu" />
          <div><h3>Todavía no hay jornadas publicadas</h3><p>Cuando una institución verificada publique una convocatoria, aparecerá aquí.</p></div>
        </div>}
        {proximas.items.length > 0 && <div className="j-grid">{proximas.items.map((j) => <JornadaCard key={j.id} j={j} />)}</div>}
      </div>
    </section>
    {/* ===== FIN Próximas jornadas ===== */}

    {/* ===== INICIO Súmate ===== */}
    <section className="sumate">
      <div className="container">
        <div className="sumate-panel">
          <div className="sumate-paisaje" aria-hidden="true">
            <svg viewBox="0 0 1200 360" preserveAspectRatio="xMidYMax slice" focusable="false">
              <path data-speed="-0.25" fill="#127160" d="M0 190C120 120 210 116 300 150S470 70 590 80 760 170 860 150 1050 70 1200 100V360H0Z" />
              <path data-speed="-0.12" fill="#0d5c4e" d="M0 250C140 200 250 210 360 232S560 180 700 190 960 246 1200 220V360H0Z" />
              <path fill="#0a3b33" d="M0 300C160 270 330 280 480 292S800 266 1200 284V360H0Z" />
            </svg>
          </div>
          <Topo className="sumate-topo" seed={5} centros={[[0.8, 0.3, 7]]} />
          <div className="sumate-texto">
            <span className="kicker kicker--claro" data-reveal>Súmate al nexo</span>
            <h2 data-split>¿Desde qué lado quieres participar?</h2>
          </div>
          <div className="sumate-puertas">
            <Link to={user ? '/mi-perfil-voluntario' : '/registro'} className="puerta" data-reveal>
              <Icon name="users" size={26} />
              <span><strong>Quiero ser voluntaria o voluntario</strong><small>{user ? 'Completa tu perfil de voluntariado' : 'Crea tu cuenta y completa tu perfil'}</small></span>
              <Icon name="arrow" size={20} />
            </Link>
            <Link to="/instituciones" className="puerta" data-reveal>
              <Icon name="building" size={26} />
              <span><strong>Represento a una institución</strong><small>Conoce el proceso de verificación</small></span>
              <Icon name="arrow" size={20} />
            </Link>
          </div>
          <Nuu className="sumate-nuu" />
        </div>
      </div>
    </section>
    {/* ===== FIN Súmate ===== */}
  </div>;
}
