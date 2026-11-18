BEGIN;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS es_cuenta_demo BOOLEAN NOT NULL DEFAULT FALSE;
-- Rechazar registros que solo difieren por mayúsculas/minúsculas.
-- Si hay duplicados preexistentes, resolverlos antes de crear el índice.
CREATE UNIQUE INDEX IF NOT EXISTS uq_usuarios_correo_normalizado ON usuarios (lower(correo));
COMMIT;