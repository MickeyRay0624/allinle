#!/bin/bash
set -e

echo "=== ALLINLE Server Setup ==="

# Install Node.js 20+
if ! command -v node &> /dev/null; then
  echo "Installing Node.js 20..."
  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
  sudo apt-get install -y nodejs
fi

# Install pnpm
if ! command -v pnpm &> /dev/null; then
  echo "Installing pnpm..."
  npm install -g pnpm
fi

# Install PM2
if ! command -v pm2 &> /dev/null; then
  echo "Installing PM2..."
  npm install -g pm2
fi

# Install Nginx
if ! command -v nginx &> /dev/null; then
  echo "Installing Nginx..."
  sudo apt-get update && sudo apt-get install -y nginx
fi

# Install Certbot
if ! command -v certbot &> /dev/null; then
  echo "Installing Certbot..."
  sudo apt-get install -y certbot python3-certbot-nginx
fi

echo "=== Setup Complete ==="
echo "Next steps:"
echo "1. Copy deploy/nginx/allinle.conf to /etc/nginx/sites-available/"
echo "2. Run: sudo certbot --nginx -d api.allinle.example.com -d admin.allinle.example.com"
echo "3. Copy project to /var/www/allinle/"
echo "4. cd /var/www/allinle && pnpm install && pnpm prisma:generate"
echo "5. Configure .env for production"
echo "6. Run: pnpm prisma:migrate && pnpm build:api"
echo "7. Start: pm2 start deploy/pm2/ecosystem.config.js"
echo "8. Setup cron: 0 2 * * * /var/www/allinle/deploy/scripts/backup-db.sh"
