import { useEffect, useState } from 'react';
import '../perfil-voluntario.css';
import { Link } from 'react-router-dom';
import { getVolunteerCatalogs, getVolunteerProfile, saveVolunteerProfile } from '../api.js';
import { PanelCabeza } from '../components/panel/piezas.jsx';

const EMPTY_PROFILE = {
  comunidadId: '', disponibilidad: 'variable', biografia: '', habilidades: [], lenguas: []
};

export default function PerfilVoluntario() {
  const [catalogs, setCatalogs] = useState({ comunidades: [], habilidades: [], lenguas: [], variantes: [] });
  const [profile, setProfile] = useState(EMPTY_PROFILE);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    Promise.all([getVolunteerCatalogs(), getVolunteerProfile()])
      .then(([data, result]) => {
        if (!active) return;
        setCatalogs(data);
        setProfile({
          comunidadId: result.perfil?.comunidadId == null ? '' : String(result.perfil.comunidadId),
          disponibilidad: result.perfil?.disponibilidad ?? 'variable',
          biografia: result.perfil?.biografia ?? '',
          habilidades: (result.perfil?.habilidades ?? []).map(String),
          lenguas: (result.perfil?.lenguas ?? []).map(row => ({
            lenguaId: String(row.lenguaId),
            varianteId: row.varianteId == null ? '' : String(row.varianteId),
            nivel: row.nivel
          }))
        });
      })
      .catch(err => { if (active) setError(err.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const toggleSkill = id => {
    setProfile(current => ({
      ...current,
      habilidades: current.habilidades.includes(id)
        ? current.habilidades.filter(value => value !== id)
        : [...current.habilidades, id]
    }));
    setMessage('');
  };

  const updateLanguage = (index, field, value) => {
    setProfile(current => ({
      ...current,
      lenguas: current.lenguas.map((row, i) => {
        if (i !== index) return row;
        return field === 'lenguaId'
          ? { ...row, lenguaId: value, varianteId: '' }
          : { ...row, [field]: value };
      })
    }));
    setMessage('');
  };

  const submit = async event => {
    event.preventDefault();
    setSaving(true);
    setError('');
    setMessage('');
    if (profile.lenguas.some(row => !row.lenguaId)) {
      setError('Selecciona una lengua en cada fila o elimina las filas vacías.');
      setSaving(false);
      return;
    }
    try {
      const response = await saveVolunteerProfile({
        comunidadId: profile.comunidadId || null,
        disponibilidad: profile.disponibilidad,
        biografia: profile.biografia,
        habilidades: profile.habilidades,
        lenguas: profile.lenguas.map(row => ({
          lenguaId: row.lenguaId,
          varianteId: row.varianteId || null,
          nivel: row.nivel
        }))
      });
      setMessage(response.message);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p className="p-cargando" role="status">Cargando tu perfil de voluntariado…</p>;

  return <div>
    <PanelCabeza kicker="Conectar · Mi perfil" titulo="Mi perfil de voluntariado"
      acciones={<Link to="/mi-espacio" className="btn btn-outline">Volver al inicio</Link>}>
      Comparte únicamente la información con la que deseas colaborar. Tu perfil no se muestra públicamente: solo lo ve la institución de la jornada a la que te postulas. Las lenguas son autodeclaradas, no una certificación.
    </PanelCabeza>

    {error && <p className="auth-error" role="alert">{error}</p>}
    <form className="volunteer-form" onSubmit={submit}>
      <div className="volunteer-section">
        <h2>Ubicación y disponibilidad</h2>
        <div className="volunteer-fields">
          <div className="volunteer-field">
            <label htmlFor="perfil-comunidad">Comunidad de referencia (opcional)</label>
            <select id="perfil-comunidad" value={profile.comunidadId} onChange={e => setProfile({ ...profile, comunidadId: e.target.value })}>
              <option value="">Prefiero no indicarla</option>
              {catalogs.comunidades.map(c => <option key={c.id} value={String(c.id)}>{c.nombre} · {c.municipio}</option>)}
            </select>
          </div>
          <div className="volunteer-field">
            <label htmlFor="perfil-disponibilidad">Disponibilidad</label>
            <select id="perfil-disponibilidad" value={profile.disponibilidad} onChange={e => setProfile({ ...profile, disponibilidad: e.target.value })}>
              <option value="variable">Variable</option>
              <option value="entre_semana">Entre semana</option>
              <option value="fin_semana">Fines de semana</option>
            </select>
          </div>
        </div>
      </div>

      <div className="volunteer-section">
        <h2>Habilidades y formas de apoyar</h2>
        <p className="auth-muted">Puedes seleccionar varias opciones. Las habilidades declaradas no acreditan formación profesional.</p>
        <div className="volunteer-skills">
          {catalogs.habilidades.map(h => <label className="volunteer-check" key={h.id}>
            <input type="checkbox" checked={profile.habilidades.includes(String(h.id))} onChange={() => toggleSkill(String(h.id))}/>
            <span>{h.nombre}</span>
          </label>)}
          {!catalogs.habilidades.length && <p>No hay habilidades cargadas. Ejecuta el script de catálogos.</p>}
        </div>
      </div>

      <div className="volunteer-section">
        <h2>Lenguas y variantes</h2>
        <p className="auth-muted">Indica solo lenguas que realmente hablas. La variante es opcional y aparecerá cuando esté revisada y registrada en el catálogo.</p>
        <div className="volunteer-language-list">
          {profile.lenguas.map((row, index) => {
            const options = catalogs.variantes.filter(item => String(item.lenguaId) === row.lenguaId);
            return <div className="volunteer-language-row" key={index}>
              <div className="volunteer-field">
                <label htmlFor={`lengua-${index}`}>Lengua</label>
                <select id={`lengua-${index}`} value={row.lenguaId} onChange={e => updateLanguage(index, 'lenguaId', e.target.value)}>
                  <option value="">Selecciona una lengua</option>
                  {catalogs.lenguas.map(l => <option key={l.id} value={String(l.id)}>{l.nombre}</option>)}
                </select>
              </div>
              <div className="volunteer-field">
                <label htmlFor={`variante-${index}`}>Variante</label>
                <select id={`variante-${index}`} value={row.varianteId} onChange={e => updateLanguage(index, 'varianteId', e.target.value)} disabled={!options.length}>
                  <option value="">{options.length ? 'Sin especificar' : 'Aún sin catálogo de variantes'}</option>
                  {options.map(v => <option key={v.id} value={String(v.id)}>{v.nombre}</option>)}
                </select>
              </div>
              <div className="volunteer-field">
                <label htmlFor={`nivel-${index}`}>Nivel declarado</label>
                <select id={`nivel-${index}`} value={row.nivel} onChange={e => updateLanguage(index, 'nivel', e.target.value)}>
                  <option value="basico">Básico</option>
                  <option value="conversacional">Conversacional</option>
                  <option value="fluido">Fluido</option>
                </select>
              </div>
              <button type="button" className="header-logout volunteer-remove" onClick={() => setProfile(current => ({ ...current, lenguas: current.lenguas.filter((_, i) => i !== index) }))} aria-label={`Eliminar lengua ${index + 1}`}>Eliminar</button>
            </div>;
          })}
        </div>
        <button type="button" className="btn btn-outline" onClick={() => setProfile(current => ({ ...current, lenguas: [...current.lenguas, { lenguaId: '', varianteId: '', nivel: 'conversacional' }] }))} disabled={profile.lenguas.length >= 12 || !catalogs.lenguas.length}>
          + Añadir lengua
        </button>
      </div>

      <div className="volunteer-section">
        <h2>Presentación personal</h2>
        <div className="volunteer-field">
          <label htmlFor="perfil-biografia">¿Cómo te gustaría colaborar? (opcional)</label>
          <textarea id="perfil-biografia" rows={4} maxLength={700} value={profile.biografia} onChange={e => setProfile({ ...profile, biografia: e.target.value })} placeholder="Comparte brevemente tu experiencia, intereses o disponibilidad..." />
          <small>{profile.biografia.length}/700 caracteres</small>
        </div>
      </div>

      <div className="volunteer-actions">
        <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Guardando...' : 'Guardar mi perfil'}</button>
        {message && <p className="auth-success" role="status">{message}</p>}
      </div>
    </form>
  </div>;
}
