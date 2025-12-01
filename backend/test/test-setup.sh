#!/bin/bash

set -e

echo "╔════════════════════════════════════════════╗"
echo "║  Transcendence Backend - Quick Setup      ║"
echo "╚════════════════════════════════════════════╝"
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${YELLOW}Step 3: Creating test users...${NC}"

# Start server in background if not running
if ! curl -s http://localhost:3000/auth/me > /dev/null 2>&1; then
    echo "Starting backend server..."
    npm run dev > /dev/null 2>&1 &
    SERVER_PID=$!
    sleep 3
    echo -e "${GREEN}✓ Server started (PID: $SERVER_PID)${NC}"
else
    echo -e "${GREEN}✓ Server already running${NC}"
fi

# Create test users
echo "Creating test users..."

for i in 1 2 3 4; do
    RESPONSE=$(curl -s -X POST http://localhost:3000/auth/signup \
      -H "Content-Type: application/json" \
      -d "{
        \"email\": \"player${i}@test.com\",
        \"username\": \"player${i}\",
        \"password\": \"password123\"
      }" 2>/dev/null)
    
    if echo "$RESPONSE" | grep -q "access_token"; then
        echo -e "${GREEN}✓ Created player${i}${NC}"
    else
        echo -e "${YELLOW}! player${i} might already exist${NC}"
    fi
done

echo ""

# Create AI user
RESPONSE=$(curl -s -X POST http://localhost:3000/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "ai@transcendence.local",
    "username": "AI Opponent",
    "password": "ai-opponent-secure-password"
  }' 2>/dev/null)

if echo "$RESPONSE" | grep -q "access_token"; then
    echo -e "${GREEN}✓ Created AI user${NC}"
else
    echo -e "${YELLOW}! AI user might already exist${NC}"
fi

echo ""
echo -e "${GREEN}╔════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║           Setup Complete! 🎉               ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${YELLOW}Quick Start Guide:${NC}"
echo ""
echo "1️⃣  HTTP API Testing:"
echo "   ./test-api.sh"
echo ""
echo "2️⃣  WebSocket Testing (Interactive):"
echo "   node test-websocket.js"
echo "   Login as: player1 / password123"
echo ""
echo "3️⃣  Visual Game Testing (Browser):"
echo "   python3 -m http.server 8080"
echo "   Then open: http://localhost:8080/test-game-client.html"
echo "   Login as: player1 / password123"
echo ""
echo -e "${YELLOW}Test Accounts Created:${NC}"
echo "   player1@test.com / password123"
echo "   player2@test.com / password123"
echo "   player3@test.com / password123"
echo "   player4@test.com / password123"
echo ""
echo -e "${YELLOW}Read full guide:${NC} less TESTING_GUIDE.md"
echo ""
echo -e "${GREEN}Backend running on: http://localhost:3000${NC}"
echo -e "${GREEN}WebSocket endpoint: ws://localhost:3000/ws${NC}"
echo ""
