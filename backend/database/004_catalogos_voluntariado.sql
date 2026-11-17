-- Nexo Nuu / Incremento 3: catalogos para perfiles de voluntariado.
-- Compatible con el esquema existente. No crea cuentas ni alianzas institucionales.
-- Seguro para reejecutar: UNIQUE + ON CONFLICT DO NOTHING.
BEGIN;

INSERT INTO habilidades (nombre) VALUES
  ('Apoyo en actividades de lectura'),
  ('Difusión comunitaria'),
  ('Organización de jornadas'),
  ('Apoyo logístico'),
  ('Elaboración de materiales'),
  ('Apoyo tecnológico'),
  ('Interpretación y comunicación bilingüe')
ON CONFLICT (nombre) DO NOTHING;

-- Nombres generales de lenguas, no certificación de competencia ni catálogo
-- exhaustivo. Las variantes se incorporarán tras su validación lingüística.
INSERT INTO lenguas (nombre) VALUES
  ('Español'),
  ('Zapoteco'),
  ('Mixteco'),
  ('Mixe'),
  ('Huave'),
  ('Chinanteco')
ON CONFLICT (nombre) DO NOTHING;

-- Comunidades reales como referencias de selección; no son sedes ni aliados.
-- Conservar las comunidades que ya existen en el usuario.
INSERT INTO comunidades (nombre, municipio, region) VALUES
  ('Oaxaca de Juárez', 'Oaxaca de Juárez', 'Valles Centrales'),
  ('Santa Cruz Xoxocotlán', 'Santa Cruz Xoxocotlán', 'Valles Centrales'),
  ('San Bartolo Coyotepec', 'San Bartolo Coyotepec', 'Valles Centrales'),
  ('San Mateo del Mar', 'San Mateo del Mar', 'Istmo de Tehuantepec')
ON CONFLICT (nombre, municipio) DO NOTHING;

COMMIT;
