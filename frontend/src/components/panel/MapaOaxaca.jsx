import { REGIONES } from '../../data/fuentes.js';

// Mapa esquemático de las ocho regiones de Oaxaca (no a escala).
// Los marcadores tienen forma de rombo, como el isotipo de Nexo Ñuu.
const P = {
  A: [40, 110], B: [95, 72], C: [150, 62], D: [198, 40], E: [240, 28], F: [275, 44], G: [330, 34], H: [385, 18],
  I: [440, 44], J: [452, 96], K: [505, 128], L: [572, 160], M: [584, 214], N: [560, 258], O: [515, 282], Pp: [462, 292],
  Q: [410, 302], R: [350, 322], S: [290, 334], T: [228, 324], U: [165, 304], V: [108, 284], W: [62, 262], X: [36, 218], Y: [28, 168],
  i1: [190, 112], i2: [262, 112], i3: [430, 122], i4: [340, 104], i5: [410, 172], i6: [320, 178], i7: [342, 224],
  i8: [196, 222], i10: [374, 262], i11: [300, 284], i12: [205, 272], i13: [150, 252],
};
const poly = (claves) => claves.map((k, i) => `${i ? 'L' : 'M'}${P[k][0]} ${P[k][1]}`).join('') + 'Z';

export const FORMAS = {
  mixteca: { d: poly(['A', 'B', 'C', 'D', 'i1', 'i8', 'i13', 'W', 'X', 'Y']), pin: [110, 150], txt: [110, 188] },
  canada: { d: poly(['D', 'E', 'F', 'i2', 'i1']), pin: [228, 70], txt: [228, 98] },
  papaloapan: { d: poly(['F', 'G', 'H', 'I', 'J', 'i3', 'i4', 'i2']), pin: [372, 56], txt: [372, 86] },
  'sierra norte': { d: poly(['i2', 'i4', 'i3', 'i5', 'i6']), pin: [362, 126], txt: [362, 156] },
  valles: { d: poly(['i1', 'i2', 'i6', 'i5', 'i7', 'i8']), pin: [262, 150], txt: [262, 186] },
  istmo: { d: poly(['J', 'K', 'L', 'M', 'N', 'O', 'Pp', 'Q', 'i10', 'i7', 'i5', 'i3']), pin: [492, 196], txt: [492, 232] },
  'sierra sur': { d: poly(['i8', 'i7', 'i10', 'i11', 'i12', 'i13']), pin: [270, 236], txt: [270, 262] },
  costa: { d: poly(['W', 'i13', 'i12', 'i11', 'i10', 'Q', 'R', 'S', 'T', 'U', 'V']), pin: [236, 292], txt: [236, 314] },
};
const OFFS = [[0, 0], [16, -9], [-16, -9], [16, 9], [-16, 9], [0, -17], [0, 17], [30, 0], [-30, 0]];

const nivel = (n) => (n >= 4 ? 4 : n >= 2 ? 3 : n >= 1 ? 2 : 0);

/**
 * conteo: { clave: número } · pines: [{ id, clave, tono: 'verde'|'ocre'|'gris', titulo }]
 * activa: clave seleccionada · onElegir(clave) · detalle: tarjeta flotante opcional
 */
export default function MapaOaxaca({ conteo = {}, pines = [], activa = '', onElegir, detalle, etiqueta = 'Mapa esquemático de Oaxaca' }) {
  const porRegion = {};
  pines.forEach((p) => { if (FORMAS[p.clave]) (porRegion[p.clave] ||= []).push(p); });
  const resumen = REGIONES.map((r) => `${r.nombre}: ${conteo[r.clave] || 0}`).join(', ');
  return <div className="p-mapa">
    <svg viewBox="0 0 620 360" role="img" aria-label={`${etiqueta}. ${resumen}.`}>
      <defs>
        <pattern id="p-mar" width="22" height="12" patternUnits="userSpaceOnUse">
          <path d="M0 6c5.5-4 11-4 16.5 0" className="p-mapa-ola" />
        </pattern>
      </defs>
      <path d="M0 250 L60 268 L170 312 L290 342 L410 308 L470 298 L520 290 L568 262 L620 240 L620 360 L0 360Z" fill="url(#p-mar)" className="p-mapa-mar" />
      <text x="560" y="340" className="p-mapa-oceano">Océano Pacífico</text>
      <g className="p-mapa-regiones">
        {REGIONES.map((r) => {
          const f = FORMAS[r.clave];
          const n = conteo[r.clave] || 0;
          return <path key={r.clave} d={f.d} className={`p-region p-region--${nivel(n)}${activa === r.clave ? ' is-activa' : ''}${onElegir ? ' is-clic' : ''}`}
            onClick={onElegir ? () => onElegir(activa === r.clave ? '' : r.clave) : undefined}>
            <title>{`${r.nombre}: ${n}`}</title>
          </path>;
        })}
      </g>
      <g className="p-mapa-textos" aria-hidden="true">
        {REGIONES.map((r) => {
          const f = FORMAS[r.clave];
          const partes = r.clave === 'valles' ? ['Valles', 'Centrales'] : r.clave === 'sierra norte' ? ['Sierra Norte'] : [r.nombre];
          return <text key={r.clave} x={f.txt[0]} y={f.txt[1]} className={activa === r.clave ? 'is-activa' : ''}>
            {partes.map((t, i) => <tspan key={t} x={f.txt[0]} dy={i ? 12 : 0}>{t}</tspan>)}
          </text>;
        })}
      </g>
      <g className="p-mapa-pines" aria-hidden="true">
        {Object.entries(porRegion).flatMap(([clave, lista]) => {
          const [cx, cy] = FORMAS[clave].pin;
          return lista.slice(0, OFFS.length).map((p, i) => {
            const x = cx + OFFS[i][0], y = cy + OFFS[i][1];
            return <g key={p.id} className={`p-pin p-pin--${p.tono || 'verde'}`} transform={`translate(${x} ${y})`}>
              <g className="p-pin-in" style={{ '--i': i }}>
                <rect x="-6.5" y="-6.5" width="13" height="13" rx="2.4" transform="rotate(45)" />
                <circle r="2.4" />
              </g>
            </g>;
          });
        })}
      </g>
    </svg>
    {detalle && <div className="p-mapa-detalle">{detalle}</div>}
  </div>;
}

export function claveRegion(nombre = '') {
  const n = nombre.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  return REGIONES.find((r) => n.includes(r.clave))?.clave || '';
}

export function RegionChips({ conteo = {}, activa, onElegir, todas = true }) {
  const total = Object.values(conteo).reduce((a, b) => a + b, 0);
  return <div className="p-filtros p-filtros--regiones" role="group" aria-label="Filtrar por región">
    {todas && <button type="button" className={`p-filtro${!activa ? ' is-on' : ''}`} aria-pressed={!activa} onClick={() => onElegir('')}>Todas <span>{total}</span></button>}
    {REGIONES.filter((r) => conteo[r.clave]).map((r) => <button key={r.clave} type="button" className={`p-filtro${activa === r.clave ? ' is-on' : ''}`}
      aria-pressed={activa === r.clave} onClick={() => onElegir(activa === r.clave ? '' : r.clave)}>{r.nombre} <span>{conteo[r.clave]}</span></button>)}
  </div>;
}
