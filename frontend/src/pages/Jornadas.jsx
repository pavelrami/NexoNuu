import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { getJornadasConFiltros, getOpcionesJornadas } from '../api.js';
import { Icon } from '../components/Icons.jsx';
import '../jornadas-filtros.css';

const VACIOS = { buscar: '', region: '', municipio: '', desde: '', hasta: '', lenguaId: '' };
const dateFormat = new Intl.DateTimeFormat('es-MX', {
  dateStyle: 'long', timeZone: 'America/Mexico_City'
});

function esDemostracion(jornada) {
  // Etiqueta de prueba hasta que exista una marca persistente específica.
  return /\bdemo\b|demostrativ/i.test(`${jornada.titulo} ${jornada.institucion}`);
}

export default function Jornadas() {
  const [borrador, setBorrador] = useState({ ...VACIOS });
  const [aplicados, setAplicados] = useState({ ...VACIOS });
  const [estado, setEstado] = useState({ fase: 'loading', items: [], total: 0, error: '' });
  const [opciones, setOpciones] = useState({ regiones: [], municipios: [], lenguas: [] });
  const [errorOpciones, setErrorOpciones] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    getOpcionesJornadas({ signal: controller.signal })
      .then(data => setOpciones({
        regiones: Array.isArray(data.regiones) ? data.regiones : [],
        municipios: Array.isArray(data.municipios) ? data.municipios : [],
        lenguas: Array.isArray(data.lenguas) ? data.lenguas : []
      }))
      .catch(error => { if (!controller.signal.aborted) setErrorOpciones(error.message); });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    setEstado(prev => ({ ...prev, fase: 'loading', error: '' }));
    getJornadasConFiltros({ signal: controller.signal, filtros: aplicados })
      .then(data => {
        if (!controller.signal.aborted) {
          setEstado({ fase: 'done', items: data.jornadas, total: data.total, error: '' });
        }
      })
      .catch(error => {
        if (!controller.signal.aborted) setEstado({ fase: 'error', items: [], total: 0, error: error.message });
      });
    return () => controller.abort();
  }, [aplicados]);

  const municipios = useMemo(() => {
    const list = opciones.municipios.filter(item => !borrador.region || item.region === borrador.region);
    return [...new Set(list.map(item => item.municipio).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'es-MX'));
  }, [opciones.municipios, borrador.region]);

  const hayFiltros = Object.values(aplicados).some(Boolean);
  const actualizar = (campo, valor) => setBorrador(prev => ({
    ...prev,
    [campo]: valor,
    ...(campo === 'region' ? { municipio: '' } : {})
  }));
  const limpiar = () => { setBorrador({ ...VACIOS }); setAplicados({ ...VACIOS }); };
  const aplicar = event => { event.preventDefault(); setAplicados({ ...borrador }); };

  return <section className="container inner-page">
    <span className="section-kicker">Módulos Informar · Conectar</span>
    <h1>Jornadas y oportunidades de participación</h1>
    <p className="page-intro">Explora jornadas futuras publicadas por instituciones verificadas. La búsqueda consulta PostgreSQL mediante nuestra API. Las actividades de demostración se identifican como ficticias y no admiten postulaciones.</p>

    <form className="filtros-jornadas" onSubmit={aplicar} role="search">
      <div className="filtros-jornadas__cabecera">
        <h2>Buscar oportunidades</h2>
        <p>Filtra por palabra clave, ubicación o fecha. Puedes combinar opciones.</p>
      </div>
      <div className="filtros-jornadas__campos">
        <div className="filtro-campo filtro-campo--ancho">
          <label htmlFor="f-buscar">Palabra clave</label>
          <input id="f-buscar" type="search" value={borrador.buscar}
            maxLength={100} onChange={e => actualizar('buscar', e.target.value)}
            placeholder="Alfabetización, comunidad, institución..." />
        </div>
        <div className="filtro-campo">
          <label htmlFor="f-region">Región</label>
          <select id="f-region" value={borrador.region} onChange={e => actualizar('region', e.target.value)}>
            <option value="">Todas las regiones</option>
            {opciones.regiones.map(region => <option value={region} key={region}>{region}</option>)}
          </select>
        </div>
        <div className="filtro-campo">
          <label htmlFor="f-municipio">Municipio</label>
          <select id="f-municipio" value={borrador.municipio} onChange={e => actualizar('municipio', e.target.value)}>
            <option value="">Todos los municipios</option>
            {municipios.map(municipio => <option value={municipio} key={municipio}>{municipio}</option>)}
          </select>
        </div>
        <div className="filtro-campo">
          <label htmlFor="f-desde">Desde</label>
          <input id="f-desde" type="date" value={borrador.desde}
            max={borrador.hasta || undefined} onChange={e => actualizar('desde', e.target.value)} />
        </div>
        <div className="filtro-campo">
          <label htmlFor="f-hasta">Hasta</label>
          <input id="f-hasta" type="date" value={borrador.hasta}
            min={borrador.desde || undefined} onChange={e => actualizar('hasta', e.target.value)} />
        </div>
        {opciones.lenguas.length > 0 && <div className="filtro-campo">
          <label htmlFor="f-lengua">Lengua solicitada</label>
          <select id="f-lengua" value={borrador.lenguaId} onChange={e => actualizar('lenguaId', e.target.value)}>
            <option value="">Cualquier lengua</option>
            {opciones.lenguas.map(lengua => <option key={lengua.id} value={String(lengua.id)}>{lengua.nombre}</option>)}
          </select>
        </div>}
      </div>
      {errorOpciones && <p className="filtros-jornadas__nota" role="status">Los filtros de ubicación no se pudieron cargar: {errorOpciones}. Aún puedes buscar por texto o fecha.</p>}
      <div className="filtros-jornadas__acciones">
        <button className="btn btn-primary" type="submit">Aplicar filtros</button>
        <button className="btn btn-outline" type="button" onClick={limpiar}>Limpiar filtros</button>
      </div>
    </form>

    <div className="jornadas-resultados" aria-live="polite" aria-atomic="true">
      <h2>Resultados</h2>
      {estado.fase === 'done' && <p>{estado.items.length} {estado.items.length === 1 ? 'jornada mostrada' : 'jornadas mostradas'}{estado.total > estado.items.length ? ` de ${estado.total} coincidencias` : ''}</p>}
      {estado.fase === 'loading' && <p>Buscando jornadas...</p>}
    </div>
    {estado.fase === 'error' && <div className="notice notice-warning" role="alert">
      <strong>No se pudieron consultar las jornadas.</strong><p>{estado.error}</p>
      <small>Comprueba que Express esté ejecutándose y PostgreSQL conectado.</small>
    </div>}
    {estado.fase === 'done' && estado.items.length === 0 && <div className="empty-state">
      <div className="empty-icon"><Icon name="calendar" size={36}/></div>
      <h2>{hayFiltros ? 'No encontramos jornadas con esos filtros' : 'Todavía no hay jornadas publicadas'}</h2>
      <p>{hayFiltros ? 'Prueba otra fecha, región o palabra clave.' : 'Las convocatorias futuras verificadas aparecerán aquí.'}</p>
      {hayFiltros && <button className="btn btn-outline limpiar-vacio" type="button" onClick={limpiar}>Ver todas las próximas jornadas</button>}
    </div>}
    {estado.fase === 'done' && estado.items.length > 0 && <div className="jornada-grid">
      {estado.items.map(j => <article className="jornada-card" key={j.id}>
        <span className="chip">{esDemostracion(j) ? 'DEMOSTRACIÓN · No es una convocatoria real' : 'Jornada publicada'}</span>
        <h2>{j.titulo}</h2>
        <p>{j.descripcion}</p>
        <div className="meta"><Icon name="pin" size={18}/>{j.comunidad}, {j.municipio}{j.region ? ` · ${j.region}` : ''}</div>
        <div className="meta"><Icon name="calendar" size={18}/>{dateFormat.format(new Date(j.inicio))}</div>
        <p className="source">Institución: {j.institucion}</p>
        <Link className="btn btn-outline" to={`/jornadas/${j.id}`}>Ver detalles</Link>
        <p className="micro-note">Consulta informativa. Las postulaciones todavía no están habilitadas.</p>
      </article>)}
    </div>}
    <p className="jornadas-aclaracion">Las jornadas finalizadas, como la referencia histórica del IEEA, no aparecen entre las oportunidades vigentes. Más adelante tendrán una sección histórica independiente, con su fuente y sin opción de postularse.</p>
  </section>;
}
