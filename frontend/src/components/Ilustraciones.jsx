import { useId, useMemo } from 'react';
import { rng } from './Adornos.jsx';

// Ilustraciones propias en vector, con la paleta de la marca.
// Ocupan el lugar de las fotos mientras llegan imágenes reales con permiso de las comunidades.

const C = {
  cielo1: '#fbf4e4', cielo2: '#f5e3c2', sol: '#f3d39b',
  m1: '#d6eee3', m2: '#a9dcc8', m3: '#5fae8f', m4: '#127160',
  verde: '#0d5c4e', verdeOsc: '#0a3b33', menta: '#cbeadd',
  arena: '#ecdfc5', arena2: '#e1cfa9', ocre: '#e3a23c', ocreOsc: '#94570b',
  terracota: '#c45f3c', papel: '#fffdf8',
  piel: ['#7a4e32', '#9b6a45', '#5e3b25', '#8a5a3c'],
};

function Persona({ x, y, cuerpo, piel, alto = 44, sombrero = false, rebozo = false }) {
  return <g>
    <rect x={x} y={y} width="34" height={alto} rx="17" fill={cuerpo} />
    {rebozo && <path d={`M${x + 3} ${y + 12}h28M${x + 3} ${y + 19}h28`} stroke={C.papel} strokeOpacity=".7" strokeWidth="2.4" />}
    <circle cx={x + 17} cy={y - 11} r="13" fill={piel} />
    <path d={`M${x + 5} ${y - 14}c3-11 21-13 25-1`} stroke={C.verdeOsc} strokeWidth="5" fill="none" strokeLinecap="round" />
    {sombrero && <g>
      <ellipse cx={x + 17} cy={y - 21} rx="23" ry="5.5" fill="#e9d4a6" />
      <path d={`M${x + 7} ${y - 22}c1-11 19-11 20 0`} fill="#e9d4a6" />
      <path d={`M${x + 8} ${y - 24}h18`} stroke={C.ocreOsc} strokeWidth="2" />
    </g>}
  </g>;
}

function PapelPicado({ x1, y1, x2, y2, n = 7 }) {
  const colores = [C.ocre, C.verde, C.terracota, C.m2, C.ocre, C.m3, C.terracota];
  const banderas = [];
  for (let i = 0; i < n; i += 1) {
    const t = (i + 0.5) / n;
    const x = x1 + (x2 - x1) * t;
    const y = y1 + (y2 - y1) * t + Math.sin(t * Math.PI) * 14;
    banderas.push(<path key={i} d={`M${x - 9} ${y}h18l-2 16-7-5-7 5Z`} fill={colores[i % colores.length]} />);
  }
  return <g>
    <path d={`M${x1} ${y1}Q${(x1 + x2) / 2} ${(y1 + y2) / 2 + 28} ${x2} ${y2}`} stroke={C.verdeOsc} strokeWidth="1.4" fill="none" />
    {banderas}
  </g>;
}

