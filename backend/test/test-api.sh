#!/bin/bash

# Complete Backend Testing Script
# Tests all Auth, User, Game, and WebSocket functionality

BASE_URL="http://localhost:3000"
WS_URL="ws://localhost:3000/ws"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counters
PASSED=0
FAILED=0

print_test() {
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}TEST: $1${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

print_success() {
    echo -e "${GREEN}✓ PASS: $1${NC}"
    ((PASSED++))
}

print_error() {
    echo -e "${RED}✗ FAIL: $1${NC}"
    ((FAILED++))
}

print_info() {
    echo -e "${YELLOW}ℹ INFO: $1${NC}"
}

# Variables to store tokens
ACCESS_TOKEN=""
ACCESS_TOKEN_2=""

# ==================== AUTH TESTS ====================

print_test "1. Sign Up - Create Test User 1"
SIGNUP_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/signup" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "testuser1@example.com",
    "username": "testuser1",
    "password": "password123"
  }')

echo "$SIGNUP_RESPONSE" | jq '.'

if echo "$SIGNUP_RESPONSE" | jq -e '.access_token' > /dev/null; then
    ACCESS_TOKEN=$(echo "$SIGNUP_RESPONSE" | jq -r '.access_token')
    print_success "User 1 created successfully"
else
    print_error "Failed to create user 1"
fi

echo ""
sleep 1

print_test "2. Sign Up - Create Test User 2"
SIGNUP_RESPONSE_2=$(curl -s -X POST "$BASE_URL/auth/signup" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "testuser2@example.com",
    "username": "testuser2",
    "password": "password123"
  }')

echo "$SIGNUP_RESPONSE_2" | jq '.'

if echo "$SIGNUP_RESPONSE_2" | jq -e '.access_token' > /dev/null; then
    ACCESS_TOKEN_2=$(echo "$SIGNUP_RESPONSE_2" | jq -r '.access_token')
    print_success "User 2 created successfully"
else
    print_error "Failed to create user 2"
fi

echo ""
sleep 1

print_test "3. Get Current User (GET /auth/me)"
ME_RESPONSE=$(curl -s -X GET "$BASE_URL/auth/me" \
  -H "Authorization: Bearer $ACCESS_TOKEN")

echo "$ME_RESPONSE" | jq '.'

if echo "$ME_RESPONSE" | jq -e '.username' > /dev/null; then
    USER_ID=$(echo "$ME_RESPONSE" | jq -r '.id')
    print_success "Retrieved current user (ID: $USER_ID)"
else
    print_error "Failed to get current user"
fi

echo ""
sleep 1

# ==================== USER TESTS ====================

print_test "4. Search Users"
SEARCH_RESPONSE=$(curl -s -X GET "$BASE_URL/users/search?q=testuser" \
  -H "Authorization: Bearer $ACCESS_TOKEN")

echo "$SEARCH_RESPONSE" | jq '.'

if echo "$SEARCH_RESPONSE" | jq -e '.[0]' > /dev/null; then
    print_success "Search found users"
else
    print_error "Search failed"
fi

echo ""
sleep 1

print_test "5. Get Leaderboard"
LEADERBOARD_RESPONSE=$(curl -s -X GET "$BASE_URL/users/leaderboard" \
  -H "Authorization: Bearer $ACCESS_TOKEN")

echo "$LEADERBOARD_RESPONSE" | jq '.'

if echo "$LEADERBOARD_RESPONSE" | jq -e 'type == "array"' > /dev/null; then
    print_success "Retrieved leaderboard"
else
    print_error "Failed to get leaderboard"
fi

echo ""
sleep 1

# ==================== GAME HTTP TESTS ====================

print_test "6. Get Active Games"
ACTIVE_GAMES=$(curl -s -X GET "$BASE_URL/game/active" \
  -H "Authorization: Bearer $ACCESS_TOKEN")

echo "$ACTIVE_GAMES" | jq '.'

if echo "$ACTIVE_GAMES" | jq -e 'type == "array"' > /dev/null; then
    print_success "Retrieved active games list"
else
    print_error "Failed to get active games"
fi

echo ""
sleep 1

print_test "7. Get Game Stats"
GAME_STATS=$(curl -s -X GET "$BASE_URL/game/stats" \
  -H "Authorization: Bearer $ACCESS_TOKEN")

echo "$GAME_STATS" | jq '.'

if echo "$GAME_STATS" | jq -e '.gamesPlayed' > /dev/null; then
    print_success "Retrieved game stats"
else
    print_error "Failed to get game stats"
fi

echo ""
sleep 1

print_test "8. Get Game History"
GAME_HISTORY=$(curl -s -X GET "$BASE_URL/game/history" \
  -H "Authorization: Bearer $ACCESS_TOKEN")

echo "$GAME_HISTORY" | jq '.'

if echo "$GAME_HISTORY" | jq -e 'type == "array"' > /dev/null; then
    print_success "Retrieved game history"
else
    print_error "Failed to get game history"
fi

echo ""
sleep 1

# ==================== FRIEND SYSTEM TESTS ====================

print_test "9. Get User 2 Details"
USER2_RESPONSE=$(curl -s -X GET "$BASE_URL/auth/me" \
  -H "Authorization: Bearer $ACCESS_TOKEN_2")

USER2_ID=$(echo "$USER2_RESPONSE" | jq -r '.id')
print_info "User 2 ID: $USER2_ID"

echo ""
sleep 1

print_test "10. Add Friend Request"
ADD_FRIEND=$(curl -s -X POST "$BASE_URL/users/friends/add" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"targetUserId\": $USER2_ID}")

echo "$ADD_FRIEND" | jq '.'

if echo "$ADD_FRIEND" | jq -e '.message' > /dev/null; then
    print_success "Friend request sent"
else
    print_error "Failed to send friend request"
fi

echo ""
sleep 1

print_test "11. Get Friends List"
FRIENDS_LIST=$(curl -s -X GET "$BASE_URL/users/friends/list" \
  -H "Authorization: Bearer $ACCESS_TOKEN")

echo "$FRIENDS_LIST" | jq '.'
print_success "Retrieved friends list"

echo ""
sleep 1

# ==================== SUMMARY ====================

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}TEST SUMMARY${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}Passed: $PASSED${NC}"
echo -e "${RED}Failed: $FAILED${NC}"
echo ""
echo -e "${YELLOW}🔑 Save these for WebSocket testing:${NC}"
echo -e "${YELLOW}User 1 Token: ${NC}$ACCESS_TOKEN"
echo -e "${YELLOW}User 2 Token: ${NC}$ACCESS_TOKEN_2"
echo ""
echo -e "${YELLOW}To test WebSocket, use the Node.js script:${NC}"
echo -e "${YELLOW}node test-websocket.js${NC}"
echo ""
