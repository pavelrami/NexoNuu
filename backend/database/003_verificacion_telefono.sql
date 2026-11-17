-- Nexo Nuu - migracion 003. No ejecutar el schema inicial otra vez.
BEGIN;

CREATE TABLE IF NOT EXISTS verificaciones_telefono (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  usuario_id BIGINT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  telefono_e164 VARCHAR(16) NOT NULL,
  codigo_hash TEXT NOT NULL,
  expira_en TIMESTAMPTZ NOT NULL,
  intentos INTEGER NOT NULL DEFAULT 0 CHECK (intentos >= 0),
  usado_en TIMESTAMPTZ,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT ck_verificacion_telefono_mx CHECK (telefono_e164 ~ '^\+52[0-9]{10}$')
);

CREATE INDEX IF NOT EXISTS idx_verificaciones_telefono_usuario
  ON verificaciones_telefono(usuario_id, creado_en DESC);

-- Solo los numeros YA verificados deben ser unicos entre cuentas.
CREATE UNIQUE INDEX IF NOT EXISTS uq_usuarios_telefono_verificado
  ON usuarios(telefono_e164) WHERE telefono_verificado_en IS NOT NULL;

COMMIT;
