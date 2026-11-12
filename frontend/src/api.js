export async function getJornadas({ signal } = {}) {
  const response = await fetch('/api/jornadas', { signal });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.message || 'No se pudieron consultar las jornadas.');
    error.code = data.code;
    throw error;
  }
  return data.jornadas ?? [];
}
