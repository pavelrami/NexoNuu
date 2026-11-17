-- Nexo Nuu: migracion 001 (NO volver a ejecutar schema.sql)
-- Diseñada para PostgreSQL 15+ y el esquema de 17 tablas existente.
BEGIN;

ALTER TABLE usuarios
  ADD COLUMN IF NOT EXISTS correo_verificado_en TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS telefono_e164 VARCHAR(16),
  ADD COLUMN IF NOT EXISTS telefono_verificado_en TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS verificaciones_correo (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  usuario_id BIGINT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  token_hash CHAR(64) NOT NULL UNIQUE,
  expira_en TIMESTAMPTZ NOT NULL,
  usado_en TIMESTAMPTZ,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_verificaciones_correo_usuario
  ON verificaciones_correo(usuario_id, creado_en DESC);

CREATE TABLE IF NOT EXISTS sesiones_usuario (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  usuario_id BIGINT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  token_hash CHAR(64) NOT NULL UNIQUE,
  expira_en TIMESTAMPTZ NOT NULL,
  revocado_en TIMESTAMPTZ,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_sesiones_usuario_usuario
  ON sesiones_usuario(usuario_id, expira_en DESC);

-- Los roles de mayor privilegio NO se asignan durante el registro publico.
INSERT INTO roles (codigo, descripcion)
VALUES ('voluntario', 'Persona que solicita colaborar en jornadas de alfabetizacion')
ON CONFLICT (codigo) DO NOTHING;

COMMIT;
