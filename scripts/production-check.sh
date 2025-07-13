#!/bin/bash

# 🚀 Teton Tracker Production Verification Script
# This script verifies that the application is properly configured for production deployment

# Don't exit on error - we want to collect all checks
set +e

echo "🚀 Teton Tracker Production Verification"
echo "=========================================="

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check counters
CHECKS_PASSED=0
CHECKS_FAILED=0

# Function to print success
print_success() {
    echo -e "${GREEN}✅ $1${NC}"
    ((CHECKS_PASSED++))
}

# Function to print error
print_error() {
    echo -e "${RED}❌ $1${NC}"
    ((CHECKS_FAILED++))
}

# Function to print warning
print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

echo ""
echo "🔍 Environment Configuration Checks"
echo "===================================="

# Check NODE_ENV
if [[ "$NODE_ENV" == "production" ]]; then
    print_success "NODE_ENV is set to production"
else
    print_error "NODE_ENV is not set to production (current: $NODE_ENV)"
fi

# Check API Key
if [[ -n "$AVIATIONSTACK_API_KEY" ]]; then
    print_success "AviationStack API key is configured"
else
    print_error "AVIATIONSTACK_API_KEY is not set"
fi

# Check Database Configuration
if [[ -n "$TURSO_DATABASE_URL" && -n "$TURSO_AUTH_TOKEN" ]]; then
    print_success "Turso database configuration is set"
elif [[ -n "$DATABASE_URL" ]]; then
    print_warning "Using DATABASE_URL instead of Turso"
else
    print_error "No database configuration found"
fi

# Check for development flags that should be OFF in production
if [[ "$FORCE_MOCK_RUNS" == "true" ]]; then
    print_error "FORCE_MOCK_RUNS is enabled - this will use fake data!"
else
    print_success "FORCE_MOCK_RUNS is disabled"
fi

if [[ "$FORCE_MOCK_DATA" == "true" ]]; then
    print_error "FORCE_MOCK_DATA is enabled - flight API will use fake data!"
else
    print_success "FORCE_MOCK_DATA is disabled"
fi

if [[ "$DEBUG_LOGGING" == "true" ]]; then
    print_warning "DEBUG_LOGGING is enabled - consider disabling for production"
else
    print_success "DEBUG_LOGGING is disabled"
fi

echo ""
echo "🔨 Build System Checks"
echo "======================"

# Check if build can run
if bun run build > /dev/null 2>&1; then
    print_success "Build process completes successfully"
else
    print_error "Build process failed"
fi

# Check if production server can start
echo ""
echo "🖥️  Production Server Check"
echo "=========================="

# Start server in background for testing
export NODE_ENV=production
timeout 10s bun run src/prod-server.ts > /dev/null 2>&1 &
SERVER_PID=$!

# Wait a moment for server to start
sleep 3

# Check if server is responding
if curl -s -f http://localhost:3000 > /dev/null 2>&1; then
    print_success "Production server starts and responds"
else
    print_error "Production server failed to start or is not responding"
fi

# Clean up
kill $SERVER_PID 2>/dev/null || true

echo ""
echo "📊 Code Quality Checks"
echo "======================"

# Check TypeScript
if bun run typecheck > /dev/null 2>&1; then
    print_success "TypeScript compilation successful"
else
    print_error "TypeScript compilation failed"
fi

# Check for hardcoded mock data flags in code (should be environment-dependent)
if grep -r "FORCE_MOCK.*: true" src/ > /dev/null 2>&1; then
    print_error "Found hardcoded mock data flags in source code"
else
    print_success "No hardcoded mock data flags found"
fi

echo ""
echo "🏁 Final Results"
echo "================"

if [[ $CHECKS_FAILED -eq 0 ]]; then
    echo -e "${GREEN}🎉 ALL CHECKS PASSED! Application is ready for production deployment.${NC}"
    echo ""
    echo "Next steps:"
    echo "1. Set up your production database (Turso recommended)"
    echo "2. Get your AviationStack API key"
    echo "3. Choose a deployment platform (Railway recommended)"
    echo "4. Deploy with confidence!"
    exit 0
else
    echo -e "${RED}❌ $CHECKS_FAILED checks failed. Please fix these issues before deploying.${NC}"
    echo ""
    echo "See DEPLOYMENT.md for detailed setup instructions."
    exit 1
fi 