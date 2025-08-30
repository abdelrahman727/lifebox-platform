#!/bin/bash

# LifeBox DevContainer Post-Create Script
# Sets up the development environment after container creation

set -e

echo "🚀 Setting up LifeBox development environment..."

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

# Install dependencies
print_step "Installing dependencies..."
npm install
print_success "Dependencies installed"

# Generate Prisma client
print_step "Generating Prisma client..."
npm run db:generate
print_success "Prisma client generated"

# Wait for services to be ready
print_step "Waiting for services to start..."
max_attempts=30
attempt=0

while [ $attempt -lt $max_attempts ]; do
    if pg_isready -h localhost -p 5432 -U lifebox -d lifebox_dev >/dev/null 2>&1; then
        print_success "PostgreSQL is ready"
        break
    fi
    
    attempt=$((attempt + 1))
    sleep 2
    print_info "Waiting for PostgreSQL... (attempt $attempt/$max_attempts)"
done

if [ $attempt -eq $max_attempts ]; then
    echo "❌ PostgreSQL did not start in time"
    exit 1
fi

# Run database migrations
print_step "Running database migrations..."
npm run db:migrate
print_success "Database migrations completed"

# Seed database
print_step "Seeding database..."
npm run db:seed
print_success "Database seeded"

# Set up Git configuration (if not already set)
if ! git config --global user.name >/dev/null 2>&1; then
    print_step "Setting up Git configuration..."
    git config --global user.name "LifeBox Developer"
    git config --global user.email "developer@lifebox.local"
    git config --global init.defaultBranch main
    print_success "Git configuration set"
fi

# Create initial environment file if it doesn't exist
if [ ! -f .env ]; then
    print_step "Creating environment file from template..."
    cp .env.example .env
    print_success "Environment file created"
fi

# Set executable permissions on scripts
print_step "Setting script permissions..."
chmod +x tools/*.sh
chmod +x scripts/*.sh
chmod +x .devcontainer/*.sh
print_success "Script permissions set"

# Build all applications
print_step "Building applications..."
npm run build
print_success "Applications built successfully"

# Create welcome message
cat > /tmp/welcome.txt << 'EOF'
🎉 LifeBox IoT Platform Development Environment Ready!

🔧 Available Commands:
  npm run dev              - Start all development servers
  npm run build            - Build all applications  
  npm run test             - Run all tests
  npm run db:studio        - Open Prisma Studio
  npm run db:migrate       - Run database migrations
  npm run db:seed          - Seed database with sample data
  ./tools/health-check.sh  - Check system health

🌐 Service Endpoints:
  API:           http://localhost:3000
  Web App:       http://localhost:3001  
  API Docs:      http://localhost:3000/api/docs
  Prisma Studio: http://localhost:5555
  EMQX Dashboard: http://localhost:18083 (admin/public)

📚 Documentation:
  Main Guide:    ./CLAUDE.md
  API Reference: ./docs/api/
  Frontend:      ./docs/frontend/

🚀 Get Started:
  Run 'npm run dev' to start all services
EOF

print_success "Development environment setup complete!"
echo
cat /tmp/welcome.txt
rm /tmp/welcome.txt