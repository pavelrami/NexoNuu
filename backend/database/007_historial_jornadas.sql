-- Nexo Nuu | Incremento 5.5: bitacora de gestion de jornadas DEMO.
-- Migracion aditiva: no modifica ni elimina registros de jornadas anteriores.
BEGIN;
CREATE TABLE IF NOT EXISTS jornadas_historial (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    jornada_id BIGINT NOT NULL REFERENCES jornadas(id) ON DELETE RESTRICT,
    actor_id BIGINT NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT,
    accion VARCHAR(24) NOT NULL CHECK (accion IN ('edicion', 'cierre', 'cancelacion', 'finalizacion')),
    estado_anterior VARCHAR(16) NOT NULL,
    estado_nuevo VARCHAR(16) NOT NULL,
    motivo VARCHAR(500) NOT NULL,
    creado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_jornadas_historial_fecha
    ON jornadas_historial (jornada_id, creado_en DESC);
COMMIT;
