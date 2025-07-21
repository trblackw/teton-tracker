#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}🧹 Cleaning up existing servers...${NC}"

# Function to kill process on a specific port
kill_port() {
    local port=$1
    local pids=$(lsof -ti:$port 2>/dev/null)
    
    if [ ! -z "$pids" ]; then
        echo -e "${YELLOW}📡 Killing existing process(es) on port $port: $pids${NC}"
        kill -9 $pids 2>/dev/null
        sleep 1
        
        # Double check if process is still running
        local remaining=$(lsof -ti:$port 2>/dev/null)
        if [ ! -z "$remaining" ]; then
            echo -e "${RED}⚠️  Process still running on port $port, trying force kill...${NC}"
            kill -9 $remaining 2>/dev/null
        else
            echo -e "${GREEN}✅ Port $port is now free${NC}"
        fi
    else
        echo -e "${GREEN}✅ Port $port is already free${NC}"
    fi
}

# Kill processes on both ports
kill_port 3000
kill_port 3001

# Kill any bun processes that might be related to our project
echo -e "${YELLOW}🧹 Cleaning up any lingering bun processes...${NC}"
pkill -f "api-server.ts" 2>/dev/null || true
pkill -f "dev-server.ts" 2>/dev/null || true
pkill -f "index.html" 2>/dev/null || true

# Wait a moment for cleanup
sleep 2

echo -e "${GREEN}🚀 Starting development servers...${NC}"

# Start API server in background
echo -e "${YELLOW}📡 Starting API server on port 3001...${NC}"
bun run src/api-server.ts &
API_PID=$!

# Wait a moment for API server to start
sleep 2

# Start frontend dev server with hot reload
echo -e "${YELLOW}🎨 Starting frontend dev server on port 3000...${NC}"
echo -e "${GREEN}✨ Hot reload enabled!${NC}"
exec bun --hot index.html

# If we exit, kill the API server
trap "kill $API_PID 2>/dev/null" EXIT 