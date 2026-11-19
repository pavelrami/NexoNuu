import { useState } from 'react';
import { createRepresentativeSeguimiento, getRepresentativeSeguimientos } from '../api.js';

export default function SeguimientoJornada({ jornada, institucionId, onError, onSuccess }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [seguimientos, setSeguimientos] = useState([]);
  const [aceptados, setAceptados] = useState(0);
  const [resumen, setResumen] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [confirmados, setConfirmados] = useState(0);
  if (!jornada.gestionable || !['publicada', 'cerrada', 'finalizada'].includes(jornada.estado)) return null;
  async function refresh() {
    const data = await getRepresentativeSeguimientos(institucionId, jornada.id);
    setSeguimientos(data.seguimientos || []);
    setAceptados(Number(data.aceptados || 0));
  }
  async function toggle() {
    if (open) { setOpen(false); return; }
    setLoading(true);
    try { await refresh(); setOpen(true); }
    catch (error) { onError(error.message); }
    finally { setLoading(false); }
  }
  async function save(event) {
    event.preventDefault(); if (loading) return;
    setLoading(true);
    try {
      const data = await createRepresentativeSeguimiento(institucionId, jornada.id, {
        resumen, observaciones, participantesConfirmados: Number(confirmados)
      });
      onSuccess(data.message);
      setResumen(''); setObservaciones(''); setConfirmados(0);
      await refresh();
    } catch (error) { onError(error.message); }
    finally { setLoading(false); }
  }
  return <div className="panel-inst-follow">
    <button type="button" className="btn btn-outline" disabled={loading} aria-expanded={open} onClick={toggle}>
      {open ? 'Ocultar seguimiento' : 'Registrar seguimiento'}
    </button>
    {open && <div className="panel-inst-follow-body">
      <h3>Seguimiento de coordinación</h3>
      <p className="panel-inst-sub">Notas operativas de coordinación. No son una lista de asistencia ni prueban resultados educativos.</p>
      <div className="panel-inst-follow-stats"><strong>{aceptados}</strong><span>Postulaciones aceptadas</span><strong>{seguimientos.length}</strong><span>Notas mostradas</span></div>
      <form onSubmit={save} className="panel-inst-form">
        <label htmlFor={`resumen-${jornada.id}`}>Resumen de coordinación *</label>
        <textarea id={`resumen-${jornada.id}`} required minLength={30} maxLength={1200} rows={3} value={resumen} onChange={e => setResumen(e.target.value)} placeholder="Ejemplo: Revisamos el material de lectura y distribuimos responsabilidades entre las personas voluntarias." />
        <label htmlFor={`confirmados-${jornada.id}`}>Personas confirmadas para la coordinación</label>
        <input id={`confirmados-${jornada.id}`} type="number" min={0} max={aceptados} required value={confirmados} onChange={e => setConfirmados(e.target.value)} />
        <p className="panel-inst-sub">Máximo permitido: {aceptados}, según solicitudes aceptadas. No representa asistencia efectiva.</p>
        <label htmlFor={`obs-${jornada.id}`}>Observaciones (opcional)</label>
        <textarea id={`obs-${jornada.id}`} maxLength={800} rows={2} value={observaciones} onChange={e => setObservaciones(e.target.value)} />
        <button type="submit" className="btn btn-primary" disabled={loading || resumen.trim().length < 30 || Number(confirmados) > aceptados}>{loading ? 'Guardando…' : 'Guardar nota'}</button>
      </form>
      <h4>Historial de notas ({seguimientos.length})</h4>
      {seguimientos.length === 0 ? <p className="panel-inst-sub">Aún no hay notas de seguimiento.</p> : <ol className="panel-inst-follow-list">{seguimientos.map(s => <li key={s.id}>
        <strong>{new Date(s.fecha).toLocaleString('es-MX')}</strong><span> · {s.responsable}</span>
        <p>{s.resumen}</p><small>Confirmados para coordinación: {s.participantes_confirmados}</small>
        {s.observaciones && <p className="panel-inst-sub">Observaciones: {s.observaciones}</p>}
      </li>)}</ol>}
    </div>}
  </div>;
}
