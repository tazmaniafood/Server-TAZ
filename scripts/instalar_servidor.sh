#!/usr/bin/env bash
# =========================================================
#  Instala y configura el servidor (Ubuntu) desde cero.
#  Uso: sudo bash scripts/instalar_servidor.sh
# =========================================================
set -euo pipefail

echo ">> Actualizando sistema"
apt update && apt upgrade -y

echo ">> Instalando Nginx, PostgreSQL, Certbot y UFW"
apt install -y nginx postgresql postgresql-contrib certbot python3-certbot-nginx ufw curl

echo ">> Instalando Node.js LTS + PM2"
curl -fsSL https://deb.nodesource.com/setup_lts.x | bash -
apt install -y nodejs
npm install -g pm2

echo ">> Configurando firewall"
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw --force enable

echo ">> Versiones instaladas"
node -v; npm -v; psql --version; nginx -v; certbot --version
ufw status
