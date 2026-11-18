import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { getAdminInstitutions, decideInstitution, decideRepresentative } from '../api.js';
import '../admin-instituciones.css';

function Status({value}) {
 const labels={pendiente:'En revisión',verificada:'Verificada',rechazada:'Rechazada',activo:'Autorizado',revocado:'Revocado'};
 return <span className={`admin-state admin-state-${value}`}>{labels[value]||value}</span>;
}
export default function AdminInstituciones(){
 const {user}=useAuth();
 const [data,setData]=useState([]);
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState('');
 const [success,setSuccess]=useState('');
 const [busy,setBusy]=useState('');
 const [motivos,setMotivos]=useState({});
 const refresh=async()=>{
   const result=await getAdminInstitutions();
   setData(result.instituciones||[]);
 };
 useEffect(()=>{let active=true;getAdminInstitutions().then(x=>{if(active)setData(x.instituciones||[]);})
   .catch(e=>{if(active)setError(e.message);}).finally(()=>{if(active)setLoading(false);});return()=>{active=false;};},[]);
 const act=async({id,usuarioId,accion})=>{
   const key=usuarioId?`r-${id}-${usuarioId}`:`i-${id}`;
   const motivo=(motivos[key]||'').trim();
   if(motivo.length<10){setError('Escribe un motivo de al menos 10 caracteres antes de decidir.');return;}
   const label=usuarioId?`la representación del usuario ${usuarioId}`:`la institución ${id}`;
   if(!window.confirm(`¿Confirmas ${accion} ${label}? Esta decisión quedará registrada.`))return;
   setError('');setSuccess('');setBusy(key);
   try{
     const answer=usuarioId?await decideRepresentative(id,usuarioId,accion,motivo):await decideInstitution(id,accion,motivo);
     setSuccess(answer.message);
     setMotivos(prev=>({...prev,[key]:''}));
     await refresh();
   }catch(e){setError(e.message);}finally{setBusy('');}
 };
 const pending=data.filter(x=>x.estado_verificacion==='pendiente').length;
 return <section className="container inner-page admin-page">
   <span className="section-kicker">Acceso reservado · Administración</span>
   <h1>Revisión de instituciones</h1>
   <p className="page-intro">Verifica información institucional y autoriza representantes por separado. Cada decisión se almacena para auditoría.</p>
   <div className="admin-overview"><div><strong>{data.length}</strong><span>Instituciones registradas</span></div><div><strong>{pending}</strong><span>En revisión</span></div><div><strong>{data.filter(x=>x.estado_verificacion==='verificada').length}</strong><span>Verificadas</span></div></div>
   <div className="admin-alert">Esta pantalla no comprueba documentos automáticamente. Revisa evidencia de representación y existencia de la institución antes de aprobar; utiliza únicamente instituciones ficticias para pruebas.</div>
   {error&&<p role="alert" className="admin-message admin-error">{error}</p>}
   {success&&<p role="status" className="admin-message admin-success">{success}</p>}
   {loading?<p>Consultando instituciones...</p>:!data.length?<p>No hay solicitudes registradas.</p>:data.map(inst=>
     <article className="admin-institution" key={inst.id}>
       <div className="admin-institution-head"><h2>{inst.nombre}</h2><Status value={inst.estado_verificacion}/></div>
       <p><strong>Tipo:</strong> {inst.tipo||'No indicado'} · <strong>ID:</strong> {inst.id}</p>
       <p>{inst.descripcion||'Sin descripción'}</p>
       {inst.sitio_web&&<p><a href={inst.sitio_web} target="_blank" rel="noopener noreferrer">Sitio web declarado (no verificado)</a></p>}
       {inst.estado_verificacion==='pendiente'&&<div className="admin-action">
         <label htmlFor={`motivo-i-${inst.id}`}>Motivo / evidencia de la decisión (mínimo 10 caracteres)</label>
         <textarea id={`motivo-i-${inst.id}`} rows="2" maxLength="1000" value={motivos[`i-${inst.id}`]||''} onChange={e=>setMotivos(p=>({...p,[`i-${inst.id}`]:e.target.value}))} placeholder="Describe qué documentos verificaste o por qué rechazas..."/>
         <div className="admin-actions"><button type="button" className="btn btn-primary" disabled={Boolean(busy)} onClick={()=>act({id:inst.id,accion:'aprobar'})}>Aprobar institución</button>
         <button type="button" className="btn btn-outline" disabled={Boolean(busy)} onClick={()=>act({id:inst.id,accion:'rechazar'})}>Rechazar</button></div>
       </div>}
       <h3>Personas solicitantes y representantes</h3>
       {(inst.solicitantes||[]).length===0?<p>No hay personas vinculadas.</p>:(inst.solicitantes||[]).map(person=><div className="admin-representative" key={person.id}>
         <div><strong>{person.nombre}</strong> <Status value={person.estadoVinculo}/></div>
         <p>{person.correo} · Usuario {person.id}</p>
         {inst.estado_verificacion==='verificada' && (person.estadoVinculo==='pendiente'||person.estadoVinculo==='activo') && <div className="admin-action">
           <label htmlFor={`motivo-r-${inst.id}-${person.id}`}>Justificación de representación</label>
           <textarea id={`motivo-r-${inst.id}-${person.id}`} rows="2" maxLength="1000" value={motivos[`r-${inst.id}-${person.id}`]||''} onChange={e=>setMotivos(p=>({...p,[`r-${inst.id}-${person.id}`]:e.target.value}))} placeholder="Indica la autorización institucional revisada..."/>
           <div className="admin-actions"><button className="btn btn-outline" type="button" disabled={Boolean(busy)||String(person.id)===String(user.id)} onClick={()=>act({id:inst.id,usuarioId:person.id,accion:person.estadoVinculo==='pendiente'?'autorizar':'revocar'})}>
             {person.estadoVinculo==='pendiente'?'Autorizar representante':'Revocar representación'}
           </button></div>
         </div>}
       </div>)}
     </article>)}
 </section>;
}
