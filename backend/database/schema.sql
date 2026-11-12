-- NEXO NUU | Modelo físico preliminar PostgreSQL 15+
-- Esquema de diseño, no migración aprobada para producción.
BEGIN;
CREATE TABLE roles (
 id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 codigo VARCHAR(32) NOT NULL UNIQUE,
 descripcion VARCHAR(180) NOT NULL
);
CREATE TABLE usuarios (
 id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 nombre VARCHAR(140) NOT NULL,
 correo VARCHAR(255) NOT NULL UNIQUE,
 password_hash TEXT NOT NULL,
 estado VARCHAR(16) NOT NULL DEFAULT 'activo' CHECK (estado IN ('activo','bloqueado')),
 creado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE usuario_rol (
 usuario_id BIGINT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
 rol_id BIGINT NOT NULL REFERENCES roles(id),
 PRIMARY KEY(usuario_id,rol_id)
);
CREATE TABLE instituciones (
 id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 nombre VARCHAR(200) NOT NULL,
 tipo VARCHAR(100),
 descripcion TEXT,
 sitio_web TEXT,
 estado_verificacion VARCHAR(20) NOT NULL DEFAULT 'pendiente'
  CHECK (estado_verificacion IN ('pendiente','verificada','rechazada')),
 creado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE institucion_usuario (
 institucion_id BIGINT NOT NULL REFERENCES instituciones(id) ON DELETE CASCADE,
 usuario_id BIGINT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
 estado VARCHAR(16) NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente','activo','revocado')),
 PRIMARY KEY(institucion_id,usuario_id)
);
CREATE TABLE comunidades (
 id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 nombre VARCHAR(140) NOT NULL,
 municipio VARCHAR(140) NOT NULL,
 region VARCHAR(100),
 UNIQUE(nombre, municipio)
);
CREATE TABLE perfiles_voluntario (
 usuario_id BIGINT PRIMARY KEY REFERENCES usuarios(id) ON DELETE CASCADE,
 comunidad_id BIGINT REFERENCES comunidades(id) ON DELETE SET NULL,
 biografia TEXT,
 disponibilidad VARCHAR(25) NOT NULL DEFAULT 'variable' CHECK (disponibilidad IN ('entre_semana','fin_semana','variable'))
);
CREATE TABLE habilidades (
 id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 nombre VARCHAR(100) NOT NULL UNIQUE
);
CREATE TABLE voluntario_habilidad (
 usuario_id BIGINT NOT NULL REFERENCES perfiles_voluntario(usuario_id) ON DELETE CASCADE,
 habilidad_id BIGINT NOT NULL REFERENCES habilidades(id),
 PRIMARY KEY(usuario_id,habilidad_id)
);
CREATE TABLE lenguas (
 id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 nombre VARCHAR(100) NOT NULL UNIQUE
);
CREATE TABLE variantes (
 id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 lengua_id BIGINT NOT NULL REFERENCES lenguas(id),
 nombre VARCHAR(140) NOT NULL,
 UNIQUE(lengua_id,nombre),
 UNIQUE(lengua_id,id)
);
CREATE TABLE voluntario_lengua (
 id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 usuario_id BIGINT NOT NULL REFERENCES perfiles_voluntario(usuario_id) ON DELETE CASCADE,
 lengua_id BIGINT NOT NULL REFERENCES lenguas(id),
 variante_id BIGINT,
 nivel VARCHAR(20) NOT NULL CHECK (nivel IN ('basico','conversacional','fluido')),
 FOREIGN KEY(lengua_id,variante_id) REFERENCES variantes(lengua_id,id),
 UNIQUE NULLS NOT DISTINCT(usuario_id,lengua_id,variante_id)
);
CREATE TABLE jornadas (
 id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 institucion_id BIGINT NOT NULL REFERENCES instituciones(id),
 comunidad_id BIGINT NOT NULL REFERENCES comunidades(id),
 creado_por BIGINT NOT NULL REFERENCES usuarios(id),
 titulo VARCHAR(220) NOT NULL,
 descripcion TEXT NOT NULL,
 inicio TIMESTAMPTZ NOT NULL,
 fin TIMESTAMPTZ NOT NULL,
 cupo INTEGER NOT NULL CHECK(cupo > 0),
 estado VARCHAR(16) NOT NULL DEFAULT 'borrador' CHECK (estado IN ('borrador','publicada','cerrada','finalizada','cancelada')),
 creado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
 CHECK (fin > inicio)
);
CREATE TABLE jornada_lengua (
 id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 jornada_id BIGINT NOT NULL REFERENCES jornadas(id) ON DELETE CASCADE,
 lengua_id BIGINT NOT NULL REFERENCES lenguas(id),
 variante_id BIGINT,
 prioridad VARCHAR(12) NOT NULL CHECK(prioridad IN ('deseable','requerida')),
 FOREIGN KEY(lengua_id,variante_id) REFERENCES variantes(lengua_id,id),
 UNIQUE NULLS NOT DISTINCT(jornada_id,lengua_id,variante_id)
);
CREATE TABLE postulaciones (
 id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 jornada_id BIGINT NOT NULL REFERENCES jornadas(id),
 voluntario_id BIGINT NOT NULL REFERENCES perfiles_voluntario(usuario_id),
 estado VARCHAR(16) NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente','aceptada','rechazada','retirada')),
 nota TEXT,
 creada_en TIMESTAMPTZ NOT NULL DEFAULT now(),
 actualizada_en TIMESTAMPTZ NOT NULL DEFAULT now(),
 UNIQUE(jornada_id,voluntario_id)
);
CREATE TABLE seguimientos (
 id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 jornada_id BIGINT NOT NULL REFERENCES jornadas(id),
 registrado_por BIGINT NOT NULL REFERENCES usuarios(id),
 fecha TIMESTAMPTZ NOT NULL DEFAULT now(),
 resumen TEXT NOT NULL,
 participantes_confirmados INTEGER CHECK (participantes_confirmados >= 0),
 observaciones TEXT
);
CREATE TABLE contenidos (
 id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 creado_por BIGINT NOT NULL REFERENCES usuarios(id),
 titulo VARCHAR(220) NOT NULL,
 cuerpo TEXT NOT NULL,
 fuente_url TEXT,
 fecha_verificacion DATE,
 estado VARCHAR(16) NOT NULL DEFAULT 'borrador' CHECK(estado IN ('borrador','publicado','archivado')),
 creado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_jornadas_estado_inicio ON jornadas(estado,inicio);
CREATE INDEX idx_postulaciones_jornada_estado ON postulaciones(jornada_id,estado);
CREATE INDEX idx_seguimientos_jornada_fecha ON seguimientos(jornada_id,fecha);
COMMIT;
-- Validaciones transversales en capa de servicio (transacciones):
-- autoridad real del representante; institucion verificada antes de publicar;
-- límite de cupo bajo concurrencia; transiciones permitidas de estado;
-- validación de no duplicación de postulaciones (también protegida por UNIQUE);
-- minimización y consentimiento de información voluntaria.
