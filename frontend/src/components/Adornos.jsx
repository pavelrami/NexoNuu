import { useId, useMemo } from 'react';
import { Link } from 'react-router-dom';

// Elementos gráficos propios de Nexo Ñuu:
// - Topo: curvas de nivel de la sierra oaxaqueña.
// - Hilo: la puntada que une secciones (rima con el rombo tejido del isotipo).
// - Sello: el sello circular que gira lento.
// - Greca: la greca escalonada como cenefa.

export function rng(seed = 1) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function curvaCerrada(pts) {
  const n = pts.length;
  const f = (v) => Math.round(v * 10) / 10;
  let d = `M${f(pts[0][0])} ${f(pts[0][1])}`;
  for (let i = 0; i < n; i += 1) {
    const p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n];
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += `C${f(c1[0])} ${f(c1[1])} ${f(c2[0])} ${f(c2[1])} ${f(p2[0])} ${f(p2[1])}`;
  }
  return `${d}Z`;
}

const CENTROS = [[0.72, 0.38, 8], [0.16, 0.86, 6]];

export function Topo({ seed = 7, centros = CENTROS, className = '', draw = false }) {
  const paths = useMemo(() => {
    const r = rng(seed);
    const out = [];
    centros.forEach(([cx, cy, anillos], ci) => {
      const ph = [r() * 6.28, r() * 6.28, r() * 6.28];
      for (let k = 1; k <= anillos; k += 1) {
        const base = 26 + k * 44;
        const pts = [];
        for (let i = 0; i < 48; i += 1) {
          const a = (i / 48) * Math.PI * 2;
          const rr = base * (1 + 0.17 * Math.sin(3 * a + ph[0] + k * 0.22)
            + 0.08 * Math.sin(5 * a + ph[1] - k * 0.14) + 0.05 * Math.sin(2 * a + ph[2] + ci));
          pts.push([cx * 1000 + Math.cos(a) * rr * 1.3, cy * 700 + Math.sin(a) * rr]);
        }
        out.push(curvaCerrada(pts));
      }
    });
    return out;
  }, [seed, centros]);
  return <svg className={`topo ${className}`} viewBox="0 0 1000 700" preserveAspectRatio="xMidYMid slice"
    aria-hidden="true" focusable="false" {...(draw ? { 'data-draw-scrub': '' } : {})}>
    {paths.map((d, i) => <path key={i} d={d} />)}
  </svg>;
}

const HILO_D = 'M4 30C150 6 300 54 450 30S750 6 900 30 1110 50 1196 26';

export function Hilo({ className = '', scrub = true }) {
  const id = useId().replace(/:/g, '');
  return <svg className={`hilo ${className}`} viewBox="0 0 1200 60" preserveAspectRatio="none"
    aria-hidden="true" focusable="false" {...(scrub ? { 'data-draw-scrub': '' } : { 'data-draw': '' })}>
    <defs>
      <mask id={`hilo-${id}`} maskUnits="userSpaceOnUse" x="0" y="0" width="1200" height="60">
        <path className="dr" d={HILO_D} fill="none" stroke="#fff" strokeWidth="16" strokeLinecap="round" />
      </mask>
    </defs>
    <path className="hilo-puntada" d={HILO_D} mask={`url(#hilo-${id})`} />
    <path className="hilo-nudo" d="M4 22 12 30 4 38-4 30Z" />
    <path className="hilo-nudo" d="M1196 18 1204 26 1196 34 1188 26Z" />
  </svg>;
}

// Hilos punteados que se dibujan: la máscara (sólida) es la que se traza, así el punteado
// conserva su ritmo aunque el SVG se estire con el ancho de la pantalla.
export function HiloSvg({ paths, viewBox = '0 0 1000 400', className = '', scrub = true, grosor = 10 }) {
  const id = useId().replace(/:/g, '');
  const [, , w, h] = viewBox.split(' ').map(Number);
  return <svg className={className} viewBox={viewBox} preserveAspectRatio="none" aria-hidden="true" focusable="false"
    {...(scrub ? { 'data-draw-scrub': '' } : { 'data-draw': '' })}>
    <defs>
      <mask id={`hm-${id}`} maskUnits="userSpaceOnUse" x="-10" y="-10" width={w + 20} height={h + 20}>
        {paths.map((d) => <path key={d} className="dr" d={d} fill="none" stroke="#fff" strokeWidth={grosor} strokeLinecap="round" />)}
      </mask>
    </defs>
    <g mask={`url(#hm-${id})`}>{paths.map((d) => <path key={d} className="hilo-visible" d={d} />)}</g>
  </svg>;
}

export function Sello({ texto = 'NEXO ÑUU · VOLUNTARIADO · OAXACA · COMUNIDAD · ', to, label = 'Ir', className = '' }) {
  const id = useId().replace(/:/g, '');
  const contenido = <svg viewBox="0 0 200 200" aria-hidden="true" focusable="false">
    <defs><path id={`sello-${id}`} d="M100 100m-74 0a74 74 0 1 1 148 0a74 74 0 1 1-148 0" /></defs>
    <g className="sello-giro">
      <text><textPath href={`#sello-${id}`} textLength="462" lengthAdjust="spacing">{texto}</textPath></text>
    </g>
    <circle className="sello-centro" cx="100" cy="100" r="44" />
    <path className="sello-flecha" d="M82 100h36M104 86l14 14-14 14" />
  </svg>;
  if (to) return <Link to={to} className={`sello ${className}`} aria-label={label}>{contenido}</Link>;
  return <span className={`sello ${className}`} aria-hidden="true">{contenido}</span>;
}

export function Greca({ className = '' }) {
  const id = useId().replace(/:/g, '');
  return <svg className={`greca ${className}`} aria-hidden="true" focusable="false" width="100%" height="24">
    <defs>
      <pattern id={`greca-${id}`} width="40" height="24" patternUnits="userSpaceOnUse">
        <path d="M0 21H8V15H14V9H20V3H34V15H27V10M27 21H40" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round" />
      </pattern>
    </defs>
    <rect width="100%" height="24" fill={`url(#greca-${id})`} />
  </svg>;
}

export function RomboMini({ className = '' }) {
  return <svg className={`rombo-mini ${className}`} viewBox="0 0 12 12" aria-hidden="true" focusable="false">
    <path d="M6 0 12 6 6 12 0 6Z" />
  </svg>;
}
