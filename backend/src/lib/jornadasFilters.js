// Filtros de consulta publica. No altera jornadas ni permisos institucionales.
const MAX_LENGTHS = { buscar: 100, region: 100, municipio: 140 };
const FIELDS = ['buscar', 'region', 'municipio', 'desde', 'hasta', 'lenguaId'];

function readString(input, field) {
  const value = input[field];
  if (value === undefined) return '';
  if (typeof value !== 'string') throw new Error(`El filtro ${field} debe ser un texto.`);
  const clean = value.trim();
  if (clean.length > (MAX_LENGTHS[field] ?? 30)) throw new Error(`El filtro ${field} es demasiado largo.`);
  return clean;
}

function validDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d = new Date(`${value}T12:00:00Z`);
  return Number.isFinite(d.getTime()) && d.toISOString().slice(0, 10) === value;
}

export function parseJornadasFilters(query = {}) {
  try {
    const f = Object.fromEntries(FIELDS.map(field => [field, readString(query, field)]));
    for (const field of ['desde', 'hasta']) {
      if (f[field] && !validDate(f[field])) throw new Error(`La fecha ${field} no es válida.`);
    }
    if (f.desde && f.hasta && f.desde > f.hasta) {
      throw new Error('La fecha inicial no puede ser posterior a la fecha final.');
    }
    if (f.lenguaId && (!/^[1-9]\d{0,14}$/.test(f.lenguaId))) {
      throw new Error('Selecciona una lengua válida.');
    }
    return { ok: true, value: f };
  } catch (error) {
    return { ok: false, message: error.message };
  }
}

export function buildJornadasQuery(f) {
  const params = [];
  const where = [
    "j.estado = 'publicada'",
    "i.estado_verificacion = 'verificada'",
    'j.inicio >= CURRENT_TIMESTAMP'
  ];
  const add = (value) => { params.push(value); return `$${params.length}`; };
  if (f.buscar) {
    // STRPOS trata %, _ y otros caracteres como texto, no comodines SQL.
    // La conversión sencilla permite buscar "alfabetizacion" sin escribir el acento.
    const text = f.buscar.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    const p = add(text);
    where.push(`STRPOS(
      TRANSLATE(LOWER(CONCAT_WS(' ', j.titulo, j.descripcion,
        c.nombre, c.municipio, c.region, i.nombre)), 'áéíóúüñ', 'aeiouun'),
      ${p}
    ) > 0`);
  }
  if (f.region) where.push(`c.region = ${add(f.region)}`);
  if (f.municipio) where.push(`c.municipio = ${add(f.municipio)}`);
  if (f.desde) where.push(`(j.inicio AT TIME ZONE 'America/Mexico_City')::date >= ${add(f.desde)}::date`);
  if (f.hasta) where.push(`(j.inicio AT TIME ZONE 'America/Mexico_City')::date <= ${add(f.hasta)}::date`);
  if (f.lenguaId) {
    const p = add(f.lenguaId);
    where.push(`EXISTS (SELECT 1 FROM jornada_lengua jl
      WHERE jl.jornada_id = j.id AND jl.lengua_id = ${p}::bigint)`);
  }
  return {
    text: `SELECT j.id, j.titulo, j.descripcion, j.inicio, j.fin,
      c.nombre AS comunidad, c.municipio, c.region,
      i.nombre AS institucion,
      COUNT(*) OVER () AS total_coincidencias
      FROM jornadas j
      JOIN instituciones i ON i.id = j.institucion_id
      JOIN comunidades c ON c.id = j.comunidad_id
      WHERE ${where.join(' AND ')}
      ORDER BY j.inicio ASC, j.id ASC
      LIMIT 60`,
    values: params
  };
}
