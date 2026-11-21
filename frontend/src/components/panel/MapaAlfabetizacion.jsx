import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '../Icons.jsx';
import { REGIONES } from '../../data/fuentes.js';
import { SITIOS_ALFA, TIPOS_ALFA, FUENTES_ALFA, CONSULTA_ALFA, CONTACTO_IEEA } from '../../data/alfabetizacion-oaxaca.js';

// Mapa real de Oaxaca (OpenStreetMap + Leaflet) con las sedes públicas de alfabetización:
// sede central del IEEA, coordinaciones de zona y plazas comunitarias. Los marcadores son rombos,
// como el isotipo de Nexo Ñuu. La lista es la alternativa accesible y funciona sin el mapa.

const LIMITES = [[15.55, -98.75], [18.75, -93.75]];
const CENTRO = [17.05, -96.6];
const ORDEN = ['plaza', 'zona', 'sede'];
const comoLlegar = (s) => `https://www.google.com/maps/dir/?api=1&destination=${s.lat},${s.lng}`;
const verEnOsm = (s) => `https://www.openstreetmap.org/?mlat=${s.lat}&mlon=${s.lng}#map=15/${s.lat}/${s.lng}`;
const nombreRegion = (k) => REGIONES.find((r) => r.clave === k)?.nombre || '';

function nodo(tag, clase, texto) { const e = document.createElement(tag); if (clase) e.className = clase; if (texto) e.textContent = texto; return e; }

// Ficha del marcador, armada con nodos (sin HTML en texto) para no inyectar nada por error.
function ficha(s) {
  const raiz = nodo('div', 'p-alfa-ficha');
  raiz.append(nodo('span', `p-alfa-tipo p-alfa-tipo--${s.tipo}`, TIPOS_ALFA[s.tipo].nombre));
  raiz.append(nodo('strong', '', s.nombre));
  raiz.append(nodo('p', '', s.direccion));
  raiz.append(nodo('small', '', [s.localidad !== s.municipio ? s.localidad : '', s.municipio, nombreRegion(s.region)].filter(Boolean).join(' · ')));
  if (s.precision === 'localidad') raiz.append(nodo('small', 'p-alfa-aprox', 'Ubicación aproximada al centro de la localidad.'));
  const acc = nodo('span', 'p-alfa-acc');
  const a = nodo('a', '', 'Cómo llegar'); a.href = comoLlegar(s); a.target = '_blank'; a.rel = 'noopener noreferrer';
  acc.append(a); raiz.append(acc);
  return raiz;
}

