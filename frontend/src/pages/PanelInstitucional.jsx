import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { getRepresentativeInstitutions, getRepresentativeCommunities, getRepresentativeJornadas, createRepresentativeJornada, publishRepresentativeDemo, getRepresentativeApplications, decideRepresentativeApplication } from '../api.js';
import '../panel-institucional.css';
import JornadaGestion from '../components/JornadaGestion.jsx';
import SeguimientoJornada from '../components/SeguimientoJornada.jsx';
import { Icon } from '../components/Icons.jsx';
import { Isotipo } from '../components/Brand.jsx';
import { Topo } from '../components/Adornos.jsx';
import PanelLayout, { entradaPanel } from '../components/panel/PanelLayout.jsx';
import { claveRegion } from '../components/panel/MapaOaxaca.jsx';
import { Kpi, Tarjeta, Chip, EstadoJornada, EstadoPostulacion, Vacio, Mensajes, PanelCabeza, Filtros, Avatar,
  diaCorto, fechaCorta, fechaHora, hora, haceCuanto, plural, porMes, saludo } from '../components/panel/piezas.jsx';
import { useMotion } from '../motion/useMotion.js';
import { scrollToTop, scrollToElement } from '../motion/motion.js';
import { REGIONES } from '../data/fuentes.js';

