import { useId, useState } from 'react';

// Botón que abre un pequeño formulario para escribir el motivo antes de confirmar una decisión.
// Toda decisión administrativa o institucional queda registrada con su motivo.
export default function AccionConMotivo({ etiqueta, confirmar = 'Confirmar', minimo = 10, variante = 'outline', peligro = false, disabled, onConfirm, ayuda }) {
  const id = useId();
  const [abierto, setAbierto] = useState(false);
  const [motivo, setMotivo] = useState('');
  const [busy, setBusy] = useState(false);
  const valido = motivo.trim().length >= minimo;
  async function enviar(event) {
    event.preventDefault();
    if (!valido || busy) return;
    setBusy(true);
    try { const ok = await onConfirm(motivo.trim()); if (ok !== false) { setMotivo(''); setAbierto(false); } }
    finally { setBusy(false); }
  }
  if (!abierto) {
    return <button type="button" className={`btn btn-sm btn-${variante}${peligro ? ' btn-peligro' : ''}`} disabled={disabled} onClick={() => setAbierto(true)}>{etiqueta}</button>;
  }
  return <form className="accion-motivo" onSubmit={enviar}>
    <label htmlFor={id}>{ayuda || `Motivo (mínimo ${minimo} caracteres)`}</label>
    <textarea id={id} rows={2} maxLength={1000} value={motivo} onChange={(e) => setMotivo(e.target.value)} autoFocus />
    <div className="accion-motivo-botones">
      <button type="submit" className={`btn btn-sm btn-primary${peligro ? ' btn-peligro-solido' : ''}`} disabled={!valido || busy}>{busy ? 'Guardando…' : confirmar}</button>
      <button type="button" className="btn btn-sm btn-outline" onClick={() => { setAbierto(false); setMotivo(''); }} disabled={busy}>Cancelar</button>
    </div>
  </form>;
}
