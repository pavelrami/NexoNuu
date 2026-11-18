import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getRepresentativeInstitutions, getRepresentativeCommunities, getRepresentativeJornadas, createRepresentativeJornada, publishRepresentativeDemo, getRepresentativeApplications, decideRepresentativeApplication } from '../api.js';
import '../panel-institucional.css';
import JornadaGestion from '../components/JornadaGestion.jsx';
import SeguimientoJornada from '../components/SeguimientoJornada.jsx';

const empty = { titulo:'',descripcion:'',comunidadId:'',inicio:'',fin:'',cupo:15 };
const readable = (date) => new Date(date).toLocaleString('es-MX',{dateStyle:'medium',timeStyle:'short'});
const timeToIso = (local) => new Date(local).toISOString();
export default function PanelInstitucional(){
  const [instituciones,setInstituciones]=useState([]);
  const [comunidades,setComunidades]=useState([]);
  const [selected,setSelected]=useState('');
  const [jornadas,setJornadas]=useState([]);
  const [loading,setLoading]=useState(true);
  const [loadingJ,setLoadingJ]=useState(false);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const [success,setSuccess]=useState('');
  const [form,setForm]=useState(empty);
  const [openJornada,setOpenJornada]=useState('');
  const [solicitudes,setSolicitudes]=useState([]);
  const [loadingS,setLoadingS]=useState(false);
  const [cupoS,setCupoS]=useState(null);
  useEffect(()=>{
    let active=true;
    Promise.all([getRepresentativeInstitutions(),getRepresentativeCommunities()])
      .then(([inst,catalog])=>{if(!active)return;setInstituciones(inst.instituciones||[]);setComunidades(catalog.comunidades||[]);setSelected(inst.instituciones?.[0]?.id ? String(inst.instituciones[0].id) : '');})
      .catch(e=>active&&setError(e.message))
      .finally(()=>active&&setLoading(false));
    return()=>{active=false};
  },[]);
  async function refresh(id){
    if(!id)return;
    setLoadingJ(true);
    try{const data=await getRepresentativeJornadas(id);setJornadas(data.jornadas||[]);setError('');}
    catch(e){setError(e.message)}
    finally{setLoadingJ(false)}
  }
  useEffect(()=>{setJornadas([]);setError('');setOpenJornada('');setSolicitudes([]);refresh(selected);},[selected]);
  async function loadApplications(jornadaId){
    setLoadingS(true);setError('');
    try {const data=await getRepresentativeApplications(selected,jornadaId);setSolicitudes(data.postulaciones||[]);setCupoS(data.cupo);}
    catch(e){setError(e.message);setSolicitudes([])}
    finally {setLoadingS(false)}
  }
  async function showApplications(id){
    const key=String(id);if(openJornada===key){setOpenJornada('');return;}
    setOpenJornada(key);await loadApplications(key);
  }
  async function decideApplication(id,estado){
    const verb=estado==='aceptada'?'aceptar':'rechazar';
    if(!window.confirm(`¿Deseas ${verb} esta postulacion DEMO?`))return;
    setBusy(true);setError('');setSuccess('');
    try {const r=await decideRepresentativeApplication(selected,openJornada,id,estado);setSuccess(r.message);await loadApplications(openJornada);await refresh(selected);}
    catch(e){setError(e.message)}finally {setBusy(false)}
  }
  const update=(key,value)=>setForm(old=>({...old,[key]:value}));
  async function save(e){
    e.preventDefault();if(busy||!selected)return;
    setBusy(true);setSuccess('');setError('');
    try{
      await createRepresentativeJornada(selected,{...form,cupo:Number(form.cupo),inicio:timeToIso(form.inicio),fin:timeToIso(form.fin)});
      setSuccess('Borrador DEMO guardado correctamente. Aun no es publico.');setForm(empty);await refresh(selected);
    }catch(e){setError(e.message)}finally{setBusy(false)}
  }
  async function publish(id){
    if(!window.confirm('Publicar solamente una jornada DEMO en tu entorno local?'))return;
    setBusy(true);setSuccess('');setError('');
    try{const r=await publishRepresentativeDemo(selected,id);setSuccess(r.message);await refresh(selected)}
    catch(e){setError(e.message)}finally{setBusy(false)}
  }
  const current=instituciones.find(i=>String(i.id)===selected);
  return <section className="container inner-page panel-inst">
    <span className="section-kicker">Coordinar · Representación institucional</span>
    <h1>Mi panel institucional</h1>
    <p className="page-intro">Gestiona únicamente las instituciones que has sido autorizado a representar. Durante esta fase podrás crear jornadas de demostración en borrador.</p>
    {error&&<p className="auth-error" role="alert">{error}</p>}
    {success&&<p className="auth-success" role="status">{success}</p>}
    {loading?<p role="status">Consultando permisos...</p>:instituciones.length===0?<div className="notice"><strong>No tienes instituciones autorizadas.</strong><p>Una solicitud en revisión no permite gestionar jornadas.</p><Link className="btn btn-outline" to="/instituciones/solicitar">Ver mis solicitudes</Link></div>:<>
      <div className="panel-inst-picker"><label htmlFor="institucion-activa">Institución que representas</label><select id="institucion-activa" value={selected} onChange={e=>setSelected(e.target.value)}>{instituciones.map(i=><option value={i.id} key={i.id}>{i.nombre}</option>)}</select></div>
      <div className="panel-inst-banner"><strong>{current?.nombre}</strong><span>Representación autorizada</span></div>
      <div className="panel-inst-grid">
        <article className="panel-inst-card">
          <h2>Nueva jornada de demostración</h2>
          <p className="panel-inst-sub">Los borradores no se muestran a visitantes. Los datos serán ficticios hasta validar la publicación real.</p>
          <form onSubmit={save} className="panel-inst-form">
            <label htmlFor="j-titulo">Título *</label><input id="j-titulo" required minLength={8} maxLength={220} value={form.titulo} onChange={e=>update('titulo',e.target.value)} placeholder="Jornada DEMO de lectura comunitaria"/>
            <label htmlFor="j-descripcion">Descripción *</label><textarea id="j-descripcion" required minLength={30} maxLength={2000} rows={4} value={form.descripcion} onChange={e=>update('descripcion',e.target.value)} placeholder="Explica la actividad simulada, participantes y objetivos..."/>
            <label htmlFor="j-comunidad">Comunidad *</label><select id="j-comunidad" value={form.comunidadId} required onChange={e=>update('comunidadId',e.target.value)}><option value="">Selecciona una comunidad</option>{comunidades.map(c=><option value={c.id} key={c.id}>{c.nombre} · {c.municipio} ({c.region||'Sin región'})</option>)}</select>
            <div className="panel-inst-two"><div><label htmlFor="j-inicio">Inicio *</label><input id="j-inicio" type="datetime-local" required value={form.inicio} onChange={e=>update('inicio',e.target.value)}/></div><div><label htmlFor="j-fin">Fin *</label><input id="j-fin" type="datetime-local" required value={form.fin} onChange={e=>update('fin',e.target.value)}/></div></div>
            <label htmlFor="j-cupo">Cupo estimado *</label><input id="j-cupo" type="number" min={1} max={500} required value={form.cupo} onChange={e=>update('cupo',e.target.value)}/>
            <button className="btn btn-primary" type="submit" disabled={busy}>{busy?'Guardando...':'Guardar borrador DEMO'}</button>
          </form>
        </article>
        <article className="panel-inst-card">
          <h2>Mis jornadas</h2>
          {loadingJ?<p role="status">Consultando jornadas...</p>:jornadas.length===0?<p className="panel-inst-sub">Todavía no hay jornadas creadas por esta institución.</p>:<div className="panel-inst-items">{jornadas.map(j=><div key={j.id} className="panel-inst-item"><strong>{j.titulo}</strong><p>{j.comunidad}, {j.municipio}</p><p>Inicio: {readable(j.inicio)}</p><p>Estado: <b>{j.estado}</b> · DEMO: {j.es_demo?'Sí':'No'}</p><p>Solicitudes pendientes: {j.pendientes} · Aceptadas: {j.aceptadas}</p>{j.estado==='borrador'&&j.es_demo&&<button className="btn btn-outline" type="button" disabled={busy} onClick={()=>publish(j.id)}>Publicar DEMO (solo local)</button>}
              {j.estado==='publicada'&&j.es_demo&&<button className="btn btn-outline" type="button" disabled={busy} onClick={()=>showApplications(j.id)} aria-expanded={openJornada===String(j.id)}>{openJornada===String(j.id)?'Ocultar postulaciones':'Revisar postulaciones DEMO'}</button>}
              <JornadaGestion key={`lifecycle-${j.id}`} jornada={j} institucionId={selected} comunidades={comunidades} onUpdated={()=>refresh(selected)} onError={setError} onSuccess={setSuccess}/>
              <SeguimientoJornada key={`tracking-${j.id}`} jornada={j} institucionId={selected} onError={setError} onSuccess={setSuccess}/>
              {openJornada===String(j.id)&&<div className="panel-inst-applications">
                <h3>Postulaciones de esta jornada</h3>
                <p className="panel-inst-sub">Solo simulaciones locales. Cupo: {cupoS ?? j.cupo}. Los cambios se reflejan en Mis postulaciones del voluntario.</p>
                {loadingS?<p role="status">Cargando solicitudes...</p>:solicitudes.length===0?<p>No hay solicitudes para esta jornada.</p>:<ul className="panel-inst-app-list">{solicitudes.map(p=><li key={p.id}>
                  <strong>{p.voluntario}</strong><span>Estado: {p.estado}</span>
                  {p.estado==='pendiente'&&<div className="panel-inst-app-actions"><button type="button" className="btn btn-primary" disabled={busy} onClick={()=>decideApplication(p.id,'aceptada')}>Aceptar</button><button type="button" className="btn btn-outline" disabled={busy} onClick={()=>decideApplication(p.id,'rechazada')}>Rechazar</button></div>}
                </li>)}</ul>}
              </div>}</div>)}</div>}
          <p className="panel-inst-sub">La gestion de postulaciones DEMO se habilita solo en desarrollo local. Las convocatorias reales permanecen pendientes de autorizacion y controles de produccion.</p>
        </article>
      </div>
    </>}
  </section>;
}