const empty = { titulo: '', descripcion: '', comunidadId: '', inicio: '', fin: '', cupo: 15, esDemo: false };
const timeToIso = (local) => new Date(local).toISOString();
const DISPONIBILIDAD = { entre_semana: 'Entre semana', fin_semana: 'Fines de semana', variable: 'Variable' };
const VISTAS = { general: 'Panel general', jornadas: 'Jornadas', postulaciones: 'Postulaciones', nueva: 'Nueva jornada', seguimiento: 'Seguimiento' };
const BASE = '/panel-institucional';
const iniciales = (n = '') => n.split(/\s+/).filter((w) => /^[A-ZÁÉÍÓÚÑ]/.test(w)).map((w) => w[0]).join('').slice(0, 3) || 'IN';
const normal = (t = '') => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export default function PanelInstitucional() {
  const [params, setParams] = useSearchParams();
  const vista = VISTAS[params.get('vista')] ? params.get('vista') : 'general';
  const jFoco = params.get('j') || '';
  const buscarQ = params.get('buscar') || '';
  const ir = (v, extra = {}) => {
    const p = new URLSearchParams();
    if (v !== 'general') p.set('vista', v);
    Object.entries(extra).forEach(([k, val]) => { if (val) p.set(k, val); });
    setParams(p);
  };

  const [instituciones, setInstituciones] = useState([]);
  const [modoDemo, setModoDemo] = useState(false);
  const [comunidades, setComunidades] = useState([]);
  const [selected, setSelected] = useState('');
  const [jornadas, setJornadas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingJ, setLoadingJ] = useState(false);
  const [primeraCarga, setPrimeraCarga] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [form, setForm] = useState(empty);
  const [solicitudes, setSolicitudes] = useState({ jornadaId: '', lista: [], cupo: null, puedeDecidir: false });
  const [loadingS, setLoadingS] = useState(false);
  const [recientes, setRecientes] = useState({ cargando: false, lista: [] });
  const [filtroJ, setFiltroJ] = useState('todas');
  const [textoJ, setTextoJ] = useState(buscarQ);
  const conservarMsg = useRef(false);
  const ref = useRef(null);

  useEffect(() => {
    let active = true;
    Promise.all([getRepresentativeInstitutions(), getRepresentativeCommunities()])
      .then(([inst, catalog]) => {
        if (!active) return;
        setInstituciones(inst.instituciones || []);
        setModoDemo(Boolean(inst.modoDemo));
        setComunidades(catalog.comunidades || []);
        setSelected(inst.instituciones?.[0]?.id ? String(inst.instituciones[0].id) : '');
      })
      .catch((e) => active && setError(e.message))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, []);

  // Postulaciones pendientes de todas las jornadas, para "Postulaciones recientes por revisar".
  const cargarRecientes = useCallback(async (lista, inst) => {
    const conPendientes = lista.filter((j) => j.gestionable && Number(j.pendientes) > 0);
    if (!inst || !conPendientes.length) { setRecientes({ cargando: false, lista: [] }); return; }
    setRecientes((x) => ({ ...x, cargando: true }));
    const res = await Promise.allSettled(conPendientes.map((j) => getRepresentativeApplications(inst, j.id).then((d) =>
      (d.postulaciones || []).filter((p) => p.estado === 'pendiente').map((p) => ({ ...p, jornadaId: j.id, jornada: j.titulo, puedeDecidir: Boolean(d.puedeDecidir) })))));
    const todas = res.flatMap((r) => (r.status === 'fulfilled' ? r.value : [])).sort((a, b) => new Date(b.creadaEn) - new Date(a.creadaEn));
    setRecientes({ cargando: false, lista: todas });
  }, []);

  const refresh = useCallback(async (id) => {
    if (!id) return;
    setLoadingJ(true);
    try {
      const data = await getRepresentativeJornadas(id);
      const lista = data.jornadas || [];
      setJornadas(lista); setError('');
      cargarRecientes(lista, id);
    } catch (e) { setError(e.message); }
    finally { setLoadingJ(false); setPrimeraCarga(false); }
  }, [cargarRecientes]);
  useEffect(() => { setJornadas([]); setError(''); refresh(selected); }, [selected, refresh]);

  const loadApplications = useCallback(async (jornadaId) => {
    if (!selected || !jornadaId) return;
    setLoadingS(true);
    try {
      const data = await getRepresentativeApplications(selected, jornadaId);
      setSolicitudes({ jornadaId: String(jornadaId), lista: data.postulaciones || [], cupo: data.cupo, puedeDecidir: Boolean(data.puedeDecidir) });
    } catch (e) { setError(e.message); setSolicitudes({ jornadaId: String(jornadaId), lista: [], cupo: null, puedeDecidir: false }); }
    finally { setLoadingS(false); }
  }, [selected]);

  // Jornada elegida en la vista de postulaciones (la de la dirección o la primera con pendientes).
  const candidatas = jornadas.filter((j) => j.gestionable && (Number(j.total_postulaciones) > 0 || j.estado === 'publicada'));
  const jPost = vista === 'postulaciones'
    ? String((candidatas.find((j) => String(j.id) === jFoco) || candidatas.find((j) => Number(j.pendientes) > 0) || candidatas[0])?.id ?? '')
    : '';
  useEffect(() => { if (jPost) loadApplications(jPost); }, [jPost, loadApplications]);

  useEffect(() => { setTextoJ(buscarQ); }, [buscarQ]);
  useEffect(() => {
    scrollToTop();
    if (conservarMsg.current) { conservarMsg.current = false; return; }
    setError(''); setSuccess('');
  }, [vista]);
  useEffect(() => {
    if (vista !== 'jornadas' || !jFoco) return;
    const el = document.getElementById(`jornada-${jFoco}`);
    if (el) requestAnimationFrame(() => scrollToElement(el, -96));
  }, [vista, jFoco, jornadas.length]);

  const listo = !loading && (instituciones.length === 0 || !primeraCarga);
  useMotion(ref, listo ? entradaPanel : null, [listo, vista]);

  async function decideApplication(jornadaId, id, estado, nombre) {
    const verb = estado === 'aceptada' ? 'aceptar' : 'rechazar';
    if (!window.confirm(`¿Deseas ${verb} la postulación de ${nombre}? Le avisaremos por correo.`)) return;
    setBusy(true); setError(''); setSuccess('');
    try {
      const r = await decideRepresentativeApplication(selected, jornadaId, id, estado);
      setSuccess(r.message);
      if (solicitudes.jornadaId === String(jornadaId)) await loadApplications(jornadaId);
      await refresh(selected);
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }
  const update = (key, value) => setForm((old) => ({ ...old, [key]: value }));
  async function save(e) {
    e.preventDefault(); if (busy || !selected) return;
    setBusy(true); setSuccess(''); setError('');
    try {
      const r = await createRepresentativeJornada(selected, { ...form, cupo: Number(form.cupo), inicio: timeToIso(form.inicio), fin: timeToIso(form.fin), esDemo: modoDemo && form.esDemo });
      setForm(empty); await refresh(selected);
      conservarMsg.current = true; ir('jornadas'); setSuccess(r.message);
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }
  async function publish(id) {
    if (!window.confirm('¿Publicar esta jornada? Aparecerá en la sección Jornadas y recibirá postulaciones.')) return;
    setBusy(true); setSuccess(''); setError('');
    try { const r = await publishRepresentativeDemo(selected, id); setSuccess(r.message); await refresh(selected); }
    catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }

  // ---- Datos derivados ----
  const current = instituciones.find((i) => String(i.id) === selected);
  const cuenta = (estado) => jornadas.filter((j) => j.estado === estado).length;
  const vivas = jornadas.filter((j) => j.estado !== 'cancelada');
  const publicadas = jornadas.filter((j) => j.estado === 'publicada');
  const suma = (lista, k) => lista.reduce((n, j) => n + Number(j[k] || 0), 0);
  const pendientesTotal = suma(jornadas, 'pendientes');
  const aceptadasTotal = suma(jornadas, 'aceptadas');
  const recibidasTotal = suma(jornadas, 'total_postulaciones');
  const cupoPub = suma(publicadas, 'cupo');
  const aceptPub = suma(publicadas, 'aceptadas');
  const pctCupo = cupoPub ? (aceptPub / cupoPub) * 100 : 0;
  const porRegion = {};
  publicadas.forEach((j) => { const k = claveRegion(j.region || ''); if (k) porRegion[k] = (porRegion[k] || 0) + 1; });
  const nRegiones = Object.keys(porRegion).length;
  const ahora = Date.now();
  const enCurso = jornadas.filter((j) => ['publicada', 'cerrada'].includes(j.estado));
  const proximaJ = enCurso.filter((j) => new Date(j.inicio).getTime() > ahora).sort((a, b) => new Date(a.inicio) - new Date(b.inicio))[0];
  const finSpark = jornadas.length ? new Date(Math.max(...jornadas.map((j) => new Date(j.inicio).getTime()))) : new Date();
  const sparkJ = porMes(jornadas.map((j) => j.inicio), 6, finSpark);
  const fechas = enCurso.flatMap((j) => [{ j, tipo: 'Inicia', f: j.inicio }, { j, tipo: 'Termina', f: j.fin }])
    .filter((e) => new Date(e.f).getTime() > ahora).sort((a, b) => new Date(a.f) - new Date(b.f)).slice(0, 4);
  const conSeguimiento = jornadas.filter((j) => j.gestionable && ['publicada', 'cerrada', 'finalizada'].includes(j.estado));
  const q = normal(textoJ.trim());
  const visiblesJ = jornadas.filter((j) => (filtroJ === 'todas' || j.estado === filtroJ)
    && (!q || normal(`${j.titulo} ${j.comunidad} ${j.municipio} ${j.region || ''}`).includes(q)));
  const jSel = candidatas.find((j) => String(j.id) === jPost);

  const nav = [
    { to: BASE, label: 'Panel general', icon: 'grid', activo: vista === 'general' },
    { to: `${BASE}?vista=jornadas`, label: 'Jornadas', icon: 'calendar', activo: vista === 'jornadas', badge: publicadas.length ? `${publicadas.length} ${publicadas.length === 1 ? 'activa' : 'activas'}` : null },
    { to: `${BASE}?vista=postulaciones`, label: 'Postulaciones', icon: 'inbox', activo: vista === 'postulaciones', badge: pendientesTotal ? String(pendientesTotal) : null, badgeSr: `${pendientesTotal} por revisar`, tono: 'alerta' },
    { to: `${BASE}?vista=nueva`, label: 'Nueva jornada', icon: 'plus', activo: vista === 'nueva' },
    { to: `${BASE}?vista=seguimiento`, label: 'Seguimiento', icon: 'follow', activo: vista === 'seguimiento' },
    { to: '/instituciones/solicitar', label: 'Solicitudes institucionales', icon: 'building', activo: false },
    { to: '/jornadas', label: 'Jornadas públicas', icon: 'calendar', externo: true, activo: false },
  ];
  const identidad = current ? <>
    <div className="p-ident">
      <span className="p-ident-logo" aria-hidden="true">{iniciales(current.nombre)}</span>
      <span className="p-ident-txt"><strong>{current.nombre}</strong><small><i className="p-punto" aria-hidden="true" /> Institución verificada</small></span>
    </div>
    {instituciones.length > 1 && <div className="p-ident-select">
      <label htmlFor="institucion-activa">Cambiar institución</label>
      <select id="institucion-activa" value={selected} onChange={(e) => setSelected(e.target.value)}>
        {instituciones.map((i) => <option value={i.id} key={i.id}>{i.nombre}</option>)}
      </select>
    </div>}
  </> : null;
  const mensajes = <Mensajes error={error} exito={success} onCerrar={() => { setError(''); setSuccess(''); }} />;

  // ---- Vistas ----
  function VistaGeneral() {
    const texto = publicadas.length
      ? `Gestión institucional de alfabetización. Coordinas ${plural(publicadas.length, 'jornada publicada', 'jornadas publicadas')} en ${plural(nRegiones, 'región', 'regiones')} con ${plural(aceptadasTotal, 'persona voluntaria aceptada', 'personas voluntarias aceptadas')}.`
      : 'Todavía no tienes jornadas publicadas. Crea una, revísala y publícala para empezar a recibir postulaciones.';
    return <>
      <section className="p-bienvenida" data-panel-card>
        <Topo seed={12} />
        <div>
          <h1>{saludo()}, {current.nombre}</h1>
          <p>{texto}</p>
          <div className="p-chips">
            {REGIONES.filter((r) => porRegion[r.clave]).map((r) => <Chip key={r.clave} tono="blanco" icono="pin">{r.nombre} ({porRegion[r.clave]})</Chip>)}
            {proximaJ && <Chip tono="blanco" icono="calendar">Próxima jornada: {fechaCorta(proximaJ.inicio)} · {proximaJ.comunidad}</Chip>}
          </div>
        </div>
        <span className="p-bienvenida-arte" aria-hidden="true" data-draw><Isotipo /></span>
      </section>

      <section className="p-kpis p-kpis--3" aria-label="Indicadores de la institución">
        <Kpi icono="calendar" etiqueta="Jornadas activas" valor={publicadas.length} unidad={publicadas.length === 1 ? 'jornada' : 'jornadas'}
          sub={`${plural(cuenta('borrador'), 'borrador', 'borradores')} · ${plural(cuenta('cerrada'), 'cerrada', 'cerradas')} · ${plural(cuenta('finalizada'), 'finalizada', 'finalizadas')}`}
          spark={sparkJ} sparkEtiqueta="Jornadas por mes de inicio, últimos seis meses"
          hilo={vivas.length ? (publicadas.length / vivas.length) * 100 : 0} hiloEtiqueta="Jornadas publicadas del total vigente" />
        <Kpi icono="inbox" etiqueta="Postulaciones recibidas" valor={pendientesTotal} unidad={pendientesTotal === 1 ? 'pendiente' : 'pendientes'}
          sub={`${plural(recibidasTotal, 'recibida', 'recibidas')} en total · ${plural(aceptadasTotal, 'aceptada', 'aceptadas')}`}
          pie={<>{pendientesTotal ? <Chip tono="alerta" icono="info">Requieren revisión</Chip> : <Chip tono="ok" icono="check">Todo al día</Chip>}
            <Link className="p-link" to={`${BASE}?vista=postulaciones`}>Ver postulaciones <Icon name="arrow" size={14} /></Link></>} />
        <Kpi icono="follow" etiqueta="Cupo cubierto" valor={Math.round(pctCupo)} unidad="%"
          sub={cupoPub ? `${aceptPub} de ${cupoPub} lugares en jornadas publicadas` : 'Sin jornadas publicadas todavía'}
          hilo={pctCupo} hiloEtiqueta="Cupo cubierto en jornadas publicadas" />
      </section>

      <div className="p-grid">
        <div className="p-col">
          <Tarjeta titulo="Gestión de jornadas y convocatorias vigentes" icono="list"
            accion={<Link className="p-link" to={`${BASE}?vista=jornadas`}>Ver todas <Icon name="arrow" size={14} /></Link>}>
            {loadingJ && !jornadas.length ? <p className="p-cargando" role="status">Consultando jornadas…</p>
              : vivas.length === 0 ? <Vacio icono="calendar" titulo="Aún no hay jornadas">Crea la primera: se guarda como borrador hasta que la publiques.</Vacio>
              : <div className="p-tabla-marco"><table className="p-tabla">
                <thead><tr><th scope="col">Jornada y estado</th><th scope="col">Voluntarios</th><th scope="col">Por revisar</th><th scope="col"><span className="sr-only">Acciones</span></th></tr></thead>
                <tbody>{vivas.slice(0, 6).map((j) => <tr key={j.id}>
                  <td className="p-celda-t"><strong>{j.titulo}</strong><small>{j.comunidad} · {j.region || j.municipio}</small>
                    <span className="p-chips"><EstadoJornada estado={j.estado} inicio={j.inicio} />{j.es_demo && <Chip tono="neutro">Demo</Chip>}</span></td>
                  <td data-label="Voluntarios" className="p-num">{j.aceptadas}/{j.cupo}<small>aceptadas</small></td>
                  <td data-label="Por revisar" className="p-num">{j.pendientes}<small>{Number(j.pendientes) === 1 ? 'pendiente' : 'pendientes'}</small></td>
                  <td className="p-celda-accion"><Link className="p-link" to={`${BASE}?vista=jornadas&j=${j.id}`}>Gestionar <Icon name="arrow" size={14} /></Link></td>
                </tr>)}</tbody>
              </table></div>}
            <Link className="btn btn-primary p-btn-ancho" to={`${BASE}?vista=nueva`}><Icon name="plus" size={18} /> Crear nueva jornada</Link>
          </Tarjeta>
        </div>
        <div className="p-col">
          <Tarjeta titulo="Postulaciones recientes por revisar" icono="users">
            {recientes.cargando ? <p className="p-cargando" role="status">Consultando postulaciones…</p>
              : recientes.lista.length === 0 ? <Vacio icono="check" titulo="Sin postulaciones pendientes">Cuando alguien se postule a tus jornadas, aparecerá aquí.</Vacio>
              : <ul className="p-lista p-lista--apilada">{recientes.lista.slice(0, 4).map((p) => <li key={`${p.jornadaId}-${p.id}`}>
                <Avatar nombre={p.voluntario} size={40} />
                <span className="p-lista-txt"><strong>{p.voluntario}</strong><small>{p.jornada}</small><small>{p.comunidad ? `${p.comunidad} · ` : ''}Se postuló {haceCuanto(p.creadaEn)}</small></span>
                <span className="p-lista-acc">
                  {p.puedeDecidir && <button type="button" className="btn btn-primary btn-sm" disabled={busy} onClick={() => decideApplication(p.jornadaId, p.id, 'aceptada', p.voluntario)}>Aceptar</button>}
                  <Link className="btn btn-outline btn-sm" to={`${BASE}?vista=postulaciones&j=${p.jornadaId}`}>Detalles</Link>
                </span>
              </li>)}</ul>}
            {recientes.lista.length > 4 && <Link className="p-link" to={`${BASE}?vista=postulaciones`}>Ver las {recientes.lista.length} pendientes <Icon name="arrow" size={14} /></Link>}
          </Tarjeta>
          <Tarjeta titulo="Próximas fechas" icono="clock">
            {fechas.length ? <ol className="p-agenda">{fechas.map((e) => <li key={`${e.j.id}-${e.tipo}`}>
              <span className="p-agenda-cuando">{diaCorto(e.f)}<small>{hora(e.f)}</small></span>
              <span className={`p-agenda-nodo${e.tipo === 'Termina' ? ' p-agenda-nodo--aviso' : ''}`} aria-hidden="true" />
              <span className="p-agenda-que"><strong>{e.tipo}: {e.j.titulo}</strong><small>{e.j.comunidad}, {e.j.municipio}</small></span>
            </li>)}</ol> : <Vacio icono="calendar" titulo="Sin fechas próximas">Las fechas de inicio y cierre de tus jornadas publicadas aparecerán aquí.</Vacio>}
          </Tarjeta>
        </div>
      </div>
    </>;
  }

  function VistaJornadas() {
    const opciones = [['todas', 'Todas', jornadas.length], ['publicada', 'Publicadas', cuenta('publicada')], ['borrador', 'Borradores', cuenta('borrador')],
      ['cerrada', 'Cerradas', cuenta('cerrada')], ['finalizada', 'Finalizadas', cuenta('finalizada')], ['cancelada', 'Canceladas', cuenta('cancelada')]]
      .filter(([id, , n]) => id === 'todas' || n > 0);
    return <>
      <PanelCabeza kicker="Coordinar · Jornadas" titulo="Jornadas de tu institución"
        acciones={<Link className="btn btn-primary" to={`${BASE}?vista=nueva`}><Icon name="plus" size={17} /> Nueva jornada</Link>}>
        Publica los borradores, revisa postulaciones y cambia el estado de cada jornada. Cada cambio queda registrado con su motivo.
      </PanelCabeza>
      {mensajes}
      <div className="p-barra">
        <Filtros etiqueta="Filtrar jornadas por estado" valor={filtroJ} onCambio={setFiltroJ} opciones={opciones} />
        <div className="p-buscar p-buscar--local"><Icon name="search" size={18} />
          <label htmlFor="buscar-jornada" className="sr-only">Buscar jornada por título o comunidad</label>
          <input id="buscar-jornada" type="search" value={textoJ} onChange={(e) => setTextoJ(e.target.value)} placeholder="Buscar por título o comunidad…" />
        </div>
      </div>
      {loadingJ && !jornadas.length ? <p className="p-cargando" role="status">Consultando jornadas…</p>
        : visiblesJ.length === 0 ? <Vacio icono="search" titulo={jornadas.length ? 'Ninguna jornada coincide' : 'Todavía no hay jornadas'}>
          {jornadas.length ? 'Prueba con otro estado o con otra búsqueda.' : 'Crea la primera desde “Nueva jornada”.'}</Vacio>
        : <div className="p-jornadas">{visiblesJ.map((j) => <article key={j.id} id={`jornada-${j.id}`} className={`p-jornada${String(j.id) === jFoco ? ' is-foco' : ''}`} data-panel-card>
          <div className="p-jornada-cab">
            <h3>{j.titulo}</h3>
            <span className="p-chips"><EstadoJornada estado={j.estado} inicio={j.inicio} />{j.es_demo && <Chip tono="aviso">Demostración</Chip>}</span>
          </div>
          <p className="p-jornada-meta">
            <span><Icon name="pin" size={15} />{j.comunidad}, {j.municipio}{j.region ? ` · ${j.region}` : ''}</span>
            <span><Icon name="calendar" size={15} />{fechaHora(j.inicio)}</span>
          </p>
          <div className="p-jornada-stats">
            <div className={Number(j.pendientes) ? 'is-alerta' : ''}><strong>{j.pendientes}</strong><small>Pendientes</small></div>
            <div><strong>{j.aceptadas}/{j.cupo}</strong><small>Aceptadas / cupo</small></div>
            <div><strong>{j.total_postulaciones}</strong><small>Postulaciones</small></div>
          </div>
          <div className="p-acciones">
            {j.estado === 'borrador' && j.gestionable && <button className="btn btn-primary btn-sm" type="button" disabled={busy} onClick={() => publish(j.id)}><Icon name="flag" size={15} /> Publicar</button>}
            {j.gestionable && (Number(j.total_postulaciones) > 0 || j.estado === 'publicada') && <Link className="btn btn-outline btn-sm" to={`${BASE}?vista=postulaciones&j=${j.id}`}>
              <Icon name="users" size={15} /> Ver postulaciones ({j.total_postulaciones})</Link>}
            {j.estado === 'publicada' && <Link className="btn btn-outline btn-sm" to={`/jornadas/${j.id}`}>Ver ficha pública</Link>}
          </div>
          {!j.gestionable && <p className="p-nota">Jornada de demostración: se gestiona cuando el servidor tiene activo el modo demo.</p>}
          <JornadaGestion key={`lifecycle-${j.id}-${String(j.id) === jFoco}`} jornada={j} institucionId={selected} comunidades={comunidades}
            abiertoInicial={String(j.id) === jFoco} onUpdated={() => refresh(selected)} onError={setError} onSuccess={setSuccess} />
        </article>)}</div>}
    </>;
  }

  function VistaPostulaciones() {
    return <>
      <PanelCabeza kicker="Coordinar · Postulaciones" titulo="Postulaciones">
        Revisa el perfil que compartió cada persona y decide quién participa. El correo de contacto aparece cuando aceptas la postulación y a la persona le avisamos por correo.
      </PanelCabeza>
      {mensajes}
      {loadingJ && !jornadas.length ? <p className="p-cargando" role="status">Consultando jornadas…</p>
        : candidatas.length === 0 ? <Vacio icono="inbox" titulo="Aún no hay jornadas con postulaciones">Cuando publiques una jornada, las personas podrán postularse y aparecerán aquí.</Vacio>
        : <div className="p-split">
          <div className="p-selector" role="group" aria-label="Elige una jornada">
            {candidatas.map((j) => <button key={j.id} type="button" aria-pressed={String(j.id) === jPost} onClick={() => ir('postulaciones', { j: String(j.id) })}>
              <strong>{j.titulo}</strong><small>{j.comunidad} · {fechaCorta(j.inicio)}</small>
              <span className="p-chips">{Number(j.pendientes) > 0 && <Chip tono="aviso">{plural(Number(j.pendientes), 'pendiente', 'pendientes')}</Chip>}<Chip tono="neutro">{j.aceptadas}/{j.cupo} aceptadas</Chip></span>
            </button>)}
          </div>
          <Tarjeta titulo={jSel ? jSel.titulo : 'Personas que se postularon'} icono="users"
            sub={`Cupo: ${solicitudes.cupo ?? jSel?.cupo ?? '—'}. El correo aparece cuando aceptas.${solicitudes.puedeDecidir ? '' : ' Las decisiones están disponibles mientras la jornada esté publicada y abierta.'}`}>
            {loadingS ? <p className="p-cargando" role="status">Cargando postulaciones…</p>
              : solicitudes.lista.length === 0 ? <Vacio icono="inbox" titulo="Aún no hay postulaciones para esta jornada" />
              : <ul className="panel-inst-app-list">{solicitudes.lista.map((p) => <li key={p.id} className={`postulante postulante--${p.estado}`}>
                <div className="postulante-cabeza">
                  <span className="p-postulante"><Avatar nombre={p.voluntario} size={36} /><strong>{p.voluntario}</strong></span>
                  <EstadoPostulacion estado={p.estado} institucion />
                </div>
                <dl className="postulante-datos">
                  {p.comunidad && <><dt>Comunidad</dt><dd>{p.comunidad}, {p.municipio}</dd></>}
                  <dt>Disponibilidad</dt><dd>{DISPONIBILIDAD[p.disponibilidad] || 'Sin perfil'}</dd>
                  {p.habilidades?.length > 0 && <><dt>Habilidades</dt><dd>{p.habilidades.join(', ')}</dd></>}
                  {p.lenguas?.length > 0 && <><dt>Lenguas</dt><dd>{p.lenguas.map((l) => `${l.lengua}${l.variante ? ` (${l.variante})` : ''} · ${l.nivel}`).join('; ')}</dd></>}
                  {p.correo && <><dt>Contacto</dt><dd><a href={`mailto:${p.correo}`}>{p.correo}</a></dd></>}
                </dl>
                {p.biografia && <p className="postulante-bio">“{p.biografia}”</p>}
                <small>Se postuló {haceCuanto(p.creadaEn)}</small>
                {p.estado === 'pendiente' && solicitudes.puedeDecidir && <div className="panel-inst-app-actions">
                  <button type="button" className="btn btn-primary btn-sm" disabled={busy} onClick={() => decideApplication(jPost, p.id, 'aceptada', p.voluntario)}><Icon name="check" size={15} /> Aceptar</button>
                  <button type="button" className="btn btn-outline btn-sm" disabled={busy} onClick={() => decideApplication(jPost, p.id, 'rechazada', p.voluntario)}>Rechazar</button>
                </div>}
              </li>)}</ul>}
          </Tarjeta>
        </div>}
    </>;
  }

  function VistaNueva() {
    return <>
      <PanelCabeza kicker="Coordinar · Nueva jornada" titulo="Crear una jornada">
        Se guarda como borrador. Revísala y publícala cuando esté lista: entonces aparecerá en Jornadas y recibirá postulaciones.
      </PanelCabeza>
      {mensajes}
      <div className="p-grid">
        <Tarjeta titulo="Datos de la jornada" icono="calendar">
          <form onSubmit={save} className="p-form">
            <label htmlFor="j-titulo">Título *</label>
            <input id="j-titulo" required minLength={8} maxLength={220} value={form.titulo} onChange={(e) => update('titulo', e.target.value)} placeholder="Círculo de lectura en …" />
            <label htmlFor="j-descripcion">Descripción *</label>
            <textarea id="j-descripcion" required minLength={30} maxLength={2000} rows={5} value={form.descripcion} onChange={(e) => update('descripcion', e.target.value)} placeholder="Qué se hará, a quién va dirigida y qué apoyo se busca…" />
            <label htmlFor="j-comunidad">Comunidad *</label>
            <select id="j-comunidad" value={form.comunidadId} required onChange={(e) => update('comunidadId', e.target.value)}>
              <option value="">Selecciona una comunidad</option>
              {comunidades.map((c) => <option value={c.id} key={c.id}>{c.nombre} · {c.municipio} ({c.region || 'Sin región'})</option>)}
            </select>
            <div className="p-form-dos">
              <div><label htmlFor="j-inicio">Inicio *</label><input id="j-inicio" type="datetime-local" required value={form.inicio} onChange={(e) => update('inicio', e.target.value)} /></div>
              <div><label htmlFor="j-fin">Fin *</label><input id="j-fin" type="datetime-local" required value={form.fin} onChange={(e) => update('fin', e.target.value)} /></div>
            </div>
            <label htmlFor="j-cupo">Cupo de personas voluntarias *</label>
            <input id="j-cupo" type="number" min={1} max={500} required value={form.cupo} onChange={(e) => update('cupo', e.target.value)} />
            {modoDemo && <label className="panel-inst-check"><input type="checkbox" checked={form.esDemo} onChange={(e) => update('esDemo', e.target.checked)} /> Es una jornada de demostración (se mostrará con esa etiqueta)</label>}
            <button className="btn btn-primary" type="submit" disabled={busy}>{busy ? 'Guardando…' : 'Guardar borrador'}</button>
          </form>
        </Tarjeta>
        <Tarjeta titulo="Cómo sigue tu jornada" icono="list">
          <ol className="p-pasos">
            <li><strong>Borrador</strong>Solo tu institución la ve y puedes editarla.</li>
            <li><strong>Publicada</strong>Aparece en Jornadas y recibe postulaciones.</li>
            <li><strong>Decides quién participa</strong>Aceptas o rechazas cada postulación; avisamos por correo.</li>
            <li><strong>Cierre y seguimiento</strong>Cierras inscripciones, registras notas de coordinación y la finalizas.</li>
          </ol>
        </Tarjeta>
      </div>
    </>;
  }

  function VistaSeguimiento() {
    return <>
      <PanelCabeza kicker="Coordinar · Seguimiento" titulo="Seguimiento de coordinación">
        Notas operativas por jornada publicada, cerrada o finalizada. No son una lista de asistencia ni prueban resultados educativos.
      </PanelCabeza>
      {mensajes}
      {conSeguimiento.length === 0 ? <Vacio icono="follow" titulo="Aún no hay jornadas para dar seguimiento">Aparecerán aquí cuando publiques una jornada.</Vacio>
        : <div className="p-jornadas">{conSeguimiento.map((j) => <article key={j.id} className="p-jornada" data-panel-card>
          <div className="p-jornada-cab"><h3>{j.titulo}</h3><EstadoJornada estado={j.estado} inicio={j.inicio} /></div>
          <p className="p-jornada-meta">
            <span><Icon name="pin" size={15} />{j.comunidad}, {j.municipio}</span>
            <span><Icon name="users" size={15} />{plural(Number(j.aceptadas), 'persona aceptada', 'personas aceptadas')}</span>
          </p>
          <SeguimientoJornada key={`tracking-${j.id}`} jornada={j} institucionId={selected} onError={setError} onSuccess={setSuccess} />
        </article>)}</div>}
    </>;
  }

  // Se llaman como funciones (no como <Componente/>) para no desmontar formularios ni estados internos en cada cambio.
  const vistaActual = { general: VistaGeneral, jornadas: VistaJornadas, postulaciones: VistaPostulaciones, nueva: VistaNueva, seguimiento: VistaSeguimiento }[vista];

  return <PanelLayout rol="institucion" nav={current ? nav : nav.slice(5)} identidad={identidad}
    titulo={VISTAS[vista]} migas={['Área institucional', current?.nombre || 'Panel institucional']}
    buscar={current ? { placeholder: 'Buscar jornadas por título o comunidad…', onSubmit: (texto) => ir('jornadas', { buscar: texto }) } : undefined}
    avisos={current ? { n: pendientesTotal, to: `${BASE}?vista=postulaciones`, label: pendientesTotal ? `${pendientesTotal} postulaciones por revisar` : 'Sin postulaciones pendientes' } : undefined}>
    <div ref={ref}>
      {loading ? <p className="p-cargando" role="status">Consultando permisos…</p>
        : instituciones.length === 0 ? <>
          <PanelCabeza kicker="Coordinar · Representación institucional" titulo="Panel institucional" />
          {mensajes}
          <Vacio icono="building" titulo="No tienes instituciones autorizadas"
            accion={<Link className="btn btn-outline btn-sm" to="/instituciones/solicitar">Ver mis solicitudes</Link>}>
            Una solicitud en revisión todavía no permite gestionar jornadas. Cuando la administración la verifique y autorice tu representación, aquí podrás publicar jornadas.
          </Vacio>
        </>
        : <>{vista === 'general' && mensajes}{vistaActual()}</>}
    </div>
  </PanelLayout>;
}
