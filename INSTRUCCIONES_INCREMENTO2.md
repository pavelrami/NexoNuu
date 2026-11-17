# Nexo Ñuu — Incremento 2, fase 1: cuentas y acceso

Esta entrega **se basa en el ZIP original del usuario**. Conserva `GET /api/jornadas`, los archivos visuales y las 17 tablas. **No** incluye `.env`, `node_modules` ni `.git`. No cambia el esquema inicial `backend/database/schema.sql`.

## Funciones nuevas

- Migración SQL no destructiva de autenticación (`backend/database/001_autenticacion.sql`).
- Registro público de **voluntarios** con contraseña protegida mediante `scrypt`.
- Verificación de correo con un enlace de un solo uso y caducidad de 24 horas; en desarrollo local el enlace se imprime en la terminal del backend.
- Inicio/cierre de sesión con token aleatorio cuyo hash se guarda en PostgreSQL y cookie `HttpOnly` / `SameSite=Lax` (`Secure` cuando `NODE_ENV=production`).
- `GET /api/auth/me` para consultar el usuario autenticado.
- Páginas React de registro, inicio de sesión, confirmación y **Mi espacio**.
- Limitación básica de solicitudes por IP para uso local académico.

**Pendiente**: envío real a correos (requiere configurar proveedor Resend o equivalente), recuperación de contraseñas, verificación telefónica OTP, paneles por rol, permisos de administración para jornadas, mapas y despliegue VPS. No utilizar esta versión de forma pública antes de pruebas de seguridad y de integrar protecciones de infraestructura.

## 0. Respaldo y rama (Git Bash en la carpeta correcta)

```bash
cd /c/Users/carlo/Desktop/Nexo_Nuu_Primer_Incremento_Codigo/Nexo_Nuu_Starter_v1
git status
git switch -c feat/autenticacion
```

No ejecutes `git init`, no uses Git desde `C:/Users/carlo` y no hagas commit de un archivo `.env`.

## 1. Copiar el contenido del ZIP

Descomprime `NexoNuu_Incremento2_Fase1.zip` **dentro de** `Nexo_Nuu_Starter_v1/` (no dentro de `backend`). Las carpetas `backend/` y `frontend/` del ZIP deben coincidir con las del proyecto, reemplazando solo algunos archivos y añadiendo otros. No elimines los archivos existentes. Contiene `INSTRUCCIONES_INCREMENTO2.md`.

## 2. Migrar PostgreSQL (SIN ejecutar schema.sql)

Abre una terminal PowerShell desde `Nexo_Nuu_Starter_v1/backend` y ejecuta:

```powershell
npm.cmd run db:migrate:auth
```

Tu `backend/.env` actual sigue siendo necesario y debe contener `DATABASE_URL` de la base `nexo_nuu`. **No** subas `backend/.env` al repositorio. Puedes ejecutar la migración por pgAdmin abriendo `backend/database/001_autenticacion.sql` si prefieres. El script incluye transacción e instrucciones `IF NOT EXISTS`, de modo que se puede volver a ejecutar sin duplicar columnas ni roles.

Puedes verificar columnas y tablas ejecutando en pgAdmin:

```sql
SELECT column_name FROM information_schema.columns
WHERE table_name = 'usuarios' ORDER BY ordinal_position;
SELECT tablename FROM pg_tables WHERE schemaname='public'
AND tablename IN ('sesiones_usuario','verificaciones_correo');
SELECT codigo FROM roles ORDER BY codigo;
```

## 3. Configurar modo de correo de desarrollo

En tu archivo **privado** `backend/.env` conserva `PORT` y `DATABASE_URL` y añade:

```env
APP_URL=http://localhost:5173
NODE_ENV=development
EMAIL_MODE=console
```

No pegues contraseñas de PostgreSQL en ChatGPT, capturas o GitHub. En este modo **no se envía un correo real**: en el terminal del backend aparecerá un enlace que permite probar el proceso completo. Es apropiado **solo para desarrollo local**.

Para envío real posteriormente, registra y verifica tu dominio en un proveedor transaccional y utiliza:

```env
EMAIL_MODE=resend
RESEND_API_KEY=CLAVE_PRIVADA_DEL_PROVEEDOR
EMAIL_FROM=Nexo Nuu <verificacion@tudominio.com>
APP_URL=https://tudominio.com
NODE_ENV=production
```

**No** configures el modo producción hasta disponer de HTTPS, reverse proxy, dominio verificado y protecciones contra abuso. Requiere un proveedor de correo válido; el código impide imprimir enlaces sensibles en producción.

## 4. Ejecutar y probar

Terminal 1 (backend):

```powershell
cd C:\Users\carlo\Desktop\Nexo_Nuu_Primer_Incremento_Codigo\Nexo_Nuu_Starter_v1\backend
npm.cmd run dev
```

Terminal 2 (frontend):

```powershell
cd C:\Users\carlo\Desktop\Nexo_Nuu_Primer_Incremento_Codigo\Nexo_Nuu_Starter_v1\frontend
npm.cmd run dev
```

En el navegador abre `http://localhost:5173/registro`.

1. Regístrate con **un correo propio de prueba**, nombre y contraseña de 12+ caracteres. No uses el correo ficticio `demo-nexonuu@example.com`, ya registrado en los datos de ejemplo.
2. El backend imprimirá un enlace de verificación en **su terminal** (no en el navegador). Copia y ábrelo; solo funciona una vez y vence después de 24 horas.
3. Abre `http://localhost:5173/iniciar-sesion`, ingresa tus datos, y comprueba que aparece **Mi espacio** y tu rol `voluntario`.
4. Pulsa **Salir** y abre `/mi-espacio`: deberá redirigirte a inicio de sesión.
5. Visita `/jornadas`: la jornada DEMO debe permanecer visible, sin cambios.

Si el correo no llega **al terminal** en modo `console`, revisa `backend/.env`, reinicia el backend y utiliza el botón **Reenviar verificación**. Este botón espera 60 segundos entre envíos para la misma cuenta.

## 5. Pruebas automatizadas y Git

Desde `backend`:

```powershell
npm.cmd test
```

Se prueban hash de contraseñas, rechazo de contraseña incorrecta, token y cookie. También hay que comprobar en tu computadora `npm.cmd run build` desde `frontend` antes de subir los cambios.

Tras comprobar todo:

```bash
git status
git add backend frontend INSTRUCCIONES_INCREMENTO2.md
git commit -m "feat: registro, verificacion de correo y sesiones iniciales"
git push -u origin feat/autenticacion
```

Revisa los cambios y crea un Pull Request de `feat/autenticacion` a `main` cuando las pruebas funcionen. No crees commits en el repositorio accidental de `C:\Users\carlo`.

## Endpoints nuevos

| Método | Ruta | Función |
|---|---|---|
| POST | `/api/auth/registro` | Crear voluntario pendiente de verificar |
| POST | `/api/auth/reenviar-verificacion` | Solicitar nuevo enlace |
| POST | `/api/auth/verificar-correo` | Activar correo con token de un uso |
| POST | `/api/auth/login` | Abrir sesión, exige correo verificado |
| GET | `/api/auth/me` | Consultar la sesión vigente |
| POST | `/api/auth/logout` | Invalidar sesión |

**Criterios mínimos a comprobar**: un correo sin verificar no inicia sesión, contraseña equivocada no inicia sesión, un enlace usado dos veces falla, la sesión se invalida al salir, las credenciales no aparecen en la base de datos en texto plano y la consulta pública de jornadas sigue operando.
