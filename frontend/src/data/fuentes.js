// Datos públicos verificados para los módulos Concientizar e Informar.
// Cada cifra lleva su fuente y fecha. Consulta: 19 de noviembre de 2026.
// Nexo Ñuu NO tiene convenio con estas instituciones: se citan como referencia pública.
// Para actualizar una cifra, cambia el valor, la fecha y el enlace en el mismo objeto.

export const CONSULTA = '19 de noviembre de 2026';

export const FUENTES = {
  inegiOax: {
    nombre: 'INEGI · Encuesta Intercensal 2025, resultados de Oaxaca',
    fecha: '22 de septiembre de 2026',
    url: 'https://www.inegi.org.mx/contenidos/saladeprensa/boletines/2026/ei/EIC2025-def_Oax.pdf',
  },
  inegiNal: {
    nombre: 'INEGI · Comunicado de prensa 54/26, Encuesta Intercensal 2025',
    fecha: '22 de septiembre de 2026',
    url: 'https://www.inegi.org.mx/contenidos/saladeprensa/boletines/2026/ei/EIC2025-def_CP.pdf',
  },
  sepEstrategia: {
    nombre: 'Crónica · Declaración de la SEP a un año de la Estrategia Nacional de Alfabetización',
    fecha: '8 de septiembre de 2026',
    url: 'https://www.cronica.com.mx/nacional/2026/09/08/mario-delgado-reduce-analfabetismo-de-41-a-38-la-cifra-mas-baja-en-la-historia-de-mexico/',
  },
  anuies: {
    nombre: 'El Imparcial · Acuerdo SEP, ANUIES e INEA',
    fecha: '13 de marzo de 2026',
    url: 'https://www.elimparcial.com/mexico/2026/03/13/mexico-impulsa-acuerdo-historico-entre-sep-anuies-e-inea-para-erradicar-el-analfabetismo-integrar-a-jovenes-como-alfabetizadores-y-reducir-el-rezago-que-limita-oportunidades-laborales-y-sociales/',
  },
  imss: {
    nombre: 'IMSS · Boletín de prensa 441/2026',
    fecha: '18 de agosto de 2026',
    url: 'https://www.imss.gob.mx/prensa/archivo/202608/441',
  },
  ieeaCuenta: {
    nombre: 'IEEA Oaxaca · Cuenta Pública 2025',
    fecha: 'febrero de 2026',
    url: 'https://www.oaxaca.gob.mx/ieea/wp-content/uploads/sites/49/2026/02/CUENTA-PUBLICA-2025.pdf',
  },
  ieeaConvocatoria: {
    nombre: 'IEEA Oaxaca · Convocatoria general 2025 para personas voluntarias',
    fecha: 'enero de 2025',
    url: 'https://www.oaxaca.gob.mx/ieea/wp-content/uploads/sites/49/2025/01/Conv_GRAL2025-OAX-VF-1.pdf',
  },
  ineaBilingue: {
    nombre: 'Quadratín · INEA y la alfabetización en lenguas indígenas',
    fecha: '14 de septiembre de 2025',
    url: 'https://mexico.quadratin.com.mx/indigenas-en-inea-alfabetizacion/',
  },
};

// Concientizar: la brecha en cifras (INEGI, misma fuente y método para Oaxaca y el país).
export const BRECHA = {
  oaxaca2025: 9.4,
  oaxaca2020: 11.8,
  nacional2025: 3.7,
  nacional2020: 4.8,
  escolaridadOax2025: 8.7,
  escolaridadOax2020: 8.1,
  escolaridadNal2025: 10.3,
  hablantesPct: 29.0,
  hablantes: 1159650,
  poblacionOax: 4.2,
};

