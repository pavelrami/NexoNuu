-- Migracion 006: auditoria de administracion; no modifica solicitudes existentes.
BEGIN;
INSERT INTO roles (codigo, descripcion) VALUES
  ('administrador', 'Administracion y verificacion institucional de Nexo Nuu'),
  ('representante', 'Representante institucional autorizado')
ON CONFLICT (codigo) DO NOTHING;
CREATE TABLE IF NOT EXISTS decisiones_institucionales (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  institucion_id BIGINT NOT NULL REFERENCES instituciones(id),
  usuario_objetivo_id BIGINT REFERENCES usuarios(id),
  administrador_id BIGINT NOT NULL REFERENCES usuarios(id),
  accion VARCHAR(32) NOT NULL CHECK (accion IN ('verificar_institucion','rechazar_institucion','autorizar_representante','revocar_representante')),
  motivo TEXT NOT NULL CHECK (char_length(trim(motivo)) BETWEEN 10 AND 1000),
  fecha TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_decisiones_institucion_fecha ON decisiones_institucionales(institucion_id,fecha DESC);
COMMIT;
