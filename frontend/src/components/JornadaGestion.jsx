import { useState } from 'react';
import { editRepresentativeDraft, transitionRepresentativeDemo, getRepresentativeJornadaHistory } from '../api.js';

function localDateTime(value) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return '';
  const p = n => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}T${p(date.getHours())}:${p(date.getMinutes())}`;
}
function formFrom(j) {
  return { titulo: j.titulo, descripcion: j.descripcion, comunidadId: String(j.comunidad_id || ''),
    inicio: localDateTime(j.inicio), fin: localDateTime(j.fin), cupo: j.cupo };
}
const actions = { cerrar: 'Cerrar inscripciones', cancelar: 'Cancelar jornada', finalizar: 'Finalizar jornada' };

export default function JornadaGestion({ jornada, institucionId, comunidades, onUpdated, onError, onSuccess }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(() => formFrom(jornada));
  const [selectedAction, setSelectedAction] = useState('');
  const [motivo, setMotivo] = useState('');
  const [busy, setBusy] = useState(false);
  const [history, setHistory] = useState(null);
  const [showHistory, setShowHistory] = useState(false);
  const [abierto, setAbierto] = useState(false);
  if (!jornada.gestionable) return null;
  const pending = Number(jornada.pendientes || 0), accepted = Number(jornada.aceptadas || 0);
  const options = [];
  if (jornada.estado === 'borrador') options.push('cancelar');
  if (jornada.estado === 'publicada') {
    if (pending === 0) options.push('cerrar');
    if (pending === 0 && accepted === 0) options.push('cancelar');
  }
  if (jornada.estado === 'cerrada' && new Date(jornada.fin).getTime() <= Date.now()) options.push('finalizar');
  const change = (key, value) => setDraft(previous => ({ ...previous, [key]: value }));
  async function saveEdit(event) {
    event.preventDefault(); if (busy) return;
    setBusy(true);
    try {
      const payload = { ...draft, cupo: Number(draft.cupo), inicio: new Date(draft.inicio).toISOString(), fin: new Date(draft.fin).toISOString() };
      const data = await editRepresentativeDraft(institucionId, jornada.id, payload);
      onSuccess(data.message); setEditing(false); await onUpdated();
    } catch (error) { onError(error.message); }
    finally { setBusy(false); }
  }
  async function changeStatus(event) {
    event.preventDefault(); if (busy || !selectedAction || motivo.trim().length < 12) return;
    if (!window.confirm(`¿Confirmas: ${actions[selectedAction]}? La acción quedará registrada.`)) return;
    setBusy(true);
    try {
      const data = await transitionRepresentativeDemo(institucionId, jornada.id, selectedAction, motivo);
      onSuccess(data.message); setSelectedAction(''); setMotivo(''); await onUpdated();
    } catch (error) { onError(error.message); }
    finally { setBusy(false); }
  }
  async function toggleHistory() {
    if (showHistory) { setShowHistory(false); return; }
    setBusy(true);
    try { const data = await getRepresentativeJornadaHistory(institucionId, jornada.id); setHistory(data.historial || []); setShowHistory(true); }
    catch (error) { onError(error.message); }
    finally { setBusy(false); }
  }
  if (!abierto) {
    return <button type="button" className="btn btn-outline btn-sm panel-inst-toggle" aria-expanded="false" onClick={() => setAbierto(true)}>
      Gestionar jornada (editar, cerrar, historial)
    </button>;
  }
  return <div className="panel-inst-manage">
    <div className="panel-inst-manage-head">
      <h3>Gestionar jornada</h3>
      <button type="button" className="btn btn-outline btn-sm" aria-expanded="true" onClick={() => setAbierto(false)}>Ocultar</button>
    </div>
    {jornada.estado === 'borrador' && <>
      <button type="button" className="btn btn-outline" disabled={busy} onClick={() => { setDraft(formFrom(jornada)); setEditing(!editing); }}>{editing ? 'Ocultar edición' : 'Editar borrador'}</button>
      {editing && <form className="panel-inst-form panel-inst-editor" onSubmit={saveEdit}>
        <label htmlFor={`edit-title-${jornada.id}`}>Título</label><input id={`edit-title-${jornada.id}`} required minLength={8} maxLength={220} value={draft.titulo} onChange={e => change('titulo', e.target.value)} />
        <label htmlFor={`edit-description-${jornada.id}`}>Descripción</label><textarea id={`edit-description-${jornada.id}`} rows={3} required minLength={30} maxLength={2000} value={draft.descripcion} onChange={e => change('descripcion', e.target.value)} />
        <label htmlFor={`edit-community-${jornada.id}`}>Comunidad</label><select id={`edit-community-${jornada.id}`} required value={draft.comunidadId} onChange={e => change('comunidadId', e.target.value)}><option value="">Seleccionar</option>{comunidades.map(c => <option value={c.id} key={c.id}>{c.nombre}, {c.municipio}</option>)}</select>
        <div className="panel-inst-two"><div><label htmlFor={`edit-start-${jornada.id}`}>Inicio</label><input id={`edit-start-${jornada.id}`} type="datetime-local" required value={draft.inicio} onChange={e => change('inicio', e.target.value)} /></div><div><label htmlFor={`edit-end-${jornada.id}`}>Fin</label><input id={`edit-end-${jornada.id}`} type="datetime-local" required value={draft.fin} onChange={e => change('fin', e.target.value)} /></div></div>
        <label htmlFor={`edit-capacity-${jornada.id}`}>Cupo</label><input id={`edit-capacity-${jornada.id}`} type="number" min={1} max={500} required value={draft.cupo} onChange={e => change('cupo', Number(e.target.value))}/>
        <button className="btn btn-primary" type="submit" disabled={busy}>{busy ? 'Guardando...' : 'Guardar cambios'}</button>
      </form>}
    </>}
    {pending > 0 && jornada.estado === 'publicada' && <p className="panel-inst-sub">Resuelve las {pending} solicitud(es) pendientes antes de cerrar las inscripciones.</p>}
    {accepted > 0 && jornada.estado === 'publicada' && <p className="panel-inst-sub">Hay {accepted} persona(s) aceptadas; no se puede cancelar para proteger sus solicitudes.</p>}
    {options.length > 0 && <form className="panel-inst-lifecycle" onSubmit={changeStatus}>
      <label htmlFor={`action-${jornada.id}`}>Cambiar estado de la jornada</label>
      <select id={`action-${jornada.id}`} value={selectedAction} required onChange={e => setSelectedAction(e.target.value)}><option value="">Selecciona una acción</option>{options.map(a => <option key={a} value={a}>{actions[a]}</option>)}</select>
      <label htmlFor={`reason-${jornada.id}`}>Motivo de la decisión (mínimo 12 caracteres)</label>
      <textarea id={`reason-${jornada.id}`} rows={2} required minLength={12} maxLength={500} value={motivo} onChange={e => setMotivo(e.target.value)} placeholder="Explica por qué realizas este cambio..." />
      <button className="btn btn-outline" type="submit" disabled={busy || !selectedAction || motivo.trim().length < 12}>{busy ? 'Procesando...' : 'Confirmar cambio'}</button>
    </form>}
    <button className="btn btn-outline" type="button" disabled={busy} onClick={toggleHistory}>{showHistory ? 'Ocultar historial' : 'Ver historial de cambios'}</button>
    {showHistory && <div className="panel-inst-history"><h4>Historial de la jornada</h4>{history?.length ? <ul>{history.map(h => <li key={h.id}><strong>{h.accion}</strong> · {new Date(h.creado_en).toLocaleString('es-MX')}<div>{h.estado_anterior} → {h.estado_nuevo}</div><div>Motivo: {h.motivo}</div></li>)}</ul> : <p>Sin cambios registrados todavía.</p>}</div>}
  </div>;
}
