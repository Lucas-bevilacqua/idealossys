#!/bin/bash
cd "C:/Users/lucas.bevilacqua/Documents/systemos-main"

# Kill existing servers
pkill -9 -f "node\|tsx\|npm" 2>/dev/null || true
sleep 2

# Start server
export PORT=5000
npm run dev &
SERVER_PID=$!
sleep 8

# Test login
echo "=== Testing Login ==="
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"idealos123"}' \
  -c /tmp/cookies_test.txt)
echo "$LOGIN_RESPONSE"

# Test blog request
echo ""
echo "=== Testing Blog Request ==="
curl -s -X POST http://localhost:5000/api/agent/run \
  -H "Content-Type: application/json" \
  -b /tmp/cookies_test.txt \
  -d '{"userInput":"Crie um plano para um novo blog","history":[],"areaName":"PM"}' | head -c 1000

# Cleanup
kill $SERVER_PID 2>/dev/null || true
