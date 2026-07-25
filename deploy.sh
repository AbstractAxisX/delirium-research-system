#!/bin/bash
set -e
echo "Pulling latest code..."
git pull origin main
echo "Installing dependencies..."
npm install
echo "Building..."
npm run build
if [ ! -d ".next/standalone/node_modules/bcryptjs" ]; then
  cp -r node_modules/bcryptjs .next/standalone/node_modules/
fi
echo "Restarting app..."
pm2 restart delirium --update-env
echo "Done."
