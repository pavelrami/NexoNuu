# Nexo Ñuu · Incremento 7: sitio público animado con datos reales

Rediseño completo del sitio público (Inicio, Jornadas, Detalle, Voluntariado, Instituciones, Seguimiento, Iniciar sesión y Registro) con animaciones por sección, datos oficiales con su fuente y dos endpoints públicos nuevos. **Todo lo que ya funcionaba sigue igual**: cuentas, verificación, perfil de voluntariado, postulaciones, panel institucional y administración.

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

- [ ] **[CORREO DE CONTACTO]** en el pie (marcador amarillo). Falta el correo real.
- [ ] Confirmar las cifras del IEEA (punto 3 de “Por validar”).
- [ ] Fotos reales con permiso de las comunidades, si quieres sustituir ilustraciones.
- [ ] Revisar con una sesión iniciada: Mi espacio, Perfil de voluntariado, Mis postulaciones, Panel institucional y Administración heredan el nuevo estilo, pero **no los revisé con una cuenta** (no usé contraseñas tuyas ni creé cuentas en tu base).
- [ ] Probar en un celular real (lo revisé con Chrome sin ventana a 375 × 812 y 1440 × 900).
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
