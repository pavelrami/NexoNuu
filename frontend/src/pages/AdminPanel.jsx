import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import {
  getAdminResumen, getAdminInstitutions, decideInstitution, decideRepresentative, revokeInstitution,
  getAdminUsuarios, setAdminUsuarioEstado, setAdminUsuarioAdmin, getAdminJornadas, cancelAdminJornada, getProveedores,
} from '../api.js';
import { Icon } from '../components/Icons.jsx';
import AccionConMotivo from '../components/AccionConMotivo.jsx';
import PanelLayout, { entradaPanel } from '../components/panel/PanelLayout.jsx';
import MapaOaxaca, { claveRegion, RegionChips } from '../components/panel/MapaOaxaca.jsx';
import { Kpi, Tarjeta, Chip, EstadoJornada, Vacio, Mensajes, PanelCabeza, Filtros, Avatar,
  fechaCorta, fechaMedia, hora, haceCuanto, plural, porMes, acumulado, acumuladoDesde, primerNombre } from '../components/panel/piezas.jsx';
import { useMotion } from '../motion/useMotion.js';
import { scrollToTop } from '../motion/motion.js';
import '../admin-instituciones.css';

const ESTADOS = {
  pendiente: ['En revisión', 'aviso'], verificada: ['Verificada', 'ok'], rechazada: ['Rechazada', 'alerta'], activo: ['Activo', 'ok'],
  revocado: ['Revocado', 'alerta'], bloqueado: ['Bloqueado', 'alerta'],
};
const ROLES = { voluntario: ['Voluntariado', 'menta'], representante: ['Institución', 'aviso'], administrador: ['Administración', 'oscuro'] };
function Estado({ value }) { const [t, tono] = ESTADOS[value] || [value, 'neutro']; return <Chip tono={tono}>{t}</Chip>; }
const VISTAS = { resumen: 'Resumen global', solicitudes: 'Solicitudes', instituciones: 'Instituciones', usuarios: 'Usuarios', jornadas: 'Jornadas' };
const normal = (t = '') => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export default function AdminPanel({ inicial = 'resumen' }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const pedida = params.get('vista');
  const vista = VISTAS[pedida] ? pedida : (VISTAS[inicial] ? inicial : 'resumen');
  const buscarQ = params.get('buscar') || '';
  const ir = (v, extra = {}) => {
    const p = new URLSearchParams();
    if (v !== 'resumen') p.set('vista', v);
    Object.entries(extra).forEach(([k, val]) => { if (val) p.set(k, val); });
    navigate(`/admin${p.toString() ? `?${p}` : ''}`);
  };

  const [resumen, setResumen] = useState(null);
  const [instituciones, setInstituciones] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [jornadas, setJornadas] = useState([]);
  const [buscar, setBuscar] = useState(buscarQ);
  const [filtroU, setFiltroU] = useState('todos');
  const [filtroI, setFiltroI] = useState('todas');
  const [filtroJ, setFiltroJ] = useState('todas');
  const [region, setRegion] = useState('');
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [exito, setExito] = useState('');
  const [salud, setSalud] = useState({ cargando: true, api: '', db: '', ms: null, cuando: null });
  const [prov, setProv] = useState(null);
  const ref = useRef(null);

  const cargar = useCallback(async () => {
    const [r, i, u, j] = await Promise.all([getAdminResumen(), getAdminInstitutions(), getAdminUsuarios(), getAdminJornadas()]);
    setResumen(r.resumen); setInstituciones(i.instituciones || []); setUsuarios(u.usuarios || []); setJornadas(j.jornadas || []);
  }, []);
  // Estado real del servidor: la API responde y consulta PostgreSQL (/api/health). Se mide el tiempo de respuesta.
  const comprobar = useCallback(async () => {
    setSalud((x) => ({ ...x, cargando: true }));
    const t0 = performance.now();
    try {
      const r = await fetch('/api/health', { cache: 'no-store' });
      const d = await r.json();
      setSalud({ cargando: false, api: d.api, db: d.database, ms: Math.round(performance.now() - t0), cuando: new Date() });
    } catch { setSalud({ cargando: false, api: 'no_disponible', db: 'desconocida', ms: null, cuando: new Date() }); }
  }, []);
  useEffect(() => {
    let activo = true;
    cargar().catch((e) => activo && setError(e.message)).finally(() => activo && setCargando(false));
    comprobar();
    getProveedores().then((p) => activo && setProv(p)).catch(() => {});
    return () => { activo = false; };
  }, [cargar, comprobar]);
  useEffect(() => { setBuscar(buscarQ); }, [buscarQ]);
  useEffect(() => { scrollToTop(); }, [vista]);
  useMotion(ref, cargando ? null : entradaPanel, [cargando, vista]);

  // Ejecuta una acción, muestra el resultado y recarga los datos.
  const hacer = async (fn) => {
    setError(''); setExito('');
    try { const r = await fn(); setExito(r.message || 'Listo.'); await cargar(); return true; }
    catch (e) { setError(e.message); return false; }
  };

  // ---- Datos derivados ----
  const pendientesInst = instituciones.filter((i) => i.estado_verificacion === 'pendiente');
  const pendientesRep = instituciones.flatMap((i) => (i.estado_verificacion === 'verificada' ? (i.solicitantes || []).filter((p) => p.estadoVinculo === 'pendiente').map((p) => ({ ...p, inst: i })) : []));
  const nSolicitudes = pendientesInst.length + pendientesRep.length;
  const usuariosFiltrados = useMemo(() => {
    const q = normal(buscar.trim());
    return usuarios.filter((u) => (!q || normal(`${u.nombre} ${u.correo}`).includes(q))
      && (filtroU === 'todos' || (filtroU === 'bloqueado' ? u.estado === 'bloqueado' : u.roles.includes(filtroU))));
  }, [usuarios, buscar, filtroU]);
  const publicadas = jornadas.filter((j) => j.estado === 'publicada');
  const cupo = publicadas.reduce((n, j) => n + Number(j.cupo || 0), 0);
  const acept = publicadas.reduce((n, j) => n + Number(j.aceptadas || 0), 0);
  const pctCupo = cupo ? (acept / cupo) * 100 : 0;
  const vivas = jornadas.filter((j) => !['cancelada', 'finalizada'].includes(j.estado));
  const conteoRegion = {};
  vivas.forEach((j) => { const k = claveRegion(j.region || ''); if (k) conteoRegion[k] = (conteoRegion[k] || 0) + 1; });
  const tonoPin = { publicada: 'verde', borrador: 'ocre' };
  const pines = vivas.map((j) => ({ id: j.id, clave: claveRegion(j.region || ''), tono: tonoPin[j.estado] || 'gris' }));
  const tablaJ = (region ? vivas.filter((j) => claveRegion(j.region || '') === region) : vivas).slice(0, 5);
  const finSpark = jornadas.length ? new Date(Math.max(...jornadas.map((j) => new Date(j.inicio).getTime()))) : new Date();
  const ultimos = usuarios.slice(0, 5);
  const dbOk = salud.db === 'conectada';
  const apiOk = salud.api === 'conectada';
  const contarI = (e) => instituciones.filter((i) => i.estado_verificacion === e).length;
  const institucionesVis = filtroI === 'todas' ? instituciones : instituciones.filter((i) => i.estado_verificacion === filtroI);
  const contarJ = (e) => jornadas.filter((j) => j.estado === e).length;
  const jornadasVis = jornadas.filter((j) => (filtroJ === 'todas' || j.estado === filtroJ) && (!region || claveRegion(j.region || '') === region));

  const nav = [
    { to: '/admin', label: 'Resumen global', icon: 'grid', activo: vista === 'resumen' },
    { to: '/admin?vista=solicitudes', label: 'Solicitudes', icon: 'flag', activo: vista === 'solicitudes', badge: nSolicitudes ? String(nSolicitudes) : null, badgeSr: `${nSolicitudes} pendientes`, tono: 'alerta' },
    { to: '/admin?vista=instituciones', label: 'Instituciones', icon: 'building', activo: vista === 'instituciones', badge: resumen ? String(resumen.instituciones_verificadas) : null, badgeSr: resumen ? plural(resumen.instituciones_verificadas, 'verificada', 'verificadas') : '' },
    { to: '/admin?vista=usuarios', label: 'Usuarios', icon: 'users', activo: vista === 'usuarios', badge: resumen ? String(resumen.usuarios) : null, badgeSr: resumen ? plural(resumen.usuarios, 'cuenta', 'cuentas') : '' },
    { to: '/admin?vista=jornadas', label: 'Jornadas', icon: 'calendar', activo: vista === 'jornadas', badge: resumen ? `${resumen.jornadas_publicadas} publicadas` : null },
    { to: '/jornadas', label: 'Jornadas públicas', icon: 'globe', externo: true, activo: false },
  ];
  const identidad = <div className="p-ident">
    <span className="p-ident-logo p-ident-logo--admin" aria-hidden="true"><Icon name="shield" size={20} /></span>
    <span className="p-ident-txt"><strong>Administración general</strong><small><i className="p-punto" aria-hidden="true" /> Permisos de administración</small></span>
  </div>;
  const estadoServidor = salud.cargando && !salud.cuando ? null
    : <span className={`p-estado${apiOk && dbOk ? '' : ' p-estado--alerta'}`}><i className={`p-semaforo${apiOk && dbOk ? '' : ' p-semaforo--alerta'}`} aria-hidden="true" />
      {apiOk && dbOk ? 'API y PostgreSQL conectados' : 'Revisa el servidor'}</span>;
  const mensajes = <Mensajes error={error} exito={exito} onCerrar={() => { setError(''); setExito(''); }} />;

  // ---- Vistas (se llaman como funciones para no desmontar formularios abiertos) ----
  function vistaResumen() {
    return <>
      <section className="p-kpis" aria-label="Indicadores generales">
        <Kpi icono="building" etiqueta="Instituciones" valor={resumen.instituciones_verificadas} unidad={resumen.instituciones_verificadas === 1 ? 'verificada' : 'verificadas'}
          sub={`${plural(resumen.instituciones_pendientes, 'en proceso de validación', 'en proceso de validación')}`}
          spark={acumulado(instituciones.map((i) => i.creado_en))} sparkEtiqueta="Instituciones registradas, acumulado de seis meses" />
        <Kpi icono="users" etiqueta="Usuarios registrados" valor={resumen.usuarios}
          sub={`${resumen.voluntarios} voluntariado · ${plural(resumen.representantes, 'representante', 'representantes')}`}
          spark={acumuladoDesde(resumen.usuarios, usuarios.map((u) => u.creado_en))} sparkEtiqueta="Usuarios registrados, acumulado de seis meses" />
        <Kpi icono="calendar" etiqueta="Jornadas en Oaxaca" valor={resumen.jornadas_publicadas} unidad={resumen.jornadas_publicadas === 1 ? 'publicada' : 'publicadas'}
          sub={`${plural(resumen.jornadas_borrador, 'borrador', 'borradores')} · ${jornadas.length} en total`}
          spark={porMes(jornadas.map((j) => j.inicio), 6, finSpark)} sparkEtiqueta="Jornadas por mes de inicio, últimos seis meses" />
        <Kpi icono="follow" etiqueta="Cupo cubierto" valor={Math.round(pctCupo)} unidad="%" anillo={pctCupo}
          sub={cupo ? `${acept} de ${cupo} lugares en jornadas publicadas` : 'Sin jornadas publicadas'} />
      </section>

      <div className="p-grid">
        <div className="p-col">
          <Tarjeta titulo="Distribución y estado de jornadas por región (Oaxaca)" icono="map">
            <RegionChips conteo={conteoRegion} activa={region} onElegir={setRegion} />
            <div style={{ height: 14 }} />
            <MapaOaxaca conteo={conteoRegion} pines={pines} activa={region} onElegir={setRegion} etiqueta="Jornadas vigentes por región de Oaxaca" />
            <div className="p-mapa-leyenda">
              <span><i /> Publicada</span><span><i className="ocre" /> Borrador</span><span><i className="gris" /> Inscripciones cerradas</span>
              <span>Esquema por regiones, no a escala.</span>
            </div>
            <h3>{region ? 'Jornadas de la región' : 'Jornadas vigentes'}</h3>
            {tablaJ.length === 0 ? <Vacio icono="calendar" titulo="Sin jornadas vigentes">{region ? 'Esta región no tiene jornadas vigentes.' : 'Aún no hay jornadas registradas.'}</Vacio>
              : <div className="p-tabla-marco"><table className="p-tabla">
                <thead><tr><th scope="col">Jornada y estado</th><th scope="col">Fecha</th><th scope="col">Por revisar</th><th scope="col">Voluntarios</th></tr></thead>
                <tbody>{tablaJ.map((j) => <tr key={j.id}>
                  <td className="p-celda-t"><strong>{j.titulo}</strong><small>{j.institucion} · {j.region || j.municipio}</small>
                    <span className="p-chips"><EstadoJornada estado={j.estado} inicio={j.inicio} />{j.es_demo && <Chip tono="neutro">Demo</Chip>}</span></td>
                  <td data-label="Fecha" className="p-num">{fechaCorta(j.inicio)}<small>{hora(j.inicio)}</small></td>
                  <td data-label="Por revisar" className="p-num">{j.pendientes}<small>{Number(j.pendientes) === 1 ? 'pendiente' : 'pendientes'}</small></td>
                  <td data-label="Voluntarios" className="p-num">{j.aceptadas}/{j.cupo}<small>aceptadas</small></td>
                </tr>)}</tbody>
              </table></div>}
            <Link className="p-link" to="/admin?vista=jornadas">Ver todas las jornadas ({jornadas.length}) <Icon name="arrow" size={14} /></Link>
          </Tarjeta>
        </div>

        <div className="p-col">
          <Tarjeta titulo="Validaciones pendientes" icono="shield" sub="Instituciones y representantes que esperan revisión.">
            {nSolicitudes === 0 ? <Vacio icono="check" titulo="Todo al día">No hay instituciones ni representantes por revisar.</Vacio>
              : <ul className="p-lista">
                {pendientesInst.slice(0, 4).map((i) => <li key={`i-${i.id}`}>
                  <span className="p-icono-t"><Icon name="building" size={18} /></span>
                  <span className="p-lista-txt"><strong>{i.nombre}</strong><small>Solicitud de registro institucional · {haceCuanto(i.creado_en)}</small></span>
                  <span className="p-lista-acc"><Link className="btn btn-outline btn-sm" to="/admin?vista=solicitudes">Revisar</Link></span>
                </li>)}
                {pendientesRep.slice(0, 3).map((p) => <li key={`r-${p.inst.id}-${p.id}`}>
                  <span className="p-icono-t p-icono-t--ocre"><Icon name="users" size={18} /></span>
                  <span className="p-lista-txt"><strong>{p.nombre}</strong><small>Quiere representar a {p.inst.nombre}</small></span>
                  <span className="p-lista-acc"><Link className="btn btn-outline btn-sm" to="/admin?vista=solicitudes">Revisar</Link></span>
                </li>)}
              </ul>}
          </Tarjeta>

          <Tarjeta titulo="Estado de la plataforma" icono="activity"
            accion={<button type="button" className="p-link" onClick={comprobar} disabled={salud.cargando}><Icon name="refresh" size={15} /> {salud.cargando ? 'Comprobando…' : 'Volver a comprobar'}</button>}>
            <ul className="p-lista">
              <li><span className="p-icono-t"><Icon name="database" size={18} /></span><span className="p-lista-txt"><strong>Base de datos</strong><small>PostgreSQL</small></span>
                <span className="p-estado-val">{dbOk ? 'Conectada' : salud.db === 'sin_configurar' ? 'Sin configurar' : 'Sin conexión'}</span><i className={`p-semaforo${dbOk ? '' : ' p-semaforo--alerta'}`} aria-hidden="true" /></li>
              <li><span className="p-icono-t"><Icon name="activity" size={18} /></span><span className="p-lista-txt"><strong>API de Nexo Ñuu</strong><small>{salud.ms != null ? `Respondió en ${salud.ms} ms` : 'Sin respuesta'}</small></span>
                <span className="p-estado-val">{apiOk ? 'Activa' : 'No disponible'}</span><i className={`p-semaforo${apiOk ? '' : ' p-semaforo--alerta'}`} aria-hidden="true" /></li>
              <li><span className="p-icono-t"><Icon name="mail" size={18} /></span><span className="p-lista-txt"><strong>Correo</strong><small>Verificación y avisos</small></span>
                <span className="p-estado-val">{!prov ? '—' : prov.correo === 'bandeja' ? 'Llega a la bandeja' : 'Solo en la terminal'}</span><i className={`p-semaforo${prov?.correo === 'bandeja' ? '' : ' p-semaforo--aviso'}`} aria-hidden="true" /></li>
              <li><span className="p-icono-t"><Icon name="globe" size={18} /></span><span className="p-lista-txt"><strong>Acceso con Google</strong><small>Inicio de sesión</small></span>
                <span className="p-estado-val">{!prov ? '—' : prov.google ? 'Activo' : 'Sin configurar'}</span><i className={`p-semaforo${prov?.google ? '' : ' p-semaforo--aviso'}`} aria-hidden="true" /></li>
            </ul>
            {salud.cuando && <p className="p-nota">Comprobado a las {salud.cuando.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}.</p>}
          </Tarjeta>
        </div>
      </div>

      <h2 className="p-seccion-t">Actividad y cuentas</h2>
      <div className="p-tres">
        <Tarjeta titulo="Últimos usuarios registrados" icono="users" accion={<Link className="p-link" to="/admin?vista=usuarios">Ver todos <Icon name="arrow" size={14} /></Link>}>
          <div className="p-avatares" aria-hidden="true">{ultimos.map((u) => <Avatar key={u.id} nombre={u.nombre} size={34} />)}</div>
          <ul className="p-lista">{ultimos.slice(0, 4).map((u) => <li key={u.id}>
            <span className="p-lista-txt"><strong>{u.nombre}</strong><small>Alta {fechaMedia(u.creado_en)}</small></span>
            <span className="p-chips">{u.roles.slice(0, 2).map((r) => <Chip key={r} tono={ROLES[r]?.[1] || 'neutro'}>{ROLES[r]?.[0] || r}</Chip>)}</span>
          </li>)}</ul>
        </Tarjeta>
        <Tarjeta titulo="Postulaciones" icono="inbox">
          <div className="p-mini">
            <div className={resumen.postulaciones_pendientes ? 'is-alerta' : ''}><strong data-count={resumen.postulaciones_pendientes}>{resumen.postulaciones_pendientes}</strong><span>Pendientes de decisión</span></div>
            <div><strong data-count={resumen.postulaciones_aceptadas}>{resumen.postulaciones_aceptadas}</strong><span>Aceptadas</span></div>
            <div><strong>{resumen.jornadas_borrador}</strong><span>Jornadas en borrador</span></div>
            <div><strong>{resumen.administradores}</strong><span>Cuentas administradoras</span></div>
          </div>
          <p className="p-nota">Las decisiones las toma cada institución; la administración solo modera.</p>
        </Tarjeta>
        <Tarjeta titulo="Cuentas que requieren atención" icono="info" accion={<Link className="p-link" to="/admin?vista=usuarios">Revisar <Icon name="arrow" size={14} /></Link>}>
          <div className="p-mini">
            <div className={resumen.sin_verificar ? 'is-alerta' : ''}><strong>{resumen.sin_verificar}</strong><span>Sin verificar su correo</span></div>
            <div className={resumen.bloqueados ? 'is-alerta' : ''}><strong>{resumen.bloqueados}</strong><span>Bloqueadas</span></div>
          </div>
          <p className="p-nota">{resumen.sin_verificar || resumen.bloqueados ? 'Revisa estas cuentas en Usuarios.' : 'No hay cuentas con incidencias.'}</p>
        </Tarjeta>
      </div>
    </>;
  }

  function vistaSolicitudes() {
    return <>
      <PanelCabeza kicker="Administración · Solicitudes" titulo="Solicitudes por revisar">
        Revisa la evidencia de cada institución y autoriza a sus representantes. Cada decisión pide un motivo y queda registrada.
      </PanelCabeza>
      {mensajes}
      <div className="p-col">
        <Tarjeta titulo="Instituciones por verificar" icono="building" sub={plural(pendientesInst.length, 'solicitud pendiente', 'solicitudes pendientes')}>
          {pendientesInst.length === 0 ? <Vacio icono="check" titulo="No hay instituciones pendientes" />
            : pendientesInst.map((inst) => <article className="p-item" key={inst.id}>
              <div className="p-item-cab"><h3>{inst.nombre}</h3><Estado value={inst.estado_verificacion} /></div>
              <p><strong>Tipo:</strong> {inst.tipo || 'No indicado'} · Solicitada el {fechaMedia(inst.creado_en)}</p>
              <p>{inst.descripcion || 'Sin descripción'}</p>
              {inst.sitio_web && <p><a className="fuente" href={inst.sitio_web} target="_blank" rel="noopener noreferrer">Sitio web declarado (no verificado) <Icon name="arrowUpRight" size={13} /></a></p>}
              <p className="p-nota">Solicitante: {(inst.solicitantes || []).map((p) => `${p.nombre} (${p.correo})`).join(', ') || 'sin persona vinculada'}</p>
              <div className="p-acciones">
                <AccionConMotivo etiqueta="Aprobar institución" variante="primary" confirmar="Aprobar" ayuda="Evidencia revisada (mínimo 10 caracteres)" onConfirm={(m) => hacer(() => decideInstitution(inst.id, 'aprobar', m))} />
                <AccionConMotivo etiqueta="Rechazar" confirmar="Rechazar" peligro onConfirm={(m) => hacer(() => decideInstitution(inst.id, 'rechazar', m))} />
              </div>
            </article>)}
        </Tarjeta>
        <Tarjeta titulo="Representantes por autorizar" icono="users" sub={plural(pendientesRep.length, 'persona en espera', 'personas en espera')}>
          {pendientesRep.length === 0 ? <Vacio icono="check" titulo="No hay representantes pendientes" />
            : pendientesRep.map((p) => <article className="p-item" key={`${p.inst.id}-${p.id}`}>
              <div className="p-item-cab"><span className="p-postulante"><Avatar nombre={p.nombre} size={36} /><h3>{p.nombre}</h3></span><Estado value="pendiente" /></div>
              <p>{p.correo} · quiere representar a <strong>{p.inst.nombre}</strong></p>
              <div className="p-acciones">
                <AccionConMotivo etiqueta="Autorizar representante" variante="primary" confirmar="Autorizar" disabled={String(p.id) === String(user.id)} onConfirm={(m) => hacer(() => decideRepresentative(p.inst.id, p.id, 'autorizar', m))} />
              </div>
            </article>)}
        </Tarjeta>
      </div>
    </>;
  }

  function vistaInstituciones() {
    return <>
      <PanelCabeza kicker="Administración · Instituciones" titulo="Instituciones">
        Verifica instituciones, autoriza o revoca a sus representantes y retira la verificación cuando haga falta.
      </PanelCabeza>
      {mensajes}
      <Tarjeta titulo="Registro de instituciones" icono="building"
        accion={<Filtros etiqueta="Filtrar instituciones" valor={filtroI} onCambio={setFiltroI} opciones={[
          ['todas', 'Todas', instituciones.length], ['verificada', 'Verificadas', contarI('verificada')],
          ['pendiente', 'En revisión', contarI('pendiente')], ['rechazada', 'Rechazadas', contarI('rechazada')],
        ].filter(([id, , n]) => id === 'todas' || n > 0)} />}>
        {institucionesVis.length === 0 ? <Vacio icono="building" titulo="No hay instituciones en este filtro" />
          : institucionesVis.map((inst) => <article className="p-item" key={inst.id}>
            <div className="p-item-cab"><h3>{inst.nombre}</h3><Estado value={inst.estado_verificacion} /></div>
            <p>{inst.tipo || 'Tipo no indicado'} · registrada el {fechaMedia(inst.creado_en)}</p>
            {(inst.solicitantes || []).length > 0 && <ul className="p-lista p-lista--sub">{inst.solicitantes.map((p) => <li key={p.id}>
              <Avatar nombre={p.nombre} size={32} />
              <span className="p-lista-txt"><strong>{p.nombre}</strong><small>{p.correo}</small></span>
              <Estado value={p.estadoVinculo} />
              {inst.estado_verificacion === 'verificada' && p.estadoVinculo === 'pendiente' && <AccionConMotivo etiqueta="Autorizar" variante="primary" disabled={String(p.id) === String(user.id)} onConfirm={(m) => hacer(() => decideRepresentative(inst.id, p.id, 'autorizar', m))} />}
              {p.estadoVinculo === 'activo' && <AccionConMotivo etiqueta="Revocar" peligro disabled={String(p.id) === String(user.id)} onConfirm={(m) => hacer(() => decideRepresentative(inst.id, p.id, 'revocar', m))} />}
            </li>)}</ul>}
            <div className="p-acciones">
              {inst.estado_verificacion === 'pendiente' && <>
                <AccionConMotivo etiqueta="Aprobar" variante="primary" onConfirm={(m) => hacer(() => decideInstitution(inst.id, 'aprobar', m))} />
                <AccionConMotivo etiqueta="Rechazar" peligro onConfirm={(m) => hacer(() => decideInstitution(inst.id, 'rechazar', m))} />
              </>}
              {inst.estado_verificacion === 'verificada' && <AccionConMotivo etiqueta="Retirar verificación" confirmar="Retirar verificación" peligro
                ayuda="Motivo: sus jornadas dejarán de mostrarse y sus representantes perderán el acceso" onConfirm={(m) => hacer(() => revokeInstitution(inst.id, m))} />}
            </div>
          </article>)}
      </Tarjeta>
    </>;
  }

  function vistaUsuarios() {
    const n = (r) => usuarios.filter((u) => u.roles.includes(r)).length;
    return <>
      <PanelCabeza kicker="Administración · Usuarios" titulo="Usuarios y voluntariado">
        Bloquea o reactiva cuentas y da o quita permisos de administración. Nadie puede bloquearse ni quitarse permisos a sí mismo.
      </PanelCabeza>
      {mensajes}
      <div className="p-barra">
        <Filtros etiqueta="Filtrar usuarios" valor={filtroU} onCambio={setFiltroU} opciones={[
          ['todos', 'Todos', usuarios.length], ['voluntario', 'Voluntariado', n('voluntario')], ['representante', 'Institución', n('representante')],
          ['administrador', 'Administración', n('administrador')], ['bloqueado', 'Bloqueados', usuarios.filter((u) => u.estado === 'bloqueado').length],
        ]} />
        <div className="p-buscar p-buscar--local"><Icon name="search" size={18} />
          <label htmlFor="buscar-usuario" className="sr-only">Buscar por nombre o correo</label>
          <input id="buscar-usuario" type="search" value={buscar} onChange={(e) => setBuscar(e.target.value)} placeholder="Buscar por nombre o correo…" />
        </div>
      </div>
      <Tarjeta titulo={plural(usuariosFiltrados.length, 'cuenta', 'cuentas')} icono="users" sub={usuarios.length >= 200 ? 'Se muestran las 200 cuentas más recientes; usa la búsqueda para encontrar otras.' : undefined}>
        {usuariosFiltrados.length === 0 ? <Vacio icono="search" titulo="Ningún usuario coincide con la búsqueda" />
          : usuariosFiltrados.map((u) => {
            const propio = String(u.id) === String(user.id);
            const esAdmin = u.roles.includes('administrador');
            return <article key={u.id} className={`p-item p-usuario${u.estado === 'bloqueado' ? ' is-bloqueado' : ''}`}>
              <div className="p-usuario-datos">
                <Avatar nombre={u.nombre} size={40} />
                <div className="p-lista-txt">
                  <strong>{u.nombre}{propio && <em className="p-tu"> (tú)</em>}</strong>
                  <small>{u.correo}</small>
                  <span className="p-chips" style={{ marginTop: 6 }}>
                    {u.roles.map((r) => <Chip key={r} tono={ROLES[r]?.[1] || 'neutro'}>{ROLES[r]?.[0] || r}</Chip>)}
                    {u.correo_verificado ? <Chip tono="ok" icono="check">Correo verificado</Chip> : <Chip tono="aviso">Sin verificar</Chip>}
                    {u.con_google && <Chip tono="neutro">Google</Chip>}
                    {u.estado === 'bloqueado' && <Estado value="bloqueado" />}
                  </span>
                  <small style={{ marginTop: 6 }}>Alta {fechaMedia(u.creado_en)} · último acceso {u.ultimo_acceso ? haceCuanto(u.ultimo_acceso) : 'sin registro'} · {plural(u.postulaciones, 'postulación', 'postulaciones')}</small>
                </div>
              </div>
              {!propio && <div className="p-acciones">
                {u.estado === 'activo'
                  ? <AccionConMotivo etiqueta="Bloquear" confirmar="Bloquear cuenta" peligro onConfirm={(m) => hacer(() => setAdminUsuarioEstado(u.id, 'bloqueado', m))} />
                  : <AccionConMotivo etiqueta="Desbloquear" variante="primary" onConfirm={(m) => hacer(() => setAdminUsuarioEstado(u.id, 'activo', m))} />}
                {esAdmin
                  ? <AccionConMotivo etiqueta="Quitar administración" peligro onConfirm={(m) => hacer(() => setAdminUsuarioAdmin(u.id, 'retirar', m))} />
                  : <AccionConMotivo etiqueta="Hacer administrador" disabled={u.estado !== 'activo' || !u.correo_verificado} onConfirm={(m) => hacer(() => setAdminUsuarioAdmin(u.id, 'otorgar', m))} />}
              </div>}
            </article>;
          })}
      </Tarjeta>
    </>;
  }

  function vistaJornadas() {
    return <>
      <PanelCabeza kicker="Administración · Jornadas" titulo="Gestión de jornadas">
        Consulta todas las jornadas y cancela por moderación cuando haga falta. La cancelación rechaza las postulaciones pendientes y queda en el historial.
      </PanelCabeza>
      {mensajes}
      <div className="p-barra">
        <Filtros etiqueta="Filtrar por estado" valor={filtroJ} onCambio={setFiltroJ} opciones={[
          ['todas', 'Todas', jornadas.length], ['publicada', 'Publicadas', contarJ('publicada')], ['borrador', 'Borradores', contarJ('borrador')],
          ['cerrada', 'Cerradas', contarJ('cerrada')], ['finalizada', 'Finalizadas', contarJ('finalizada')], ['cancelada', 'Canceladas', contarJ('cancelada')],
        ].filter(([id, , c]) => id === 'todas' || c > 0)} />
      </div>
      <div style={{ marginBottom: 16 }}><RegionChips conteo={(() => { const c = {}; jornadas.forEach((j) => { const k = claveRegion(j.region || ''); if (k) c[k] = (c[k] || 0) + 1; }); return c; })()} activa={region} onElegir={setRegion} /></div>
      <Tarjeta titulo={plural(jornadasVis.length, 'jornada', 'jornadas')} icono="calendar">
        {jornadasVis.length === 0 ? <Vacio icono="calendar" titulo="No hay jornadas en este filtro" />
          : jornadasVis.map((j) => <article className="p-item" key={j.id}>
            <div className="p-item-cab">
              <div><h3>{j.titulo}</h3><p style={{ marginTop: 4 }}>{j.institucion} · {j.municipio}{j.region ? `, ${j.region}` : ''} · {fechaMedia(j.inicio)}</p></div>
              <span className="p-chips"><EstadoJornada estado={j.estado} inicio={j.inicio} />{j.es_demo && <Chip tono="aviso">Demostración</Chip>}</span>
            </div>
            <div className="p-jornada-stats" style={{ marginTop: 12 }}>
              <div className={Number(j.pendientes) ? 'is-alerta' : ''}><strong>{j.pendientes}</strong><small>Pendientes</small></div>
              <div><strong>{j.aceptadas}/{j.cupo}</strong><small>Aceptadas / cupo</small></div>
              <div><strong>{fechaCorta(j.inicio)}</strong><small>Inicio · {hora(j.inicio)}</small></div>
            </div>
            <div className="p-acciones">
              {j.estado === 'publicada' && <Link className="btn btn-sm btn-outline" to={`/jornadas/${j.id}`}>Ver ficha</Link>}
              {['borrador', 'publicada', 'cerrada'].includes(j.estado) && <AccionConMotivo etiqueta="Cancelar jornada" confirmar="Cancelar por moderación" peligro minimo={12}
                ayuda="Motivo de moderación (mínimo 12 caracteres)" onConfirm={(m) => hacer(() => cancelAdminJornada(j.id, m))} />}
            </div>
          </article>)}
      </Tarjeta>
    </>;
  }

  const vistaActual = { resumen: vistaResumen, solicitudes: vistaSolicitudes, instituciones: vistaInstituciones, usuarios: vistaUsuarios, jornadas: vistaJornadas }[vista];

  return <PanelLayout rol="admin" nav={nav} identidad={identidad}
    titulo={`Hola, ${primerNombre(user?.nombre)}`} migas={['Administración', VISTAS[vista]]}
    buscar={{ placeholder: 'Buscar usuarios…', onSubmit: (texto) => ir('usuarios', { buscar: texto }) }}
    avisos={{ n: nSolicitudes, to: '/admin?vista=solicitudes', label: nSolicitudes ? `${nSolicitudes} solicitudes por revisar` : 'Sin solicitudes pendientes' }}
    estado={estadoServidor}>
    <div ref={ref}>
      {vista === 'resumen' && <h1 className="sr-only">Panel de administración · Resumen global</h1>}
      {cargando ? <p className="p-cargando" role="status">Consultando información…</p>
        : !resumen ? mensajes
        : <>{vista === 'resumen' && mensajes}{vistaActual()}</>}
    </div>
  </PanelLayout>;
}
