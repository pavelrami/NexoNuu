import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getRepresentativeInstitutions, getRepresentativeCommunities, getRepresentativeJornadas, createRepresentativeJornada, publishRepresentativeDemo, getRepresentativeApplications, decideRepresentativeApplication } from '../api.js';
import '../panel-institucional.css';
import JornadaGestion from '../components/JornadaGestion.jsx';
import SeguimientoJornada from '../components/SeguimientoJornada.jsx';
import { Icon } from '../components/Icons.jsx';

const empty = { titulo: '', descripcion: '', comunidadId: '', inicio: '', fin: '', cupo: 15, esDemo: false };
const readable = (date) => new Date(date).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' });
const timeToIso = (local) => new Date(local).toISOString();
const ESTADO = { borrador: 'Borrador', publicada: 'Publicada', cerrada: 'Cerrada', finalizada: 'Finalizada', cancelada: 'Cancelada' };
const DISPONIBILIDAD = { entre_semana: 'Entre semana', fin_semana: 'Fines de semana', variable: 'Variable' };
const POSTULACION = { pendiente: 'Pendiente', aceptada: 'Aceptada', rechazada: 'Rechazada', retirada: 'Retirada' };

export default function PanelInstitucional() {
  const [instituciones, setInstituciones] = useState([]);
  const [modoDemo, setModoDemo] = useState(false);
  const [comunidades, setComunidades] = useState([]);
  const [selected, setSelected] = useState('');
  const [jornadas, setJornadas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingJ, setLoadingJ] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [form, setForm] = useState(empty);
  const [openJornada, setOpenJornada] = useState('');
  const [solicitudes, setSolicitudes] = useState({ lista: [], cupo: null, puedeDecidir: false });
  const [loadingS, setLoadingS] = useState(false);

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

  async function refresh(id) {
    if (!id) return;
    setLoadingJ(true);
    try { const data = await getRepresentativeJornadas(id); setJornadas(data.jornadas || []); setError(''); }
    catch (e) { setError(e.message); }
    finally { setLoadingJ(false); }
  }
  useEffect(() => { setJornadas([]); setError(''); setOpenJornada(''); refresh(selected); }, [selected]);

  async function loadApplications(jornadaId) {
    setLoadingS(true); setError('');
    try {
      const data = await getRepresentativeApplications(selected, jornadaId);
      setSolicitudes({ lista: data.postulaciones || [], cupo: data.cupo, puedeDecidir: Boolean(data.puedeDecidir) });
    } catch (e) { setError(e.message); setSolicitudes({ lista: [], cupo: null, puedeDecidir: false }); }
    finally { setLoadingS(false); }
  }
  async function showApplications(id) {
    const key = String(id);
    if (openJornada === key) { setOpenJornada(''); return; }
    setOpenJornada(key);
    await loadApplications(key);
  }
  async function decideApplication(id, estado, nombre) {
    const verb = estado === 'aceptada' ? 'aceptar' : 'rechazar';
    if (!window.confirm(`¿Deseas ${verb} la postulación de ${nombre}? Le avisaremos por correo.`)) return;
    setBusy(true); setError(''); setSuccess('');
    try { const r = await decideRepresentativeApplication(selected, openJornada, id, estado); setSuccess(r.message); await loadApplications(openJornada); await refresh(selected); }
    catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }
  const update = (key, value) => setForm((old) => ({ ...old, [key]: value }));
  async function save(e) {
    e.preventDefault(); if (busy || !selected) return;
    setBusy(true); setSuccess(''); setError('');
    try {
      const r = await createRepresentativeJornada(selected, { ...form, cupo: Number(form.cupo), inicio: timeToIso(form.inicio), fin: timeToIso(form.fin), esDemo: modoDemo && form.esDemo });
      setSuccess(r.message); setForm(empty); await refresh(selected);
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }
  async function publish(id) {
    if (!window.confirm('¿Publicar esta jornada? Aparecerá en la sección Jornadas y recibirá postulaciones.')) return;
    setBusy(true); setSuccess(''); setError('');
    try { const r = await publishRepresentativeDemo(selected, id); setSuccess(r.message); await refresh(selected); }
    catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }
  const current = instituciones.find((i) => String(i.id) === selected);
  const pendientesTotal = jornadas.reduce((n, j) => n + Number(j.pendientes || 0), 0);

  return <section className="container inner-page panel-inst">
    <span className="section-kicker">Coordinar · Representación institucional</span>
    <h1>Mi panel institucional</h1>
    <p className="page-intro">Crea y publica jornadas de tu institución, revisa a las personas voluntarias que se postulan y decide quién participa. Cada decisión le llega por correo a la persona.</p>
    {error && <p className="auth-error" role="alert">{error}</p>}
    {success && <p className="auth-success" role="status">{success}</p>}
    {loading ? <p role="status">Consultando permisos…</p> : instituciones.length === 0 ? <div className="notice"><strong>No tienes instituciones autorizadas.</strong><p>Una solicitud en revisión no permite gestionar jornadas.</p><Link className="btn btn-outline" to="/instituciones/solicitar">Ver mis solicitudes</Link></div> : <>
      <div className="panel-inst-top">
        {instituciones.length > 1 && <div className="panel-inst-picker"><label htmlFor="institucion-activa">Institución que representas</label><select id="institucion-activa" value={selected} onChange={(e) => setSelected(e.target.value)}>{instituciones.map((i) => <option value={i.id} key={i.id}>{i.nombre}</option>)}</select></div>}
        <div className="panel-inst-banner">
          <div><strong>{current?.nombre}</strong><span><Icon name="shield" size={15} /> Institución verificada · representación autorizada</span></div>
          <ul className="panel-inst-kpis">
            <li><strong>{jornadas.filter((j) => j.estado === 'publicada').length}</strong> publicadas</li>
            <li><strong>{jornadas.filter((j) => j.estado === 'borrador').length}</strong> borradores</li>
            <li className={pendientesTotal ? 'is-alerta' : ''}><strong>{pendientesTotal}</strong> postulaciones por revisar</li>
          </ul>
        </div>
      </div>
      <div className="panel-inst-grid">
        <article className="panel-inst-card panel-inst-card--form">
          <h2><Icon name="calendar" size={20} /> Nueva jornada</h2>
          <p className="panel-inst-sub">Se guarda como borrador. Revísala y publícala cuando esté lista: entonces aparecerá en Jornadas.</p>
          <form onSubmit={save} className="panel-inst-form">
            <label htmlFor="j-titulo">Título *</label><input id="j-titulo" required minLength={8} maxLength={220} value={form.titulo} onChange={(e) => update('titulo', e.target.value)} placeholder="Círculo de lectura en …" />
            <label htmlFor="j-descripcion">Descripción *</label><textarea id="j-descripcion" required minLength={30} maxLength={2000} rows={4} value={form.descripcion} onChange={(e) => update('descripcion', e.target.value)} placeholder="Qué se hará, a quién va dirigida y qué apoyo se busca…" />
            <label htmlFor="j-comunidad">Comunidad *</label><select id="j-comunidad" value={form.comunidadId} required onChange={(e) => update('comunidadId', e.target.value)}><option value="">Selecciona una comunidad</option>{comunidades.map((c) => <option value={c.id} key={c.id}>{c.nombre} · {c.municipio} ({c.region || 'Sin región'})</option>)}</select>
            <div className="panel-inst-two"><div><label htmlFor="j-inicio">Inicio *</label><input id="j-inicio" type="datetime-local" required value={form.inicio} onChange={(e) => update('inicio', e.target.value)} /></div><div><label htmlFor="j-fin">Fin *</label><input id="j-fin" type="datetime-local" required value={form.fin} onChange={(e) => update('fin', e.target.value)} /></div></div>
            <label htmlFor="j-cupo">Cupo de personas voluntarias *</label><input id="j-cupo" type="number" min={1} max={500} required value={form.cupo} onChange={(e) => update('cupo', e.target.value)} />
            {modoDemo && <label className="panel-inst-check"><input type="checkbox" checked={form.esDemo} onChange={(e) => update('esDemo', e.target.checked)} /> Es una jornada de demostración (se mostrará con esa etiqueta)</label>}
            <button className="btn btn-primary" type="submit" disabled={busy}>{busy ? 'Guardando…' : 'Guardar borrador'}</button>
          </form>
        </article>
        <article className="panel-inst-card">
          <h2><Icon name="list" size={20} /> Mis jornadas</h2>
          {loadingJ ? <p role="status">Consultando jornadas…</p> : jornadas.length === 0 ? <p className="panel-inst-sub">Todavía no hay jornadas creadas por esta institución.</p> : <div className="panel-inst-items">{jornadas.map((j) => {
            const abierta = openJornada === String(j.id);
            return <div key={j.id} className={`panel-inst-item${abierta ? ' is-open' : ''}`}>
              <div className="panel-inst-item-head">
                <strong>{j.titulo}</strong>
                <div className="panel-inst-badges"><span className={`estado-j estado-j--${j.estado}`}>{ESTADO[j.estado] || j.estado}</span>{j.es_demo && <span className="estado-j estado-j--demo">Demostración</span>}</div>
              </div>
              <p><Icon name="pin" size={14} /> {j.comunidad}, {j.municipio} · <Icon name="calendar" size={14} /> {readable(j.inicio)}</p>
              <p className="panel-inst-cuenta"><span className={j.pendientes ? 'is-alerta' : ''}>{j.pendientes} pendientes</span> · {j.aceptadas}/{j.cupo} aceptadas</p>
              <div className="panel-inst-acciones">
                {j.estado === 'borrador' && j.gestionable && <button className="btn btn-primary btn-sm" type="button" disabled={busy} onClick={() => publish(j.id)}><Icon name="flag" size={15} /> Publicar</button>}
                {j.gestionable && (j.total_postulaciones > 0 || j.estado === 'publicada') && <button className="btn btn-outline btn-sm" type="button" disabled={busy} onClick={() => showApplications(j.id)} aria-expanded={abierta}>
                  <Icon name="users" size={15} /> {abierta ? 'Ocultar postulaciones' : `Ver postulaciones (${j.total_postulaciones})`}</button>}
                {j.estado === 'publicada' && <Link className="btn btn-outline btn-sm" to={`/jornadas/${j.id}`}>Ver ficha pública</Link>}
              </div>
              {!j.gestionable && <p className="panel-inst-sub">Jornada de demostración: se gestiona cuando el servidor tiene activo el modo demo.</p>}
              {abierta && <div className="panel-inst-applications">
                <h3>Personas que se postularon</h3>
                <p className="panel-inst-sub">Cupo: {solicitudes.cupo ?? j.cupo}. El correo de contacto aparece cuando aceptas la postulación.{!solicitudes.puedeDecidir && ' Las decisiones están disponibles mientras la jornada esté publicada y abierta.'}</p>
                {loadingS ? <p role="status">Cargando postulaciones…</p> : solicitudes.lista.length === 0 ? <p>Aún no hay postulaciones para esta jornada.</p> : <ul className="panel-inst-app-list">{solicitudes.lista.map((p) => <li key={p.id} className={`postulante postulante--${p.estado}`}>
                  <div className="postulante-cabeza"><strong>{p.voluntario}</strong><span className={`estado-p estado-p--${p.estado}`}>{POSTULACION[p.estado]}</span></div>
                  <dl className="postulante-datos">
                    {p.comunidad && <><dt>Comunidad</dt><dd>{p.comunidad}, {p.municipio}</dd></>}
                    <dt>Disponibilidad</dt><dd>{DISPONIBILIDAD[p.disponibilidad] || 'Sin perfil'}</dd>
                    {p.habilidades?.length > 0 && <><dt>Habilidades</dt><dd>{p.habilidades.join(', ')}</dd></>}
                    {p.lenguas?.length > 0 && <><dt>Lenguas</dt><dd>{p.lenguas.map((l) => `${l.lengua}${l.variante ? ` (${l.variante})` : ''} · ${l.nivel}`).join('; ')}</dd></>}
                    {p.correo && <><dt>Contacto</dt><dd><a href={`mailto:${p.correo}`}>{p.correo}</a></dd></>}
                  </dl>
                  {p.biografia && <p className="postulante-bio">“{p.biografia}”</p>}
                  <small>Se postuló el {new Date(p.creadaEn).toLocaleDateString('es-MX', { dateStyle: 'long' })}</small>
                  {p.estado === 'pendiente' && solicitudes.puedeDecidir && <div className="panel-inst-app-actions">
                    <button type="button" className="btn btn-primary btn-sm" disabled={busy} onClick={() => decideApplication(p.id, 'aceptada', p.voluntario)}><Icon name="check" size={15} /> Aceptar</button>
                    <button type="button" className="btn btn-outline btn-sm" disabled={busy} onClick={() => decideApplication(p.id, 'rechazada', p.voluntario)}>Rechazar</button>
                  </div>}
                </li>)}</ul>}
              </div>}
              <JornadaGestion key={`lifecycle-${j.id}`} jornada={j} institucionId={selected} comunidades={comunidades} onUpdated={() => refresh(selected)} onError={setError} onSuccess={setSuccess} />
              <SeguimientoJornada key={`tracking-${j.id}`} jornada={j} institucionId={selected} onError={setError} onSuccess={setSuccess} />
            </div>;
          })}</div>}
        </article>
      </div>
    </>}
  </section>;
}
