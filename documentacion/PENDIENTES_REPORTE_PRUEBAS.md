# Actividades por mejorar · Reporte de pruebas (18 nov 2026)

Origen: *Reporte de pruebas – Nexo Ñuu*, revisión de @Eduardo sobre el sitio publicado en Azure.
Estado revisado contra la rama `feat/demo-publica` (commit `1836ade`), 19 nov 2026.

Leyenda: ✅ ya resuelto en el código · 🔧 pendiente en el código · 🖥️ pendiente en el servidor (VPS/nginx)

## Crítica

- [ ] 🖥️ **1. El backend no responde (502 Bad Gateway) en /jornadas.**
  nginx no llega a Express. Al migrar al VPS de Hostinger: correr el backend con `pm2` (`pm2 start src/index.js --name nexo-api`, `pm2 save`, `pm2 startup`), confirmar puerto 3001 y `DATABASE_URL`, y revisar `pm2 logs` y `/var/log/nginx/error.log`.

## Alta

- [ ] 🔧 **2. Mensajes técnicos al usuario final.**
  - [x] ✅ Descripción de Jornadas ya no menciona PostgreSQL.
  - [x] ✅ “Olvidé mi contraseña” solo menciona la terminal cuando el servidor está en modo local.
  - [ ] 🔧 `pages/Jornadas.jsx`: el aviso de error aún dice “Comprueba que el servidor de la API esté en marcha y PostgreSQL conectado”. Mostrarlo solo con `import.meta.env.DEV` y dejar un texto amable (“Por ahora no podemos cargar las jornadas, intenta más tarde”).
- [ ] **3. No hay página 404.**
  - [ ] 🔧 `App.jsx`: la ruta `*` redirige al inicio. Crear una página “Página no encontrada”.
  - [ ] 🖥️ nginx: servir archivos estáticos reales antes de `try_files … /index.html` y crear `robots.txt` y `sitemap.xml` en `frontend/public`.

## Media

- [ ] 🔧 **4. Textos duplicados y doble punto** en el error de Jornadas (título y descripción iguales; “jornadas..”). Revisar al corregir el punto 2.
- [x] ✅ **5. Contenido contradictorio entre páginas.** Voluntariado, Seguimiento e Instituciones se reescribieron; Voluntariado ya tiene “Registrarme como voluntario”.
- [ ] **6. Al registro le faltan elementos.**
  - [x] ✅ Botón para mostrar la contraseña y medidor de longitud.
  - [ ] 🔧 Campo “Confirmar contraseña”.
  - [ ] 🔧 Aviso de privacidad (página nueva) y casilla de consentimiento obligatoria.
- [x] ✅ **7. Favicon.** `favicon.svg`, `apple-touch-icon.png` y `<link rel="icon">` agregados. (🖥️ verificar que nginx sirva `/favicon.svg` como archivo.)

## Baja

- [ ] 🖥️ **8. El servidor muestra su versión.** Agregar `server_tokens off;` en nginx.
- [ ] 🖥️🔧 **9. Faltan cabeceras de seguridad.** `Strict-Transport-Security`, `Content-Security-Policy`, `X-Frame-Options`, `X-Content-Type-Options` en nginx (`add_header … always`) o con `helmet` en Express.
- [x] ✅ **10. `/api/auth/me` con 403 sin sesión.** Ahora responde 200 con `user: null` (el 403 del reporte venía del servidor anterior).
- [ ] **11. Detalles menores.**
  - [x] ✅ “Seguimiento” en la sección Explorar del pie.
  - [x] ✅ Metadatos Open Graph e imagen `og-imagen.png`.
  - [ ] 🔧 Título de pestaña por sección (“Jornadas | Nexo Ñuu”, etc.).

## No se pudo probar (repetir en el VPS)

- [ ] Crear cuenta, verificar correo e iniciar sesión con datos reales (requiere `EMAIL_MODE=smtp`).
- [ ] Vista móvil en un celular real.
- [ ] Búsqueda de jornadas con resultados (depende del punto 1).