function Cielo({ id, sol = [508, 104] }) {
  return <>
    <defs>
      <linearGradient id={`cielo-${id}`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor={C.cielo1} /><stop offset="1" stopColor={C.cielo2} />
      </linearGradient>
    </defs>
    <rect width="640" height="440" fill={`url(#cielo-${id})`} />
    <circle cx={sol[0]} cy={sol[1]} r="44" fill={C.sol} />
    <circle cx={sol[0]} cy={sol[1]} r="64" fill="none" stroke={C.sol} strokeWidth="2" strokeDasharray="3 9" />
  </>;
}

function EscenaArbol({ id }) {
  return <>
    <Cielo id={id} />
    <path d="M0 252C60 200 90 196 130 222S190 150 240 150 300 214 350 206 420 160 470 162 560 222 640 196V440H0Z" fill={C.m1} />
    <path d="M0 300C90 262 160 268 240 290S380 258 470 262 600 296 640 290V440H0Z" fill={C.m2} />
    <path d="M528 300h56v34h-56z" fill={C.papel} /><path d="M520 302l36-24 36 24z" fill={C.terracota} />
    <path d="M548 312h14v22h-14z" fill={C.verde} />
    <path d="M0 342C120 324 220 332 320 338S540 328 640 334V440H0Z" fill={C.arena} />
    <path d="M206 336c5-50 4-80 14-112l18 2c-5 34-2 70 4 110z" fill={C.verdeOsc} />
    <g fill={C.m4}><circle cx="196" cy="176" r="68" /><circle cx="258" cy="150" r="60" /><circle cx="134" cy="166" r="48" /><circle cx="306" cy="194" r="46" /></g>
    <g fill={C.m3}><circle cx="226" cy="138" r="30" /><circle cx="160" cy="150" r="22" /><circle cx="288" cy="176" r="20" /></g>
    <PapelPicado x1={300} y1={204} x2={534} y2={286} />
    <Persona x={176} y={302} cuerpo={C.ocre} piel={C.piel[0]} rebozo />
    <Persona x={248} y={296} cuerpo={C.terracota} piel={C.piel[1]} />
    <Persona x={318} y={298} cuerpo={C.m3} piel={C.piel[2]} sombrero />
    <Persona x={388} y={300} cuerpo={C.verdeOsc} piel={C.piel[3]} rebozo />
    <rect x="160" y="330" width="290" height="12" rx="5" fill={C.ocreOsc} />
    <path d="M176 342v34M434 342v34" stroke={C.ocreOsc} strokeWidth="7" strokeLinecap="round" />
    <path d="M262 318c14-6 28-6 40 0v13c-12-5-26-5-40 0z" fill={C.papel} />
    <path d="M302 318c12-6 26-6 40 0v13c-14-5-28-5-40 0z" fill="#f4ecdc" />
    <path d="M302 318v13" stroke={C.ocreOsc} strokeWidth="1.5" />
    <Persona x={466} y={262} alto={78} cuerpo={C.verde} piel={C.piel[1]} />
    <rect x="446" y="282" width="24" height="30" rx="3" fill={C.papel} transform="rotate(-12 458 297)" />
    <path d="M30 380c30-26 60-26 90 0M560 392c22-18 44-18 66 0" stroke={C.m3} strokeWidth="5" fill="none" strokeLinecap="round" />
  </>;
}

function EscenaAula({ id }) {
  const letras = ['A', 'E', 'I', 'O', 'U', 'Ñ'];
  return <>
    <rect width="640" height="440" fill="#f7f1e4" />
    <rect y="318" width="640" height="122" fill={C.arena} />
    <path d="M0 318h640" stroke={C.arena2} strokeWidth="6" />
    <PapelPicado x1={20} y1={22} x2={620} y2={22} n={11} />
    <rect x="62" y="78" width="318" height="178" rx="12" fill={C.ocreOsc} />
    <rect x="72" y="88" width="298" height="158" rx="7" fill={C.verdeOsc} />
    <text x="221" y="168" textAnchor="middle" fontFamily="DM Sans, Arial, sans-serif" fontSize="46" fontWeight="500" letterSpacing="14" fill="#f2efe6" opacity=".92">A E I O U</text>
    <text x="221" y="218" textAnchor="middle" fontFamily="Fraunces, Georgia, serif" fontStyle="italic" fontSize="32" fill={C.sol}>ñuu · pueblo</text>
    <path d="M150 232h142" stroke={C.sol} strokeWidth="3" strokeDasharray="2 8" strokeLinecap="round" />
    <g>{letras.map((l, i) => <g key={l} transform={`translate(${410 + (i % 3) * 52} ${88 + Math.floor(i / 3) * 56})`}>
      <rect width="42" height="44" rx="8" fill={[C.ocre, C.m2, C.terracota, C.menta, C.sol, C.m3][i]} />
      <text x="21" y="31" textAnchor="middle" fontFamily="Plus Jakarta Sans, Arial, sans-serif" fontWeight="800" fontSize="22" fill={C.verdeOsc}>{l}</text>
    </g>)}</g>
    <rect x="410" y="210" width="146" height="96" rx="8" fill={C.m1} stroke={C.ocreOsc} strokeWidth="6" />
    <path d="M414 290c28-30 46-30 70-8 18-22 40-26 68 6v14H414z" fill={C.m3} />
    <circle cx="520" cy="240" r="12" fill={C.sol} />
    {[90, 260, 430].map((x, i) => <g key={x}>
      <rect x={x} y="330" width="128" height="14" rx="5" fill={C.ocreOsc} />
      <path d={`M${x + 12} 344v50M${x + 116} 344v50`} stroke={C.ocreOsc} strokeWidth="7" strokeLinecap="round" />
      <path d={`M${x + 30} 320c12-5 24-5 34 0v11c-10-4-22-4-34 0zM${x + 64} 320c10-5 22-5 34 0v11c-12-4-24-4-34 0z`} fill={i === 1 ? C.menta : C.papel} />
    </g>)}
    <Persona x={104} y={290} cuerpo={C.terracota} piel={C.piel[2]} rebozo />
    <Persona x={290} y={288} cuerpo={C.ocre} piel={C.piel[0]} />
    <Persona x={462} y={290} cuerpo={C.m3} piel={C.piel[3]} sombrero />
  </>;
}

function EscenaSierra({ id }) {
  return <>
    <Cielo id={id} sol={[150, 110]} />
    <g fill={C.papel} opacity=".85">
      <path d="M380 80c10-16 34-16 42 0 16-4 26 10 18 20h-74c-8-8-2-20 14-20z" />
      <path d="M520 132c8-12 26-12 32 0 12-3 20 8 14 15h-56c-6-6-1-15 10-15z" />
    </g>
    <path d="M0 214C70 150 120 144 170 182S260 104 330 112 420 186 480 170 580 98 640 120V440H0Z" fill={C.m1} />
    <path d="M0 262C80 214 150 222 220 246S360 196 440 208 570 250 640 232V440H0Z" fill={C.m2} />
    <path d="M0 312C110 276 210 286 300 304S500 270 640 292V440H0Z" fill={C.m3} />
    <g>
      {[[300, 286], [338, 280], [380, 290], [418, 282]].map(([x, y], i) => <g key={x}>
        <rect x={x} y={y} width="30" height="24" fill={C.papel} />
        <path d={`M${x - 4} ${y + 2}l19-14 19 14z`} fill={i % 2 ? C.ocreOsc : C.terracota} />
        <rect x={x + 11} y={y + 10} width="8" height="14" fill={C.verdeOsc} />
      </g>)}
      <rect x="456" y="258" width="22" height="48" fill={C.papel} />
      <path d="M452 260l15-18 15 18z" fill={C.terracota} />
      <path d="M467 230v12M462 236h10" stroke={C.verdeOsc} strokeWidth="2" />
    </g>
    <path d="M0 360C120 330 260 340 380 352S560 344 640 336V440H0Z" fill={C.m4} />
    <path d="M250 440C300 400 330 380 400 352" stroke={C.arena} strokeWidth="18" fill="none" strokeLinecap="round" />
    {[[80, 380], [150, 396], [560, 372], [600, 400]].map(([x, y]) => <path key={x}
      d={`M${x} ${y}l-14-26 18 18 2-30 6 30 14-22-6 30z`} fill={C.verde} />)}
  </>;
}

export function Escena({ variante = 'arbol', className = '', titulo }) {
  const id = useId().replace(/:/g, '');
  const Contenido = { arbol: EscenaArbol, aula: EscenaAula, sierra: EscenaSierra }[variante] || EscenaArbol;
  return <svg className={`escena ${className}`} viewBox="0 0 640 440" preserveAspectRatio="xMidYMid slice"
    role={titulo ? 'img' : undefined} aria-label={titulo} aria-hidden={titulo ? undefined : true} focusable="false">
    <Contenido id={id} />
  </svg>;
}

// Portada generativa para cada jornada: mismas piezas de la marca, combinación única por jornada.
const PALETAS = [
  { cielo: '#fbf0dc', sol: '#f3d39b', capas: ['#cbeadd', '#8fcdb4', '#127160'] },
  { cielo: '#e4f4ed', sol: '#f6dfae', capas: ['#a9dcc8', '#5fae8f', '#0b4b40'] },
  { cielo: '#f6efe1', sol: '#e9b871', capas: ['#ecdfc5', '#d9b77c', '#94570b'] },
  { cielo: '#f1f9f5', sol: '#f3d39b', capas: ['#d6eee3', '#1d8a73', '#0a3b33'] },
];

function capa(r, base, amp, ancho = 400) {
  let d = `M0 ${base}`;
  const pasos = 5;
  for (let i = 1; i <= pasos; i += 1) {
    const x = (ancho / pasos) * i;
    const y = base - amp * (0.3 + r() * 0.9);
    const cx = x - ancho / pasos / 2;
    d += `Q${cx.toFixed(1)} ${(y - amp * 0.4).toFixed(1)} ${x.toFixed(1)} ${(base - r() * amp * 0.3).toFixed(1)}`;
  }
  return `${d}V220H0Z`;
}

export function Portada({ seed = 1, region = '', className = '' }) {
  const id = useId().replace(/:/g, '');
  const data = useMemo(() => {
    const r = rng(Number(seed) * 97 + region.length * 13);
    const paleta = PALETAS[Math.floor(r() * PALETAS.length)];
    return {
      paleta,
      sol: [60 + r() * 280, 44 + r() * 30],
      capas: [capa(r, 120, 60), capa(r, 160, 52), capa(r, 196, 40)],
      casas: Math.floor(r() * 3) + 2,
      casaX: 120 + r() * 180,
    };
  }, [seed, region]);
  const { paleta } = data;
  return <svg className={`portada ${className}`} viewBox="0 0 400 220" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">
    <defs><pattern id={`rombos-${id}`} width="22" height="22" patternUnits="userSpaceOnUse">
      <path d="M11 3 19 11 11 19 3 11Z" fill="none" stroke={paleta.capas[2]} strokeOpacity=".22" strokeWidth="1.4" />
    </pattern></defs>
    <rect width="400" height="220" fill={paleta.cielo} />
    <rect width="400" height="220" fill={`url(#rombos-${id})`} />
    <circle cx={data.sol[0]} cy={data.sol[1]} r="24" fill={paleta.sol} />
    <path d={data.capas[0]} fill={paleta.capas[0]} />
    <path d={data.capas[1]} fill={paleta.capas[1]} />
    {Array.from({ length: data.casas }, (_, i) => {
      const x = data.casaX + i * 22;
      return <g key={i}><rect x={x} y="150" width="16" height="12" fill="#fffdf8" /><path d={`M${x - 3} 151l11-8 11 8z`} fill={i % 2 ? '#c45f3c' : '#94570b'} /></g>;
    })}
    <path d={data.capas[2]} fill={paleta.capas[2]} />
  </svg>;
}
