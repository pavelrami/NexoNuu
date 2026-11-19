import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { getJornadasConFiltros, getOpcionesJornadas } from '../api.js';
import { Icon } from '../components/Icons.jsx';
import JornadaCard from '../components/JornadaCard.jsx';
import Nuu from '../components/Nuu.jsx';
import { Topo } from '../components/Adornos.jsx';
import { REGIONES, normalizar, regionDe } from '../data/fuentes.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useMotion } from '../motion/useMotion.js';
import '../jornadas-filtros.css';

const CAMPOS = ['buscar', 'region', 'municipio', 'desde', 'hasta', 'lenguaId'];
const VACIOS = { buscar: '', region: '', municipio: '', desde: '', hasta: '', lenguaId: '' };
const ETIQUETAS = { buscar: 'Texto', region: 'Región', municipio: 'Municipio', desde: 'Desde', hasta: 'Hasta', lenguaId: 'Lengua' };

const isoLocal = (d) => {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};
const fechaLegible = (v) => {
  const d = new Date(`${v}T12:00:00`);
  return Number.isFinite(d.getTime()) ? d.toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' }) : v;
};

export default function Jornadas() {
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const clave = params.toString();
  const aplicados = useMemo(() => {
    const out = { ...VACIOS };
    CAMPOS.forEach((c) => { const v = params.get(c); if (v) out[c] = v.slice(0, 140); });
    return out;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clave]);
  const [borrador, setBorrador] = useState(aplicados);
  const [estado, setEstado] = useState({ fase: 'loading', items: [], total: 0, error: '' });
  const [opciones, setOpciones] = useState({ regiones: [], municipios: [], lenguas: [] });
  const [errorOpciones, setErrorOpciones] = useState('');
  const [orden, setOrden] = useState('proximas');
  const [abierto, setAbierto] = useState(false);
  const pageRef = useRef(null);
  const listRef = useRef(null);

  useEffect(() => { setBorrador(aplicados); }, [aplicados]);

  useEffect(() => {
    const controller = new AbortController();
    getOpcionesJornadas({ signal: controller.signal })
      .then((data) => setOpciones({
        regiones: Array.isArray(data.regiones) ? data.regiones : [],
        municipios: Array.isArray(data.municipios) ? data.municipios : [],
        lenguas: Array.isArray(data.lenguas) ? data.lenguas : [],
      }))
      .catch((error) => { if (!controller.signal.aborted) setErrorOpciones(error.message); });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    setEstado((prev) => ({ ...prev, fase: 'loading', error: '' }));
    getJornadasConFiltros({ signal: controller.signal, filtros: aplicados })
      .then((data) => { if (!controller.signal.aborted) setEstado({ fase: 'done', items: data.jornadas, total: data.total, error: '' }); })
      .catch((error) => { if (!controller.signal.aborted) setEstado({ fase: 'error', items: [], total: 0, error: error.message }); });
    return () => controller.abort();
  }, [aplicados]);

  useMotion(pageRef, null, []);
  useMotion(listRef, null, [estado.fase, orden, clave]);

  const municipios = useMemo(() => {
    const list = opciones.municipios.filter((item) => !borrador.region || item.region === borrador.region);
    return [...new Set(list.map((item) => item.municipio).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'es-MX'));
  }, [opciones.municipios, borrador.region]);

  const ordenadas = useMemo(() => {
    const items = [...estado.items];
    if (orden === 'lejanas') items.sort((a, b) => new Date(b.inicio) - new Date(a.inicio));
    if (orden === 'nombre') items.sort((a, b) => a.titulo.localeCompare(b.titulo, 'es-MX'));
    return items;
  }, [estado.items, orden]);

  // Conteo por región de los resultados visibles y regiones disponibles en la base.
  const porRegion = useMemo(() => {
    const cuenta = {};
    estado.items.forEach((j) => { const r = regionDe(j.region || ''); if (r) cuenta[r.clave] = (cuenta[r.clave] || 0) + 1; });
    return cuenta;
  }, [estado.items]);
  const regionReal = (clave) => opciones.regiones.find((nombre) => normalizar(nombre).includes(clave)) || '';

  const hayFiltros = Object.values(aplicados).some(Boolean);
  const aplicarFiltros = (f) => {
    const limpio = {};
    CAMPOS.forEach((c) => { if (f[c] && String(f[c]).trim()) limpio[c] = String(f[c]).trim(); });
    setParams(limpio);
  };
  const actualizar = (campo, valor) => setBorrador((prev) => ({ ...prev, [campo]: valor, ...(campo === 'region' ? { municipio: '' } : {}) }));
  const limpiar = () => { setBorrador({ ...VACIOS }); setParams({}); };
  const aplicar = (event) => { event.preventDefault(); aplicarFiltros(borrador); setAbierto(false); };
  const quitar = (campo) => aplicarFiltros({ ...aplicados, [campo]: '', ...(campo === 'region' ? { municipio: '' } : {}) });
  const proximasDosSemanas = () => {
    const hoy = new Date();
    const fin = new Date(); fin.setDate(fin.getDate() + 14);
    aplicarFiltros({ ...aplicados, desde: isoLocal(hoy), hasta: isoLocal(fin) });
  };
  const elegirRegion = (clave) => {
    const nombre = regionReal(clave);
    if (!nombre) return;
    aplicarFiltros({ ...aplicados, region: aplicados.region === nombre ? '' : nombre, municipio: '' });
  };
  const etiquetaValor = (campo, valor) => {
    if (campo === 'lenguaId') return opciones.lenguas.find((l) => String(l.id) === valor)?.nombre || valor;
    if (campo === 'desde' || campo === 'hasta') return fechaLegible(valor);
    return valor;
  };
  const tabActiva = aplicados.desde && aplicados.hasta ? 'proximas' : (!hayFiltros ? 'todas' : '');

  return <div className="jornadas-page" ref={pageRef}>
    <section className="page-hero">
      <Topo className="page-hero-topo" seed={3} centros={[[0.85, 0.2, 7]]} />
      <div className="container">
        <span className="kicker" data-reveal>Módulos Informar · Conectar</span>
        <h1 data-split>Jornadas y oportunidades de participación</h1>
        <p className="page-intro" data-reveal>Explora jornadas de alfabetización publicadas por instituciones verificadas en Oaxaca. Las actividades de demostración se identifican como tales y no son convocatorias reales.</p>
        <div className="tabs-rapidas" role="group" aria-label="Vistas rápidas" data-reveal>
          <button type="button" className={`tab${tabActiva === 'todas' ? ' is-active' : ''}`} onClick={limpiar}><Icon name="list" size={17} /> Todas</button>
          <button type="button" className={`tab${tabActiva === 'proximas' ? ' is-active' : ''}`} onClick={proximasDosSemanas}><Icon name="calendar" size={17} /> Próximas 2 semanas</button>
          <Link className="tab" to={user ? '/mis-postulaciones' : '/iniciar-sesion'}><Icon name="flag" size={17} /> Mis postulaciones</Link>
        </div>
      </div>
    </section>

    <div className="container jornadas-cuerpo">
      <form className={`filtros-jornadas${abierto ? ' is-open' : ''}`} onSubmit={aplicar} role="search" data-reveal>
        <div className="filtros-jornadas__cabecera">
          <h2>Buscar jornadas</h2>
          <button type="button" className="filtros-toggle btn btn-outline btn-sm" aria-expanded={abierto} aria-controls="filtros-campos" onClick={() => setAbierto((v) => !v)}>
            <Icon name="layers" size={16} /> {abierto ? 'Ocultar filtros' : 'Más filtros'}
          </button>
        </div>
        <div className="filtros-jornadas__campos" id="filtros-campos">
          <div className="filtro-campo filtro-campo--ancho filtro-campo--buscar">
            <label htmlFor="f-buscar">Palabra clave</label>
            <div className="input-icono"><Icon name="search" size={18} />
              <input id="f-buscar" type="search" value={borrador.buscar} maxLength={100} onChange={(e) => actualizar('buscar', e.target.value)} placeholder="Alfabetización, comunidad, institución…" />
            </div>
          </div>
          <div className="filtro-campo filtro-extra">
            <label htmlFor="f-region">Región</label>
            <select id="f-region" value={borrador.region} onChange={(e) => actualizar('region', e.target.value)}>
              <option value="">Todas las regiones</option>
              {opciones.regiones.map((region) => <option value={region} key={region}>{region}</option>)}
            </select>
          </div>
          <div className="filtro-campo filtro-extra">
            <label htmlFor="f-municipio">Municipio</label>
            <select id="f-municipio" value={borrador.municipio} onChange={(e) => actualizar('municipio', e.target.value)}>
              <option value="">Todos los municipios</option>
              {municipios.map((m) => <option value={m} key={m}>{m}</option>)}
            </select>
          </div>
          <div className="filtro-campo filtro-extra">
            <label htmlFor="f-desde">Desde</label>
            <input id="f-desde" type="date" value={borrador.desde} max={borrador.hasta || undefined} onChange={(e) => actualizar('desde', e.target.value)} />
          </div>
          <div className="filtro-campo filtro-extra">
            <label htmlFor="f-hasta">Hasta</label>
            <input id="f-hasta" type="date" value={borrador.hasta} min={borrador.desde || undefined} onChange={(e) => actualizar('hasta', e.target.value)} />
          </div>
          {opciones.lenguas.length > 0 && <div className="filtro-campo filtro-extra">
            <label htmlFor="f-lengua">Lengua solicitada</label>
            <select id="f-lengua" value={borrador.lenguaId} onChange={(e) => actualizar('lenguaId', e.target.value)}>
              <option value="">Cualquier lengua</option>
              {opciones.lenguas.map((l) => <option key={l.id} value={String(l.id)}>{l.nombre}</option>)}
            </select>
          </div>}
        </div>
        {errorOpciones && <p className="filtros-jornadas__nota" role="status">Los filtros de ubicación no se pudieron cargar: {errorOpciones}. Aún puedes buscar por texto o fecha.</p>}
        <div className="filtros-jornadas__pie">
          {hayFiltros && <ul className="chips-activos" aria-label="Filtros aplicados">
            {CAMPOS.filter((c) => aplicados[c]).map((c) => <li key={c}>
              <button type="button" className="chip-activo" onClick={() => quitar(c)} aria-label={`Quitar filtro ${ETIQUETAS[c]}: ${etiquetaValor(c, aplicados[c])}`}>
                <span>{ETIQUETAS[c]}:</span> {etiquetaValor(c, aplicados[c])} <Icon name="close" size={14} />
              </button>
            </li>)}
          </ul>}
          <div className="filtros-jornadas__acciones">
            <button className="btn btn-primary" type="submit"><Icon name="search" size={17} /> Aplicar filtros</button>
            <button className="btn btn-outline" type="button" onClick={limpiar}>Limpiar filtros</button>
          </div>
        </div>
      </form>

      <div className="jornadas-layout">
        <div className="jornadas-main" ref={listRef}>
          <div className="jornadas-resultados" aria-live="polite" aria-atomic="true">
            <h2>Resultados {estado.fase === 'done' && <span>({estado.items.length} {estado.items.length === 1 ? 'jornada' : 'jornadas'}{estado.total > estado.items.length ? ` de ${estado.total}` : ''})</span>}</h2>
            {estado.fase === 'loading' && <p>Buscando jornadas…</p>}
            {estado.fase === 'done' && estado.items.length > 1 && <label className="orden">Ordenar por
              <select value={orden} onChange={(e) => setOrden(e.target.value)}>
                <option value="proximas">Fecha más próxima</option>
                <option value="lejanas">Fecha más lejana</option>
                <option value="nombre">Nombre (A–Z)</option>
              </select>
            </label>}
          </div>
          {estado.fase === 'loading' && <div className="j-grid j-grid--2" aria-hidden="true">{[0, 1].map((i) => <div key={i} className="j-esqueleto" />)}</div>}
          {estado.fase === 'error' && <div className="notice notice-warning" role="alert">
            <strong>No se pudieron consultar las jornadas.</strong><p>{estado.error}</p>
            <small>Comprueba que el servidor de la API esté en marcha y PostgreSQL conectado.</small>
          </div>}
          {estado.fase === 'done' && estado.items.length === 0 && <div className="vacio" data-reveal>
            <Nuu className="vacio-nuu" />
            <div>
              <h3>{hayFiltros ? 'No encontramos jornadas con esos filtros' : 'Todavía no hay jornadas publicadas'}</h3>
              <p>{hayFiltros ? 'Prueba otra fecha, región o palabra clave.' : 'Las convocatorias futuras verificadas aparecerán aquí.'}</p>
              {hayFiltros && <button className="btn btn-outline btn-sm limpiar-vacio" type="button" onClick={limpiar}>Ver todas las próximas jornadas</button>}
            </div>
          </div>}
          {estado.fase === 'done' && estado.items.length > 0 && <div className="j-grid j-grid--2">
            {ordenadas.map((j) => <JornadaCard key={j.id} j={j} />)}
          </div>}
          <p className="jornadas-aclaracion">Las jornadas finalizadas, como la referencia histórica del IEEA Oaxaca, no aparecen entre las oportunidades vigentes. Consúltalas en <Link to="/seguimiento">Seguimiento</Link>, con su fuente y sin opción de postularse.</p>
        </div>

        <aside className="jornadas-aside" aria-label="Regiones de Oaxaca" data-reveal>
          <div className="regiones-card">
            <h2><Icon name="map" size={19} /> Regiones de Oaxaca</h2>
            <p>Toca una región para filtrar. El número indica cuántas jornadas visibles hay en ella.</p>
            <div className="regiones-mapa">
              {REGIONES.map((r) => {
                const nombre = regionReal(r.clave);
                const activa = nombre && aplicados.region === nombre;
                const n = porRegion[r.clave] || 0;
                return <button key={r.clave} type="button" style={{ gridArea: r.area }}
                  className={`region${activa ? ' is-active' : ''}${n ? ' tiene' : ''}`}
                  disabled={!nombre} onClick={() => elegirRegion(r.clave)}
                  aria-pressed={Boolean(activa)}
                  title={nombre ? `Filtrar por ${nombre}` : 'Sin comunidades registradas todavía'}>
                  <span>{r.nombre}</span>{n > 0 && <strong>{n}</strong>}
                </button>;
              })}
            </div>
            <p className="regiones-nota">Esquema por regiones, no a escala. Las regiones en gris aún no tienen comunidades registradas en la plataforma.</p>
          </div>
          <div className="aside-cta">
            <Nuu className="aside-nuu" />
            <p><strong>¿Representas a una institución?</strong> Publica jornadas después de verificar tu institución.</p>
            <Link className="btn btn-outline btn-sm" to="/instituciones">Conocer el proceso <Icon name="arrow" size={15} /></Link>
          </div>
        </aside>
      </div>
    </div>
  </div>;
}
