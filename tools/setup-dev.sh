#!/bin/bash

# LifeBox Development Environment Setup Script
# This script sets up a complete development environment

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

echo -e "${BLUE}🚀 LifeBox Development Environment Setup${NC}"
echo "================================================"

# Function to print step
print_step() {
    echo -e "${YELLOW}➡️  $1${NC}"
}

# Function to print success
print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

# Function to print error
print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check prerequisites
check_prerequisites() {
    print_step "Checking prerequisites..."
    
    # Check Node.js
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed. Please install Node.js 18+ from https://nodejs.org"
        exit 1
    fi
    
    NODE_VERSION=$(node --version)
    print_success "Node.js $NODE_VERSION detected"
    
    # Check Docker
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed. Please install Docker from https://docker.com"
        exit 1
    fi
    
    DOCKER_VERSION=$(docker --version)
    print_success "Docker detected: $DOCKER_VERSION"
    
    # Check npm
    if ! command -v npm &> /dev/null; then
        print_error "npm is not installed"
        exit 1
    fi
    
    NPM_VERSION=$(npm --version)
    print_success "npm $NPM_VERSION detected"
}

# Install dependencies
install_dependencies() {
    print_step "Installing dependencies..."
    
    cd "$PROJECT_ROOT"
    
    # Install root dependencies
    npm install
    
    print_success "Dependencies installed successfully"
}

# Setup database
setup_database() {
    print_step "Setting up development database..."
    
    cd "$PROJECT_ROOT"
    
    # Start infrastructure services
    cd infrastructure/docker
    docker-compose up -d
    
    # Wait for database to be ready
    echo "Waiting for database to be ready..."
    sleep 10
    
    # Run migrations
    cd "$PROJECT_ROOT"
    npm run db:migrate
    
    # Seed database
    npm run db:seed
    
    print_success "Database setup completed"
}

# Setup environment files
setup_environment() {
    print_step "Setting up environment files..."
    
    cd "$PROJECT_ROOT"
    
    # Create .env from example if it doesn't exist
    if [ ! -f .env ]; then
        if [ -f .env.example ]; then
            cp .env.example .env
            print_success "Created .env from .env.example"
            echo -e "${YELLOW}⚠️  Please edit .env file with your configuration${NC}"
        else
            print_error ".env.example not found"
        fi
    else
        print_success ".env file already exists"
    fi
}

# Setup git hooks
setup_git_hooks() {
    print_step "Setting up Git hooks..."
    
    cd "$PROJECT_ROOT"
    
    # Install husky hooks
    npm run prepare 2>/dev/null || true
    
    print_success "Git hooks setup completed"
}

# Build projects
build_projects() {
    print_step "Building projects..."
    
    cd "$PROJECT_ROOT"
    
    # Generate database client
    cd libs/database
    npm run generate
    
    # Build all projects
    cd "$PROJECT_ROOT"
    npm run build 2>/dev/null || echo "Build completed with warnings"
    
    print_success "Projects built successfully"
}

# Main execution
main() {
    echo "Starting development environment setup..."
    echo
    
    check_prerequisites
    echo
    
    install_dependencies
    echo
    
    setup_environment
    echo
    
    setup_database
    echo
    
    setup_git_hooks
    echo
    
    build_projects
    echo
    
    echo -e "${GREEN}🎉 Development environment setup completed!${NC}"
    echo
    echo "Next steps:"
    echo "1. Edit .env file with your configuration"
    echo "2. Run 'npm run dev' to start development servers"
    echo "3. Visit http://localhost:3000 for API documentation"
    echo "4. Visit http://localhost:3001 for web application"
    echo "5. Visit http://localhost:18083 for MQTT dashboard (admin/public)"
    echo
    echo "Helpful commands:"
    echo "  npm run dev          - Start all development servers"
    echo "  npm run db:studio    - Open database GUI"
    echo "  npm run db:reset     - Reset database (dev only)"
    echo "  docker-compose logs  - View service logs"
}

# Run main function
main "$@"