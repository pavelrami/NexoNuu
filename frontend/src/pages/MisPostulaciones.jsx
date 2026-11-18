import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getMisPostulaciones, retirarPostulacion } from '../api.js';

export default function MisPostulaciones() {
  const [estado,setEstado] = useState({cargando:true,error:'',filas:[]});
  const [trabajando,setTrabajando] = useState(null);
  const [aviso,setAviso] = useState('');
  async function cargar() {
    setEstado(x=>({...x,cargando:true,error:''}));
    try {
      const r = await getMisPostulaciones();
      setEstado({cargando:false,error:'',filas:r.postulaciones || []});
    } catch(e) {setEstado({cargando:false,error:e.message,filas:[]});}
  }
  useEffect(()=>{cargar();},[]);
  async function retirar(id) {
    if (!window.confirm('¿Retirar esta solicitud pendiente? No podrás volver a postularte a la misma jornada.')) return;
    setTrabajando(id); setAviso('');
    try {await retirarPostulacion(id); await cargar(); setAviso('Solicitud retirada.');}
    catch(e) {setAviso(e.message);}
    finally {setTrabajando(null);}
  }
  return <section className="container inner-page">
    <span className="section-kicker">Conectar · Mi participación</span>
    <h1>Mis postulaciones</h1>
    <p className="page-intro">Consulta tus solicitudes. Solo el representante de una institución autorizada puede aceptarlas o rechazarlas.</p>
    {estado.cargando && <p role="status">Consultando solicitudes...</p>}
    {estado.error && <p role="alert">{estado.error}</p>}
    {aviso && <p role="status">{aviso}</p>}
    {!estado.cargando && !estado.error && estado.filas.length === 0 && <div className="notice"><p>Aún no tienes postulaciones registradas.</p><Link className="btn btn-outline" to="/jornadas">Explorar jornadas</Link></div>}
    <div className="feature-list">
      {estado.filas.map(p=><article key={p.id}>
        <h2>{p.titulo}</h2>
        {p.esDemo && <p><strong>Simulación académica; no es una inscripción real.</strong></p>}
        <p><strong>Estado:</strong> {p.estado}</p>
        <p><strong>Institución:</strong> {p.institucion}</p>
        <p><strong>Ubicación:</strong> {p.comunidad}, {p.municipio}</p>
        <p><strong>Fecha:</strong> {new Date(p.inicio).toLocaleDateString('es-MX',{dateStyle:'long',timeZone:'America/Mexico_City'})}</p>
        <Link className="btn btn-outline" to={`/jornadas/${p.jornadaId}`}>Ver jornada</Link>{' '}
        {p.estado==='pendiente' && <button className="btn btn-outline" disabled={trabajando!==null} onClick={()=>retirar(p.id)}>Retirar solicitud</button>}
      </article>)}
    </div>
  </section>;
}
