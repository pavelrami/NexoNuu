-- Incremento 4.3. No elimina datos ni habilita inscripciones existentes.
BEGIN;
ALTER TABLE jornadas ADD COLUMN IF NOT EXISTS es_demo BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE jornadas ADD COLUMN IF NOT EXISTS postulaciones_habilitadas BOOLEAN NOT NULL DEFAULT FALSE;
-- Etiquetar solo el registro de demostracion conocido, no la jornada historica real.
UPDATE jornadas SET es_demo = TRUE
WHERE titulo = 'Jornada DEMO de apoyo a la alfabetización en Oaxaca'
AND institucion_id IN (
  SELECT id FROM instituciones WHERE nombre = 'Institución Demostrativa Nexo Ñuu'
);
CREATE INDEX IF NOT EXISTS idx_postulaciones_voluntario_fecha ON postulaciones(voluntario_id, creada_en DESC);
COMMIT;
