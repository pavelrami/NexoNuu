import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getInstitutionRequests, submitInstitutionRequest } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';
import '../instituciones-solicitudes.css';

const initial = { nombre: '', tipo: '', descripcion: '', sitioWeb: '' };
const estados = { pendiente:'En revisión', verificada:'Verificada', rechazada:'Rechazada' };
export default function SolicitarInstitucion() {
  const { user } = useAuth();
  const [form, setForm] = useState(initial);
  const [solicitudes, setSolicitudes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  async function cargar() {
    try {
      const result = await getInstitutionRequests();
      setSolicitudes(result.solicitudes || []);
      setError('');
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }
  useEffect(() => { cargar(); }, []);
  const pendiente = solicitudes.some(i => i.estadoVerificacion === 'pendiente' && i.estadoVinculo === 'pendiente');
  const canSubmit = !loading && !pendiente && solicitudes.length < 3;
  const setValue = (key, value) => setForm(old => ({ ...old, [key]: value }));
  async function enviar(event) {
    event.preventDefault(); if (!canSubmit || saving) return;
    setSaving(true); setError(''); setSuccess('');
    try {
      const result = await submitInstitutionRequest(form);
      setSuccess(result.message || 'Solicitud recibida.');
      setForm(initial);
      await cargar();
    } catch (err) { setError(err.message); }
    finally { setSaving(false); }
  }
  return <section className="container inner-page inst-page">
    <span className="section-kicker">Coordinar · Instituciones</span>
    <h1>Solicitar registro institucional</h1>
    <p className="page-intro">Una institución podrá publicar jornadas únicamente después de ser verificada y contar con representantes autorizados. Enviar esta solicitud no concede permisos administrativos.</p>
    <div className="inst-layout">
      <div className="inst-panel">
        <h2>Información de la institución</h2>
        <p className="inst-muted">Utiliza los datos reales de la organización únicamente si tienes autorización para representarla. Para pruebas, emplea una institución claramente ficticia.</p>
        {success && <p className="auth-success" role="status">{success}</p>}
        {error && <p className="auth-error" role="alert">{error}</p>}
        {loading ? <p role="status">Consultando solicitudes...</p> : !canSubmit ? <div className="notice"><strong>No puedes presentar una nueva solicitud ahora.</strong><p>Consulta el estado de la solicitud existente. La revisión administrativa no está implementada aún.</p></div> : <form className="inst-form" onSubmit={enviar}>
          <label htmlFor="inst-nombre">Nombre oficial de la institución *</label>
          <input id="inst-nombre" value={form.nombre} onChange={e=>setValue('nombre',e.target.value)} required minLength={5} maxLength={200} placeholder="Ej. Centro Comunitario DEMO" autoComplete="organization"/>
          <label htmlFor="inst-tipo">Tipo de organización (opcional)</label>
          <select id="inst-tipo" value={form.tipo} onChange={e=>setValue('tipo',e.target.value)}>
            <option value="">Selecciona una opción</option>
            <option value="Institución educativa">Institución educativa</option>
            <option value="Asociación civil">Asociación civil</option>
            <option value="Institución pública">Institución pública</option>
            <option value="Organización comunitaria">Organización comunitaria</option>
            <option value="Institución ficticia de prueba">Institución ficticia de prueba</option>
          </select>
          <label htmlFor="inst-desc">Descripción y actividades que realiza *</label>
          <textarea id="inst-desc" value={form.descripcion} onChange={e=>setValue('descripcion',e.target.value)} required minLength={30} maxLength={2000} rows={5} placeholder="Explica a qué se dedica la institución y su relación con iniciativas educativas."/>
          <label htmlFor="inst-sitio">Sitio web (opcional)</label>
          <input id="inst-sitio" value={form.sitioWeb} onChange={e=>setValue('sitioWeb',e.target.value)} type="url" maxLength={500} placeholder="https://ejemplo.org"/>
          <p className="inst-muted">La solicitud se asociará con tu cuenta: <strong>{user?.correo}</strong>. No podrás asignarte un rol de representante.</p>
          <button className="btn btn-primary" disabled={saving} type="submit">{saving ? 'Enviando...' : 'Enviar solicitud para revisión'}</button>
        </form>}
      </div>
      <aside className="inst-panel inst-side">
        <h2>Mis solicitudes</h2>
        {loading && <p>Consultando...</p>}
        {!loading && solicitudes.length===0 && <p className="inst-muted">Todavía no has solicitado registrar una institución.</p>}
        {solicitudes.map(s => <div className="inst-request" key={s.id}>
          <strong>{s.nombre}</strong>
          <span className={'inst-status status-'+s.estadoVerificacion}>{estados[s.estadoVerificacion] || s.estadoVerificacion}</span>
          <p className="inst-muted">Relación con tu cuenta: {s.estadoVinculo === 'activo' ? 'Autorizada' : s.estadoVinculo === 'revocado' ? 'Revocada' : 'Pendiente de autorización'}</p>
        </div>)}
        <div className="inst-steps">
          <strong>¿Qué ocurrirá después?</strong>
          <p>1. Se registra tu solicitud.</p><p>2. Un administrador revisará la institución.</p><p>3. La representación necesitará aprobación por separado.</p>
          <p className="inst-muted">Las etapas 2 y 3 se implementarán en el siguiente incremento.</p>
        </div>
        <Link className="btn btn-outline" to="/mi-espacio">Volver a Mi espacio</Link>
      </aside>
    </div>
  </section>;
}
