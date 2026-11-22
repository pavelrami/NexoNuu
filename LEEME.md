# Nexo Ñuu · Incremento 7: sitio público animado con datos reales

Rediseño completo del sitio público (Inicio, Jornadas, Detalle, Voluntariado, Instituciones, Seguimiento, Iniciar sesión y Registro) con animaciones por sección, datos oficiales con su fuente y dos endpoints públicos nuevos. **Todo lo que ya funcionaba sigue igual**: cuentas, verificación, perfil de voluntariado, postulaciones, panel institucional y administración.

---

## Incremento 10: panel central de administración y mapa real de alfabetización

No se tocó el backend ni la base de datos. Cambian dos vistas:

### 1. Panel central de administración (`/admin`)

Toma la estructura del diseño de referencia; todos los números salen de la API y ninguno se inventa:

| Bloque | Qué muestra | De dónde sale |
|---|---|---|
| Barra superior | Saludo, estado del servidor, búsqueda, cifras de voluntariado y voluntarios aceptados, avisos y fecha | `/api/admin/resumen` y `/api/health` |
| Menú lateral | Panel central, Instituciones verificadas (N activas), Gestión de jornadas (N en curso), Usuarios y voluntariado (N cuentas), Validaciones (con número pendiente) | `/api/admin/resumen` |
| Jornadas activas | Publicadas, total, barra de publicadas del total, tendencia de seis meses | `/api/admin/jornadas` |
| Voluntariado registrado | Cuentas con rol voluntariado; barra de quienes ya se postularon (se oculta si hay más de 200 cuentas, porque la API devuelve solo las 200 más recientes) | `/api/admin/usuarios` |
| Lugares cubiertos | Voluntarios aceptados y porcentaje del cupo de jornadas publicadas | `/api/admin/jornadas` |
| Instituciones verificadas | Verificadas, pendientes y representantes autorizados | `/api/admin/resumen` |
| Avance de jornadas del año | Línea acumulada por mes de inicio, con pestañas por región; los meses que aún no llegan van punteados (jornadas ya programadas) | `/api/admin/jornadas` |
| Distribución por institución | Medio anillo de jornadas vigentes por institución (las 3 con más jornadas y "Otras") | `/api/admin/jornadas` |
| Últimas jornadas registradas | Las 5 de alta más reciente (id más alto) | `/api/admin/jornadas` |
| Validaciones y solicitudes | Instituciones y representantes por revisar, y cuentas sin verificar o bloqueadas | `/api/admin/instituciones` y resumen |
| Infraestructura y datos del sistema | PostgreSQL, API (tiempo de respuesta medido en tu navegador), correo y Google | `/api/health` y `/api/auth/proveedores` |

**Diferencias con la referencia, a propósito:** la referencia muestra "Personas en alfabetización" y una meta del 85 %, pero la plataforma no registra educandos ni metas, así que esa tarjeta muestra **lugares cubiertos** con datos reales. Tampoco hay menú de "Repositorio", "Estadísticas" ni "Configuración", porque esas secciones no existen todavía.

**Colores de las gráficas** (validados para daltonismo con el validador de la guía de visualización): `#1d8a73` verde, `#e3a23c` ocre, `#c45f3c` terracota y `#5a78c4` azul; "Otras" en gris `#9aa7a2`. El ocre tiene poco contraste sobre blanco, por eso la leyenda siempre lleva el nombre y el porcentaje escritos.

### 2. Mapa de alfabetización en Mi espacio (`/mi-espacio`)

El mapa esquemático se cambió por un **mapa real de Oaxaca** con 50 sedes públicas de alfabetización. Se puede acercar, mover, filtrar por tipo y región, y ver la ficha de cada sede con su dirección y un enlace "Cómo llegar". También hay vista de lista, que es la alternativa accesible.

