import { useId, useState } from 'react';

// Gráficas del panel de administración. Una sola serie por gráfica, un solo eje,
// trazos delgados y etiquetas directas solo donde ayudan. Todo dato sale de la API.

// Colores categóricos validados (orden fijo; "Otras" siempre en gris neutro).
export const CATEGORICOS = ['#1d8a73', '#e3a23c', '#c45f3c', '#5a78c4'];
export const GRIS_OTRAS = '#9aa7a2';

/**
 * Línea acumulada por mes con área suave. Los meses que aún no llegan se dibujan punteados
 * (son jornadas ya programadas, no una estimación).
 * puntos: [{ etiqueta: 'Ene', valor: 3, futuro: false }]
 */
export function LineaAcumulada({ puntos = [], titulo, unidad = '' }) {
  const id = useId();
  const [hover, setHover] = useState(null);
  const W = 640, H = 230, PX = 34, PT = 28, PB = 30;
  const max = Math.max(1, ...puntos.map((p) => p.valor));
  const techo = Math.max(4, Math.ceil(max / 4) * 4);
  const x = (i) => PX + (i * (W - PX * 2)) / Math.max(1, puntos.length - 1);
  const y = (v) => PT + (1 - v / techo) * (H - PT - PB);
  const corte = puntos.findIndex((p) => p.futuro);
  const real = corte === -1 ? puntos : puntos.slice(0, corte + 1);
  const linea = (lista, desde = 0) => lista.map((p, i) => `${i ? 'L' : 'M'}${x(i + desde).toFixed(1)} ${y(p.valor).toFixed(1)}`).join('');
  const dReal = linea(real.length ? real : puntos.slice(0, 1));
  const dFut = corte > 0 ? linea(puntos.slice(corte - 1), corte - 1) : '';
  const area = `${linea(puntos)}L${x(puntos.length - 1).toFixed(1)} ${H - PB}L${x(0).toFixed(1)} ${H - PB}Z`;
  const ult = puntos.length - 1;
  const hoyIdx = corte === -1 ? ult : Math.max(0, corte - 1);
  const marcas = new Set([hoyIdx, ult]);
  const rejilla = [0, 0.5, 1].map((f) => Math.round(techo * f));
  const resumen = puntos.map((p) => `${p.etiqueta}: ${p.valor}`).join(', ');

  return <div className="p-linea" onMouseLeave={() => setHover(null)}>
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${titulo}. ${resumen}.`}>
      <defs>
        <linearGradient id={`${id}-g`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#1d8a73" stopOpacity=".22" /><stop offset="1" stopColor="#1d8a73" stopOpacity="0" />
        </linearGradient>
      </defs>
      {rejilla.map((v) => <g key={v} className="p-linea-rejilla">
        <line x1={PX} x2={W - PX} y1={y(v)} y2={y(v)} />
        <text x={PX - 8} y={y(v) + 4}>{v}</text>
      </g>)}
      <path d={area} fill={`url(#${id}-g)`} />
      <path d={dReal} className="p-linea-trazo" />
      {dFut && <path d={dFut} className="p-linea-trazo p-linea-trazo--futuro" />}
      {puntos.map((p, i) => <g key={p.etiqueta}>
        <circle cx={x(i)} cy={y(p.valor)} r={hover === i ? 5.5 : marcas.has(i) ? 5 : 3.5}
          className={`p-linea-punto${p.futuro ? ' is-futuro' : ''}${marcas.has(i) ? ' is-marca' : ''}`} />
        {marcas.has(i) && hover === null && <text x={i === ult ? x(i) : x(i) - 10} y={y(p.valor) - (i === ult ? 12 : 4)} className="p-linea-valor" textAnchor="end">{p.valor}</text>}
        <text x={x(i)} y={H - 8} className="p-linea-mes">{p.etiqueta}</text>
        <rect x={x(i) - (W - PX * 2) / (puntos.length - 1) / 2} y={PT - 10} width={(W - PX * 2) / (puntos.length - 1)} height={H - PT - PB + 10}
          className="p-linea-zona" onMouseEnter={() => setHover(i)} onFocus={() => setHover(i)} onBlur={() => setHover(null)} tabIndex={-1} />
      </g>)}
      {hover !== null && <line x1={x(hover)} x2={x(hover)} y1={PT - 6} y2={H - PB} className="p-linea-guia" />}
    </svg>
    {hover !== null && <div className="p-linea-tip" style={{ left: `${(x(hover) / W) * 100}%` }} role="status">
      <strong>{puntos[hover].valor} {unidad}</strong>
      <span>{puntos[hover].etiqueta}{puntos[hover].futuro ? ' · programadas' : ''}</span>
    </div>}
  </div>;
}

/**
 * Medio anillo con separación entre segmentos y leyenda con valores (la leyenda siempre está:
 * la identidad nunca depende solo del color).
 * partes: [{ nombre, valor }]
 */
export function MedioAnillo({ partes = [], titulo, unidad = '' }) {
  const [hover, setHover] = useState(null);
  const total = partes.reduce((n, p) => n + p.valor, 0);
  const R = 92, G = 26, CX = 120, CY = 112;
  const color = (p, i) => (p.otras ? GRIS_OTRAS : CATEGORICOS[i % CATEGORICOS.length]);
  let acum = 0;
  const arcos = partes.map((p, i) => {
    const a0 = Math.PI + (acum / total) * Math.PI; acum += p.valor;
    const a1 = Math.PI + (acum / total) * Math.PI;
    const hueco = partes.length > 1 ? 0.012 : 0;
    const s = a0 + hueco, e = a1 - hueco;
    const pt = (a, r) => `${(CX + r * Math.cos(a)).toFixed(2)} ${(CY + r * Math.sin(a)).toFixed(2)}`;
    const grande = e - s > Math.PI ? 1 : 0;
    const d = `M${pt(s, R)}A${R} ${R} 0 ${grande} 1 ${pt(e, R)}L${pt(e, R - G)}A${R - G} ${R - G} 0 ${grande} 0 ${pt(s, R - G)}Z`;
    return { ...p, d, c: color(p, i), pct: total ? Math.round((p.valor / total) * 100) : 0 };
  });
  const foco = hover !== null ? arcos[hover] : null;
  return <div className="p-anillo2">
    <svg viewBox="0 0 240 124" role="img" aria-label={`${titulo}: ${arcos.map((a) => `${a.nombre} ${a.valor} (${a.pct} %)`).join(', ')}`}>
      {total === 0 ? <path d={`M${CX - R} ${CY}A${R} ${R} 0 0 1 ${CX + R} ${CY}`} className="p-anillo2-vacio" />
        : arcos.map((a, i) => <path key={a.nombre} d={a.d} fill={a.c} className={hover !== null && hover !== i ? 'is-tenue' : ''}
          onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} />)}
      <text x={CX} y={CY - 22} className="p-anillo2-num">{foco ? foco.valor : total}</text>
      <text x={CX} y={CY - 4} className="p-anillo2-etq">{foco ? `${foco.pct} % · ${foco.nombre.length > 22 ? `${foco.nombre.slice(0, 21)}…` : foco.nombre}` : unidad}</text>
    </svg>
    <ul className="p-anillo2-ley">
      {arcos.map((a, i) => <li key={a.nombre} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
        <i style={{ background: a.c }} aria-hidden="true" /><span>{a.nombre}</span><strong>{a.pct} %</strong>
      </li>)}
    </ul>
  </div>;
}
