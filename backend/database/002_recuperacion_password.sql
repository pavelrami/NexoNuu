-- Nexo Nuu - Migracion 002: recuperacion segura de contrasena.
-- Ejecutar UNA sola vez despues de 001_autenticacion.sql.
BEGIN;
CREATE TABLE IF NOT EXISTS recuperaciones_password (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  usuario_id BIGINT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  token_hash CHAR(64) NOT NULL UNIQUE,
  expira_en TIMESTAMPTZ NOT NULL,
  usado_en TIMESTAMPTZ,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_recuperaciones_usuario
  ON recuperaciones_password(usuario_id, creado_en DESC);
COMMIT;
