#!/bin/bash

# LifeBox DevContainer Post-Start Script
# Runs every time the container starts

set -e

echo "🔄 Starting LifeBox development environment..."

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

print_step() {
    echo -e "${BLUE}➡️  $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_info() {
    echo -e "${YELLOW}ℹ️  $1${NC}"
}

# Check if services are running
print_step "Checking services..."

# PostgreSQL health check
if pg_isready -h localhost -p 5432 -U lifebox -d lifebox_dev >/dev/null 2>&1; then
    print_success "PostgreSQL is running"
else
    print_info "PostgreSQL is not ready yet"
fi

# EMQX health check
if curl -s http://localhost:18083/api/v5/status >/dev/null 2>&1; then
    print_success "EMQX broker is running"
else
    print_info "EMQX broker is not ready yet"
fi

# Update Prisma client if schema changed
print_step "Checking Prisma client..."
if [ libs/database/prisma/schema.prisma -nt libs/database/node_modules/.prisma/client/index.js ]; then
    print_info "Schema changed, regenerating Prisma client..."
    npm run db:generate
    print_success "Prisma client updated"
else
    print_success "Prisma client is up to date"
fi

# Install new dependencies if package.json changed
if [ package.json -nt node_modules/.package-lock.json ] || [ ! -f node_modules/.package-lock.json ]; then
    print_info "Dependencies changed, installing..."
    npm install
    touch node_modules/.package-lock.json
    print_success "Dependencies updated"
fi

print_success "Environment ready!"
echo
echo "💡 Quick Start:"
echo "  • Run 'npm run dev' to start all services"
echo "  • Open http://localhost:3001 for the web app"
echo "  • Open http://localhost:3000/api/docs for API documentation"