// Informar: programas públicos que ya existen.
export const PROGRAMAS = [
  {
    id: 'inea',
    sigla: 'INEA',
    titulo: 'Estrategia Nacional de Alfabetización para el Bienestar Compartido',
    quien: 'Instituto Nacional para la Educación de los Adultos (SEP)',
    texto: 'Programa federal que ofrece alfabetización, primaria y secundaria gratuitas a personas jóvenes y adultas. A un año de la estrategia, la SEP informó que más de 277 mil personas aprendieron a leer y escribir.',
    dato: { valor: '3.8 %', etiqueta: 'analfabetismo nacional estimado por la SEP (antes 4.1 %)' },
    fuente: 'sepEstrategia',
    enlace: { texto: 'Sitio del INEA', url: 'https://www.gob.mx/inea' },
  },
  {
    id: 'ieea',
    sigla: 'IEEA',
    titulo: 'Instituto Estatal de Educación para Adultos de Oaxaca',
    quien: 'Gobierno del Estado de Oaxaca',
    texto: 'Atiende alfabetización, primaria y secundaria con el Modelo de Educación para la Vida (MEV AprendeINEA) a través de plazas comunitarias en todo el estado. En 2025 reportó 10,789 personas alfabetizadas frente a una meta de 24,600.',
    dato: { valor: '10,789', etiqueta: 'personas alfabetizadas en 2025' },
    fuente: 'ieeaCuenta',
    enlace: { texto: 'Sitio del IEEA Oaxaca', url: 'https://www.oaxaca.gob.mx/ieea/' },
    porValidar: true,
  },
  {
    id: 'anuies',
    sigla: 'SEP · ANUIES · INEA',
    titulo: 'Alianza para el servicio social alfabetizador',
    quien: 'SEP, ANUIES e INEA',
    texto: 'Acuerdo firmado en marzo de 2026 para que estudiantes universitarios realicen su servicio social o prácticas profesionales como alfabetizadores voluntarios: formar círculos de estudio, operar plazas comunitarias y dar acompañamiento educativo.',
    dato: { valor: '100 mil', etiqueta: 'personas por alfabetizar, meta anunciada para agosto de 2026' },
    fuente: 'anuies',
  },
  {
    id: 'imss',
    sigla: 'IMSS · INEA',
    titulo: 'Programa de Alfabetización Comunitaria',
    quien: 'IMSS e INEA',
    texto: 'Inició el 11 de mayo de 2026 en Chiapas, Oaxaca, Michoacán y Puebla. Pasantes de medicina y enfermería identifican a personas que no saben leer ni escribir durante la atención médica y las invitan a círculos de estudio dos veces por semana.',
    dato: { valor: '789', etiqueta: 'pasantes de medicina y enfermería participantes' },
    fuente: 'imss',
  },
  {
    id: 'bilingue',
    sigla: 'INEA',
    titulo: 'Alfabetización en lengua materna',
    quien: 'Modelo Indígena Bilingüe del INEA',
    texto: 'El INEA ofrece módulos de alfabetización en 66 de las 68 lenguas originarias del país, con 110 variantes, en 18 estados, Oaxaca entre ellos. En septiembre de 2025 atendía a 7,932 personas indígenas mayores de 15 años.',
    dato: { valor: '66 de 68', etiqueta: 'lenguas originarias con material educativo' },
    fuente: 'ineaBilingue',
  },
];

// Otras puertas oficiales para sumarse (Voluntariado).
export const OTRAS_PUERTAS = [
  {
    titulo: 'Figura solidaria del IEEA Oaxaca',
    texto: 'El IEEA publica convocatorias para personas voluntarias que asesoran círculos de estudio o apoyan plazas comunitarias. Revisa requisitos y fechas en su convocatoria vigente.',
    fuente: 'ieeaConvocatoria',
  },
  {
    titulo: 'Servicio social universitario',
    texto: 'Si estudias en una institución asociada a ANUIES, pregunta en tu escuela si puedes liberar tu servicio social como alfabetizadora o alfabetizador del INEA.',
    fuente: 'anuies',
  },
  {
    titulo: 'Pasantías en salud',
    texto: 'Pasantes de medicina y enfermería del IMSS participan en el Programa de Alfabetización Comunitaria en Oaxaca desde mayo de 2026.',
    fuente: 'imss',
  },
];

// Las ocho regiones de Oaxaca. `clave` sirve para emparejar el nombre guardado en la base.
export const REGIONES = [
  { clave: 'canada', nombre: 'Cañada', area: 'can' },
  { clave: 'papaloapan', nombre: 'Papaloapan', area: 'pap' },
  { clave: 'mixteca', nombre: 'Mixteca', area: 'mix' },
  { clave: 'sierra norte', nombre: 'Sierra Norte', area: 'sno' },
  { clave: 'valles', nombre: 'Valles Centrales', area: 'val' },
  { clave: 'istmo', nombre: 'Istmo', area: 'ist' },
  { clave: 'sierra sur', nombre: 'Sierra Sur', area: 'ssu' },
  { clave: 'costa', nombre: 'Costa', area: 'cos' },
];

export const normalizar = (texto = '') => texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
export const regionDe = (nombre) => REGIONES.find((r) => normalizar(nombre).includes(r.clave)) || null;