export default function MapaAlfabetizacion({ jornadasPorRegion = {} }) {
  const [tipos, setTipos] = useState(() => new Set(ORDEN));
  const [region, setRegion] = useState('');
  const [vista, setVista] = useState('mapa');
  const [estado, setEstado] = useState('cargando');
  const [creado, setCreado] = useState(false);
  const caja = useRef(null);
  const mapa = useRef(null);
  const capa = useRef(null);
  const marcadores = useRef(new Map());
  const Lref = useRef(null);

  const visibles = useMemo(() => SITIOS_ALFA.filter((s) => tipos.has(s.tipo) && (!region || s.region === region)), [tipos, region]);
  const enMapa = useMemo(() => visibles.filter((s) => s.lat != null), [visibles]);
  const porTipo = (t) => SITIOS_ALFA.filter((s) => s.tipo === t && (!region || s.region === region)).length;
  const porRegion = useMemo(() => { const c = {}; SITIOS_ALFA.forEach((s) => { if (tipos.has(s.tipo)) c[s.region] = (c[s.region] || 0) + 1; }); return c; }, [tipos]);

  // Crea el mapa una sola vez. Leaflet se carga aparte para no pesar en las demás páginas.
  useEffect(() => {
    let vivo = true;
    Promise.all([import('leaflet'), import('leaflet/dist/leaflet.css')]).then(([{ default: L }]) => {
      if (!vivo || !caja.current || mapa.current) return;
      Lref.current = L;
      const m = L.map(caja.current, {
        center: CENTRO, zoom: 7, minZoom: 6, maxZoom: 17, maxBounds: LIMITES, maxBoundsViscosity: 0.8,
        scrollWheelZoom: false, dragging: !L.Browser.mobile, zoomSnap: 0.5, attributionControl: true,
      });
      m.attributionControl.setPrefix(false);
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19, attribution: '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a>',
      }).on('tileerror', () => vivo && setEstado((e) => (e === 'listo' ? 'sin-teselas' : e)))
        .on('load', () => vivo && setEstado('listo')).addTo(m);
      // La rueda del ratón solo hace zoom después de tocar el mapa, para no atrapar el scroll de la página.
      m.on('click focus', () => m.scrollWheelZoom.enable());
      m.on('mouseout blur', () => m.scrollWheelZoom.disable());
      capa.current = L.layerGroup().addTo(m);
      mapa.current = m;
      setCreado(true);
      setEstado((e) => (e === 'cargando' ? 'listo' : e));
      setTimeout(() => vivo && m.invalidateSize(), 60);
    }).catch(() => vivo && setEstado('error'));
    return () => { vivo = false; mapa.current?.remove(); mapa.current = null; marcadores.current.clear(); };
  }, []);

  // Pinta los marcadores que tocan con los filtros y encuadra la vista.
  useEffect(() => {
    const L = Lref.current; const m = mapa.current;
    if (!L || !m || !capa.current) return;
    capa.current.clearLayers(); marcadores.current.clear();
    enMapa.forEach((s) => {
      const icono = L.divIcon({
        className: `p-alfa-pin p-alfa-pin--${s.tipo}`,
        html: '<span class="p-alfa-rombo"></span>',
        iconSize: s.tipo === 'sede' ? [26, 26] : s.tipo === 'zona' ? [22, 22] : [18, 18],
      });
      const mk = L.marker([s.lat, s.lng], { icon: icono, title: `${TIPOS_ALFA[s.tipo].nombre}: ${s.nombre}`, alt: s.nombre, riseOnHover: true, keyboard: true,
        zIndexOffset: s.tipo === 'sede' ? 400 : s.tipo === 'zona' ? 200 : 0 })
        .bindPopup(() => ficha(s), { maxWidth: 260, autoPanPadding: [20, 20] });
      mk.addTo(capa.current); marcadores.current.set(s.id, mk);
    });
    if (enMapa.length) m.fitBounds(L.latLngBounds(enMapa.map((s) => [s.lat, s.lng])).pad(0.12), { maxZoom: region ? 10 : 8, animate: true });
  }, [enMapa, region, creado]);

  // Al volver al mapa desde la lista, Leaflet necesita medir de nuevo su caja.
  useEffect(() => { if (vista === 'mapa') setTimeout(() => mapa.current?.invalidateSize(), 30); }, [vista]);

  const abrir = (s) => {
    setVista('mapa');
    setTimeout(() => {
      const mk = marcadores.current.get(s.id); const m = mapa.current;
      if (!mk || !m) return;
      m.flyTo([s.lat, s.lng], 12, { duration: 0.8 }); setTimeout(() => mk.openPopup(), 850);
      caja.current?.scrollIntoView?.({ block: 'nearest', behavior: 'smooth' });
    }, 60);
  };
  const alternarTipo = (t) => setTipos((x) => { const n = new Set(x); if (n.has(t) && n.size > 1) n.delete(t); else n.add(t); return n; });
  const nJornadas = region ? jornadasPorRegion[region] || 0 : Object.values(jornadasPorRegion).reduce((a, b) => a + b, 0);

  return <div className="p-alfa">
    <div className="p-alfa-barra">
      <div className="p-filtros" role="group" aria-label="Tipos de sede que se muestran">
        {ORDEN.map((t) => <button key={t} type="button" className={`p-filtro p-filtro--alfa-${t}${tipos.has(t) ? ' is-on' : ''}`}
          aria-pressed={tipos.has(t)} onClick={() => alternarTipo(t)}><i aria-hidden="true" />{TIPOS_ALFA[t].plural} <span>{porTipo(t)}</span></button>)}
      </div>
      <div className="p-toggle" role="group" aria-label="Forma de ver las sedes">
        <button type="button" aria-pressed={vista === 'mapa'} onClick={() => setVista('mapa')}><Icon name="map" size={15} /> Mapa</button>
        <button type="button" aria-pressed={vista === 'lista'} onClick={() => setVista('lista')}><Icon name="list" size={15} /> Lista</button>
      </div>
    </div>

    <label className="p-alfa-region">
      <span>Región</span>
      <select value={region} onChange={(e) => setRegion(e.target.value)}>
        <option value="">Todo Oaxaca ({Object.values(porRegion).reduce((a, b) => a + b, 0)} sedes)</option>
        {REGIONES.map((r) => <option key={r.clave} value={r.clave} disabled={!porRegion[r.clave]}>{r.nombre} ({porRegion[r.clave] || 0})</option>)}
      </select>
    </label>

    <div className="p-alfa-marco" hidden={vista !== 'mapa'}>
      <div ref={caja} className="p-alfa-mapa" role="region" aria-label={`Mapa de sedes de alfabetización en ${region ? nombreRegion(region) : 'Oaxaca'}: ${enMapa.length} visibles. La lista ofrece la misma información.`} data-lenis-prevent />
      {estado === 'cargando' && <p className="p-alfa-aviso" role="status">Cargando mapa…</p>}
      {estado === 'error' && <p className="p-alfa-aviso" role="alert">No se pudo cargar el mapa. Usa la vista de lista.</p>}
      {estado === 'sin-teselas' && <p className="p-alfa-aviso p-alfa-aviso--abajo" role="status">El fondo del mapa no cargó por completo; los puntos siguen disponibles.</p>}
    </div>

    {vista === 'lista' && <ul className="p-alfa-lista">
      {visibles.length === 0 ? <li className="p-alfa-vacio">No hay sedes con estos filtros.</li>
        : [...visibles].sort((a, b) => ORDEN.indexOf(b.tipo) - ORDEN.indexOf(a.tipo) || a.municipio.localeCompare(b.municipio, 'es')).map((s) => <li key={s.id}>
          <span className={`p-alfa-rombo-lista p-alfa-rombo-lista--${s.tipo}`} aria-hidden="true" />
          <span className="p-alfa-lista-txt">
            <strong>{s.nombre}</strong>
            <small>{s.direccion}</small>
            <small>{[s.localidad !== s.municipio ? s.localidad : '', s.municipio, nombreRegion(s.region)].filter(Boolean).join(' · ')}</small>
          </span>
          <span className="p-alfa-lista-acc">
            {s.lat != null ? <>
              <button type="button" className="p-link" onClick={() => abrir(s)}>Ver en el mapa <span className="sr-only">: {s.nombre}</span></button>
              <a className="p-link" href={verEnOsm(s)} target="_blank" rel="noopener noreferrer">Abrir en OpenStreetMap<span className="sr-only"> (se abre en otra pestaña)</span></a>
            </> : <small>Sin ubicación precisa: confirma con el IEEA.</small>}
          </span>
        </li>)}
    </ul>}

    <div className="p-alfa-pie">
      <div className="p-mapa-leyenda">
        <span><i className="p-ley-sede" /> Sede central IEEA</span>
        <span><i className="p-ley-zona" /> Coordinación de zona</span>
        <span><i className="p-ley-plaza" /> Plaza comunitaria</span>
      </div>
      <p className="p-alfa-jornadas">
        <Icon name="calendar" size={15} /> {nJornadas ? <>{nJornadas === 1 ? 'Hay 1 jornada' : `Hay ${nJornadas} jornadas`} de Nexo Ñuu {region ? `en ${nombreRegion(region)}` : 'en Oaxaca'}. <Link className="p-link" to="/jornadas">Ver jornadas <Icon name="arrow" size={14} /></Link></>
          : <>Aún no hay jornadas de Nexo Ñuu {region ? `en ${nombreRegion(region)}` : 'publicadas'}.</>}
      </p>
      <p className="p-nota">
        Sedes públicas del IEEA Oaxaca y del INEA; Nexo Ñuu no tiene convenio con ellas. Horarios y servicios pueden cambiar: confirma antes de ir al <a className="fuente" href={`tel:${CONTACTO_IEEA.tel}`}>{CONTACTO_IEEA.telefono}</a> (IEEA, sede central).
        {' '}Fuentes: {FUENTES_ALFA.map((f, i) => <span key={f.url}>{i ? '; ' : ''}<a className="fuente" href={f.url} target="_blank" rel="noopener noreferrer">{f.nombre}</a> ({f.fecha})</span>)}. Consulta: {CONSULTA_ALFA}.
      </p>
    </div>
  </div>;
}
