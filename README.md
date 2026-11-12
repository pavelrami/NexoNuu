# Nexo Ñuu — Incremento 1 (base de implementación)

Proyecto integrador de Gestión de Proyectos de Software (SCG-1009).
**Propósito:** plataforma web de concientización, información, vinculación, coordinación y seguimiento de iniciativas de alfabetización en Oaxaca. No imparte clases ni administra un padrón de personas sin alfabetización.

## Lo que SÍ funciona en este primer incremento

- Página pública de inicio, navegación y secciones informativas responsive.
- Pantalla de jornadas que consulta `GET /api/jornadas` (sin datos ficticios).
- API Express con `GET /api/health` y `GET /api/jornadas`.
- Preparación de conexión a PostgreSQL y copia del diseño preliminar de 17 tablas existente.

## Lo que AÚN NO está desarrollado

Autenticación, perfiles, postulaciones, administración de instituciones, edición de jornadas y seguimiento privado. Se incorporarán de forma incremental, con validación de roles y permisos en el backend.

## Requisitos

- Node.js **LTS** actual y npm (consulta https://nodejs.org/en/download).
- PostgreSQL 15 o posterior si deseas usar el esquema existente.
- VS Code recomendado.

## Primera prueba (sin PostgreSQL)

Abre dos terminales desde la carpeta principal.

**Terminal 1: backend**
```bash
cd backend
npm install
cp .env.example .env
npm run dev
```

**Terminal 2: frontend**
```bash
cd frontend
npm install
npm run dev
```

Visita `http://localhost:5173` y luego `http://localhost:3001/api/health`.
Sin PostgreSQL, la pantalla de Jornadas mostrará que falta configurar la base de datos, pero el sitio y la API estarán disponibles.

**Windows PowerShell:** usa `Copy-Item .env.example .env` en lugar de `cp .env.example .env`.

## Activar PostgreSQL (base vacía)

1. En pgAdmin o `psql`, crea una base de datos local llamada `nexo_nuu`.
2. Edita `backend/.env` con tu propia cadena de conexión. Ejemplo (NO usar literalmente la contraseña de ejemplo):
   `DATABASE_URL=postgresql://postgres:TU_CONTRASENA@localhost:5432/nexo_nuu`
3. Con una base de datos **vacía**, ejecuta una sola vez:
```bash
cd backend
npm run db:init
```
4. Reinicia el servidor si editaste el archivo `.env`.
5. Revisa `http://localhost:3001/api/health` (debe indicar `database: conectado`).
6. Al no existir registros de jornadas, la página mostrará un estado vacío correcto.

**Importante:** `db:init` ejecuta el esquema existente, no está diseñado para migraciones repetidas; nunca lo ejecutes sobre datos reales ni lo uses como mecanismo de actualización de tablas. Conservamos el SQL de la etapa de modelado para revisarlo antes del despliegue.

## Estructura
```text
Nexo_Nuu_Starter_v1/
  frontend/           React + Vite
    src/components/   cabecera, pie, marca e iconografía
    src/pages/        Inicio, Jornadas, Voluntariado, Instituciones, Seguimiento
  backend/            Node.js + Express
    src/index.js      API pública de lectura
    src/db.js         conexión PostgreSQL
    src/scripts/      instalación manual del esquema
    database/         SQL del diseño preliminar
  documentacion/      documento de UML/E-R/modelo relacional ya elaborado
```

## Arquitectura de conexión
`Navegador (React) -> /api (proxy de Vite) -> Express -> PostgreSQL`.
La contraseña de PostgreSQL solo vive en `backend/.env`, nunca en React. Mantén `.env` fuera del repositorio.

## Próximo incremento recomendado

1. Validar las tablas y estados contra los diagramas.
2. Implementar registro e inicio de sesión seguros en backend con hash de contraseñas.
3. Asociar roles `voluntario`, `representante` y `administrador` y restringir endpoints.
4. Registro de perfil de voluntario, lenguas y disponibilidad.
5. Administración de jornadas por instituciones verificadas y postulaciones con flujo de aprobación.

## Fuentes técnicas
- https://vite.dev/guide/
- https://react.dev/learn
- https://expressjs.com/es/starter/installing/
- https://node-postgres.com/features/pooling
- https://www.postgresql.org/docs/

## Boceto de referencia
En `referencia_visual/` se incluye el mockup de inicio creado anteriormente. **Las cifras, contactos y cualquier institución de ese boceto son ilustrativos, no datos reales.** La implementación inicial usa estados vacíos y evita inventar resultados o alianzas.
