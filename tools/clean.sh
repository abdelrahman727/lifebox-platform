#!/bin/bash

# LifeBox Project Cleanup Script
# Removes build artifacts, caches, and node_modules

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

echo -e "${BLUE}🧹 LifeBox Project Cleanup${NC}"
echo "=========================="

# Function to print step
print_step() {
    echo -e "${YELLOW}➡️  $1${NC}"
}

# Function to print success
print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

# Clean function
clean_directory() {
    local dir=$1
    local pattern=$2
    local description=$3
    
    if [ -d "$dir" ] || [ -f "$dir" ]; then
        print_step "Cleaning $description..."
        rm -rf "$dir"
        print_success "Removed $dir"
    fi
}

# Main cleanup
main() {
    cd "$PROJECT_ROOT"
    
    print_step "Starting project cleanup..."
    echo
    
    # Clean node_modules
    print_step "Cleaning node_modules..."
    find . -name "node_modules" -type d -prune -exec rm -rf {} \;
    print_success "Cleaned all node_modules directories"
    
    # Clean build artifacts
    print_step "Cleaning build artifacts..."
    find . -name "dist" -type d -prune -exec rm -rf {} \;
    find . -name "build" -type d -prune -exec rm -rf {} \;
    find . -name ".next" -type d -prune -exec rm -rf {} \;
    print_success "Cleaned build directories"
    
    # Clean TypeScript cache
    print_step "Cleaning TypeScript cache..."
    find . -name "*.tsbuildinfo" -type f -delete
    find . -name ".turbo" -type d -prune -exec rm -rf {} \;
    print_success "Cleaned TypeScript cache"
    
    # Clean logs
    print_step "Cleaning logs..."
    find . -name "*.log" -type f -delete
    find . -name "logs" -type d -prune -exec rm -rf {} \;
    print_success "Cleaned log files"
    
    # Clean coverage
    print_step "Cleaning test coverage..."
    find . -name "coverage" -type d -prune -exec rm -rf {} \;
    print_success "Cleaned coverage directories"
    
    # Clean Docker build cache (optional)
    read -p "Do you want to clean Docker build cache? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        print_step "Cleaning Docker build cache..."
        docker builder prune -f 2>/dev/null || echo "Docker not available or no cache to clean"
        print_success "Docker cache cleaned"
    fi
    
    echo
    print_success "🎉 Project cleanup completed!"
    echo
    echo "To reinstall dependencies:"
    echo "  npm install"
    echo
    echo "To rebuild everything:"
    echo "  npm run build"
}

# Run main function
main "$@"