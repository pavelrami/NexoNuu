import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import {
  getAdminResumen, getAdminInstitutions, decideInstitution, decideRepresentative, revokeInstitution,
  getAdminUsuarios, setAdminUsuarioEstado, setAdminUsuarioAdmin, getAdminJornadas, cancelAdminJornada,
} from '../api.js';
import { Icon } from '../components/Icons.jsx';
import AccionConMotivo from '../components/AccionConMotivo.jsx';
import '../admin-instituciones.css';

const ESTADOS = { pendiente: 'En revisión', verificada: 'Verificada', rechazada: 'Rechazada', activo: 'Activo', revocado: 'Revocado', bloqueado: 'Bloqueado',
  publicada: 'Publicada', borrador: 'Borrador', cerrada: 'Cerrada', finalizada: 'Finalizada', cancelada: 'Cancelada' };
const ROLES = { voluntario: 'Voluntariado', representante: 'Institución', administrador: 'Administración' };
const fecha = (v) => (v ? new Date(v).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' }) : '—');
function Estado({ value }) { return <span className={`admin-state admin-state-${value}`}>{ESTADOS[value] || value}</span>; }

const TABS = [
  ['solicitudes', 'Solicitudes', 'flag'],
  ['instituciones', 'Instituciones', 'building'],
  ['usuarios', 'Usuarios', 'users'],
  ['jornadas', 'Jornadas', 'calendar'],
];

export default function AdminPanel({ inicial = 'solicitudes' }) {
  const { user } = useAuth();
  const [tab, setTab] = useState(inicial);
  const [resumen, setResumen] = useState(null);
  const [instituciones, setInstituciones] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [jornadas, setJornadas] = useState([]);
  const [buscar, setBuscar] = useState('');
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [exito, setExito] = useState('');

  const cargar = useCallback(async () => {
    const [r, i, u, j] = await Promise.all([getAdminResumen(), getAdminInstitutions(), getAdminUsuarios(), getAdminJornadas()]);
    setResumen(r.resumen); setInstituciones(i.instituciones || []); setUsuarios(u.usuarios || []); setJornadas(j.jornadas || []);
  }, []);
  useEffect(() => {
    let activo = true;
    cargar().catch((e) => activo && setError(e.message)).finally(() => activo && setCargando(false));
    return () => { activo = false; };
  }, [cargar]);

  // Ejecuta una acción, muestra el resultado y recarga los datos.
  const hacer = async (fn) => {
    setError(''); setExito('');
    try { const r = await fn(); setExito(r.message || 'Listo.'); await cargar(); return true; }
    catch (e) { setError(e.message); return false; }
  };

  const pendientesInst = instituciones.filter((i) => i.estado_verificacion === 'pendiente');
  const pendientesRep = instituciones.flatMap((i) => (i.estado_verificacion === 'verificada' ? (i.solicitantes || []).filter((p) => p.estadoVinculo === 'pendiente').map((p) => ({ ...p, inst: i })) : []));
  const usuariosFiltrados = useMemo(() => {
    const q = buscar.trim().toLowerCase();
    return q ? usuarios.filter((u) => `${u.nombre} ${u.correo}`.toLowerCase().includes(q)) : usuarios;
  }, [usuarios, buscar]);
  const conteo = { solicitudes: pendientesInst.length + pendientesRep.length, instituciones: instituciones.length, usuarios: usuarios.length, jornadas: jornadas.length };

  return <section className="container inner-page admin-page">
    <span className="section-kicker">Acceso reservado · Administración</span>
    <h1>Panel de administración</h1>
    <p className="page-intro">Revisa solicitudes institucionales, autoriza representantes, gestiona cuentas de usuario y modera jornadas. Cada decisión se guarda con su motivo.</p>

    {resumen && <div className="admin-kpis">
      <div className={resumen.instituciones_pendientes + resumen.representantes_pendientes ? 'is-alerta' : ''}><strong>{resumen.instituciones_pendientes + resumen.representantes_pendientes}</strong><span>Solicitudes por revisar</span></div>
      <div><strong>{resumen.usuarios}</strong><span>Usuarios ({resumen.voluntarios} voluntariado)</span></div>
      <div><strong>{resumen.instituciones_verificadas}</strong><span>Instituciones verificadas</span></div>
      <div><strong>{resumen.jornadas_publicadas}</strong><span>Jornadas publicadas</span></div>
      <div><strong>{resumen.postulaciones_pendientes}</strong><span>Postulaciones pendientes</span></div>
      <div><strong>{resumen.bloqueados}</strong><span>Cuentas bloqueadas</span></div>
    </div>}

    <div className="admin-tabs" role="tablist" aria-label="Secciones de administración">
      {TABS.map(([id, label, icon]) => <button key={id} type="button" role="tab" id={`tab-${id}`} aria-selected={tab === id} aria-controls={`panel-${id}`}
        className={`admin-tab${tab === id ? ' is-active' : ''}`} onClick={() => setTab(id)}>
        <Icon name={icon} size={17} /> {label} <span className="admin-tab-n">{conteo[id]}</span>
      </button>)}
    </div>

    {error && <p role="alert" className="admin-message admin-error">{error}</p>}
    {exito && <p role="status" className="admin-message admin-success">{exito}</p>}
    {cargando && <p role="status">Consultando información…</p>}

    {!cargando && tab === 'solicitudes' && <div role="tabpanel" id="panel-solicitudes" aria-labelledby="tab-solicitudes" className="admin-panel">
      <h2>Instituciones por verificar</h2>
      {pendientesInst.length === 0 ? <p className="admin-vacio">No hay instituciones pendientes.</p> : pendientesInst.map((inst) => <article className="admin-institution" key={inst.id}>
        <div className="admin-institution-head"><h3>{inst.nombre}</h3><Estado value={inst.estado_verificacion} /></div>
        <p><strong>Tipo:</strong> {inst.tipo || 'No indicado'} · Solicitada el {fecha(inst.creado_en)}</p>
        <p>{inst.descripcion || 'Sin descripción'}</p>
        {inst.sitio_web && <p><a href={inst.sitio_web} target="_blank" rel="noopener noreferrer">Sitio web declarado (no verificado) <Icon name="arrowUpRight" size={13} /></a></p>}
        <p className="admin-sub">Solicitante: {(inst.solicitantes || []).map((p) => `${p.nombre} (${p.correo})`).join(', ') || 'sin persona vinculada'}</p>
        <div className="admin-actions">
          <AccionConMotivo etiqueta="Aprobar institución" variante="primary" confirmar="Aprobar" ayuda="Evidencia revisada (mínimo 10 caracteres)" onConfirm={(m) => hacer(() => decideInstitution(inst.id, 'aprobar', m))} />
          <AccionConMotivo etiqueta="Rechazar" confirmar="Rechazar" peligro onConfirm={(m) => hacer(() => decideInstitution(inst.id, 'rechazar', m))} />
        </div>
      </article>)}
      <h2>Representantes por autorizar</h2>
      {pendientesRep.length === 0 ? <p className="admin-vacio">No hay representantes pendientes.</p> : pendientesRep.map((p) => <article className="admin-institution" key={`${p.inst.id}-${p.id}`}>
        <div className="admin-institution-head"><h3>{p.nombre}</h3><Estado value="pendiente" /></div>
        <p>{p.correo} · quiere representar a <strong>{p.inst.nombre}</strong></p>
        <div className="admin-actions">
          <AccionConMotivo etiqueta="Autorizar representante" variante="primary" confirmar="Autorizar" disabled={String(p.id) === String(user.id)} onConfirm={(m) => hacer(() => decideRepresentative(p.inst.id, p.id, 'autorizar', m))} />
        </div>
      </article>)}
    </div>}

    {!cargando && tab === 'instituciones' && <div role="tabpanel" id="panel-instituciones" aria-labelledby="tab-instituciones" className="admin-panel">
      {instituciones.length === 0 ? <p className="admin-vacio">No hay instituciones registradas.</p> : instituciones.map((inst) => <article className="admin-institution" key={inst.id}>
        <div className="admin-institution-head"><h3>{inst.nombre}</h3><Estado value={inst.estado_verificacion} /></div>
        <p className="admin-sub">{inst.tipo || 'Tipo no indicado'} · registrada el {fecha(inst.creado_en)}</p>
        {(inst.solicitantes || []).length > 0 && <ul className="admin-personas">{inst.solicitantes.map((p) => <li key={p.id}>
          <span><strong>{p.nombre}</strong> · {p.correo}</span><Estado value={p.estadoVinculo} />
          {inst.estado_verificacion === 'verificada' && p.estadoVinculo === 'pendiente' && <AccionConMotivo etiqueta="Autorizar" variante="primary" disabled={String(p.id) === String(user.id)} onConfirm={(m) => hacer(() => decideRepresentative(inst.id, p.id, 'autorizar', m))} />}
          {p.estadoVinculo === 'activo' && <AccionConMotivo etiqueta="Revocar" peligro disabled={String(p.id) === String(user.id)} onConfirm={(m) => hacer(() => decideRepresentative(inst.id, p.id, 'revocar', m))} />}
        </li>)}</ul>}
        <div className="admin-actions">
          {inst.estado_verificacion === 'pendiente' && <>
            <AccionConMotivo etiqueta="Aprobar" variante="primary" onConfirm={(m) => hacer(() => decideInstitution(inst.id, 'aprobar', m))} />
            <AccionConMotivo etiqueta="Rechazar" peligro onConfirm={(m) => hacer(() => decideInstitution(inst.id, 'rechazar', m))} />
          </>}
          {inst.estado_verificacion === 'verificada' && <AccionConMotivo etiqueta="Retirar verificación" confirmar="Retirar verificación" peligro
            ayuda="Motivo: sus jornadas dejarán de mostrarse y sus representantes perderán el acceso" onConfirm={(m) => hacer(() => revokeInstitution(inst.id, m))} />}
        </div>
      </article>)}
    </div>}

    {!cargando && tab === 'usuarios' && <div role="tabpanel" id="panel-usuarios" aria-labelledby="tab-usuarios" className="admin-panel">
      <div className="admin-buscar input-icono"><Icon name="search" size={18} />
        <label htmlFor="buscar-usuario" className="sr-only">Buscar por nombre o correo</label>
        <input id="buscar-usuario" type="search" value={buscar} onChange={(e) => setBuscar(e.target.value)} placeholder="Buscar por nombre o correo…" />
      </div>
      <ul className="admin-usuarios">{usuariosFiltrados.map((u) => {
        const propio = String(u.id) === String(user.id);
        const esAdmin = u.roles.includes('administrador');
        return <li key={u.id} className={u.estado === 'bloqueado' ? 'is-bloqueado' : ''}>
          <div className="admin-usuario-datos">
            <strong>{u.nombre}{propio && <em> (tú)</em>}</strong>
            <span>{u.correo}</span>
            <div className="admin-chips">
              {u.roles.map((r) => <span key={r} className={`admin-chip admin-chip--${r}`}>{ROLES[r] || r}</span>)}
              {u.correo_verificado ? <span className="admin-chip">Correo verificado</span> : <span className="admin-chip admin-chip--aviso">Sin verificar</span>}
              {u.con_google && <span className="admin-chip">Google</span>}
              {u.estado === 'bloqueado' && <Estado value="bloqueado" />}
            </div>
            <small>Alta {fecha(u.creado_en)} · último acceso {fecha(u.ultimo_acceso)} · {u.postulaciones} postulaciones</small>
          </div>
          {!propio && <div className="admin-actions">
            {u.estado === 'activo'
              ? <AccionConMotivo etiqueta="Bloquear" confirmar="Bloquear cuenta" peligro onConfirm={(m) => hacer(() => setAdminUsuarioEstado(u.id, 'bloqueado', m))} />
              : <AccionConMotivo etiqueta="Desbloquear" variante="primary" onConfirm={(m) => hacer(() => setAdminUsuarioEstado(u.id, 'activo', m))} />}
            {esAdmin
              ? <AccionConMotivo etiqueta="Quitar administración" peligro onConfirm={(m) => hacer(() => setAdminUsuarioAdmin(u.id, 'retirar', m))} />
              : <AccionConMotivo etiqueta="Hacer administrador" disabled={u.estado !== 'activo' || !u.correo_verificado} onConfirm={(m) => hacer(() => setAdminUsuarioAdmin(u.id, 'otorgar', m))} />}
          </div>}
        </li>;
      })}</ul>
      {usuariosFiltrados.length === 0 && <p className="admin-vacio">Ningún usuario coincide con la búsqueda.</p>}
    </div>}

    {!cargando && tab === 'jornadas' && <div role="tabpanel" id="panel-jornadas" aria-labelledby="tab-jornadas" className="admin-panel">
      <ul className="admin-jornadas">{jornadas.map((j) => <li key={j.id}>
        <div>
          <strong>{j.titulo}</strong>
          <span>{j.institucion} · {j.municipio}{j.region ? `, ${j.region}` : ''} · {fecha(j.inicio)}</span>
          <div className="admin-chips"><Estado value={j.estado} />{j.es_demo && <span className="admin-chip admin-chip--aviso">Demostración</span>}
            <span className="admin-chip">{j.pendientes} pendientes · {j.aceptadas}/{j.cupo} aceptadas</span></div>
        </div>
        <div className="admin-actions">
          {j.estado === 'publicada' && <Link className="btn btn-sm btn-outline" to={`/jornadas/${j.id}`}>Ver ficha</Link>}
          {['borrador', 'publicada', 'cerrada'].includes(j.estado) && <AccionConMotivo etiqueta="Cancelar jornada" confirmar="Cancelar por moderación" peligro minimo={12}
            ayuda="Motivo de moderación (mínimo 12 caracteres)" onConfirm={(m) => hacer(() => cancelAdminJornada(j.id, m))} />}
        </div>
      </li>)}</ul>
      {jornadas.length === 0 && <p className="admin-vacio">No hay jornadas registradas.</p>}
    </div>}
  </section>;
}
