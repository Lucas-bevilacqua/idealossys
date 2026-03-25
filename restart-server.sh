#!/bin/bash
set -e

echo "🔴 Matando todos os servidores..."
pkill -9 -f "node\|tsx\|npm" 2>/dev/null || true
sleep 4

echo "🟢 Limpando cache..."
rm -rf .tsx-cache dist node_modules/.cache 2>/dev/null || true

echo "🚀 Iniciando novo servidor na porta 3000..."
cd "C:/Users/lucas.bevilacqua/Documents/systemos-main"
export NODE_ENV=development
export PORT=3000
npm run dev

echo "✅ Servidor iniciado!"
