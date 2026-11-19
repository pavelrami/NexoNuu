-- Nexo Nuu | Incremento 8: plataforma funcional.
-- Migracion aditiva y repetible: no elimina datos.
BEGIN;

-- Inicio de sesion con Google: identificador estable de la cuenta de Google.
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS google_sub VARCHAR(64);
CREATE UNIQUE INDEX IF NOT EXISTS uq_usuarios_google_sub ON usuarios (google_sub) WHERE google_sub IS NOT NULL;

-- Auditoria de decisiones administrativas sobre cuentas de usuario.
CREATE TABLE IF NOT EXISTS decisiones_usuarios (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  usuario_objetivo_id BIGINT NOT NULL REFERENCES usuarios(id),
  administrador_id BIGINT NOT NULL REFERENCES usuarios(id),
  accion VARCHAR(32) NOT NULL CHECK (accion IN ('bloquear','desbloquear','otorgar_admin','retirar_admin')),
  motivo TEXT NOT NULL CHECK (char_length(trim(motivo)) BETWEEN 10 AND 1000),
  fecha TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_decisiones_usuarios_fecha ON decisiones_usuarios (usuario_objetivo_id, fecha DESC);

-- La administracion puede retirar la verificacion de una institucion.
DO $$
DECLARE restriccion text;
BEGIN
  SELECT con.conname INTO restriccion
  FROM pg_constraint con JOIN pg_class rel ON rel.oid = con.conrelid
  WHERE rel.relname = 'decisiones_institucionales' AND con.contype = 'c'
    AND pg_get_constraintdef(con.oid) ILIKE '%accion%';
  IF restriccion IS NOT NULL THEN
    EXECUTE format('ALTER TABLE decisiones_institucionales DROP CONSTRAINT %I', restriccion);
  END IF;
END $$;
ALTER TABLE decisiones_institucionales ADD CONSTRAINT decisiones_institucionales_accion_check
  CHECK (accion IN ('verificar_institucion','rechazar_institucion','revocar_institucion','autorizar_representante','revocar_representante'));

-- La bitacora de jornadas acepta publicacion y moderacion administrativa.
DO $$
DECLARE restriccion text;
BEGIN
  SELECT con.conname INTO restriccion
  FROM pg_constraint con JOIN pg_class rel ON rel.oid = con.conrelid
  WHERE rel.relname = 'jornadas_historial' AND con.contype = 'c'
    AND pg_get_constraintdef(con.oid) ILIKE '%accion%';
  IF restriccion IS NOT NULL THEN
    EXECUTE format('ALTER TABLE jornadas_historial DROP CONSTRAINT %I', restriccion);
  END IF;
END $$;
ALTER TABLE jornadas_historial ADD CONSTRAINT jornadas_historial_accion_check
  CHECK (accion IN ('creacion','publicacion','edicion','cierre','cancelacion','finalizacion','moderacion'));

COMMIT;
