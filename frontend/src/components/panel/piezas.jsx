import { useId } from 'react';
import { Icon } from '../Icons.jsx';

// Piezas compartidas de los paneles (voluntariado, institución y administración).
// Todo número que muestran sale de la API: aquí no se inventa ningún dato.

const ZONA = 'America/Mexico_City';

export const fechaCorta = (v) => (v ? new Date(v).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', timeZone: ZONA }).replace('.', '') : '—');
export const fechaMedia = (v) => (v ? new Date(v).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric', timeZone: ZONA }).replace('.', '') : '—');
export const fechaHora = (v) => (v ? new Date(v).toLocaleString('es-MX', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: ZONA }).replace(/\./g, '') : '—');
export const diaCorto = (v) => {
  if (!v) return '—';
  const t = new Date(v).toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'short', timeZone: ZONA }).replace(/\./g, '').replace(',', '');
  return t.charAt(0).toUpperCase() + t.slice(1);
};
export const hora = (v) => (v ? new Date(v).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', timeZone: ZONA }) : '');

export function haceCuanto(v) {
  if (!v) return '';
  const min = Math.round((Date.now() - new Date(v).getTime()) / 60000);
  if (min < 1) return 'hace un momento';
  if (min < 60) return `hace ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.round(h / 24);
  if (d < 30) return `hace ${d} ${d === 1 ? 'día' : 'días'}`;
  return `el ${fechaMedia(v)}`;
}

export const plural = (n, uno, varios) => `${n} ${n === 1 ? uno : varios}`;
export const primerNombre = (nombre = '') => nombre.trim().split(/\s+/)[0] || '';

export function hoyLargo() {
  const t = new Date().toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: ZONA });
  return t.charAt(0).toUpperCase() + t.slice(1);
}

export function saludo() {
  const h = Number(new Date().toLocaleString('en-US', { hour: 'numeric', hour12: false, timeZone: ZONA }));
  if (h < 5) return 'Buenas noches';
  if (h < 12) return 'Buenos días';
  if (h < 19) return 'Buenas tardes';
  return 'Buenas noches';
}

// Conteo por mes de una lista de fechas: los últimos `meses` terminando en el mes de referencia.
export function porMes(fechas, meses = 6, fin = new Date()) {
  const base = new Date(fin.getFullYear(), fin.getMonth(), 1);
  const cubetas = Array.from({ length: meses }, (_, i) => new Date(base.getFullYear(), base.getMonth() - (meses - 1 - i), 1));
  return cubetas.map((ini, i) => {
    const sig = i + 1 < cubetas.length ? cubetas[i + 1] : new Date(base.getFullYear(), base.getMonth() + 1, 1);
    return fechas.filter((f) => { const d = new Date(f); return d >= ini && d < sig; }).length;
  });
}
// Total acumulado al cierre de cada uno de los últimos `meses`.
export function acumulado(fechas, meses = 6) {
  const hoy = new Date();
  return Array.from({ length: meses }, (_, i) => {
    const corte = new Date(hoy.getFullYear(), hoy.getMonth() - (meses - 2 - i), 1);
    return fechas.filter((f) => new Date(f) < corte).length;
  });
}

// Igual que acumulado(), pero parte del total real: sirve cuando la lista trae solo los registros más recientes.
export function acumuladoDesde(total, fechas, meses = 6) {
  const hoy = new Date();
  return Array.from({ length: meses }, (_, i) => {
    const corte = new Date(hoy.getFullYear(), hoy.getMonth() - (meses - 2 - i), 1);
    return Math.max(0, total - fechas.filter((f) => new Date(f) >= corte).length);
  });
}

const TONOS_AVATAR =['#0d5c4e', '#94570b', '#1d8a73', '#0b4b40', '#a8432a', '#4c5f59'];
export function Avatar({ nombre = '', size = 36, claro = false }) {
  const partes = nombre.trim().split(/\s+/).filter(Boolean);
  const ini = ((partes[0]?.[0] || '') + (partes.length > 1 ? partes[partes.length - 1][0] : '')).toUpperCase() || '·';
  let h = 0; for (const c of nombre) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const fondo = claro ? '#e4f4ed' : TONOS_AVATAR[h % TONOS_AVATAR.length];
  return <span className="p-avatar" aria-hidden="true"
    style={{ width: size, height: size, fontSize: size * 0.38, background: fondo, color: claro ? '#0a3b33' : '#fff' }}>{ini}</span>;
}

export function Tarjeta({ titulo, icono, accion, children, className = '', id, as: Tag = 'section', sub }) {
  const hid = useId();
  return <Tag className={`p-card ${className}`} id={id} aria-labelledby={titulo ? hid : undefined} data-panel-card>
    {(titulo || accion) && <header className="p-card-head">
      <div>
        {titulo && <h2 id={hid}>{icono && <Icon name={icono} size={18} />}{titulo}</h2>}
        {sub && <p className="p-card-sub">{sub}</p>}
      </div>
      {accion}
    </header>}
    {children}
  </Tag>;
}

// Barra de avance con forma de hilo: termina en un nudo con forma de rombo.
export function Hilo({ valor = 0, etiqueta, tono = 'verde' }) {
  const v = Math.max(0, Math.min(100, Math.round(valor)));
  return <div className={`p-hilo p-hilo--${tono}`} role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={v} aria-label={etiqueta}>
    <span className="p-hilo-fill" style={{ width: `${v}%` }} data-grow />
  </div>;
}

export function Spark({ datos = [], etiqueta = 'Tendencia' }) {
  if (datos.length < 2 || datos.every((n) => n === 0)) return null;
  const W = 112, H = 38, max = Math.max(...datos, 1), min = Math.min(...datos, 0);
  const x = (i) => 3 + (i * (W - 10)) / (datos.length - 1);
  const y = (n) => H - 5 - ((n - min) / (max - min || 1)) * (H - 12);
  const d = datos.map((n, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(n).toFixed(1)}`).join('');
  const area = `${d}L${x(datos.length - 1).toFixed(1)} ${H}L${x(0).toFixed(1)} ${H}Z`;
  const ult = datos.length - 1;
  return <svg className="p-spark" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${etiqueta}: ${datos.join(', ')}`} data-draw>
    <path className="p-spark-area" d={area} />
    <path className="p-spark-linea dr" d={d} />
    <rect className="p-spark-nudo" x={x(ult) - 3.5} y={y(datos[ult]) - 3.5} width="7" height="7" rx="1.2" transform={`rotate(45 ${x(ult)} ${y(datos[ult])})`} />
  </svg>;
}

// Medio anillo para un porcentaje real (por ejemplo, cupo cubierto).
export function Anillo({ valor = 0, etiqueta }) {
  const v = Math.max(0, Math.min(100, valor));
  const L = Math.PI * 34;
  return <svg className="p-anillo" viewBox="0 0 84 48" role="img" aria-label={`${etiqueta}: ${Math.round(v)} %`}>
    <path className="p-anillo-pista" d="M8 44a34 34 0 0 1 68 0" />
    <path className="p-anillo-valor" d="M8 44a34 34 0 0 1 68 0" style={{ strokeDasharray: `${(L * v) / 100} ${L}` }} />
  </svg>;
}

export function Chip({ tono = 'neutro', children, icono }) {
  return <span className={`p-chip p-chip--${tono}`}>{icono && <Icon name={icono} size={13} />}{children}</span>;
}

const ESTADO_J = {
  publicada: ['En curso', 'ok'], borrador: ['Borrador', 'aviso'], cerrada: ['Inscripciones cerradas', 'neutro'],
  finalizada: ['Finalizada', 'oscuro'], cancelada: ['Cancelada', 'alerta'],
};
export function EstadoJornada({ estado, inicio }) {
  let [txt, tono] = ESTADO_J[estado] || [estado, 'neutro'];
  if (estado === 'publicada' && inicio && new Date(inicio) > new Date()) txt = `Por iniciar (${fechaCorta(inicio)})`;
  return <Chip tono={tono}>{txt}</Chip>;
}
const ESTADO_P = { pendiente: ['En revisión', 'aviso'], aceptada: ['Aceptada', 'ok'], rechazada: ['No seleccionada', 'neutro'], retirada: ['Retirada', 'neutro'] };
export function EstadoPostulacion({ estado, institucion = false }) {
  let [txt, tono] = ESTADO_P[estado] || [estado, 'neutro'];
  if (institucion && estado === 'rechazada') txt = 'Rechazada';
  return <Chip tono={tono}>{txt}</Chip>;
}

export function Kpi({ icono, etiqueta, valor, unidad, sub, hilo, hiloEtiqueta, spark, sparkEtiqueta, anillo, pie, tono }) {
  const numero = typeof valor === 'number';
  return <article className={`p-kpi${tono ? ` p-kpi--${tono}` : ''}`} data-panel-card>
    <p className="p-kpi-etq"><Icon name={icono} size={17} />{etiqueta}</p>
    <div className="p-kpi-fila">
      <p className="p-kpi-valor">
        {numero ? <span data-count={valor}>{valor.toLocaleString('es-MX')}</span> : valor}
        {unidad && <span className="p-kpi-unidad"> {unidad}</span>}
      </p>
      {spark && <Spark datos={spark} etiqueta={sparkEtiqueta || etiqueta} />}
      {anillo !== undefined && <Anillo valor={anillo} etiqueta={etiqueta} />}
    </div>
    {sub && <p className="p-kpi-sub">{sub}</p>}
    {hilo !== undefined && <Hilo valor={hilo} etiqueta={hiloEtiqueta || etiqueta} />}
    {pie && <div className="p-kpi-pie">{pie}</div>}
  </article>;
}

export function Vacio({ icono = 'sparkle', titulo, children, accion }) {
  return <div className="p-vacio">
    <span className="p-vacio-icono"><Icon name={icono} size={22} /></span>
    <div>{titulo && <strong>{titulo}</strong>}{children && <p>{children}</p>}{accion}</div>
  </div>;
}

export function PanelCabeza({ kicker, titulo, children, acciones }) {
  return <header className="p-cabeza">
    <div>
      {kicker && <p className="p-kicker">{kicker}</p>}
      <h1>{titulo}</h1>
      {children && <p className="p-cabeza-texto">{children}</p>}
    </div>
    {acciones && <div className="p-cabeza-acciones">{acciones}</div>}
  </header>;
}

export function Mensajes({ error, exito, onCerrar }) {
  if (!error && !exito) return null;
  const cerrar = onCerrar && <button type="button" className="p-msg-cerrar" onClick={onCerrar} aria-label="Cerrar aviso"><Icon name="close" size={16} /></button>;
  return <div className="p-msgs">
    {error && <p className="p-msg p-msg--error" role="alert"><Icon name="info" size={17} /><span>{error}</span>{cerrar}</p>}
    {exito && <p className="p-msg p-msg--ok" role="status"><Icon name="check" size={17} /><span>{exito}</span>{cerrar}</p>}
  </div>;
}

export function Filtros({ opciones, valor, onCambio, etiqueta }) {
  return <div className="p-filtros" role="group" aria-label={etiqueta}>
    {opciones.map(([id, txt, n]) => <button key={id} type="button" className={`p-filtro${valor === id ? ' is-on' : ''}`}
      aria-pressed={valor === id} onClick={() => onCambio(id)}>{txt}{n !== undefined && <span>{n}</span>}</button>)}
  </div>;
}
