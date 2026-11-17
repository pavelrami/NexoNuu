const AVAILABILITY = new Set(['entre_semana', 'fin_semana', 'variable']);
const LEVELS = new Set(['basico', 'conversacional', 'fluido']);
const ID_PATTERN = /^[1-9]\d{0,14}$/;

function idOrNull(value) {
  if (value === null || value === undefined || value === '') return null;
  const str = String(value);
  return ID_PATTERN.test(str) ? str : undefined;
}

export function normalizeVolunteerProfile(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return { ok: false, message: 'Envía un objeto con los datos del perfil.' };
  }
  const comunidadId = idOrNull(input.comunidadId);
  if (comunidadId === undefined) return { ok: false, message: 'La comunidad seleccionada no es válida.' };
  const disponibilidad = input.disponibilidad ?? 'variable';
  if (!AVAILABILITY.has(disponibilidad)) return { ok: false, message: 'Disponibilidad inválida.' };
  const biografia = input.biografia ?? '';
  if (typeof biografia !== 'string' || biografia.length > 700) {
    return { ok: false, message: 'La biografía debe tener como máximo 700 caracteres.' };
  }
  const habilidades = input.habilidades ?? [];
  if (!Array.isArray(habilidades) || habilidades.length > 12) {
    return { ok: false, message: 'Selecciona como máximo 12 habilidades.' };
  }
  const parsedSkills = habilidades.map(idOrNull);
  if (parsedSkills.some(x => !x) || new Set(parsedSkills).size !== parsedSkills.length) {
    return { ok: false, message: 'La lista de habilidades contiene valores inválidos o repetidos.' };
  }
  const lenguas = input.lenguas ?? [];
  if (!Array.isArray(lenguas) || lenguas.length > 12) {
    return { ok: false, message: 'Selecciona como máximo 12 declaraciones de lengua.' };
  }
  const parsedLanguages = [];
  const used = new Set();
  for (const row of lenguas) {
    if (!row || typeof row !== 'object' || Array.isArray(row)) {
      return { ok: false, message: 'Hay una lengua inválida.' };
    }
    const lenguaId = idOrNull(row.lenguaId);
    const varianteId = idOrNull(row.varianteId);
    if (!lenguaId || varianteId === undefined || !LEVELS.has(row.nivel)) {
      return { ok: false, message: 'Revisa la lengua, la variante o el nivel declarado.' };
    }
    const key = `${lenguaId}-${varianteId ?? ''}`;
    if (used.has(key)) return { ok: false, message: 'No repitas la misma lengua y variante.' };
    used.add(key);
    parsedLanguages.push({ lenguaId, varianteId, nivel: row.nivel });
  }
  return {
    ok: true,
    value: {
      comunidadId,
      disponibilidad,
      biografia: biografia.trim(),
      habilidades: parsedSkills,
      lenguas: parsedLanguages,
    }
  };
}
