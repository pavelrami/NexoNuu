import test from 'node:test';
import assert from 'node:assert/strict';
import { parseJornadasFilters, buildJornadasQuery } from '../src/lib/jornadasFilters.js';

test('acepta una consulta publica sin filtros', () => {
  const parsed = parseJornadasFilters({});
  assert.equal(parsed.ok, true);
  const query = buildJornadasQuery(parsed.value);
  assert.deepEqual(query.values, []);
  assert.match(query.text, /j\.estado = 'publicada'/);
  assert.match(query.text, /estado_verificacion = 'verificada'/);
  assert.match(query.text, /j\.inicio >= CURRENT_TIMESTAMP/);
});

test('crea parametros SQL en vez de interpolar valores arbitrarios', () => {
  const f = parseJornadasFilters({ buscar: "Oaxaca' OR true --", region: 'Sierra Sur' });
  assert.equal(f.ok, true);
  const q = buildJornadasQuery(f.value);
  assert.equal(q.values[0], "oaxaca' or true --");
  assert.equal(q.values[1], 'Sierra Sur');
  assert.doesNotMatch(q.text, /OR true --/);
  assert.match(q.text, /c\.region = \$2/);
});

test('busqueda sin acentos y texto que incluye % no activa comodines', () => {
  const parsed = parseJornadasFilters({ buscar: 'Alfabetización %' });
  const q = buildJornadasQuery(parsed.value);
  assert.equal(q.values[0], 'alfabetizacion %');
  assert.match(q.text, /STRPOS/);
});

test('rechaza fechas inexistentes y rangos invertidos', () => {
  assert.equal(parseJornadasFilters({ desde: '2026-02-30' }).ok, false);
  assert.equal(parseJornadasFilters({ desde: '2026-12-12', hasta: '2026-12-10' }).ok, false);
  assert.equal(parseJornadasFilters({ desde: '2026-12-10', hasta: '2026-12-12' }).ok, true);
});

test('rechaza filtros repetidos y lenguaId no numérico', () => {
  assert.equal(parseJornadasFilters({ region: ['Norte', 'Sur'] }).ok, false);
  assert.equal(parseJornadasFilters({ lenguaId: '1;DROP' }).ok, false);
  assert.equal(parseJornadasFilters({ lenguaId: '4' }).ok, true);
});

test('separa fechas, municipios y filtro de lenguas', () => {
  const parsed = parseJornadasFilters({
    municipio: 'Oaxaca de Juárez', desde: '2026-12-01', hasta: '2026-12-31', lenguaId: '5'
  });
  const q = buildJornadasQuery(parsed.value);
  assert.deepEqual(q.values, ['Oaxaca de Juárez', '2026-12-01', '2026-12-31', '5']);
  assert.match(q.text, /America\/Mexico_City/);
  assert.match(q.text, /jornada_lengua/);
});
