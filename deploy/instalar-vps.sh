#!/usr/bin/env bash
# Nexo Ñuu · instalación y despliegue en un VPS Ubuntu (Hostinger), como root.
# Uso:   DOMINIO=xn--nexouu-zwa.tech bash instalar-vps.sh      (con dominio y HTTPS)
#        bash instalar-vps.sh                                   (solo por la IP, sin HTTPS)
# Se puede volver a correr para actualizar: conserva la base de datos y el .env.
set -euo pipefail

RAMA="${RAMA:-feat/demo-publica}"
REPO="${REPO:-https://github.com/pavelrami/NexoNuu.git}"
APP=/var/www/nexo-nuu
DOMINIO="${DOMINIO:-}"
IP=$(curl -fsS4 https://api.ipify.org || hostname -I | awk '{print $1}')
paso() { printf '\n\033[1;32m==> %s\033[0m\n' "$1"; }

[ "$(id -u)" -eq 0 ] || { echo "Corre este script como root."; exit 1; }

paso "1/8 Paquetes del sistema"
export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get install -y curl git nginx postgresql ufw ca-certificates gnupg certbot python3-certbot-nginx

paso "2/8 Node.js 22 LTS y pm2"
if ! command -v node >/dev/null || [ "$(node -v | cut -d. -f1 | tr -d v)" -lt 20 ]; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt-get install -y nodejs
fi
command -v pm2 >/dev/null || npm install -g pm2@6.0.13
node -v; pm2 -v

paso "3/8 Código desde GitHub ($RAMA)"
if [ -d "$APP/.git" ]; then
  git -C "$APP" fetch origin "$RAMA" && git -C "$APP" checkout "$RAMA" && git -C "$APP" reset --hard "origin/$RAMA"
else
  git clone --branch "$RAMA" "$REPO" "$APP"
fi

paso "4/8 PostgreSQL"
ENV="$APP/backend/.env"
if [ ! -f "$ENV" ]; then
  DBPASS=$(openssl rand -hex 24)
  sudo -u postgres psql -v ON_ERROR_STOP=1 -c "DO \$\$BEGIN IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname='nexo') THEN CREATE ROLE nexo LOGIN PASSWORD '$DBPASS'; ELSE ALTER ROLE nexo PASSWORD '$DBPASS'; END IF; END\$\$;"
  sudo -u postgres psql -tc "SELECT 1 FROM pg_database WHERE datname='nexo_nuu'" | grep -q 1 || sudo -u postgres createdb -O nexo nexo_nuu
  URL_SITIO="http://$IP"; SEGURO=false
  [ -n "$DOMINIO" ] && URL_SITIO="https://$DOMINIO" && SEGURO=true
  cat > "$ENV" <<EOF
PORT=3001
DATABASE_URL=postgresql://nexo:$DBPASS@127.0.0.1:5432/nexo_nuu
APP_URL=$URL_SITIO
NODE_ENV=production
COOKIE_SECURE=$SEGURO
# Correo: cambia a smtp y llena SMTP_* (ver LEEME). Mientras sea console no se envian correos en produccion.
EMAIL_MODE=console
# EMAIL_FROM=Nexo Nuu <no-responder@$DOMINIO>
# SMTP_HOST=smtp.hostinger.com
# SMTP_PORT=465
# SMTP_USER=
# SMTP_PASS=
# GOOGLE_CLIENT_ID=
# GOOGLE_CLIENT_SECRET=
ALLOW_DEMO_POSTULACIONES=1
TELEFONO_OBLIGATORIO=0
SMS_MODE=console
EOF
  chmod 600 "$ENV"
  NUEVA_BASE=1
else
  echo ".env existente: se conserva."
  NUEVA_BASE=0
fi
DBURL=$(grep '^DATABASE_URL=' "$ENV" | cut -d= -f2-)

if [ "$NUEVA_BASE" = 1 ] || ! psql "$DBURL" -tc "SELECT to_regclass('public.usuarios')" | grep -q usuarios; then
  echo "Instalando esquema inicial…"
  psql "$DBURL" -v ON_ERROR_STOP=1 -q -f "$APP/backend/database/schema.sql"
fi
for f in "$APP"/backend/database/0*.sql; do
  echo "Migración $(basename "$f")"
  psql "$DBURL" -v ON_ERROR_STOP=1 -q -f "$f"
done

paso "5/8 Backend"
cd "$APP/backend"
npm ci --omit=dev
npm test --silent || echo "AVISO: alguna prueba falló; revisa arriba."
NODE_ENV=production node src/scripts/seedDemo.js --confirmar --confirmar-produccion
pm2 describe nexo-api >/dev/null 2>&1 && pm2 restart nexo-api --update-env || pm2 start src/index.js --name nexo-api --cwd "$APP/backend"
pm2 save
pm2 startup systemd -u root --hp /root >/dev/null

paso "6/8 Frontend"
cd "$APP/frontend"
npm ci
npm run build

paso "7/8 nginx"
NOMBRES="${DOMINIO:+$DOMINIO www.$DOMINIO }$IP _"
cat > /etc/nginx/sites-available/nexo-nuu <<EOF
server {
  listen 80 default_server;
  listen [::]:80 default_server;
  server_name $NOMBRES;
  server_tokens off;
  root $APP/frontend/dist;
  index index.html;
  client_max_body_size 1m;

  add_header X-Content-Type-Options "nosniff" always;
  add_header X-Frame-Options "SAMEORIGIN" always;
  add_header Referrer-Policy "strict-origin-when-cross-origin" always;
  add_header Permissions-Policy "camera=(), microphone=(), geolocation=()" always;
  add_header Content-Security-Policy "default-src 'self'; img-src 'self' data: https://tile.openstreetmap.org; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; script-src 'self'; connect-src 'self'; frame-ancestors 'self'; base-uri 'self'; form-action 'self'" always;

  location /api/ {
    proxy_pass http://127.0.0.1:3001;
    proxy_http_version 1.1;
    proxy_set_header Host \$host;
    proxy_set_header X-Real-IP \$remote_addr;
    proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto \$scheme;
  }
  location /assets/ { expires 1y; add_header Cache-Control "public, immutable"; add_header X-Content-Type-Options "nosniff" always; try_files \$uri =404; }
  location ~* \.(svg|png|ico|txt|xml|webmanifest)$ { try_files \$uri =404; }
  location / { try_files \$uri \$uri/ /index.html; }
}
EOF
ln -sf /etc/nginx/sites-available/nexo-nuu /etc/nginx/sites-enabled/nexo-nuu
rm -f /etc/nginx/sites-enabled/default
# Oculta la versión de nginx en todas las respuestas, también en sus páginas de error.
sed -i 's/^\s*#\s*server_tokens off;/\tserver_tokens off;/' /etc/nginx/nginx.conf
nginx -t && systemctl reload nginx

paso "8/8 Firewall y HTTPS"
ufw allow OpenSSH >/dev/null; ufw allow 'Nginx Full' >/dev/null; ufw --force enable >/dev/null
if [ -n "$DOMINIO" ]; then
  if [ "$(getent ahostsv4 "$DOMINIO" | awk 'NR==1{print $1}')" = "$IP" ]; then
    certbot --nginx -d "$DOMINIO" -d "www.$DOMINIO" --non-interactive --agree-tos --register-unsafely-without-email --redirect \
      && echo "HTTPS listo."
    grep -q '^add_header Strict' /dev/null || sed -i '0,/server_tokens off;/s//server_tokens off;\n  add_header Strict-Transport-Security "max-age=31536000" always;/' /etc/nginx/sites-available/nexo-nuu
    nginx -t && systemctl reload nginx
  else
    echo "AVISO: $DOMINIO todavía no apunta a $IP. Crea los registros A de @ y www en Hostinger y vuelve a correr el script."
  fi
fi

echo
echo "Listo. Abre: ${DOMINIO:+https://$DOMINIO  o  }http://$IP"
echo "Cuentas de demostración: cat $APP/backend/credenciales-demo.local.txt"
echo "Estado del backend: pm2 status   ·   registros: pm2 logs nexo-api"