| Tipo | Cuántas | Fuente |
|---|---|---|
| Sede central del IEEA (Heroica Escuela Naval Militar 701, Reforma, Oaxaca de Juárez; tel. 951 502 1490) | 1 | [Portal oficial del IEEA Oaxaca](https://www.oaxaca.gob.mx/ieea/), consultado el 21 nov 2026 |
| Coordinaciones de zona del IEEA | 11 | [INEA, Puntos de difusión e incorporación, 1a Jornada 2026, Oaxaca](http://www.inea.gob.mx/sedes_aplicacion/2026/abril/PUNTOS_DE_DIFUSION_1a_JORNADA_2026_OAXACA_17042026.pdf) (17 abr 2026) |
| Plazas comunitarias | 39 (una sin ubicación: solo aparece en la lista) | La misma lista del INEA |

- De la lista del INEA se tomaron **solo las sedes permanentes**: coordinaciones de zona y plazas comunitarias. Se dejaron fuera los puntos temporales de la jornada (palacios y corredores municipales) y **los nombres y teléfonos de las personas responsables**, porque son datos personales.
- Las coordenadas se buscaron en OpenStreetMap (Nominatim) y son **aproximadas al centro de cada localidad**. La sede central está a nivel calle. Cada ficha lo dice.
- Datos en `frontend/src/data/alfabetizacion-oaxaca.js`. Para agregar o corregir una sede, edita su objeto y cambia `CONSULTA_ALFA`.
- El mapa usa **Leaflet 1.9.4** (librería de mapas, versión fija) con el mapa base de **OpenStreetMap**. Leaflet se descarga solo al abrir Mi espacio, no en las demás páginas.

### Publicar en el VPS (esta vez son dos comandos)

1. Actualizar el sitio:

   ```powershell
   ssh root@179.66.153.232 "cd /var/www/nexo-nuu && git fetch origin feat/demo-publica && git reset --hard origin/feat/demo-publica && cd frontend && npm ci && npm run build"
   ```

2. Permitir las imágenes del mapa. La política de seguridad de nginx (CSP: la lista de sitios de los que la página puede cargar cosas) hoy solo deja cargar imágenes del propio sitio. Este comando agrega OpenStreetMap; si lo corres dos veces no pasa nada:

   ```powershell
   ssh root@179.66.153.232 "sed -i 's#data:; style-src#data: https://tile.openstreetmap.org; style-src#' /etc/nginx/sites-available/nexo-nuu && nginx -t && systemctl reload nginx"
   ```

   `deploy/instalar-vps.sh` ya trae este cambio para instalaciones nuevas.

### Por validar (decisiones que tomé por ti)

1. **Mapa base de OpenStreetMap.** Es gratuito y no pide cuenta, pero cada vez que alguien abre el mapa, su navegador pide las imágenes a los servidores de OpenStreetMap, que ven su dirección IP. Para una demo está bien. Si el tráfico crece, conviene un proveedor de mapas con contrato (sus reglas piden no abusar del servicio gratuito).
2. **Solo sedes del IEEA y del INEA.** No encontré en fuentes oficiales un directorio con ubicaciones de asociaciones civiles de alfabetización en Oaxaca. Afodepo aparece como aliada de la Estrategia Nacional, pero sin dirección pública, así que no la puse en el mapa.
3. **Ubicaciones aproximadas.** Son el centro de cada localidad, no la puerta de la sede. Convendría confirmarlas con el IEEA.
4. **La lista del INEA es de abril de 2026.** Algunas plazas pueden haber cambiado de domicilio. El directorio mensual completo del INEA está en datos.gob.mx ("Plazas comunitarias en operación", CC BY 4.0), pero su servidor bloquea la descarga automática. Si lo bajas desde el navegador, puedo sumar todas las plazas del estado.
5. **Lugares cubiertos en lugar de "Personas en alfabetización".** Si más adelante se registran educandos y metas, esa tarjeta puede mostrar el dato de la referencia.

---

## Incremento 9: paneles con menú lateral (voluntariado, institución y administración)

Solo cambió el diseño: **no se tocó el backend ni la base de datos** y cada botón usa las mismas rutas de la API que antes. Las tres áreas privadas ahora son paneles con menú lateral, sin la cabecera ni el pie del sitio público.

### Qué cambió

| Panel | Ruta | Qué muestra |
|---|---|---|
| Voluntariado | `/mi-espacio` (y Mis postulaciones, Mi perfil, Seguridad, Registrar institución) | Postulaciones activas, próxima jornada, comunidades, perfil completo (%), mapa de oportunidades por región, mis jornadas en curso, agenda, perfil, seguridad y recomendaciones (primero las de la región de tu comunidad) |
| Institución | `/panel-institucional` con vistas `?vista=jornadas`, `postulaciones`, `nueva`, `seguimiento` | Bienvenida con regiones y próxima jornada, jornadas activas, postulaciones pendientes, cupo cubierto, tabla de jornadas con “Gestionar”, postulaciones recientes con “Aceptar” y próximas fechas |
| Administración | `/admin` con vistas `?vista=solicitudes`, `instituciones`, `usuarios`, `jornadas` | Instituciones, usuarios, jornadas y cupo cubierto; mapa por región con filtro; validaciones pendientes; estado real del servidor (API, PostgreSQL, correo y Google) y cuentas que requieren atención |

**Menú lateral:** en escritorio se contrae a una columna de íconos (se recuerda en ese navegador); en celular y tableta se desliza desde la izquierda con el botón ☰, se cierra con Esc, con un toque afuera o al elegir una sección, y mientras está abierto el resto de la página no recibe foco. Si una persona tiene varios roles, abajo aparece “Cambiar de panel”.

**Cada rol entra a su panel.** Al iniciar sesión (con correo o con Google) cada cuenta va directo a su panel. Si una cuenta tiene varios roles, manda el más alto:

| Rol de la cuenta | Entra a | Puede abrir |
|---|---|---|
| Administración | `/admin` | Administración, Seguridad y, si también representa a una institución, el panel institucional |
| Institución (representante autorizado) | `/panel-institucional` | Panel institucional, Solicitudes institucionales y Seguridad |
| Voluntariado | `/mi-espacio` | Mi espacio, Mis postulaciones, Mi perfil, Seguridad y Registrar institución |

“Mi espacio”, “Mis postulaciones” y “Mi perfil” existen solo para voluntariado: si otra cuenta abre esas direcciones, vuelve a su panel. Lo mismo pasa con `/admin` y `/panel-institucional` para quien no tiene ese rol. La dirección `/panel` lleva a cada quien a su panel (la usa el regreso del acceso con Google). La lógica vive en `src/components/panel/navegacion.js` y `src/components/panel/CuentaShell.jsx`. No cambió el backend: los permisos siguen validándose en el servidor.

**Barra superior:** búsqueda (jornadas en voluntariado e institución, usuarios en administración), campana con el número de pendientes, fecha y avatar con iniciales.

### Archivos

| Archivo | Para qué sirve |
|---|---|
| `src/components/panel/PanelLayout.jsx` | Menú lateral, barra superior y pantalla de espera, compartidos por los tres paneles |
| `src/components/panel/CuentaShell.jsx` | Marco de las páginas de cuenta (Mi espacio, Seguridad…) según el rol; el menú se queda montado al navegar |
| `src/components/panel/navegacion.js` | Rol principal de cada cuenta, a qué panel entra y las secciones de cada menú |
| `src/components/panel/MapaOaxaca.jsx` | Mapa esquemático de las 8 regiones con marcadores en forma de rombo |
| `src/components/panel/piezas.jsx` | Indicadores, barra-hilo, minigráfica, medio anillo, etiquetas de estado, avatar, fechas |
| `src/panel.css` | Todo el estilo de los paneles |

### Valores de diseño

| Elemento | Valor | Contraste |
|---|---|---|
| Menú lateral | `#0a3b33` (verde-900) | Texto `#e8f3ee`: 10.9:1 · texto tenue `#9fbdb3`: 6.1:1 |
| Sección activa | Fondo `#e4f4ed`, texto `#0a3b33`, rombo ocre a la izquierda | 10.9:1 |
| Lienzo / tarjetas | `#f6f4ee` / blanco, borde `#e3e7df`, radio 16 px | |
| Avisos en el menú | `#a8432a` con texto blanco | 6.0:1 |
| Etiqueta “aviso” | Fondo `#fbf0dc`, texto `#86500b` | 5.9:1 |
| Ancho del menú | 272 px (contraído 80 px; celular hasta 300 px) | |
| Movimiento | El isotipo se teje al entrar (0.95 s, `power3.out`), las secciones del menú y las tarjetas se posan en cascada (0.05 s), los números cuentan, las barras-hilo crecen y los rombos del mapa se posan | Con “Reducir movimiento” nada se mueve |

Elementos propios: rombo tejido (firma del menú y marcador activo), barra de avance con nudo de rombo, marcadores del mapa en rombo, curvas de nivel en el menú y en la bienvenida, olas punteadas en la costa del mapa.

### De dónde sale cada dato

Todo sale de la API existente; no hay cifras de ejemplo. Lo que calcula el navegador:
- **Perfil completo:** 6 datos (perfil guardado, comunidad, habilidades, lenguas, presentación y teléfono verificado).
- **Cupo cubierto:** personas aceptadas ÷ cupo de las jornadas publicadas.
- **Minigráficas:** jornadas por mes de inicio, e instituciones y usuarios acumulados en los últimos seis meses.
- **Postulaciones recientes (institución):** se consultan las jornadas que tienen pendientes.
- **Estado de la plataforma:** `/api/health` (con el tiempo de respuesta medido) y `/api/auth/proveedores`.

### Por validar (decisiones que tomé por ti)

1. Las maquetas traían métricas que la plataforma no registra (**horas aportadas, personas alfabetizadas, materiales didácticos, sincronización IEEA/SEP, copias de seguridad, reportes**). No las inventé: las cambié por datos reales (postulaciones, cupo cubierto, perfil completo, estado del servidor). Si quieres esas secciones, hace falta guardar esos datos primero.
2. **“Materiales”, “Comunidades” y “Configuración”** del menú de las maquetas no existen todavía; no puse botones que no hagan nada.
3. **Mapa esquemático:** las formas de las regiones son aproximadas y lo dice debajo (“no a escala”).
4. **Saludo** según la hora de Oaxaca (“Buenos días / Buenas tardes / Buenas noches”).
5. En Solicitar institución quité dos frases que decían que la revisión administrativa aún no existía (ya existe).
6. **Rol más alto manda:** toda cuenta nueva empieza como voluntariado. Cuando la administración la autoriza como representante, desde su siguiente ingreso entra al panel institucional y ya no ve Mi espacio ni Mis postulaciones (sus postulaciones siguen guardadas). Si prefieres que esas cuentas conserven también Mi espacio, se cambia en `navegacion.js`.

### Pendiente

- [ ] Probar en un celular real (revisado con Chrome sin ventana a 375 × 812 y 1440 × 900 con las tres cuentas de demostración: sin desbordes ni errores de consola).

### Publicar en el VPS

Solo cambió el frontend, así que basta con traer el código y compilar (no hace falta migrar ni reiniciar la API):

```bash
cd /var/www/nexo-nuu && git fetch origin feat/demo-publica && git reset --hard origin/feat/demo-publica && cd frontend && npm ci && npm run build
```

nginx sirve `frontend/dist` directamente; los archivos nuevos llevan otro nombre, así que el navegador no se queda con la versión anterior.

---

## Incremento 9: postulaciones visibles, cambio de rol y criterios de evaluación

**Qué cambió**
- **Postularse sin perfil ya no se bloquea.** Si la cuenta voluntaria aún no tiene perfil, se crea uno básico al postularse. La institución ve la postulación de inmediato en su panel (Postulaciones).
- **Verificar una institución es un solo paso.** Toda cuenta empieza como voluntariado. Desde su panel solicita "Registrar institución". Cuando la administración la **aprueba**, en la misma acción:
  - la institución queda verificada;
  - la persona solicitante queda autorizada como su representante;
  - recibe el rol **institución** (`representante`) y pierde el de **voluntariado**;
  - sus postulaciones pendientes como voluntaria se marcan como retiradas;
  - recibe un correo con la decisión.
- **Al revocar** la representación o retirar la verificación, la cuenta vuelve a ser voluntariado.
- **El menú cambia solo** al volver a la pestaña: no hace falta cerrar sesión tras la aprobación.
- **Registro:**
  - campo **Confirmar contraseña**;
  - elección "¿Cómo quieres participar?" (voluntariado o institución, con su siguiente paso);
  - mensaje claro si el correo **ya existe** (`409 CORREO_REGISTRADO`).
- **Cuentas no voluntarias:** una cuenta institucional o administradora ve por qué no puede postularse.

**Correo con Brevo:** el `.env` del servidor usa `EMAIL_MODE=smtp`, `SMTP_HOST=smtp-relay.brevo.com` y `SMTP_PORT=587` (con 587 la conexión se cifra con STARTTLS automáticamente). `SMTP_USER` es el inicio de sesión que da Brevo y `SMTP_PASS` es la clave SMTP. **`EMAIL_FROM` debe ser un remitente verificado en Brevo** (Remitentes y dominios): si no, Brevo rechaza el envío.

### Criterios de evaluación

| Criterio | Cómo lo cumple Nexo Ñuu | Estado |
|---|---|---|
| Funcionalidad básica | El formulario pide nombre, correo, contraseña y tipo de participación. La cuenta se crea en PostgreSQL. El rol institución se otorga tras la verificación, por seguridad | Cumple |
| Validaciones | No acepta campos vacíos. Revisa el formato del correo y que su dominio reciba mensajes, la longitud mínima de 12 caracteres y la confirmación de contraseña, tanto en el navegador como en el servidor | Cumple |
| Duplicados | Un correo ya registrado responde "Ya existe una cuenta con ese correo" con enlaces a iniciar sesión o recuperar contraseña. Hay un índice único en `lower(correo)` | Cumple |
| Seguridad | La contraseña se oculta al escribir (con botón para mostrarla) y se guarda cifrada con **scrypt**. La sesión usa una cookie HttpOnly y su token se guarda cifrado. Hay límite de intentos | Cumple |
| Persistencia | El usuario aparece en Administración → Usuarios e inicia sesión después de confirmar su correo | Cumple (requiere correo configurado) |
| Roles y permisos | Cada rol entra directo a su panel (`/mi-espacio`, `/panel-institucional`, `/admin`) con su propio menú. Las rutas se protegen en el navegador y **en el servidor**, que responde 403 si alguien escribe la URL de otro rol | Cumple |
| Usabilidad y mensajes | Los mensajes de éxito y error están en español claro. Las decisiones piden un motivo. Hay avisos de correo enviado y estados vacíos explicados | Cumple |

Prueba automática del flujo completo (cuenta nueva sin perfil → se postula → la institución la ve → solicita institución → la administración aprueba → cambia de rol): 9 de 9 comprobaciones correctas en local.

---

## Incremento 8: plataforma funcional (cuentas, correo real, Google, administración e instituciones)

### Pasos una sola vez (en `backend`)

```powershell
npm.cmd install                                   # instala nodemailer 10.3.1
npm.cmd run db:migrate:plataforma                 # migración 009 (aditiva, se puede repetir)
npm.cmd run db:seed:demo -- --confirmar           # cuentas y jornadas de demostración
```

El último comando crea:

| Qué | Detalle |
|---|---|
| Cuenta **administradora** | Revisa solicitudes, verifica o retira instituciones, autoriza representantes, bloquea o reactiva usuarios, da o quita permisos de administración y cancela jornadas por moderación |
| Cuenta **institucional** | Representante autorizada de la “Institución Demostrativa Nexo Ñuu”: crea, publica, edita, cierra y finaliza jornadas, y acepta o rechaza a quien se postula |
| Cuenta **voluntaria** | Con perfil completo (comunidad, habilidades y lenguas) y dos postulaciones pendientes |
| 9 comunidades reales | Una o más por cada una de las 8 regiones de Oaxaca |
| 9 jornadas de demostración | 8 publicadas (con la etiqueta “Demostración”) y 1 en borrador para probar “Publicar” |

En el VPS (con `NODE_ENV=production`) el comando lleva además `--confirmar-produccion`. Las contraseñas se generan al azar y se guardan en **`backend/credenciales-demo.local.txt`** (Git lo ignora). Para generar contraseñas nuevas: `npm.cmd run db:seed:demo -- --confirmar --reiniciar-claves`. Los correos de las cuentas son `@nexonuu.test` salvo que pongas otros en `SEED_*_CORREO` dentro de `.env`.

### Qué hace cada parte

- **Correo real a la bandeja del usuario.** `EMAIL_MODE=smtp` (Hostinger, Gmail u Outlook) o `EMAIL_MODE=resend`. Se envían con el diseño de la marca:
  - el enlace de verificación al crear la cuenta (vence en 24 h);
  - el enlace para restablecer la contraseña (vence en 30 min y sirve una sola vez);
  - el aviso a la persona voluntaria cuando una institución acepta o rechaza su postulación.

  Con `EMAIL_MODE=console` (local), los enlaces aparecen en la terminal del backend.
- **Solo correos que existen.** Al registrarse, el servidor revisa que el dominio del correo exista y reciba mensajes (registros MX). Después, nadie entra sin abrir el enlace que llega a ese buzón.
- **Google.** Los botones “Continuar con Google” y “Registrarme con Google” usan OpenID Connect con PKCE y validan emisor, audiencia, vigencia y correo verificado. Si el correo ya existía sin verificar, se invalida la contraseña anterior para que nadie conserve el acceso. Mientras no configures `GOOGLE_CLIENT_ID` y `GOOGLE_CLIENT_SECRET`, el botón explica que falta configurarlo.
- **Olvidé mi contraseña.** Funciona de punta a punta y se rediseñó; también sirve a quien entró con Google y quiere crear una contraseña.
- **Panel institucional (ya no solo local).** Las jornadas reales de instituciones verificadas se gestionan siempre. Las de demostración se gestionan con `ALLOW_DEMO_POSTULACIONES=1`. La institución ve el perfil que cada persona compartió (comunidad, disponibilidad, habilidades y lenguas); **el correo de contacto aparece solo cuando acepta la postulación**.
- **Administración** en `/admin`, con pestañas Solicitudes, Instituciones, Usuarios y Jornadas. Cada decisión pide un motivo y queda auditada en `decisiones_institucionales`, `decisiones_usuarios` o `jornadas_historial`. Nadie puede bloquearse ni quitarse permisos a sí mismo.
- **Teléfono.** Postularse ya no exige teléfono verificado, salvo que pongas `TELEFONO_OBLIGATORIO=1` (hace falta un proveedor de SMS en producción).

### Configurar el correo real

**Opción A, correo de tu dominio en Hostinger:** crea un buzón (por ejemplo `no-responder@tudominio.com`) en hPanel, Correos electrónicos. Después, en `backend/.env`:

```env
EMAIL_MODE=smtp
SMTP_HOST=smtp.hostinger.com
SMTP_PORT=465
SMTP_USER=no-responder@tudominio.com
SMTP_PASS=(contraseña del buzón)
EMAIL_FROM=Nexo Ñuu <no-responder@tudominio.com>
```

**Opción B, Gmail:** activa la verificación en dos pasos y crea una *contraseña de aplicación* en tu cuenta de Google. Después usa `SMTP_HOST=smtp.gmail.com`, `SMTP_PORT=465`, tu Gmail en `SMTP_USER` y `EMAIL_FROM`, y la contraseña de aplicación en `SMTP_PASS`.

Reinicia el backend después de editar `.env`. Para revisar que funcione, crea una cuenta con tu correo real y espera el mensaje (revisa también la carpeta de spam).

### Configurar Google

1. En [Google Cloud Console](https://console.cloud.google.com/) crea un proyecto. En “Pantalla de consentimiento de OAuth” elige **Externo** y llena el nombre de la app y tu correo.
2. En Credenciales, crea un **ID de cliente de OAuth** de tipo *Aplicación web*.
3. En “URI de redireccionamiento autorizados” agrega:
   - local: `http://localhost:5173/api/auth/google/callback`
   - VPS: `https://tudominio.com/api/auth/google/callback`
4. Copia el ID y el secreto en `backend/.env` (`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`) y reinicia el backend.

### Nuevas rutas de la API

| Método | Ruta | Quién |
|---|---|---|
| GET | `/api/auth/proveedores` | Público: si Google está activo y cómo se entrega el correo |
| GET | `/api/auth/google`, `/api/auth/google/callback` | Público (flujo de Google) |
| GET | `/api/admin/resumen`, `/api/admin/usuarios`, `/api/admin/jornadas` | Administración |
| PATCH | `/api/admin/usuarios/:id/estado`, `/api/admin/usuarios/:id/admin` | Administración |
| PATCH | `/api/admin/instituciones/:id/revocar`, `/api/admin/jornadas/:id/cancelar` | Administración |
| PATCH | `/api/panel-institucional/…/publicar`, `/editar`, `/transicion` | Representante (las rutas `-demo` anteriores siguen funcionando) |

Pruebas: **64** en el backend (`npm.cmd test`), con casos nuevos de Google, de dominios de correo y de permisos.

---

## 1. Cómo verlo en tu computadora

Igual que antes, dos terminales:

```powershell
cd backend
npm.cmd run dev
```

```powershell
cd frontend
npm.cmd install   # una sola vez: instala gsap 3.13.0 y lenis 1.3.11
npm.cmd run dev
```

Abre `http://localhost:5173`. Si la API o PostgreSQL no están disponibles, el sitio se ve completo y muestra avisos claros en lugar de jornadas.

---

## 2. Qué cambió

### Frontend (React + Vite)

| Archivo | Para qué sirve |
|---|---|
| `src/motion/motion.js` | Sistema de movimiento: GSAP + ScrollTrigger + SplitText + Lenis (scroll suave). Tokens de movimiento y animaciones por atributos `data-` |
| `src/motion/useMotion.js` | Hook que anima cada página y limpia todo al salir de ella |
| `src/data/fuentes.js` | **Todas las cifras y fuentes oficiales** en un solo lugar (para actualizar datos sin tocar diseño) |
| `src/components/Brand.jsx` | Isotipo del rombo tejido, con cada hilo como trazo animable |
| `src/components/Nuu.jsx` | Personaje Ñuu en vector (redibujado del logo que enviaste), respira lento |
| `src/components/Ilustraciones.jsx` | Ilustraciones propias (árbol con círculo de estudio, aula, sierra) y portadas generativas por jornada |
| `src/components/Adornos.jsx` | Curvas de nivel, hilo punteado, sello giratorio, greca escalonada |
| `src/components/JornadaCard.jsx` | Tarjeta de jornada reutilizable (Inicio, Jornadas, Seguimiento) |
| `src/components/AuthLayout.jsx` | Diseño compartido de Iniciar sesión y Registro, con botón para ver la contraseña |
| `src/styles.css` y `src/paginas.css` | Sistema visual (tokens de color, letra, forma y movimiento) y estilos por página |
| `public/og-imagen.png`, `public/apple-touch-icon.png`, `public/favicon.svg` | Imagen para compartir en redes (1200 × 630), ícono de celular (180 px) y favicon |

**Funciones nuevas en la interfaz**
- Búsqueda rápida desde la cabecera (lupa) que lleva a Jornadas con el texto ya aplicado.
- Los filtros de Jornadas quedan en la dirección web (`/jornadas?region=…`), así una búsqueda se puede compartir.
- Pestañas rápidas: Todas, Próximas 2 semanas y Mis postulaciones.
- Chips de filtros aplicados que se quitan con un toque, y orden por fecha o nombre.
- Mapa esquemático de las 8 regiones de Oaxaca que filtra al tocarlo y cuenta jornadas por región.
- “El nexo hoy”: indicadores en vivo de la plataforma (jornadas vigentes, instituciones verificadas, perfiles de voluntariado, jornadas finalizadas). Si todas las jornadas son de demostración, lo dice.
- Seguimiento ahora muestra el ciclo de vida de una jornada y la lista pública de **jornadas finalizadas** (ahí aparece la referencia histórica del IEEA de San Pedro Amuzgos).
- Menú móvil a pantalla completa, cabecera que se esconde al bajar y reaparece al subir, enlace “Saltar al contenido”.

### Backend (Express)

| Cambio | Detalle |
|---|---|
| `GET /api/estadisticas` (nuevo) | Conteos agregados públicos. **Nunca** devuelve nombres, correos ni datos de participantes. Cuenta aparte las jornadas DEMO |
| `GET /api/jornadas/historicas` (nuevo) | Jornadas `finalizada` de instituciones verificadas, sin postulaciones |
| `GET /api/jornadas` | Ahora incluye `es_demo` para marcar demostraciones sin adivinar por el título |
| `GET /api/auth/me` | Para visitantes sin sesión responde `200 { user: null }` en vez de `401`, así ya no aparece un error rojo en la consola de cada visita. El resto de rutas protegidas sigue respondiendo 401/403 |

Las 51 pruebas del backend pasan (`npm.cmd test`).

---

## 3. Dirección de arte (valores técnicos)

Tomé tus maquetas como la dirección aprobada (paleta verde, crema y ocre; tarjetas redondeadas; letra geométrica) y les sumé de las referencias de estilo: de la granja, los bordes orgánicos y la sierra en capas; de las tarjetas de celular, el paisaje que entra desde abajo.

**Se siente:** cercana, clara, tejida.

### Color (contraste AA comprobado)

| Token | HEX | Papel | Contraste |
|---|---|---|---|
| `--verde-700` / `--cta` | `#0d5c4e` | Botones y acentos | Blanco encima: 7.9:1 |
| `--verde-900` | `#0a3b33` | Secciones oscuras, hover del botón | Ocre claro encima: 8.7:1 |
| `--tinta` | `#13302a` | Texto principal | |
| `--tinta-2` | `#4c5f59` | Texto secundario | Sobre crema: 6.1:1 |
| `--ocre-700` | `#94570b` | Etiquetas pequeñas en ocre | Sobre crema: 5.2:1 |
| `--ocre-500` | `#e3a23c` | Solo decoración (rombos, hilos, barras) | No se usa para texto |
| `--menta-100/200/300` | `#e4f4ed` `#cbeadd` `#a9dcc8` | Fondos suaves, del personaje Ñuu | |
| `--crema` / `--papel` | `#f4efe3` / `#fbf9f4` | Fondos | |

### Letra
- Títulos: **Plus Jakarta Sans** 600–800.
- Texto: **DM Sans** 400–700 (la que ya usaba el proyecto).
- Acento: **Fraunces** cursiva, solo en “Oaxaca.” de la portada.

### Elementos gráficos propios
1. **Rombo tejido** (isotipo): firma, menú móvil, pie y nodo “Jornada”.
2. **Hilo punteado**: une secciones y pasos; se dibuja con el scroll.
3. **Curvas de nivel** de la sierra: fondos de secciones oscuras.
4. **Apertura en rombo**: las ilustraciones se abren por una ventana con forma de rombo.
5. **Greca escalonada**: cenefa del pie.
6. **Personaje Ñuu**: estados vacíos, cierre y pie.

### Ficha de movimiento

| Token | Valor GSAP | Pareja CSS |
|---|---|---|
| Entradas | `power3.out`, 1 s | `cubic-bezier(.25,1,.5,1)` |
| Menú y paneles | `power2.inOut` | `cubic-bezier(.65,0,.35,1)` |
| Piezas pequeñas | `back.out(1.35)` | `cubic-bezier(.34,1.4,.64,1)` |
| Recorrido | 26 px | `--dist` |
| Escalonado | 0.085 s | |
| Lenis (inercia) | `lerp: 0.1` | En celular se conserva el scroll nativo |

- **Firma (portada, unos 2.2 s):** el rombo del logo se teje, las ilustraciones se abren en rombo, tres hilos salen del centro hacia Instituciones, Voluntariado y Comunidades, el titular sube por líneas y un trazo ocre subraya “Oaxaca.”, justo arriba del botón “Explorar jornadas”. Se salta con un toque o una tecla y nunca se queda a medias (respaldo a los 4.2 s).
- **Rima:** el rombo vuelve en el menú móvil (se abre en rombo y el isotipo se teje), en el pie (el logo se dibuja al llegar) y en el nodo “Jornada”, que gira muy lento.
- **Con “Reducir movimiento”** no se oculta ni se mueve nada; sin GSAP todo queda visible.
- **No hace:** cursor personalizado, marquesinas, scroll horizontal anclado ni efectos de mouse.

| Página | Gesto protagonista por sección |
|---|---|
| Inicio | Firma · cifras que cuentan y barras que crecen · hilo de las cinco funciones · hilos que convergen en “Jornada” · programas en cascada · tarjetas que se abren en rombo · sierra con parallax |
| Jornadas | Título por líneas · tarjetas en cascada al filtrar u ordenar |
| Voluntariado | Banda que se abre en rombo · camino de cuatro pasos con hilo · sello giratorio |
| Instituciones | Subrayado ocre que se dibuja · tarjetas apiladas que se superponen al bajar (escritorio alto) |
| Seguimiento | Hilo del ciclo de vida · jornadas finalizadas en cascada |
| Cuentas | Paisaje que se abre en rombo y etiquetas que se posan |

---

## 4. Qué puedes editar fácil

- **Cifras y fuentes:** `frontend/src/data/fuentes.js`. Cambia valor, fecha y enlace en el mismo objeto.
- **Colores, letra, radios y movimiento:** el bloque `:root` al inicio de `frontend/src/styles.css` y el objeto `M` en `frontend/src/motion/motion.js`.
- **Animar algo nuevo:** agrega un atributo al elemento: `data-reveal`, `data-split`, `data-draw`, `data-rombo`, `data-pop`, `data-count="9.4" data-decimals="1"`, `data-grow` o `data-speed="0.2"`.
- **Fotos reales:** cuando tengas fotos con permiso, reemplaza un `<Escena variante="…" />` por un `<img>` con `alt` descriptivo (WebP, máximo 200 KB, 1600 px de ancho).

---

## 5. De dónde salió cada dato (consulta: 19 de noviembre de 2026)

| Dato | Valor | Fuente y fecha |
|---|---|---|
| Analfabetismo 15+ en Oaxaca | 9.4 % (2025) · 11.8 % (2020) | INEGI, Encuesta Intercensal 2025, resultados de Oaxaca, 22 sep 2026 |
| Analfabetismo 15+ nacional | 3.7 % (2025) · 4.8 % (2020) | INEGI, comunicado 54/26, 22 sep 2026 |
| Escolaridad promedio | Oaxaca 8.7 años · México 10.3 | INEGI, mismos boletines |
| Hablantes de lengua indígena (3+) | 29.0 % · 1,159,650 personas | INEGI, resultados de Oaxaca |
| Estrategia Nacional de Alfabetización para el Bienestar Compartido | 4.1 % → 3.8 % (estimación SEP) · más de 277 mil personas alfabetizadas | Crónica, declaración de la SEP, 8 sep 2026 |
| IEEA Oaxaca 2025 | 10,789 personas alfabetizadas de una meta de 24,600 · MEV AprendeINEA | IEEA Oaxaca, Cuenta Pública 2025 (feb 2026). **Ver “Por validar”** |
| Alianza SEP · ANUIES · INEA | Servicio social alfabetizador · meta de 100 mil personas para agosto de 2026 | El Imparcial, 13 mar 2026 |
| IMSS · INEA | Programa de Alfabetización Comunitaria desde el 11 may 2026 en Chiapas, Oaxaca, Michoacán y Puebla · 789 pasantes | IMSS, boletín 441/2026, 18 ago 2026 |
| Alfabetización en lengua materna | 66 de 68 lenguas, 110 variantes, 18 estados · 7,932 personas indígenas (sep 2025) | Quadratín, 14 sep 2025 |

Todas las cifras se muestran con su fuente visible y enlace. Se aclara en el sitio que **Nexo Ñuu no tiene convenio** con estas instituciones.

---

## 6. Por validar (decisiones que tomé por ti)

1. **Logo:** usé el **rombo tejido** como logo principal (aparece en 6 de tus 7 maquetas) y el dibujo menta con ojos cerrados como **personaje Ñuu**. Si ese dibujo es tu nuevo logo, se cambia en `Brand.jsx`.
2. **Personaje redibujado:** lo tracé en vector a partir de la imagen; revisa que la forma te guste. Si tienes el SVG original, lo sustituimos.
3. **Cifras del IEEA (10,789 de 24,600):** el servidor del IEEA no respondió cuando intenté abrir el PDF; las tomé del extracto del documento que mostró el buscador. Confírmalas abriendo la Cuenta Pública 2025 antes de publicar.
4. **Dos cifras nacionales distintas:** INEGI dice 3.7 % (Encuesta Intercensal 2025) y la SEP dice 3.8 % (estimación de su estrategia). Se muestran separadas y cada una con su fuente.
5. **Sin fotos:** en lugar de fotos usé ilustraciones propias. Las fotos de las maquetas eran de referencia; publicar fotos de personas reales requiere su permiso.
6. **“ñuu · pueblo”** en el pizarrón de la ilustración del aula: en tu’un savi (mixteco), *ñuu* significa pueblo. Confírmalo con una persona hablante.
7. **Botones de Google, “Institucional” y “Recordarme”** de la maqueta de inicio de sesión: no los puse porque el backend no los tiene; agregar botones que no funcionan confundiría.
8. **Cifras inventadas de las maquetas** (12k voluntarios, +2500 alfabetizados, 180 jornadas): las sustituí por datos de INEGI y por los indicadores en vivo de tu base de datos.
9. **Tarjetas apiladas en Instituciones:** solo en pantallas grandes y altas (1100 × 760 px o más); en celular se ven en lista.
10. **Cambio en `/api/auth/me`:** responde 200 con `user: null` para visitantes. Si algún cliente externo esperaba el 401, avísame.

---

## 7. Pendientes

- [x] Correo de contacto en el pie: 22161118@itoaxaca.edu.mx.
- [ ] Configurar `EMAIL_MODE=smtp` (o Resend) con un buzón real para que los correos lleguen a la bandeja.
- [ ] Crear las credenciales de Google y ponerlas en `backend/.env`.
- [ ] Confirmar las cifras del IEEA (punto 3 de “Por validar”).
- [ ] Fotos reales con permiso de las comunidades, si quieres sustituir ilustraciones.
- [ ] Probar en un celular real (lo revisé con Chrome sin ventana a 375 × 812 y 1440 × 900, con y sin sesión).
- [ ] Enlace de contacto o redes sociales oficiales, si los hay.

---

## 8. Publicar en tu VPS de Hostinger

Resumen de la arquitectura en producción: **nginx** sirve el `frontend/dist` y reenvía `/api` a Express, que escucha solo en `127.0.0.1:3001`.

1. En el VPS (Ubuntu): instala Node LTS, PostgreSQL, nginx y `pm2` (`npm i -g pm2`).
2. Sube el proyecto (por `git clone` desde tu repositorio). Nunca subas `backend/.env`; créalo en el servidor con `DATABASE_URL`, `APP_URL=https://tudominio.com`, `NODE_ENV=production` y el proveedor de correo real (`EMAIL_MODE=resend`, `RESEND_API_KEY`, `EMAIL_FROM`).
3. Corre las migraciones como en los incrementos anteriores (sin `schema.sql` sobre datos reales).
4. Backend: `cd backend && npm ci && pm2 start src/index.js --name nexo-api && pm2 save && pm2 startup`.
5. Frontend: `cd frontend && npm ci && npm run build`. El resultado queda en `frontend/dist`.
6. nginx (archivo del sitio):

```nginx
server {
  server_name tudominio.com;
  root /var/www/nexo-nuu/frontend/dist;
  index index.html;
  location /api/ {
    proxy_pass http://127.0.0.1:3001;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
  location /assets/ { expires 1y; add_header Cache-Control "public, immutable"; }
  location / { try_files $uri $uri/ /index.html; }
}
```

7. HTTPS gratis con `sudo certbot --nginx -d tudominio.com` (la cookie de sesión exige HTTPS en producción).

Los archivos de `assets/` llevan un código único en el nombre en cada compilación, así que Hostinger o el navegador nunca sirven una versión vieja del CSS o del JS.
